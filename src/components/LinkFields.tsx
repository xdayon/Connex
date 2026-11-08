import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { BrandIcon } from "./BrandIcon";
import { Switch } from "./ui/Switch";
import { strings } from "../i18n/strings";
import { shortAddress } from "../lib/format";
import { LINK_PREFIX } from "../lib/links";
import { LINK_KEYS, type LinkKey, type ShareKey } from "../lib/types";

const PRIMARY_COUNT = 6;

// libphonenumber só carrega quando o formulário de redes abre.
const WhatsAppField = lazy(() => import("./WhatsAppField"));

type Props = {
  values: Record<LinkKey, string>;
  errors: Partial<Record<LinkKey, string>>;
  onChange: (key: LinkKey, value: string) => void;
  hidden: ShareKey[];
  onHiddenChange: (hidden: ShareKey[]) => void;
  wallet?: string | null;
};

const URL_KEYS: LinkKey[] = ["website", "calendar"];

function Row({ icon, children, toggle }: { icon: ReactNode; children: ReactNode; toggle?: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex h-11 w-6 shrink-0 items-center justify-center text-text">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {toggle}
    </div>
  );
}

export function LinkFields({ values, errors, onChange, hidden, onHiddenChange, wallet }: Props) {
  const primary = LINK_KEYS.slice(0, PRIMARY_COUNT);
  const more = LINK_KEYS.slice(PRIMARY_COUNT);
  const filledMore = more.filter((k) => values[k].trim() !== "").length;
  const [open, setOpen] = useState(false);
  // Erro numa rede de "Mais redes": abre a seção, senão o erro fica escondido e o salvar parece não fazer nada.
  const moreHasError = more.some((k) => errors[k]);
  useEffect(() => {
    if (moreHasError) setOpen(true);
  }, [moreHasError]);

  const setShared = (k: ShareKey, on: boolean) => {
    const rest = hidden.filter((h) => h !== k);
    onHiddenChange(on ? rest : [...rest, k]);
  };

  const toggleFor = (k: ShareKey) => (
    <Switch compact checked={!hidden.includes(k)} onChange={(v) => setShared(k, v)} label={strings.me.shareDefaultSwitch(strings.me.linkLabels[k])} />
  );

  const field = (k: LinkKey) => {
    const hasValue = values[k].trim() !== "";
    const error = errors[k];
    const label = strings.me.linkLabels[k];
    const prefix = LINK_PREFIX[k];

    if (k === "whatsapp") {
      return (
        <Row key={k} icon={<BrandIcon k={k} size={20} />} toggle={hasValue ? toggleFor(k) : undefined}>
          <Suspense fallback={<div className="h-12 animate-pulse rounded-2xl bg-surface-2" />}>
            <WhatsAppField label={<span className="sr-only">{label}</span>} value={values[k]} error={error} onChange={(v) => onChange(k, v)} />
          </Suspense>
        </Row>
      );
    }

    const errId = `link-${k}-err`;
    return (
      <Row key={k} icon={<BrandIcon k={k} size={20} />} toggle={hasValue ? toggleFor(k) : undefined}>
        <div
          className={`flex min-h-12 items-center rounded-2xl border bg-surface-2 px-3 transition focus-within:border-cyan ${error ? "border-danger" : "border-line"}`}
        >
          {prefix && (
            <span className="mr-0.5 select-none font-mono text-base text-muted" aria-hidden>
              {prefix}
            </span>
          )}
          <input
            value={values[k]}
            maxLength={300}
            aria-label={label}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
            placeholder={strings.me.linkPlaceholders[k]}
            inputMode={URL_KEYS.includes(k) ? "url" : "text"}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => onChange(k, e.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-text placeholder:text-muted/70 focus:outline-none"
          />
        </div>
        {error && (
          <p id={errId} className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </Row>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">{strings.me.shareDefaultHint}</p>
      <div className="-mb-1 flex justify-end pr-0.5" aria-hidden>
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">{strings.me.shareColumn}</span>
      </div>
      {wallet && (
        <Row icon={<BrandIcon k="wallet" size={20} />} toggle={toggleFor("wallet")}>
          <div className="flex min-h-11 items-center gap-2">
            <span className="text-sm font-medium">{strings.me.linkLabels.wallet}</span>
            <span className="font-mono text-sm text-muted">{shortAddress(wallet)}</span>
          </div>
        </Row>
      )}
      {primary.map(field)}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-muted hover:text-text"
      >
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} aria-hidden />
        {filledMore > 0 ? strings.me.moreNetworksAdded(filledMore) : strings.me.moreNetworks}
      </button>
      {open && <div className="anim-reveal flex flex-col gap-2">{more.map(field)}</div>}
    </div>
  );
}
