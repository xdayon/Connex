import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { ExternalLink } from "lucide-react";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { strings } from "../i18n/strings";
import { cluster } from "../lib/config";
import { shortAddress } from "../lib/format";
import { recordTip } from "../lib/notifications";
import { explorerTx } from "../lib/proofs";

const AMOUNTS = [0.01, 0.05, 0.1] as const;

type Props = { open: boolean; onClose: () => void; to: string; toUser: string; name: string };

// Gorjeta em SOL direto de carteira para carteira. O conneX não toca no dinheiro:
// monta a transferência, a carteira de quem envia assina e transmite.
export function TipSheet({ open, onClose, to, toUser, name }: Props) {
  const t = strings.tip;
  const { connection } = useConnection();
  const { publicKey, connected, connect, wallet, sendTransaction } = useWallet();
  const [amount, setAmount] = useState<number>(AMOUNTS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sig, setSig] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setError(null);
    setSig(null);
    onClose();
  };

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      let from = publicKey;
      if (!connected || !from) {
        if (!wallet) throw new Error(t.noWallet);
        await connect();
        from = wallet.adapter.publicKey;
      }
      if (!from) throw new Error(t.noWallet);
      const dest = new PublicKey(to);
      if (dest.equals(from)) throw new Error(t.self);
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);
      const balance = await connection.getBalance(from, "confirmed");
      // Folga para a taxa da rede (5 mil lamports por assinatura).
      if (balance < lamports + 10_000) throw new Error(t.lowBalance);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({ feePayer: from, blockhash, lastValidBlockHeight }).add(
        SystemProgram.transfer({ fromPubkey: from, toPubkey: dest, lamports }),
      );
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      void recordTip(signature, toUser);
      setSig(signature);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(/reject|declin|cancel/i.test(msg) ? t.cancelled : msg && (Object.values(t) as unknown[]).includes(msg) ? msg : t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title={t.title(name)}>
      {sig ? (
        <div className="flex flex-col gap-4">
          <p className="text-text">{t.sent(amount, name)}</p>
          <a
            href={explorerTx(sig)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-cyan underline-offset-2 hover:underline"
          >
            {t.viewTx}
            <ExternalLink size={14} aria-hidden />
          </a>
          <Button full onClick={close}>
            {strings.common.done}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t.hint(shortAddress(to))}</p>
          <div role="radiogroup" aria-label={t.amount} className="grid grid-cols-3 gap-2">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={amount === a}
                onClick={() => setAmount(a)}
                className={`min-h-12 rounded-2xl border font-mono text-sm transition ${
                  amount === a ? "border-cyan bg-cyan/15 text-cyan" : "border-line bg-surface text-text"
                }`}
              >
                {a} SOL
              </button>
            ))}
          </div>
          {cluster === "devnet" && <p className="text-xs text-lilac">{t.devnet}</p>}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button full loading={busy} onClick={send}>
            {t.send(amount)}
          </Button>
          <p className="text-xs text-muted">{t.irreversible}</p>
        </div>
      )}
    </Sheet>
  );
}
