import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

type FieldProps = { label?: ReactNode; hint?: string; error?: string | null; value?: string; maxLength?: number };

const inputClass =
  "w-full rounded-2xl border bg-surface-2 px-4 text-base text-text placeholder:text-muted/70 transition focus:border-cyan focus:outline-none disabled:opacity-60";

function Shell({
  id,
  label,
  hint,
  error,
  counter,
  children,
}: {
  id: string;
  label?: ReactNode;
  hint?: string;
  error?: string | null;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      {children}
      {(error || hint || counter) && (
        <div className="flex justify-between gap-3 text-xs">
          <span id={`${id}-desc`} className={error ? "text-danger" : "text-muted"}>
            {error || hint}
          </span>
          {counter && <span className="shrink-0 font-mono text-muted">{counter}</span>}
        </div>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  className = "",
  ...rest
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "value"> & { className?: string }) {
  const id = useId();
  const len = rest.value?.length ?? 0;
  return (
    <Shell id={id} label={label} hint={hint} error={error} counter={rest.maxLength ? `${len}/${rest.maxLength}` : undefined}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-desc` : undefined}
        className={`${inputClass} min-h-12 ${error ? "border-danger" : "border-line"} ${className}`}
        {...rest}
      />
    </Shell>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className = "",
  ...rest
}: FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value"> & { className?: string }) {
  const id = useId();
  const len = rest.value?.length ?? 0;
  return (
    <Shell id={id} label={label} hint={hint} error={error} counter={rest.maxLength ? `${len}/${rest.maxLength}` : undefined}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-desc` : undefined}
        className={`${inputClass} resize-none py-3 ${error ? "border-danger" : "border-line"} ${className}`}
        {...rest}
      />
    </Shell>
  );
}
