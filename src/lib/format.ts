export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;

export function relativeDate(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  if (abs < 60_000) return "just now";
  if (abs >= 7 * 86_400_000) {
    return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: abs > 300 * 86_400_000 ? "numeric" : undefined });
  }
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf!.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function suggestHandle(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

type BirthParts = { birth_day: number | null; birth_month: number | null; birth_year: number | null };

export function hasBirthday(p: BirthParts | null | undefined): boolean {
  return !!p && (p.birth_day != null || p.birth_month != null || p.birth_year != null);
}

// Mostra só o que existe: "12 March 1990", "12 March", "March 1990", "1990", "March".
export function formatBirthday(p: BirthParts): string {
  const month = p.birth_month != null ? new Date(2000, p.birth_month - 1, 1).toLocaleDateString("en", { month: "long" }) : null;
  return [p.birth_day, month, p.birth_year].filter((x) => x != null).join(" ");
}
