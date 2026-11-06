import { Keypair } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519.js";

const KEY = "connex.devKeypair";

function loadKeypair(): Keypair {
  const params = new URLSearchParams(window.location.search);
  if (params.get("devwallet") === "new") {
    localStorage.removeItem(KEY);
    params.delete("devwallet");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
  }
  const stored = localStorage.getItem(KEY);
  if (stored) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(stored) as number[]));
    } catch {
      localStorage.removeItem(KEY);
    }
  }
  const kp = Keypair.generate();
  localStorage.setItem(KEY, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

export function createDevWallet() {
  const kp = loadKeypair();
  const seed = kp.secretKey.slice(0, 32);
  return {
    publicKey: { toBase58: () => kp.publicKey.toBase58() },
    signMessage: async (message: Uint8Array) => ed25519.sign(message, seed),
  };
}
