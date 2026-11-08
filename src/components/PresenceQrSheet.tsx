import { useEffect, useState } from "react";
import { Sheet } from "./ui/Sheet";
import { QRCode } from "./QRCode";
import { strings } from "../i18n/strings";
import { supabase } from "../lib/supabase";

type Props = { open: boolean; onClose: () => void; eventId: string; joinCode: string };

const REFRESH_MS = 15_000;

// QR de presença do organizador: o token muda a cada 30 s, então print não funciona.
export function PresenceQrSheet({ open, onClose, eventId, joinCode }: Props) {
  const t = strings.presence;
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) {
      setToken(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.rpc("event_presence_token", { p_event: eventId });
      if (cancelled) return;
      if (error || typeof data !== "string") return setFailed(true);
      setFailed(false);
      setToken(data);
    };
    void load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, eventId]);

  const url = token ? `${window.location.origin}/e/${joinCode}?p=${encodeURIComponent(token)}` : null;

  return (
    <Sheet open={open} onClose={onClose} title={t.sheetTitle}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-xs rounded-3xl bg-white p-2">
          {url ? <QRCode value={url} size={320} label={t.qrLabel} withLogo /> : <div className="aspect-square w-full" />}
        </div>
        {failed && <p className="text-sm text-danger">{t.loadFailed}</p>}
        <p className="text-center text-sm text-muted">{t.hint}</p>
      </div>
    </Sheet>
  );
}
