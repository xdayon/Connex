import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  empty: string;
  emptyHint: string;
  children?: ReactNode;
};

export function PagePlaceholder({ title, description, icon: Icon, empty, emptyHint, children }: Props) {
  return (
    <section>
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">{title}</h1>
      <p className="mt-1 text-muted">{description}</p>
      {children}
      <div className="mt-6 flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-violet">
          <Icon size={28} />
        </div>
        <p className="font-display text-lg font-semibold">{empty}</p>
        <p className="text-sm text-muted">{emptyHint}</p>
      </div>
    </section>
  );
}
