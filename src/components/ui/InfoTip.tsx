import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

type Props = { label: string; children: ReactNode; align?: "left" | "right" };

// Botão "i" que abre uma bolha com a explicação. Fecha ao tocar fora ou com Esc.
export function InfoTip({ label, children, align = "right" }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span ref={root} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`-m-3 inline-flex size-11 items-center justify-center rounded-full transition hover:text-text ${open ? "text-cyan" : "text-muted"}`}
      >
        <Info size={15} aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className={`anim-reveal absolute top-full z-20 mt-3 w-64 max-w-[calc(100vw-3rem)] rounded-2xl border border-line bg-surface-2 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-text shadow-lg shadow-black/30 ${align === "right" ? "-right-3" : "-left-3"}`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
