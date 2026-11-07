import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, Share2 } from "lucide-react";
import { BrandIcon } from "./BrandIcon";
import { Switch } from "./ui/Switch";
import { strings } from "../i18n/strings";
import type { ShareSelection } from "../lib/useShareSelection";

const t = strings.share;

export function ShareSelector({ selection }: { selection: ShareSelection }) {
  const [open, setOpen] = useState(false);
  const { available, selected, isCustom, toggle, reset } = selection;

  if (available.length === 0) {
    return (
      <div className="flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 text-sm">
        <span className="text-muted">{t.noLinks}</span>
        <Link to="/profile" className="inline-flex min-h-11 shrink-0 items-center font-medium text-cyan underline-offset-4 hover:underline">
          {t.addLinks}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full rounded-card border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center gap-3 p-3 text-left"
      >
        <Share2 size={18} className="shrink-0 text-cyan" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {t.sharing}: <span className={isCustom ? "text-lilac" : "text-cyan"}>{isCustom ? t.modeCustom : t.modeDefault}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-text">
            {selected.length === 0 ? (
              <span className="text-xs text-muted">{t.nothingSelected}</span>
            ) : (
              selected.map((k) => <BrandIcon key={k} k={k} size={16} />)
            )}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted">
          {open ? t.done : t.adjust}
          <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>
      {open && (
        <div className="flex flex-col border-t border-line px-3 pb-3 pt-1">
          <ul className="divide-y divide-line">
            {available.map((k) => (
              <li key={k} className="flex items-center gap-3">
                <BrandIcon k={k} size={20} className="text-text" />
                <div className="min-w-0 flex-1">
                  <Switch checked={selected.includes(k)} onChange={(v) => toggle(k, v)} label={strings.me.linkLabels[k]} />
                </div>
              </li>
            ))}
          </ul>
          {isCustom && (
            <button
              type="button"
              onClick={reset}
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-medium text-text hover:border-muted/60"
            >
              {t.backToDefault}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
