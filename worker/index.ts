import { Hono } from "hono";
import { Buffer } from "buffer";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { buildProofTx, proofMessage, verifyProofSignature } from "./proofTx";

type Secrets = {
  // Chave privada (base58, como o Phantom exporta) da carteira que paga as taxas das provas.
  FEE_PAYER_SECRET?: string;
  // Autoriza o Worker a confirmar provas no banco (o banco guarda só o sha256).
  PROOF_SERVER_SECRET?: string;
  // RPC dedicado (Helius). Sem ele, usa o público da Solana.
  SOLANA_RPC_URL?: string;
};
type Bindings = Env & Secrets;

const PUBLIC_RPC = { devnet: "https://api.devnet.solana.com", mainnet: "https://api.mainnet-beta.solana.com" } as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Proof = {
  id: string;
  kind: "meet" | "attend";
  cluster: "devnet" | "mainnet";
  user_id: string;
  contact_id: string | null;
  event_id: string | null;
  ref: string;
  wallet: string;
  status: "pending" | "confirmed";
  signature: string | null;
};

class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 500 | 502 | 503,
    message: string,
  ) {
    super(message);
  }
}


let payerCache: { secret: string; kp: Keypair } | null = null;
function payer(env: Bindings): Keypair {
  const secret = env.FEE_PAYER_SECRET?.trim();
  if (!secret) throw new HttpError(503, "proofs not configured");
  if (payerCache?.secret !== secret) payerCache = { secret, kp: Keypair.fromSecretKey(bs58.decode(secret)) };
  return payerCache.kp;
}

function serverSecret(env: Bindings): string {
  const s = env.PROOF_SERVER_SECRET?.trim();
  if (!s) throw new HttpError(503, "proofs not configured");
  return s;
}

async function rpc<T>(env: Bindings, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(env.SOLANA_RPC_URL || PUBLIC_RPC[env.SOLANA_CLUSTER], {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await res.json().catch(() => null)) as { result?: T; error?: { message?: string } } | null;
  if (!res.ok || !body || body.error) throw new HttpError(502, body?.error?.message ?? `rpc ${res.status}`);
  return body.result as T;
}

// Chama uma função do banco. Com jwt: como o usuário (RLS e auth.uid() valem). Sem: anônimo.
async function db<T>(env: Bindings, fn: string, args: Record<string, unknown>, jwt?: string): Promise<T> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      ...(jwt ? { authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(args),
  });
  const body = (await res.json().catch(() => null)) as (T & { message?: string; code?: string }) | null;
  if (!res.ok) {
    const msg = body?.message ?? `db ${res.status}`;
    if (res.status === 401 || body?.code === "28000" || body?.code === "PGRST301") throw new HttpError(401, msg);
    if (body?.code === "P0002") throw new HttpError(404, msg);
    if (body?.code === "22023") throw new HttpError(400, msg);
    throw new HttpError(500, msg);
  }
  return body as T;
}

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.onError((err, c) => {
  if (err instanceof HttpError) {
    console.warn(JSON.stringify({ path: c.req.path, status: err.status, error: err.message }));
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "internal error" }, 500);
});

app.get("/health", (c) => c.json({ ok: true }));

// Cluster e carteira pagadora (pública), para o app saber se as provas estão ligadas.
app.get("/proofs/config", (c) => {
  let feePayer: string | null = null;
  try {
    feePayer = payer(c.env).publicKey.toBase58();
  } catch {
    /* sem chave configurada */
  }
  return c.json({ cluster: c.env.SOLANA_CLUSTER, feePayer, enabled: !!feePayer && !!c.env.PROOF_SERVER_SECRET });
});

// 1) Cria (ou reaproveita) a prova de quem está logado e devolve a mensagem para a carteira assinar.
//    body: { kind: "meet", contactId } | { kind: "attend", eventId, token }
app.post("/proofs/prepare", async (c) => {
  const jwt = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) throw new HttpError(401, "login required");
  const body = (await c.req.json().catch(() => null)) as {
    kind?: string;
    contactId?: string;
    eventId?: string;
    token?: string;
  } | null;
  if (!body || (body.kind !== "meet" && body.kind !== "attend")) throw new HttpError(400, "invalid kind");
  if (body.kind === "meet" && !UUID.test(body.contactId ?? "")) throw new HttpError(400, "invalid contact");
  if (body.kind === "attend" && !UUID.test(body.eventId ?? "")) throw new HttpError(400, "invalid event");

  payer(c.env); // 503 se as provas não estão configuradas
  const proof = await db<Proof>(
    c.env,
    "proof_prepare",
    {
      p_kind: body.kind,
      p_cluster: c.env.SOLANA_CLUSTER,
      p_contact: body.kind === "meet" ? body.contactId : null,
      p_event: body.kind === "attend" ? body.eventId : null,
      p_token: body.kind === "attend" ? (body.token ?? null) : null,
    },
    jwt,
  );
  if (proof.status === "confirmed") return c.json({ proof });
  return c.json({ proof, message: proofMessage(proof) });
});

// 2) Recebe a assinatura da mensagem, confere com a carteira da prova, monta a transação
//    (Ed25519 + Memo), assina como pagador, envia e marca como confirmada.
//    body: { id, signature } com a assinatura (64 bytes) em base64.
app.post("/proofs/submit", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { id?: string; signature?: string } | null;
  if (!body || !UUID.test(body.id ?? "") || typeof body.signature !== "string" || body.signature.length > 100) {
    throw new HttpError(400, "invalid request");
  }
  const userSig = Uint8Array.from(Buffer.from(body.signature, "base64"));
  if (userSig.length !== 64) throw new HttpError(400, "invalid request");
  const fee = payer(c.env);
  const secret = serverSecret(c.env);
  const proof = await db<Proof>(c.env, "proof_for_server", { p_secret: secret, p_id: body.id });
  if (proof.status === "confirmed") return c.json({ proof });
  if (proof.cluster !== c.env.SOLANA_CLUSTER) throw new HttpError(409, "wrong cluster");
  if (!verifyProofSignature(proof, userSig)) throw new HttpError(400, "invalid signature");

  const { value: bh } = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(c.env, "getLatestBlockhash", [
    { commitment: "confirmed" },
  ]);
  const tx = buildProofTx(proof, userSig, fee.publicKey, bh.blockhash, bh.lastValidBlockHeight);
  tx.sign(fee);
  const raw = tx.serialize({ requireAllSignatures: true, verifySignatures: true });
  const signature = await rpc<string>(c.env, "sendTransaction", [
    Buffer.from(raw).toString("base64"),
    { encoding: "base64", preflightCommitment: "confirmed" },
  ]);

  // Espera a confirmação (até ~30 s). Sem websocket: consulta o status a cada segundo.
  for (let i = 0; i < 30; i++) {
    const { value } = await rpc<{ value: ({ err: unknown; confirmationStatus?: string } | null)[] }>(
      c.env,
      "getSignatureStatuses",
      [[signature]],
    );
    const st = value[0];
    if (st?.err) throw new HttpError(502, "transaction failed");
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) {
      const done = await db<Proof>(c.env, "proof_confirm", { p_secret: secret, p_id: proof.id, p_signature: signature });
      return c.json({ proof: done });
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new HttpError(502, "not confirmed in time");
});

export default app;
