import { cluster } from "./config";
import { supabase } from "./supabase";

// Provas na Solana (selo de encontro e presença em evento). A carteira da pessoa assina só uma
// mensagem de texto (sem transação, sem mover dinheiro); o servidor publica a prova na rede,
// paga a taxa, e a própria rede confere a assinatura (programa Ed25519). Ver worker/proofTx.ts.

export type ProofKind = "meet" | "attend";
export type ProofCluster = "devnet" | "mainnet";

export type Proof = {
  id: string;
  kind: ProofKind;
  cluster: ProofCluster;
  user_id: string;
  contact_id: string | null;
  event_id: string | null;
  ref: string;
  wallet: string;
  status: "pending" | "confirmed";
  signature: string | null;
  created_at: string;
  confirmed_at: string | null;
};

// As provas da devnet (testes) não aparecem na versão real, e vice-versa.
export const proofCluster: ProofCluster = cluster === "devnet" ? "devnet" : "mainnet";

export type ProofTarget = { kind: "meet"; contactId: string } | { kind: "attend"; eventId: string; token: string };

export class ProofError extends Error {
  constructor(
    readonly code: "not_configured" | "login" | "cancelled" | "expired" | "not_allowed" | "failed",
    message?: string,
  ) {
    super(message ?? code);
  }
}

// Uma consulta por carregamento do app: várias telas perguntam ao mesmo tempo.
let enabledOnce: Promise<boolean> | null = null;
export function proofsEnabled(): Promise<boolean> {
  enabledOnce ??= fetchEnabled().then((ok) => {
    if (!ok) enabledOnce = null; // tenta de novo na próxima vez
    return ok;
  });
  return enabledOnce;
}

async function fetchEnabled(): Promise<boolean> {
  try {
    const res = await fetch("/api/proofs/config");
    if (!res.ok) return false;
    const body = (await res.json()) as { enabled?: boolean; cluster?: string };
    return !!body.enabled && body.cluster === proofCluster;
  } catch {
    return false;
  }
}

async function api<T>(path: string, body: unknown, jwt?: string): Promise<T> {
  const res = await fetch(`/api/proofs/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const msg = data.error ?? "";
    if (res.status === 503) throw new ProofError("not_configured", msg);
    if (res.status === 401) throw new ProofError("login", msg);
    if (/expired|invalid qr/i.test(msg)) throw new ProofError("expired", msg);
    if (/verified connection required/i.test(msg)) throw new ProofError("not_allowed", msg);
    throw new ProofError("failed", msg);
  }
  return data;
}

// Roda a prova inteira: pede a mensagem, a carteira assina, o servidor publica e confirma.
// signMessage vem de useProofSigner() (a carteira precisa estar conectada).
export async function runProof(target: ProofTarget, signMessage: (message: Uint8Array) => Promise<Uint8Array>): Promise<Proof> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new ProofError("login");

  const prepared = await api<{ proof: Proof; message?: string }>("prepare", target, jwt);
  if (prepared.proof.status === "confirmed" || !prepared.message) return prepared.proof;

  let sig: Uint8Array;
  try {
    sig = await signMessage(new TextEncoder().encode(prepared.message));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    throw new ProofError(/reject|declin|cancel/i.test(msg) ? "cancelled" : "failed", msg);
  }
  let bin = "";
  sig.forEach((b) => (bin += String.fromCharCode(b)));
  const done = await api<{ proof: Proof }>("submit", { id: prepared.proof.id, signature: btoa(bin) });
  return done.proof;
}

export function explorerTx(sig: string): string {
  return `https://solscan.io/tx/${sig}${cluster === "devnet" ? "?cluster=devnet" : ""}`;
}

// Estado do selo de encontro com uma pessoa, olhando as duas metades.
export type SealState = "none" | "mine" | "theirs" | "sealed";
export function sealState(mine: Proof | undefined, theirs: Proof | undefined): SealState {
  const a = mine?.status === "confirmed";
  const b = theirs?.status === "confirmed";
  return a && b ? "sealed" : a ? "mine" : b ? "theirs" : "none";
}

// Selos de encontro do usuário logado, por contato: { [contactId]: SealState }.
export async function loadSeals(me: string): Promise<Record<string, SealState>> {
  const { data, error } = await supabase
    .from("proofs")
    .select("user_id, contact_id, status")
    .eq("kind", "meet")
    .eq("cluster", proofCluster)
    .eq("status", "confirmed")
    .or(`user_id.eq.${me},contact_id.eq.${me}`);
  if (error || !data) return {};
  const mine = new Set<string>();
  const theirs = new Set<string>();
  for (const r of data as { user_id: string; contact_id: string }[]) {
    if (r.user_id === me) mine.add(r.contact_id);
    else theirs.add(r.user_id);
  }
  const out: Record<string, SealState> = {};
  for (const id of new Set([...mine, ...theirs])) {
    out[id] = mine.has(id) && theirs.has(id) ? "sealed" : mine.has(id) ? "mine" : "theirs";
  }
  return out;
}
