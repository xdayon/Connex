import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

export type { CountryCode };

export type Country = {
  code: CountryCode;
  dial: string;
  name: string; // inglês
  native: string; // no idioma principal do país (Россия, 日本, Brasil)
  flag: string;
  search: string; // tudo o que a busca aceita, já sem acento e em minúsculas
};

// Nomes informais que as pessoas digitam e que o Intl não devolve.
const ALIASES: Partial<Record<CountryCode, string>> = {
  US: "usa eua america estados unidos",
  GB: "uk england britain great britain inglaterra",
  AE: "uae emirados dubai",
  KR: "south korea coreia do sul",
  KP: "north korea",
  RU: "russia",
  NL: "holland holanda",
  CZ: "czech republic",
  CI: "ivory coast costa do marfim",
  VN: "viet nam",
};

export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function flagOf(code: string): string {
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

function regionNames(locale: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([locale], {
      type: "region",
      fallback: "none",
    });
  } catch {
    return null;
  }
}

// Idioma mais provável de cada país (und-RU -> ru-Cyrl-RU), sem tabela própria.
function nativeName(code: CountryCode): string | undefined {
  try {
    const lang = new Intl.Locale(`und-${code}`).maximize().language;
    if (!lang || lang === "und") return undefined;
    return regionNames(lang)?.of(code);
  } catch {
    return undefined;
  }
}

// Quando vários países dividem o código (+1, +44, +7...), este aparece primeiro.
const MAIN_FOR_DIAL = new Set<string>([
  "US",
  "GB",
  "RU",
  "NO",
  "AU",
  "IT",
  "FI",
  "MA",
  "FR",
  "CW",
  "SH",
]);

let cache: Country[] | null = null;

export function allCountries(): Country[] {
  if (cache) return cache;
  const en = regionNames("en");
  const ui =
    typeof navigator !== "undefined" ? regionNames(navigator.language) : null;
  cache = getCountries()
    .map((code) => {
      const name = en?.of(code) ?? code;
      const native = nativeName(code) ?? name;
      const local = ui?.of(code) ?? "";
      const dial = getCountryCallingCode(code);
      return {
        code,
        dial,
        name,
        native,
        flag: flagOf(code),
        search: fold(
          [name, native, local, code, ALIASES[code] ?? ""].join(" "),
        ),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  return cache;
}

export function findCountry(code: CountryCode): Country | undefined {
  return allCountries().find((c) => c.code === code);
}

export function searchCountries(query: string): Country[] {
  const q = fold(query.trim()).replace(/^\+/, "");
  if (!q) return allCountries();
  const digits = /^\d+$/.test(q);
  const hits = allCountries().filter((c) =>
    digits ? c.dial.startsWith(q) : c.search.includes(q),
  );
  // Código exato (país principal do código antes dos territórios) e começo do nome primeiro.
  const rank = (c: Country) =>
    digits
      ? c.dial === q
        ? MAIN_FOR_DIAL.has(c.code)
          ? 0
          : 1
        : 2
      : c.search.startsWith(q) || fold(c.native).startsWith(q)
        ? 0
        : 1;
  return hits.sort((a, b) => rank(a) - rank(b));
}

// País do aparelho (pt-BR -> BR; "ru" -> RU), com os EUA como último recurso.
export function guessCountry(): CountryCode {
  const known = new Set<string>(getCountries());
  const langs =
    typeof navigator !== "undefined"
      ? (navigator.languages ?? [navigator.language])
      : [];
  for (const l of langs) {
    try {
      const region = new Intl.Locale(l).maximize().region;
      if (region && known.has(region)) return region as CountryCode;
    } catch {
      /* locale inválido: tenta o próximo */
    }
  }
  return "US";
}

// "+447911123456" -> país + número local. Quando vários países dividem o DDI,
// fica o preferido (o já escolhido), senão o principal do código (+44 = Reino Unido).
export function splitPhone(
  full: string,
  prefer?: CountryCode,
): { country: CountryCode; national: string } | null {
  const p = parsePhoneNumberFromString(full);
  if (!p) return null;
  const same = getCountries().filter(
    (c) => getCountryCallingCode(c) === p.countryCallingCode,
  );
  const valid = same.filter((c) => isValidPhoneNumber(p.nationalNumber, c));
  const pool = valid.length ? valid : same;
  const country =
    (prefer && pool.includes(prefer) ? prefer : undefined) ??
    pool.find((c) => MAIN_FOR_DIAL.has(c)) ??
    p.country ??
    pool[0];
  return country ? { country, national: p.nationalNumber } : null;
}
