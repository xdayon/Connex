import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import type QrScanner from "qr-scanner";
import { CameraOff, FlipHorizontal2, Flashlight, FlashlightOff, ScanLine } from "lucide-react";
import { ShareSelector } from "../components/ShareSelector";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Sheet } from "../components/ui/Sheet";
import { TextField } from "../components/ui/TextField";
import { useToast } from "../components/ui/Toast";
import { strings } from "../i18n/strings";
import { getCurrentEventId, setCurrentEventId } from "../lib/currentEvent";
import { friendlyError, isMessage } from "../lib/errors";
import { supabase } from "../lib/supabase";
import type { Connection, EventRow } from "../lib/types";
import { useShareSelection } from "../lib/useShareSelection";
import { useAuth } from "../providers/AuthProvider";

// Crachás impressos e QRs antigos ainda podem apontar para o endereço workers.dev.
const ALLOWED_ORIGINS = [window.location.origin, "https://connex.contact", "https://connex.dayon-x.workers.dev"];
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

type Target = { kind: "profile"; handle: string; token: string | null } | { kind: "event"; code: string };

function parseCode(text: string): Target | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (!ALLOWED_ORIGINS.includes(url.origin)) return null;
  const u = url.pathname.match(/^\/u\/([A-Za-z0-9_]{3,20})\/?$/);
  if (u) return { kind: "profile", handle: u[1].toLowerCase(), token: url.searchParams.get("t") };
  const e = url.pathname.match(/^\/e\/([A-Za-z0-9]{6})\/?$/);
  if (e) return { kind: "event", code: e[1].toUpperCase() };
  return null;
}

type CamState = "starting" | "scanning" | "denied" | "nocamera" | "error";

export function ScanPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const t = strings.scan;
  const { profile } = useAuth();
  const selection = useShareSelection(profile);
  const shareRef = useRef(selection.payload);
  shareRef.current = selection.payload;
  const video = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const busy = useRef(false);
  const expiredRef = useRef<string | null>(null);
  const cooldown = useRef(0);
  const [cam, setCam] = useState<CamState>("starting");
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [multiCam, setMultiCam] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [working, setWorking] = useState(false);
  const [expired, setExpired] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const doConnect = useCallback(
    async (handle: string, token: string | null): Promise<boolean> => {
      const { data, error } = await supabase.rpc("connect", { p_handle: handle, p_token: token, p_event_id: getCurrentEventId(), p_share: shareRef.current });
      if (error) {
        if (token && isMessage(error, "qr expired")) {
          setExpired(handle);
        } else {
          toast(friendlyError(error), "error");
        }
        return false;
      }
      navigate(`/connections/${(data as Connection).id}?new=1`);
      return true;
    },
    [navigate, toast],
  );

  const onDecoded = useCallback(
    async (text: string) => {
      if (busy.current || expiredRef.current || Date.now() < cooldown.current) return;
      busy.current = true;
      setWorking(true);
      try {
        const target = parseCode(text);
        if (!target) {
          toast(t.notConnex, "error");
          cooldown.current = Date.now() + 2500;
        } else if (target.kind === "profile") {
          const ok = await doConnect(target.handle, target.token);
          if (!ok) cooldown.current = Date.now() + 2500;
          else return;
        } else {
          const { data, error } = await supabase.rpc("join_event", { p_code: target.code });
          if (error) {
            toast(friendlyError(error), "error");
            cooldown.current = Date.now() + 2500;
          } else {
            const ev = data as EventRow;
            setCurrentEventId(ev.id);
            toast(t.joinedEvent, "success");
            navigate(`/events/${ev.id}`);
            return;
          }
        }
      } finally {
        setWorking(false);
        busy.current = false;
      }
    },
    [doConnect, navigate, toast, t.notConnex, t.joinedEvent],
  );

  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  useEffect(() => {
    let cancelled = false;
    let scanner: QrScanner | null = null;
    setCam("starting");
    setHasFlash(false);
    setFlashOn(false);

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCam("error");
        return;
      }
      const { default: Scanner } = await import("qr-scanner");
      if (cancelled || !video.current) return;
      if (!(await Scanner.hasCamera())) {
        if (!cancelled) setCam("nocamera");
        return;
      }
      scanner = new Scanner(video.current, (r) => void onDecodedRef.current(r.data), {
        preferredCamera: "environment",
        maxScansPerSecond: 10,
        highlightScanRegion: false,
        highlightCodeOutline: false,
        returnDetailedScanResult: true,
      });
      scannerRef.current = scanner;
      try {
        await scanner.start();
        if (cancelled) return;
        setCam("scanning");
        setHasFlash(await scanner.hasFlash());
        setMultiCam((await Scanner.listCameras()).length > 1);
      } catch (e) {
        if (cancelled) return;
        const name = (e as { name?: string })?.name ?? String(e);
        setCam(/NotAllowed|Permission|denied/i.test(name) || /NotAllowed|Permission|denied/i.test(String(e)) ? "denied" : /NotFound|camera/i.test(String(e)) ? "nocamera" : "error");
      }
    })().catch(() => !cancelled && setCam("error"));

    return () => {
      cancelled = true;
      scannerRef.current = null;
      if (scanner) {
        scanner.stop();
        scanner.destroy();
      }
    };
  }, [attempt]);

  const toggleFlash = async () => {
    try {
      await scannerRef.current?.toggleFlash();
      setFlashOn(scannerRef.current?.isFlashOn() ?? false);
    } catch {
      setHasFlash(false);
    }
  };

  const flip = async () => {
    const next = facing === "environment" ? "user" : "environment";
    try {
      await scannerRef.current?.setCamera(next);
      setFacing(next);
      setHasFlash((await scannerRef.current?.hasFlash()) ?? false);
      setFlashOn(false);
    } catch {
      toast(t.errorTitle, "error");
    }
  };

  const submitHandle = async (e: FormEvent) => {
    e.preventDefault();
    const h = handleInput.trim().replace(/^@/, "").toLowerCase();
    if (!HANDLE_RE.test(h)) {
      setHandleError(strings.onboarding.handleInvalid);
      return;
    }
    setHandleError(null);
    setWorking(true);
    await doConnect(h, null);
    setWorking(false);
  };

  const saveWithout = async () => {
    const h = expired;
    if (!h) return;
    setWorking(true);
    const ok = await doConnect(h, null);
    setWorking(false);
    if (ok) setExpired(null);
  };

  expiredRef.current = expired;
  const problem = cam === "denied" || cam === "nocamera" || cam === "error";

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">{t.title}</h1>
        <p className="mt-1 text-muted">{t.hint}</p>
      </div>

      <ShareSelector selection={selection} />

      {problem ? (
        <EmptyState
          icon={CameraOff}
          title={cam === "denied" ? t.deniedTitle : cam === "nocamera" ? t.noCameraTitle : t.errorTitle}
          hint={cam === "denied" ? t.deniedBody : cam === "nocamera" ? t.noCameraBody : window.isSecureContext ? t.noCameraBody : t.cameraBlockedInsecure}
          action={
            cam !== "nocamera" && (
              <Button onClick={() => setAttempt((a) => a + 1)} variant="secondary">
                {t.retry}
              </Button>
            )
          }
        />
      ) : (
        <div className="relative aspect-square w-full overflow-hidden rounded-card border border-line bg-black">
          <video ref={video} muted playsInline className="size-full object-cover" />
          {cam === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-muted" role="status">
              {t.requesting}
            </div>
          )}
          <div aria-hidden className="pointer-events-none absolute inset-[16%] rounded-3xl border-2 border-cyan/80 shadow-[0_0_0_999px_rgba(7,9,15,0.45)]" />
          {working && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center" role="status">
              <span className="rounded-full bg-ink/80 px-4 py-2 text-sm text-text">{t.connecting}</span>
            </div>
          )}
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            {hasFlash && (
              <button
                type="button"
                aria-label={t.torch}
                aria-pressed={flashOn}
                onClick={toggleFlash}
                className="flex size-11 items-center justify-center rounded-full bg-ink/70 text-text backdrop-blur"
              >
                {flashOn ? <Flashlight size={20} className="text-cyan" /> : <FlashlightOff size={20} />}
              </button>
            )}
            {multiCam && (
              <button type="button" aria-label={t.flip} onClick={flip} className="flex size-11 items-center justify-center rounded-full bg-ink/70 text-text backdrop-blur">
                <FlipHorizontal2 size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={submitHandle} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4" noValidate>
        <div className="flex items-center gap-2 text-sm font-medium">
          <ScanLine size={16} className="text-cyan" aria-hidden />
          {t.enterHandle}
        </div>
        <TextField
          aria-label={t.enterHandle}
          value={handleInput}
          placeholder={t.handlePlaceholder}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono"
          error={handleError}
          onChange={(e) => setHandleInput(e.target.value)}
        />
        <Button type="submit" variant="secondary" loading={working} disabled={!handleInput.trim()}>
          {t.connect}
        </Button>
      </form>

      <Sheet open={!!expired} onClose={() => setExpired(null)} title={t.expiredTitle}>
        <p className="-mt-2 text-sm text-muted">{strings.errors.qrExpired}</p>
        <p className="mt-3 text-xs text-muted">{t.saveWithoutHint}</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button full loading={working} onClick={saveWithout}>
            {t.saveWithout}
          </Button>
          <Button full variant="ghost" onClick={() => setExpired(null)}>
            {strings.common.cancel}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
