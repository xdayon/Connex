// Teste de ponta a ponta das provas na Solana (devnet), contra a versão de teste publicada.
// Usa perfis fictícios t_* (chaves no arquivo de estado do seed-test) como as "pessoas".
//
// Uso: node scripts/proof-e2e.mjs <estado.json> [https://connex-dev.dayon-x.workers.dev]
//
// Cobre: conexão verificada entre dois perfis, selo dos dois lados (cada um assina só uma
// mensagem; a transação na rede tem Ed25519 + Memo e só o pagador como signatário), presença em
// evento pelo QR do organizador e recusas (assinatura de outra carteira, de outra mensagem, sem
// assinatura, sem conexão verificada, QR de presença vencido).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519.js";

const SUPABASE_URL = "https://krqbccfxrtpycfsgtbtb.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_toOU9TiY_ZHj17Plg9dKPg_dsLwQ48-";
const STATEMENT = "Sign in to Connex. This request does not trigger a blockchain transaction or cost any fees.";

const [statePath, base = "https://connex-dev.dayon-x.workers.dev"] = process.argv.slice(2);
if (!statePath) {
  console.error("uso: node scripts/proof-e2e.mjs <estado.json> [url]");
  process.exit(2);
}
const state = JSON.parse(readFileSync(statePath, "utf8"));

async function signIn(handle) {
  const kp = Keypair.fromSecretKey(Uint8Array.from(state.people[handle]));
  const sb = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const wallet = {
    publicKey: { toBase58: () => kp.publicKey.toBase58() },
    signMessage: async (m) => ed25519.sign(m, kp.secretKey.slice(0, 32)),
  };
  const { data, error } = await sb.auth.signInWithWeb3({ chain: "solana", statement: STATEMENT, wallet, options: { url: base } });
  if (error) throw new Error(`login ${handle}: ${error.message}`);
  return { handle, kp, sb, uid: data.user.id, jwt: data.session.access_token };
}

async function api(path, body, jwt) {
  const res = await fetch(`${base}/api/proofs/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`);
  if (!ok) failures++;
}

const b64 = (u8) => Buffer.from(u8).toString("base64");

const signText = (who, text) => ed25519.sign(new TextEncoder().encode(text), who.kp.secretKey.slice(0, 32));

// Faz a prova como o app: pede a mensagem, a carteira assina, envia a assinatura.
async function prove(who, target) {
  const prep = await api("prepare", target, who.jwt);
  if (prep.status !== 200 || !prep.body.message) return prep;
  return api("submit", { id: prep.body.proof.id, signature: b64(signText(who, prep.body.message)) });
}

// Busca a transação na devnet (confirmada há pouco; tenta por alguns segundos).
async function chainTx(sig) {
  for (let i = 0; i < 10; i++) {
    const res = await fetch("https://api.devnet.solana.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: [sig, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 }] }),
    });
    const body = await res.json().catch(() => null);
    if (body?.result) return body.result;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

const cfg = await (await fetch(`${base}/api/proofs/config`)).json();
check("config ligada na devnet", cfg.enabled && cfg.cluster === "devnet", JSON.stringify(cfg));
if (!cfg.enabled) process.exit(1);

const a = await signIn("t_lucas_dev");
const host = await signIn("t_camila_comm"); // criou o Builders Night SP no seed
const outsider = await signIn("t_gabriel_sol");

// B: o primeiro perfil fictício que ainda não tem selo confirmado com A (cada execução gasta um par).
const { data: sealedRows } = await a.sb.from("proofs").select("user_id, contact_id").eq("kind", "meet").eq("cluster", "devnet").eq("status", "confirmed");
const sealedWithA = new Set((sealedRows ?? []).map((r) => (r.user_id === a.uid ? r.contact_id : r.user_id)));
let b = null;
for (const handle of Object.keys(state.people)) {
  if ([a.handle, host.handle, outsider.handle].includes(handle)) continue;
  const who = await signIn(handle);
  if (!sealedWithA.has(who.uid)) {
    b = who;
    break;
  }
}
if (!b) {
  console.error("Todos os perfis fictícios já têm selo com A; rode o seed de novo.");
  process.exit(1);
}
console.log(`par do teste: ${a.handle} e ${b.handle}`);

// Conexão verificada entre A e B (QR ao vivo de A, escaneado por B).
const token = (await a.sb.rpc("live_qr_token")).data;
const conn = await b.sb.rpc("connect", { p_handle: a.handle, p_token: token });
check("conexão verificada A↔B", !conn.error && conn.data?.verified, conn.error?.message);

// Recusa: sem conexão verificada.
const noConn = await api("prepare", { kind: "meet", contactId: outsider.uid }, a.jwt);
check("recusa selo sem conexão verificada", noConn.status === 400, `${noConn.status} ${noConn.body.error}`);

// Recusas no envio da assinatura.
{
  const prep = await api("prepare", { kind: "meet", contactId: b.uid }, a.jwt);
  check("prepare devolve a mensagem para assinar", prep.status === 200 && /conneX meet v2 [0-9a-f]{32}$/.test(prep.body.message ?? ""), `${prep.status} ${prep.body.error ?? prep.body.message}`);
  if (prep.body.message) {
    const id = prep.body.proof.id;
    const other = await api("submit", { id, signature: b64(signText(b, prep.body.message)) });
    check("recusa assinatura de outra carteira", other.status === 400, `${other.status} ${other.body.error}`);
    const wrongText = await api("submit", { id, signature: b64(signText(a, prep.body.message.replace("meet", "attend"))) });
    check("recusa assinatura de outra mensagem", wrongText.status === 400, `${wrongText.status} ${wrongText.body.error}`);
    const empty = await api("submit", { id, signature: b64(new Uint8Array(64)) });
    check("recusa assinatura zerada", empty.status === 400, `${empty.status} ${empty.body.error}`);
    const short = await api("submit", { id, signature: "abc" });
    check("recusa assinatura malformada", short.status === 400, `${short.status} ${short.body.error}`);
  }
}

// Selo dos dois lados.
const sa = await prove(a, { kind: "meet", contactId: b.uid });
check("A assinou a metade dele", sa.status === 200 && sa.body.proof?.status === "confirmed", `${sa.status} ${sa.body.error ?? sa.body.proof?.signature}`);
// Na rede: só o pagador assina a transação; a rede conferiu a assinatura de A (Ed25519) e o Memo traz a carteira de A.
if (sa.body.proof?.signature) {
  const t = await chainTx(sa.body.proof.signature);
  const ixs = t?.transaction.message.instructions ?? [];
  const signers = (t?.transaction.message.accountKeys ?? []).filter((k) => k.signer).map((k) => k.pubkey);
  const memo = ixs.find((i) => i.program === "spl-memo")?.parsed;
  check(
    "na rede: Ed25519 + Memo, só o pagador assina",
    !!t && !t.meta.err && ixs.length === 2 && ixs[0].programId === "Ed25519SigVerify111111111111111111111111111" && signers.length === 1 && signers[0] === cfg.feePayer,
    `taxa ${t?.meta.fee} lamports`,
  );
  check("memo com o código e a carteira de A", memo === `conneX meet v2 ${sa.body.proof.ref} ${a.kp.publicKey.toBase58()}`, memo);
}
const sb2 = await prove(b, { kind: "meet", contactId: a.uid });
check("B assinou a metade dela", sb2.status === 200 && sb2.body.proof?.status === "confirmed", `${sb2.status} ${sb2.body.error ?? sb2.body.proof?.signature}`);
check("mesmo código dos dois lados", sa.body.proof?.ref === sb2.body.proof?.ref);
const again = await prove(a, { kind: "meet", contactId: b.uid });
check("repetir não gera nova transação", again.status === 200 && again.body.proof?.signature === sa.body.proof?.signature);

// Presença no evento.
const eventId = state.events.builders.id;
const ptoken = (await host.sb.rpc("event_presence_token", { p_event: eventId })).data;
check("organizador gera QR de presença", typeof ptoken === "string" && /^\d+\.[0-9a-f]{20}$/.test(ptoken), ptoken);
const notHost = await a.sb.rpc("event_presence_token", { p_event: eventId });
check("quem não organiza não gera QR", !!notHost.error);
// B muda a cada execução e ainda não tem presença: a recusa e o registro rodam de verdade.
const bad = await api("prepare", { kind: "attend", eventId, token: "1.0123456789abcdef0123" }, b.jwt);
check("recusa QR de presença vencido", bad.status === 400, `${bad.status} ${bad.body.error}`);
const pa = await prove(b, { kind: "attend", eventId, token: ptoken });
check("presença registrada", pa.status === 200 && pa.body.proof?.status === "confirmed", `${pa.status} ${pa.body.error ?? pa.body.proof?.signature}`);

for (const p of [sa, sb2, pa]) {
  if (p.body.proof?.signature) console.log(`   https://solscan.io/tx/${p.body.proof.signature}?cluster=devnet`);
}
console.log(failures ? `\n${failures} falha(s)` : "\nTudo certo");
process.exit(failures ? 1 : 0);
