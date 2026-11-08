import { useState } from "react";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { strings } from "../i18n/strings";
import { runProof } from "../lib/proofs";
import { proofErrorText } from "../lib/proofErrors";
import { useProofSigner } from "../lib/useProofSigner";

type Props = { open: boolean; onClose: () => void; eventId: string; token: string; onDone: () => void };

// Prova de presença: o QR do organizador traz um token que vale poucos segundos.
export function PresenceProofSheet({ open, onClose, eventId, token, onDone }: Props) {
  const t = strings.presence;
  const getSigner = useProofSigner();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const sign = async () => {
    setError(null);
    setBusy(true);
    try {
      const signer = await getSigner();
      await runProof({ kind: "attend", eventId, token }, signer);
      onDone();
    } catch (e) {
      const known: string[] = [strings.seal.noWallet, strings.seal.cantSign];
      setError(e instanceof Error && known.includes(e.message) ? e.message : proofErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title={t.proveTitle}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{t.explainer}</p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button full loading={busy} onClick={sign}>
          {t.sign}
        </Button>
      </div>
    </Sheet>
  );
}
