import { lazy, Suspense, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BrandIcon } from "./BrandIcon";
import { TextField } from "./ui/TextField";
import { Switch } from "./ui/Switch";
import { strings } from "../i18n/strings";
import { shortAddress } from "../lib/format";
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

export function LinkFields({
  values,
  errors,
  onChange,
  hidden,
  onHiddenChange,
  wallet,
}: Props) {
  const primary = LINK_KEYS.slice(0, PRIMARY_COUNT);
  const more = LINK_KEYS.slice(PRIMARY_COUNT);
  const [open, setOpen] = useState(() =>
    more.some((k) => values[k].trim() !== ""),
  );

  const setShared = (k: ShareKey, on: boolean) => {
    const rest = hidden.filter((h) => h !== k);
    onHiddenChange(on ? rest : [...rest, k]);
  };

  const label = (k: LinkKey) => (
    <span className="inline-flex items-center gap-2">
      <BrandIcon k={k} size={16} />
      {strings.me.linkLabels[k]}
    </span>
  );

  const input = (k: LinkKey) =>
    k === "whatsapp" ? (
      <Suspense
        fallback={
          <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />
        }
      >
        <WhatsAppField
          label={label(k)}
          value={values[k]}
          error={errors[k]}
          onChange={(v) => onChange(k, v)}
        />
      </Suspense>
    ) : (
      <TextField
        label={label(k)}
        value={values[k]}
        maxLength={300}
        placeholder={strings.me.linkPlaceholders[k]}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        error={errors[k]}
        onChange={(e) => onChange(k, e.target.value)}
      />
    );

  const field = (k: LinkKey) => (
    <div key={k} className="flex flex-col">
      {input(k)}
      {values[k].trim() !== "" && (
        <Switch
          checked={!hidden.includes(k)}
          onChange={(v) => setShared(k, v)}
          label={strings.me.shareDefaultSwitch(strings.me.linkLabels[k])}
        />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {primary.map(field)}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-muted hover:text-text"
      >
        <ChevronDown
          size={16}
          className={`transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        {strings.me.moreNetworks}
      </button>
      {open && more.map(field)}
      {wallet && (
        <div className="flex items-center gap-3 border-t border-line pt-3">
          <BrandIcon k="wallet" size={20} />
          <div className="min-w-0 flex-1">
            <Switch
              checked={!hidden.includes("wallet")}
              onChange={(v) => setShared("wallet", v)}
              label={strings.me.linkLabels.wallet}
              hint={shortAddress(wallet)}
            />
          </div>
        </div>
      )}
      <p className="text-xs text-muted">{strings.me.shareDefaultHint}</p>
    </div>
  );
}
