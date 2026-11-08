import { useId } from "react";

type Props = { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean; compact?: boolean };

const track = (checked: boolean) =>
  `relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-50 ${checked ? "border-cyan bg-cyan" : "border-line bg-surface-2"}`;
const thumb = (checked: boolean) =>
  `absolute left-0.5 top-0.5 size-5.5 rounded-full transition-transform duration-150 ${checked ? "translate-x-5 bg-ink" : "bg-muted"}`;

export function Switch({ checked, onChange, label, hint, disabled, compact }: Props) {
  const id = useId();
  // Versão compacta: só o botão (área de toque de 44px), com o nome no aria-label.
  if (compact) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center disabled:opacity-50"
      >
        <span className={track(checked)}>
          <span className={thumb(checked)} />
        </span>
      </button>
    );
  }
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div className="min-w-0">
        <p id={id} className="text-sm font-medium">
          {label}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={track(checked)}
      >
        <span className={thumb(checked)} />
      </button>
    </div>
  );
}
