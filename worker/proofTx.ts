import { Ed25519Program, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519.js";
import { Buffer } from "buffer";

// Formato das provas na Solana (v2).
//
// A pessoa não assina transação: assina só uma mensagem de texto na carteira (como no login).
// O servidor publica uma transação paga pela carteira do conneX com duas instruções:
//   1. Ed25519 (programa nativo): a rede confere que a carteira da pessoa assinou a mensagem.
//      Se a assinatura não bater, a transação inteira falha.
//   2. Memo legível: "conneX <tipo> v2 <código> <carteira>".
// Assim a carteira não tem transação para reescrever (o Phantom acrescentava instruções e taxa
// de prioridade, que a carteira do conneX teria de pagar), e o servidor só assina o que ele montou.

export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

type ProofLike = { kind: "meet" | "attend"; ref: string; wallet: string };

const INTRO = {
  meet: "conneX: seal this meeting on Solana.",
  attend: "conneX: prove I was at this event.",
} as const;

// Texto que aparece na carteira. A última linha é o que fica provado.
export function proofMessage(p: ProofLike): string {
  return `${INTRO[p.kind]}\n\nSigning is free and moves no funds.\n\nconneX ${p.kind} v2 ${p.ref}`;
}

export function proofMemo(p: ProofLike): string {
  return `conneX ${p.kind} v2 ${p.ref} ${p.wallet}`;
}

// Confere a assinatura da carteira sobre a mensagem desta prova (forma estrita, como a rede).
export function verifyProofSignature(p: ProofLike, signature: Uint8Array): boolean {
  if (signature.length !== 64) return false;
  try {
    const message = new TextEncoder().encode(proofMessage(p));
    return ed25519.verify(signature, message, new PublicKey(p.wallet).toBytes(), { zip215: false });
  } catch {
    return false;
  }
}

// Monta a transação da prova. O único signatário é o pagador.
export function buildProofTx(
  p: ProofLike,
  signature: Uint8Array,
  feePayer: PublicKey,
  blockhash: string,
  lastValidBlockHeight: number,
): Transaction {
  return new Transaction({ feePayer, blockhash, lastValidBlockHeight }).add(
    Ed25519Program.createInstructionWithPublicKey({
      publicKey: new PublicKey(p.wallet).toBytes(),
      message: new TextEncoder().encode(proofMessage(p)),
      signature,
    }),
    new TransactionInstruction({ programId: MEMO_PROGRAM, keys: [], data: Buffer.from(proofMemo(p), "utf8") }),
  );
}
