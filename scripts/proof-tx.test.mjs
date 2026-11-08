// Testes do formato das provas (worker/proofTx.ts): mensagem, conferência da assinatura e transação.
// Uso: node --test scripts/proof-tx.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519.js";
import { buildProofTx, MEMO_PROGRAM, proofMemo, proofMessage, verifyProofSignature } from "../worker/proofTx.ts";

const person = Keypair.generate();
const fee = Keypair.generate();
const proof = { kind: "meet", ref: "0123456789abcdef0123456789abcdef", wallet: person.publicKey.toBase58() };
const sign = (kp, text) => ed25519.sign(new TextEncoder().encode(text), kp.secretKey.slice(0, 32));
const blockhash = Keypair.generate().publicKey.toBase58();

test("mensagem legível, terminando no código da prova", () => {
  const m = proofMessage(proof);
  assert.match(m, /^conneX: seal this meeting on Solana\./);
  assert.match(m, /moves no funds/);
  assert.ok(m.endsWith(`conneX meet v2 ${proof.ref}`));
  assert.ok(proofMessage({ ...proof, kind: "attend" }).startsWith("conneX: prove I was at this event."));
});

test("memo traz o código e a carteira", () => {
  assert.equal(proofMemo(proof), `conneX meet v2 ${proof.ref} ${proof.wallet}`);
});

test("aceita a assinatura da carteira da prova", () => {
  assert.equal(verifyProofSignature(proof, sign(person, proofMessage(proof))), true);
});

test("recusa assinatura de outra carteira, de outra mensagem ou de tamanho errado", () => {
  assert.equal(verifyProofSignature(proof, sign(Keypair.generate(), proofMessage(proof))), false);
  assert.equal(verifyProofSignature(proof, sign(person, proofMessage({ ...proof, ref: "f".repeat(32) }))), false);
  assert.equal(verifyProofSignature(proof, sign(person, proofMessage({ ...proof, kind: "attend" }))), false);
  assert.equal(verifyProofSignature(proof, new Uint8Array(63)), false);
  assert.equal(verifyProofSignature(proof, new Uint8Array(64)), false);
});

test("transação: só o pagador assina; Ed25519 com a assinatura da pessoa e o Memo", () => {
  const sig = sign(person, proofMessage(proof));
  const tx = buildProofTx(proof, sig, fee.publicKey, blockhash, 1);
  tx.sign(fee);
  const msg = tx.compileMessage();
  assert.equal(msg.header.numRequiredSignatures, 1);
  assert.ok(msg.accountKeys[0].equals(fee.publicKey));
  // Ninguém além do pagador é gravável: a transação não mexe em saldo nenhum além da taxa.
  assert.equal(msg.header.numReadonlySignedAccounts, 0);
  assert.equal(msg.accountKeys.length - 1 - msg.header.numReadonlyUnsignedAccounts, 0);

  const [ed, memo] = tx.instructions;
  assert.equal(tx.instructions.length, 2);
  assert.equal(ed.programId.toBase58(), "Ed25519SigVerify111111111111111111111111111");
  // Os dados do Ed25519 trazem a chave da pessoa, a assinatura e a mensagem.
  const data = Buffer.from(ed.data);
  assert.ok(data.includes(Buffer.from(person.publicKey.toBytes())));
  assert.ok(data.includes(Buffer.from(sig)));
  assert.ok(data.includes(Buffer.from(proofMessage(proof))));
  assert.ok(memo.programId.equals(MEMO_PROGRAM));
  assert.equal(memo.keys.length, 0);
  assert.equal(Buffer.from(memo.data).toString("utf8"), proofMemo(proof));
  // Cabe numa transação (1232 bytes).
  assert.ok(tx.serialize().length < 1232);
});
