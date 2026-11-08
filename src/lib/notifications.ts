import { proofCluster } from "./proofs";
import { supabase } from "./supabase";

export type NotificationKind = "connected" | "seal_signed" | "sealed" | "tip";

export type Notification = {
  kind: NotificationKind;
  at: string;
  actor_id: string;
  actor_handle: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  connection_id: string | null;
  verified: boolean | null;
  lamports: number | null;
  signature: string | null;
};

export async function loadNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase.rpc("notifications_feed", { p_cluster: proofCluster });
  if (error || !data) return [];
  return data as Notification[];
}

// Avisa o servidor de uma gorjeta já confirmada, para quem recebeu ser notificado.
// Best effort: se falhar, a gorjeta em si já aconteceu na rede.
export async function recordTip(signature: string, toUser: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt) return;
    const res = await fetch("/api/tips/record", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ signature, to: toUser }),
    });
    if (!res.ok) console.warn("tip record failed", res.status);
  } catch (e) {
    console.warn("tip record failed", e);
  }
}
