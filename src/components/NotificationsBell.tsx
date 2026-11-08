import { useState } from "react";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { strings } from "../i18n/strings";
import { relativeDate } from "../lib/format";
import type { Notification } from "../lib/notifications";
import { useNotifications } from "../lib/useNotifications";
import { useAuth } from "../providers/AuthProvider";
import { Avatar } from "./ui/Avatar";
import { Sheet } from "./ui/Sheet";

// Lamports em SOL, até 4 casas e sem zeros sobrando.
function sol(lamports: number): string {
  return String(Number((lamports / 1e9).toFixed(4)));
}

function describe(n: Notification, name: string): string {
  const t = strings.notifications;
  switch (n.kind) {
    case "connected":
      return n.verified ? t.connected(name) : t.connectedUnverified(name);
    case "seal_signed":
      return t.sealSigned(name);
    case "sealed":
      return t.sealed(name);
    case "tip":
      return t.tip(name, sol(n.lamports ?? 0));
  }
}

export function NotificationsBell() {
  const t = strings.notifications;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, unread, seen, markSeen } = useNotifications(user?.id);
  const [open, setOpen] = useState(false);
  // "Visto até" de antes de abrir: as mais novas que isso ganham o ponto de nova na lista.
  const [seenAtOpen, setSeenAtOpen] = useState(0);

  const openSheet = () => {
    setSeenAtOpen(seen);
    setOpen(true);
    markSeen();
  };

  const go = (n: Notification) => {
    setOpen(false);
    if (n.connection_id) navigate(`/connections/${n.connection_id}`);
    else if (n.actor_handle) navigate(`/u/${n.actor_handle}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label={unread > 0 ? t.bellUnread(unread) : t.bell}
        className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text transition active:scale-95"
      >
        <Bell size={22} aria-hidden />
        {unread > 0 && <span aria-hidden className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-cyan ring-2 ring-ink" />}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t.title}>
        {items.length === 0 ? (
          <p className="text-sm text-muted">{t.empty}</p>
        ) : (
          <ul className="flex flex-col">
            {items.map((n) => {
              const name = n.actor_name || (n.actor_handle ? `@${n.actor_handle}` : "?");
              const fresh = new Date(n.at).getTime() > seenAtOpen;
              return (
                <li key={`${n.kind}:${n.actor_id}:${n.at}`}>
                  <button
                    type="button"
                    onClick={() => go(n)}
                    className="flex min-h-11 w-full items-center gap-3 border-b border-line py-3 text-left"
                  >
                    <Avatar src={n.actor_avatar} name={name} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-text">{describe(n, name)}</span>
                      <span className="block text-xs text-muted">{relativeDate(n.at)}</span>
                    </span>
                    {fresh && <span aria-label={t.fresh} className="size-2.5 shrink-0 rounded-full bg-cyan" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
    </>
  );
}
