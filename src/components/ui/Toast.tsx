import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Kind = "success" | "error" | "info";
type Item = { id: number; kind: Kind; message: string };
type ToastFn = (message: string, kind?: Kind) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
const tones: Record<Kind, string> = { success: "text-volt", error: "text-danger", info: "text-violet" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(0);

  const toast = useCallback<ToastFn>((message, kind = "info") => {
    const id = next.current++;
    setItems((list) => [...list.slice(-2), { id, kind, message }]);
    window.setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), kind === "error" ? 5000 : 3200);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-120 flex-col gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]"
      >
        {items.map(({ id, kind, message }) => {
          const Icon = icons[kind];
          return (
            <div key={id} className="anim-toast pointer-events-auto flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 shadow-xl">
              <Icon size={20} className={`shrink-0 ${tones[kind]}`} aria-hidden />
              <p className="text-sm">{message}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
