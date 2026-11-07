import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { isValidPhoneNumber } from "libphonenumber-js/min";
import { Sheet } from "./ui/Sheet";
import { strings } from "../i18n/strings";
import {
  findCountry,
  guessCountry,
  searchCountries,
  splitPhone,
  type CountryCode,
} from "../lib/countries";

const t = strings.me.whatsapp;

type Props = {
  label: ReactNode;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

// O valor salvo é https://wa.me/<DDI+número>; aqui ele vira país + número local.
function parse(value: string): { country: CountryCode; national: string } {
  const digits = value
    .replace(/^https?:\/\/(wa\.me|api\.whatsapp\.com\/send\?phone=)\/?/i, "")
    .replace(/\D/g, "");
  const home = guessCountry();
  return (
    (digits && splitPhone(`+${digits}`, home)) || {
      country: home,
      national: "",
    }
  );
}

export default function WhatsAppField({
  label,
  value,
  error,
  onChange,
}: Props) {
  const id = useId();
  const [initial] = useState(() => parse(value));
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [picking, setPicking] = useState(false);
  const emitted = useRef(value);

  // O pai trocou o valor por conta própria (ex.: depois de salvar): relê.
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    const p = parse(value);
    setCountry(p.country);
    setNational(p.national);
  }, [value]);

  const c = findCountry(country);
  const dial = c?.dial ?? "";

  const emit = (cc: CountryCode, nat: string) => {
    const digits = nat.replace(/\D/g, "");
    const next = digits ? `+${findCountry(cc)?.dial ?? ""}${digits}` : "";
    emitted.current = next;
    onChange(next);
  };

  const onNumber = (raw: string) => {
    // Colou o número completo com +DDI: descobre o país sozinho.
    if (raw.trim().startsWith("+")) {
      const full = `+${raw.replace(/\D/g, "")}`;
      const p = splitPhone(full, country);
      if (p) {
        setCountry(p.country);
        setNational(p.national);
        emit(p.country, p.national);
      } else {
        // Ainda digitando o +DDI: mostra como está até dar para reconhecer o país.
        setNational(raw.replace(/[^\d\s+().-]/g, ""));
        emitted.current = full.length > 1 ? full : "";
        onChange(emitted.current);
      }
      return;
    }
    const clean = raw.replace(/[^\d\s().-]/g, "");
    setNational(clean);
    emit(country, clean);
  };

  const digits = national.replace(/\D/g, "");
  const valid = digits !== "" && isValidPhoneNumber(digits, country);
  const hint =
    error ??
    (digits.length >= 6 && !valid ? t.check(c?.name ?? country) : null);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label={t.countryButton(c?.name ?? country, dial)}
          className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-line bg-surface-2 px-3 text-base transition hover:border-muted/60 focus:border-cyan focus:outline-none"
        >
          <span className="text-xl leading-none" aria-hidden>
            {c?.flag}
          </span>
          <span className="font-mono text-sm">+{dial}</span>
          <ChevronDown size={14} className="text-muted" aria-hidden />
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          maxLength={20}
          placeholder={t.numberPlaceholder}
          aria-invalid={!!hint}
          aria-describedby={`${id}-desc`}
          onChange={(e) => onNumber(e.target.value)}
          className={`min-h-12 w-full min-w-0 rounded-2xl border bg-surface-2 px-4 text-base text-text placeholder:text-muted/70 transition focus:border-cyan focus:outline-none ${hint ? "border-danger" : "border-line"}`}
        />
      </div>
      <p
        id={`${id}-desc`}
        className={`text-xs ${hint ? "text-danger" : "text-muted"}`}
      >
        {hint ??
          (valid ? (
            <span className="font-mono">wa.me/{dial + digits}</span>
          ) : (
            t.hint
          ))}
      </p>
      <CountryPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(code) => {
          setCountry(code);
          setPicking(false);
          emit(code, national);
        }}
        current={country}
      />
    </div>
  );
}

function CountryPicker({
  open,
  onClose,
  onPick,
  current,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (c: CountryCode) => void;
  current: CountryCode;
}) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => (open ? searchCountries(q) : []), [open, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    // O Sheet foca o painel depois de abrir; a busca pega o foco no quadro seguinte.
    const r = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(r);
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title={t.pickTitle}>
      <div className="sticky -top-5 z-10 -mx-5 -mt-1 bg-surface px-5 pb-3 pt-1">
        <label className="relative block">
          <span className="sr-only">{t.searchLabel}</span>
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onKeyDown={(e) => {
              if (e.key === "Enter" && list[0]) onPick(list[0].code);
            }}
            className="min-h-12 w-full rounded-2xl border border-line bg-surface-2 pl-11 pr-4 text-base text-text placeholder:text-muted/70 focus:border-cyan focus:outline-none"
          />
        </label>
      </div>
      <div className="min-h-[60dvh]">
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t.noResults}</p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {list.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => onPick(c.code)}
                  aria-current={c.code === current}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left transition hover:bg-surface-2 ${c.code === current ? "bg-surface-2" : ""}`}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {c.flag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {c.name}
                    </span>
                    {c.native !== c.name && (
                      <span className="block truncate text-xs text-muted">
                        {c.native}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-sm ${c.code === current ? "text-cyan" : "text-muted"}`}
                  >
                    +{c.dial}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
