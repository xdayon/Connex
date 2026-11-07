import { BadgeCheck } from "lucide-react";
import { strings } from "../../i18n/strings";

type Props = { label?: boolean; className?: string; text?: string };

export function VerifiedBadge({ label = false, className = "", text = strings.ui.verified }: Props) {
  if (label) {
    return (
      <span title={strings.ui.verifiedHint} className={`inline-flex items-center gap-1 rounded-full bg-cyan/15 px-2.5 py-1 text-xs font-semibold text-cyan ${className}`}>
        <BadgeCheck size={14} aria-hidden />
        {text}
      </span>
    );
  }
  return (
    <span title={text} role="img" aria-label={text} className={`inline-flex text-cyan ${className}`}>
      <BadgeCheck size={16} />
    </span>
  );
}
