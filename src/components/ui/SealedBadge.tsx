import { ShieldCheck } from "lucide-react";
import { strings } from "../../i18n/strings";

type Props = { label?: boolean; className?: string; text?: string };

export function SealedBadge({ label = false, className = "", text = strings.seal.sealedBadge }: Props) {
  if (label) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-lilac/15 px-2.5 py-1 text-xs font-semibold text-lilac ${className}`}>
        <ShieldCheck size={14} aria-hidden />
        {text}
      </span>
    );
  }
  return (
    <span title={text} role="img" aria-label={text} className={`inline-flex text-lilac ${className}`}>
      <ShieldCheck size={16} />
    </span>
  );
}
