import { useState } from "react";
import { Check, ExternalLink, ShieldCheck } from "lucide-react";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { InfoTip } from "./ui/InfoTip";
import { useToast } from "./ui/Toast";
import { strings } from "../i18n/strings";
import { formatDateTime } from "../lib/format";
import { explorerTx, runProof } from "../lib/proofs";
import { proofErrorText } from "../lib/proofErrors";
import { useProofSigner } from "../lib/useProofSigner";
import type { Seal } from "../lib/useSeal";

type Person = { name: string; avatar?: string | null };
type Props = { seal: Seal; contactId: string; me: Person; contact: Person; className?: string };

function TxLink({ sig, children }: { sig: string | null | undefined; children: string }) {
  if (!sig) return null;
  return (
    <a href={explorerTx(sig)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-cyan underline-offset-2 hover:underline">
      {children}
      <ExternalLink size={14} aria-hidden />
    </a>
  );
}

// Uma das duas metades do selo: a foto da pessoa, com um visto quando ela já assinou.
function Half({ person, done, tone }: { person: Person; done: boolean; tone: "lilac" | "cyan" }) {
  const ring = done ? (tone === "lilac" ? "ring-lilac" : "ring-cyan") : "ring-line";
  return (
    <div className="flex w-16 flex-col items-center gap-1.5">
      <span className="relative">
        <Avatar src={person.avatar} name={person.name} size="md" className={`ring-2 ring-offset-2 ring-offset-surface transition ${ring} ${done ? "" : "opacity-60"}`} />
        {done && (
          <span className={`anim-pop-now absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full text-ink ring-2 ring-surface ${tone === "lilac" ? "bg-lilac" : "bg-cyan"}`}>
            <Check size={12} strokeWidth={3} aria-hidden />
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-xs text-muted">{person.name}</span>
    </div>
  );
}

// Selo de encontro na Solana, feito a dois: cada pessoa assina a sua metade no próprio celular
// e as duas veem o progresso da outra ao vivo.
export function SealPanel({ seal, contactId, me, contact, className = "" }: Props) {
  const t = strings.seal;
  const toast = useToast();
  const getSigner = useProofSigner();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state, mine, theirs } = seal;
  if (!seal.enabled) return null;

  const a = state === "mine" || state === "sealed";
  const b = state === "theirs" || state === "sealed";
  const firstName = contact.name.split(/\s+/)[0] || contact.name;

  const sign = async () => {
    setError(null);
    setBusy(true);
    try {
      const signer = await getSigner();
      await runProof({ kind: "meet", contactId }, signer);
      await seal.reload();
      if (b) toast(t.done, "success");
    } catch (e) {
      setError(e instanceof Error && (e.message === t.noWallet || e.message === t.cantSign) ? e.message : proofErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const sealedAt = [mine?.confirmed_at, theirs?.confirmed_at].filter(Boolean).sort().pop();
  const status =
    state === "sealed" ? (sealedAt ? t.sealedOn(formatDateTime(sealedAt)) : t.sealedBadge) : state === "mine" ? t.mine(firstName) : state === "theirs" ? t.theirs(firstName) : t.hint;

  return (
    <section aria-label={t.title} className={`rounded-card border border-lilac/25 bg-linear-to-b from-lilac/8 to-cyan/4 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-base font-semibold">
          <ShieldCheck size={18} className="text-lilac" aria-hidden />
          {state === "sealed" ? t.sealedBadge : t.title}
        </p>
        <InfoTip label={t.infoLabel}>
          {t.explainer.map((line) => (
            <span key={line} className="block [&+&]:mt-1.5">
              {line}
            </span>
          ))}
        </InfoTip>
      </div>

      <div className="mt-4 flex items-start justify-center gap-2" aria-hidden>
        <Half person={{ ...me, name: t.you }} done={a} tone="lilac" />
        <div className="relative mt-5.5 h-0.5 flex-1 overflow-hidden rounded-full bg-line">
          <span className={`absolute inset-y-0 left-0 bg-lilac transition-all duration-500 ${a ? "w-1/2" : "w-0"}`} />
          <span className={`absolute inset-y-0 right-0 bg-cyan transition-all duration-500 ${b ? "w-1/2" : "w-0"}`} />
          {state === "mine" && <span className="anim-wait absolute inset-y-0 left-1/2 w-1/4 bg-linear-to-r from-lilac/0 via-cyan/70 to-cyan/0" />}
        </div>
        <Half person={{ ...contact, name: firstName }} done={b} tone="cyan" />
      </div>

      <p className="mt-3 text-center text-sm text-muted" aria-live="polite">
        {status}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-danger">
          {error}
        </p>
      )}

      {(state === "none" || state === "theirs") && (
        <Button full className="mt-4" loading={busy} icon={<ShieldCheck size={18} aria-hidden />} onClick={() => void sign()}>
          {state === "theirs" ? t.signHalf : t.button}
        </Button>
      )}

      {(state === "mine" || state === "sealed") && (
        <div className="mt-1 flex flex-wrap justify-center gap-x-4">
          <TxLink sig={mine?.signature}>{t.yourTx}</TxLink>
          <TxLink sig={theirs?.signature}>{t.theirTx}</TxLink>
        </div>
      )}
    </section>
  );
}
