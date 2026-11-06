import type { ConnectionWithContact } from "./types";

export type ReasonKind = "skill" | "event" | "offering" | "looking_for" | "headline" | "company" | "tag" | "note" | "name" | "location";
export type Reason = { kind: ReasonKind; label?: string };
export type SearchResult = { connection: ConnectionWithContact; score: number; reasons: Reason[] };

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
}

const STOPWORDS = new Set(
  (
    "who was that the a an guy girl person people someone anyone i met talked spoke at in on from with knew knows know does did do of for to about is are " +
    "were me my we looking had has have worked works work which what where when there and or " +
    "quem era eram aquele aquela cara mina pessoa pessoas alguem que eu conheci conversei falei la no na nos nas em do da dos das de com manjava manja " +
    "sabia sabe entende entendia trabalha trabalhava um uma uns umas o os as sobre para pra por e ou tem tinha foi minha meu qual onde quando ja"
  ).split(" "),
);

const SYNONYM_GROUPS: string[][] = [
  ["dev", "developer", "desenvolvedor", "desenvolvedora", "engineer", "programador", "programadora"],
  ["designer", "design", "ux", "ui"],
  ["founder", "fundador", "fundadora", "ceo", "cofounder"],
  ["investor", "investidor", "investidora", "vc", "fund"],
  ["marketing", "growth"],
  ["js", "javascript"],
  ["ts", "typescript"],
  ["py", "python"],
  ["web3", "crypto", "blockchain"],
];

const SYNONYMS = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) for (const w of group) SYNONYMS.set(w, group.filter((x) => x !== w));

type TimeRange = { from: number; to: number };

const DAY = 86_400_000;

function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(now: number): number {
  const sod = startOfDay(now);
  const dow = (new Date(sod).getDay() + 6) % 7;
  return sod - dow * DAY;
}

const TIME_PHRASES: { re: RegExp; range: (now: number) => TimeRange }[] = [
  { re: /\b(last week|semana passada)\b/, range: (n) => ({ from: startOfWeek(n) - 7 * DAY, to: startOfWeek(n) }) },
  { re: /\b(this week|essa semana|esta semana)\b/, range: (n) => ({ from: startOfWeek(n), to: Infinity }) },
  { re: /\b(yesterday|ontem)\b/, range: (n) => ({ from: startOfDay(n) - DAY, to: startOfDay(n) }) },
  { re: /\b(today|hoje)\b/, range: (n) => ({ from: startOfDay(n), to: Infinity }) },
];

export type ParsedQuery = { tokens: string[]; time: TimeRange | null };

export function parseQuery(query: string, now = Date.now()): ParsedQuery {
  let q = normalize(query).replace(/[^\p{L}\p{N}\s+#.-]/gu, " ");
  let time: TimeRange | null = null;
  for (const { re, range } of TIME_PHRASES) {
    if (re.test(q)) {
      time = time ?? range(now);
      q = q.replace(re, " ");
    }
  }
  const tokens = q
    .split(" ")
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((t) => t && !STOPWORDS.has(t));
  return { tokens: [...new Set(tokens)], time };
}

type Field = { kind: ReasonKind; weight: number; text: string; label: string };

function fieldsOf(c: ConnectionWithContact): Field[] {
  const p = c.contact;
  const out: Field[] = [];
  const add = (kind: ReasonKind, weight: number, value: string | null | undefined) => {
    const label = value?.trim();
    if (label) out.push({ kind, weight, text: normalize(label), label });
  };
  add("event", 5, c.event?.name);
  for (const s of p?.skills ?? []) add("skill", 5, s);
  for (const s of p?.offering ?? []) add("offering", 4, s);
  for (const s of p?.looking_for ?? []) add("looking_for", 3, s);
  add("headline", 3, p?.headline);
  add("company", 3, p?.company);
  for (const t of c.tags) add("tag", 4, t);
  add("note", 3, c.note);
  add("name", 6, p?.display_name);
  add("name", 6, p?.handle);
  add("location", 1, p?.location);
  return out;
}

function matchIndex(text: string, token: string): number {
  if (text.startsWith(token)) return 0;
  const wordHit = text.search(new RegExp(`[\\s\\p{P}]${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u"));
  if (wordHit >= 0) return wordHit + 1;
  if (token.length >= 4) return text.indexOf(token);
  return -1;
}

function snippet(original: string, text: string, token: string): string {
  const idx = Math.max(0, matchIndex(text, token));
  const start = Math.max(0, idx - 40);
  const end = Math.min(original.length, idx + token.length + 40);
  return `${start > 0 ? "…" : ""}${original.slice(start, end).trim()}${end < original.length ? "…" : ""}`;
}

function reasonFor(f: Field, token: string): Reason {
  switch (f.kind) {
    case "skill":
    case "event":
    case "offering":
    case "looking_for":
    case "company":
    case "tag":
      return { kind: f.kind, label: f.label };
    case "note":
      return { kind: "note", label: snippet(f.label, f.text, token) };
    default:
      return { kind: f.kind };
  }
}

export function searchConnections(connections: ConnectionWithContact[], query: string, now = Date.now()): SearchResult[] {
  const { tokens, time } = parseQuery(query, now);
  if (tokens.length === 0 && !time) return [];
  const results: SearchResult[] = [];

  for (const c of connections) {
    if (time) {
      const t = new Date(c.met_at).getTime();
      if (t < time.from || t >= time.to) continue;
    }
    const fields = fieldsOf(c);
    let score = 0;
    const reasons: Reason[] = [];
    const seen = new Set<string>();
    let ok = true;

    for (const token of tokens) {
      const variants = [token, ...(SYNONYMS.get(token) ?? [])];
      let best: { weight: number; reason: Reason } | null = null;
      for (const f of fields) {
        for (const v of variants) {
          if (matchIndex(f.text, v) < 0) continue;
          if (!best || f.weight > best.weight) best = { weight: f.weight, reason: reasonFor(f, v) };
          break;
        }
      }
      if (!best) {
        ok = false;
        break;
      }
      score += best.weight;
      const key = `${best.reason.kind}:${best.reason.label ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        reasons.push(best.reason);
      }
    }
    if (!ok) continue;

    if (c.verified) score += 1;
    const ageDays = Math.max(0, (now - new Date(c.met_at).getTime()) / DAY);
    score += Math.max(0, 1 - ageDays / 60);
    results.push({ connection: c, score, reasons: reasons.slice(0, 3) });
  }
  return results.sort((a, b) => b.score - a.score);
}

export function topSkills(connections: ConnectionWithContact[], max: number, minCount = 1): { skill: string; count: number }[] {
  const map = new Map<string, { skill: string; count: number }>();
  for (const c of connections) {
    const seen = new Set<string>();
    for (const s of c.contact?.skills ?? []) {
      const key = normalize(s);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const e = map.get(key) ?? { skill: s.trim(), count: 0 };
      e.count++;
      map.set(key, e);
    }
  }
  return [...map.values()]
    .filter((e) => e.count >= minCount)
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, max);
}
