import { useId } from "react";

type Props = { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean };

export function Switch({ checked, onChange, label, hint, disabled }: Props) {
  const id = useId();
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
        className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-50 ${checked ? "border-cyan bg-cyan" : "border-line bg-surface-2"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-5.5 rounded-full transition-transform duration-150 ${checked ? "translate-x-5 bg-ink" : "bg-muted"}`}
        />
      </button>
    </div>
  );
}
