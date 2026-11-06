// Simula uma segunda pessoa para testes ponta a ponta contra o Supabase real.
// Entra com uma carteira gerada na hora, cria o perfil e (opcionalmente) escaneia um QR ao vivo.
//
// Uso: node scripts/e2e-peer.mjs <handle> [url-do-qr-de-outra-pessoa]
// Ex.: node scripts/e2e-peer.mjs bob_test "http://localhost:5173/u/alice_test?t=123.abc"
//
// Cria um usuário real. Apague os usuários de teste depois (ver docs).
import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519.js";

const SUPABASE_URL = "https://krqbccfxrtpycfsgtbtb.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_toOU9TiY_ZHj17Plg9dKPg_dsLwQ48-";
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

const [handle, qrUrl] = process.argv.slice(2);
if (!handle) {
  console.error("uso: node scripts/e2e-peer.mjs <handle> [url-do-qr]");
  process.exit(2);
}

const sb = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
const kp = Keypair.generate();
const wallet = {
  publicKey: { toBase58: () => kp.publicKey.toBase58() },
  signMessage: async (message) => ed25519.sign(message, kp.secretKey.slice(0, 32)),
};

const fail = (step, error) => {
  console.error(`FALHOU em ${step}:`, error?.message ?? error);
  process.exit(1);
};

const { data: auth, error: authError } = await sb.auth.signInWithWeb3({
  chain: "solana",
  statement: "Sign in to Connex. This request does not trigger a blockchain transaction or cost any fees.",
  wallet,
  options: { url: APP_URL },
});
if (authError) fail("login", authError);
console.log("login ok:", auth.user.id, kp.publicKey.toBase58());

const { data: profile, error: profileError } = await sb.rpc("ensure_profile");
if (profileError) fail("ensure_profile", profileError);
console.log("perfil ok, carteira =", profile.wallet);

const { error: updateError } = await sb
  .from("profiles")
  .update({ handle, display_name: `Test ${handle}`, headline: "Rust dev looking for co-founders", skills: ["Rust", "DePIN"] })
  .eq("id", auth.user.id);
if (updateError) fail("update perfil", updateError);
console.log("handle =", handle);

if (qrUrl) {
  const url = new URL(qrUrl);
  const target = url.pathname.match(/^\/u\/([a-z0-9_]{3,20})$/i)?.[1];
  const token = url.searchParams.get("t");
  const { data: conn, error: connError } = await sb.rpc("connect", { p_handle: target, p_token: token });
  if (connError) fail("connect", connError);
  console.log("connect ok: verified =", conn.verified, "method =", conn.method, "id =", conn.id);
}
