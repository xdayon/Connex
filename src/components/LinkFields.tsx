import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TextField } from "./ui/TextField";
import { strings } from "../i18n/strings";
import { LINK_KEYS, type LinkKey } from "../lib/types";

const PRIMARY_COUNT = 6;

type Props = {
  values: Record<LinkKey, string>;
  errors: Partial<Record<LinkKey, string>>;
  onChange: (key: LinkKey, value: string) => void;
};

export function LinkFields({ values, errors, onChange }: Props) {
  const primary = LINK_KEYS.slice(0, PRIMARY_COUNT);
  const more = LINK_KEYS.slice(PRIMARY_COUNT);
  const [open, setOpen] = useState(() => more.some((k) => values[k].trim() !== ""));

  const field = (k: LinkKey) => (
    <TextField
      key={k}
      label={strings.me.linkLabels[k]}
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

  return (
    <div className="flex flex-col gap-4">
      {primary.map(field)}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-muted hover:text-text"
      >
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} aria-hidden />
        {strings.me.moreNetworks}
      </button>
      {open && more.map(field)}
    </div>
  );
}
