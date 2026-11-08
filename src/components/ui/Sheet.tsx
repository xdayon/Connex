import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { strings } from "../../i18n/strings";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; hideTitle?: boolean };

const focusable = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const EXIT_MS = 180;

export function Sheet({ open, onClose, title, children, hideTitle }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  // Continua montado por EXIT_MS depois de fechar, para a animação de saída.
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => window.clearTimeout(id);
  }, [open, mounted]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(focusable));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-end justify-center ${closing ? "pointer-events-none" : ""}`}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={strings.common.close}
        className={`${closing ? "anim-fade-out" : "anim-fade"} absolute inset-0 bg-black/70 backdrop-blur-[2px]`}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`${closing ? "anim-sheet-out" : "anim-sheet"} relative max-h-[90dvh] w-full max-w-120 overflow-y-auto overscroll-contain rounded-t-3xl border border-b-0 border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] outline-none`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          {hideTitle ? <span /> : <h2 className="font-display text-xl font-bold">{title}</h2>}
          <button
            type="button"
            aria-label={strings.common.close}
            onClick={onClose}
            className="-mr-2 -mt-1 inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-text"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
