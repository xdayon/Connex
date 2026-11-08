import { useCallback, useEffect, useState } from "react";
import { loadNotifications, type Notification } from "./notifications";
import { supabase } from "./supabase";

const POLL_MS = 60_000;

function readSeen(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

// Notificações do usuário logado, sempre frescas: ao montar, ao voltar o foco, a cada 60 s
// e quando chega uma prova nova apontando para mim (Realtime).
export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<Notification[]>([]);
  const key = `connex.notifSeen.${userId}`;
  const [seen, setSeen] = useState(() => readSeen(key));

  useEffect(() => setSeen(readSeen(key)), [key]);

  const reload = useCallback(async () => {
    if (!userId) return;
    setItems(await loadNotifications());
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    void reload();
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const onFocus = () => void reload();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void reload(), POLL_MS);
    const channel = supabase
      .channel(`notif:${userId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "proofs", filter: `contact_id=eq.${userId}` }, () => void reload())
      .subscribe();
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, reload]);

  const unread = items.filter((n) => new Date(n.at).getTime() > seen).length;

  const markSeen = useCallback(() => {
    const latest = items.reduce((m, n) => Math.max(m, new Date(n.at).getTime()), 0);
    if (!latest) return;
    setSeen(latest);
    try {
      localStorage.setItem(key, String(latest));
    } catch {
      /* sem armazenamento: o contador volta no próximo carregamento */
    }
  }, [items, key]);

  return { items, unread, seen, markSeen };
}
