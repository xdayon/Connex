import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Share2, WifiOff } from "lucide-react";
import { ConnectedSheet } from "../components/ConnectedSheet";
import { QRCode } from "../components/QRCode";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { strings } from "../i18n/strings";
import { copyText } from "../lib/clipboard";
import { supabase } from "../lib/supabase";
import { CONNECTION_SELECT, profileName, type ConnectionWithContact } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";

const REFRESH_MS = 25_000;
const RETRY_MS = 8_000;

function CountdownRing({ fraction }: { fraction: number }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="-rotate-90">
      <circle cx="10" cy="10" r={r} fill="none" stroke="var(--color-line)" strokeWidth="2.5" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="var(--color-volt)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, fraction)))}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}

export function BadgePage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [tried, setTried] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [pulse, setPulse] = useState(0);
  const [connected, setConnected] = useState<ConnectionWithContact | null>(null);

  const nextAt = useRef(0);
  const inflight = useRef(false);
  const shown = useRef(new Map<string, number>());
  const openId = useRef<string | null>(null);

  const fetchToken = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const { data, error } = await supabase.rpc("live_qr_token");
      if (error || typeof data !== "string") throw error ?? new Error("bad token");
      setToken(data);
      setLive(true);
      setPulse((p) => p + 1);
      nextAt.current = Date.now() + REFRESH_MS;
    } catch {
      setLive(false);
      nextAt.current = Date.now() + RETRY_MS;
    } finally {
      inflight.current = false;
      setTried(true);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (!document.hidden && n >= nextAt.current) void fetchToken();
    };
    const refreshNow = () => {
      nextAt.current = 0;
      tick();
    };
    const onVisible = () => {
      if (!document.hidden) refreshNow();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refreshNow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refreshNow);
    };
  }, [fetchToken]);

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (!("wakeLock" in navigator) || document.hidden || sentinel) return;
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) void lock.release();
        else {
          sentinel = lock;
          lock.addEventListener("release", () => {
            if (sentinel === lock) sentinel = null;
          });
        }
      } catch {
        // not allowed or unsupported
      }
    };
    const onVisible = () => {
      if (!document.hidden) void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, []);

  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    const onRow = async (row: { id?: string; verified?: boolean; updated_at?: string }, isInsert: boolean) => {
      if (!row.id || !row.verified) return;
      if (!isInsert && Math.abs(Date.now() - new Date(row.updated_at ?? 0).getTime()) > 15_000) return;
      if (openId.current === row.id) return;
      const last = shown.current.get(row.id) ?? 0;
      if (Date.now() - last < 15_000) return;
      shown.current.set(row.id, Date.now());
      const { data } = await supabase.from("connections").select(CONNECTION_SELECT).eq("id", row.id).maybeSingle();
      if (!data) return;
      setConnected(data as ConnectionWithContact);
      navigator.vibrate?.([60, 40, 120]);
    };
    const filter = `owner_id=eq.${uid}`;
    const channel = supabase
      .channel(`connections:${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "connections", filter }, (p) => void onRow(p.new, true))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "connections", filter }, (p) => void onRow(p.new, false))
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [uid]);

  openId.current = connected?.id ?? null;
  if (!profile?.handle) return null;
  const handle = profile.handle;
  const base = `${window.location.origin}/u/${handle}`;
  const url = live && token ? `${base}?t=${token}` : base;
  const secondsLeft = Math.max(0, Math.ceil((nextAt.current - now) / 1000));
  const name = profileName(profile);
  const sub = [profile.headline, profile.company].filter(Boolean).join(" · ");

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: strings.badge.shareText, url: base });
        return;
      }
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
    }
    toast((await copyText(base)) ? strings.badge.linkCopied : strings.errors.generic, "success");
  };
  const copy = async () => toast((await copyText(base)) ? strings.badge.linkCopied : strings.errors.generic, "success");

  return (
    <section className="flex flex-col items-center gap-5">
      <div className="flex w-full items-center gap-4 rounded-card border border-line bg-surface p-4">
        <Avatar src={profile.avatar_url} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold tracking-[-0.02em]">{name}</h1>
          <p className="truncate font-mono text-sm text-volt">@{handle}</p>
          {sub && <p className="mt-0.5 truncate text-sm text-muted">{sub}</p>}
          {profile.seeker_verified && (
            <span className="mt-1 inline-flex items-center rounded-full bg-violet/20 px-2 py-0.5 text-xs font-semibold text-violet">
              {strings.ui.seeker}
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <div key={pulse} className={`rounded-[28px] bg-white p-3 ring-2 ring-volt/70 ${pulse > 1 ? "anim-qr-pulse" : ""}`}>
          {tried ? (
            <QRCode value={url} size={272} label={strings.badge.qrLabel} />
          ) : (
            <div className="size-68 animate-pulse rounded-2xl bg-line" aria-label={strings.badge.tokenLoading} />
          )}
        </div>

        {!tried ? (
          <p className="h-5 text-sm text-muted" role="status">
            {strings.badge.tokenLoading}
          </p>
        ) : live ? (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <CountdownRing fraction={secondsLeft / (REFRESH_MS / 1000)} />
            <span className="font-semibold text-volt">{strings.badge.live}</span>
            <span>
              · {strings.badge.refreshesIn} <span className="inline-block w-6 text-right font-mono text-text">{secondsLeft}s</span>
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <WifiOff size={16} className="text-danger" aria-hidden />
            <span className="font-medium text-text">{strings.badge.offline}</span>
          </p>
        )}
      </div>

      <div className="flex w-full gap-3">
        <Button full onClick={share} icon={<Share2 size={18} aria-hidden />}>
          {strings.badge.share}
        </Button>
        <Button full variant="secondary" onClick={copy} icon={<Copy size={18} aria-hidden />}>
          {strings.badge.copyLink}
        </Button>
      </div>

      <ConnectedSheet
        connection={connected}
        onClose={() => {
          if (connected) shown.current.set(connected.id, Date.now());
          setConnected(null);
        }}
      />
    </section>
  );
}
