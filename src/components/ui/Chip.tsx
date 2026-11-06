import type { ReactNode } from "react";
import { X } from "lucide-react";
import { strings } from "../../i18n/strings";

type Props = {
  children: ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
};

export function Chip({ children, onRemove, onClick, selected = false, className = "" }: Props) {
  const tone = selected ? "border-volt bg-volt text-ink" : "border-line bg-surface-2 text-text";
  const cls = `inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-sm ${tone} ${className}`;
  if (onClick) {
    return (
      <button type="button" aria-pressed={selected} onClick={onClick} className={`${cls} min-h-9 transition active:scale-95`}>
        {children}
      </button>
    );
  }
  return (
    <span className={cls}>
      <span className="min-w-0 break-words">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={strings.common.remove}
          className="-mr-1.5 inline-flex size-7 items-center justify-center rounded-full text-muted hover:text-text"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}
