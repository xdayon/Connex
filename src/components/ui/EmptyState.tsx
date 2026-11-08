import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = { icon: LucideIcon; title: string; hint?: ReactNode; action?: ReactNode; className?: string };

export function EmptyState({ icon: Icon, title, hint, action, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-10 text-center ${className}`}>
      <div className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-lilac">
        <Icon size={28} aria-hidden />
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {hint && <p className="max-w-72 text-sm text-muted">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
