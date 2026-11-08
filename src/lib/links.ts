import type { LinkKey, Links } from "./types.ts";
import { LINK_KEYS } from "./types.ts";

type HandleKey = Exclude<LinkKey, "website" | "calendar" | "discord" | "whatsapp">;

type HandleSpec = {
  // Texto fixo mostrado dentro do campo, antes do que a pessoa digita.
  prefix: string;
  // Aceita só o handle, sem URL.
  re: RegExp;
  // Hosts que valem para esta rede (com www., países, etc.).
  host: RegExp;
  // Pega o handle no caminho da URL (grupo 1).
  path: RegExp;
  // Tira prefixos que a pessoa pode digitar junto (ex.: u/ no Reddit).
  strip?: RegExp;
  lower?: boolean;
  url: (h: string) => string;
};

const FIRST_SEGMENT = /^\/@?([^/]+)\/?$/;

const SPECS: Record<HandleKey, HandleSpec> = {
  telegram: { prefix: "@", re: /^[A-Za-z0-9_]{5,32}$/, host: /^(?:www\.)?(?:t|telegram)\.me$/, path: FIRST_SEGMENT, url: (h) => `https://t.me/${h}` },
  x: { prefix: "@", re: /^[A-Za-z0-9_]{1,15}$/, host: /^(?:www\.|mobile\.)?(?:x|twitter)\.com$/, path: FIRST_SEGMENT, url: (h) => `https://x.com/${h}` },
  github: { prefix: "@", re: /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/, host: /^(?:www\.)?github\.com$/, path: /^\/([^/]+)\/?$/, url: (h) => `https://github.com/${h}` },
  linkedin: {
    prefix: "in/",
    re: /^[A-Za-z0-9_%-]{3,100}$/,
    host: /^(?:www\.|[a-z]{2,3}\.)?linkedin\.com$/,
    path: /^\/in\/([^/]+)\/?$/,
    strip: /^\/?in\//i,
    url: (h) => `https://www.linkedin.com/in/${h}`,
  },
  instagram: { prefix: "@", re: /^[A-Za-z0-9._]{1,30}$/, host: /^(?:www\.)?instagram\.com$/, path: FIRST_SEGMENT, url: (h) => `https://www.instagram.com/${h}` },
  tiktok: { prefix: "@", re: /^[A-Za-z0-9._]{2,24}$/, host: /^(?:www\.)?tiktok\.com$/, path: /^\/@([^/]+)\/?$/, url: (h) => `https://www.tiktok.com/@${h}` },
  farcaster: {
    prefix: "@",
    re: /^[a-z0-9][a-z0-9-]{0,15}(?:\.eth)?$/,
    host: /^(?:www\.)?(?:farcaster\.xyz|warpcast\.com)$/,
    path: FIRST_SEGMENT,
    lower: true,
    url: (h) => `https://farcaster.xyz/${h}`,
  },
  superteam: { prefix: "@", re: /^[A-Za-z0-9_-]{1,60}$/, host: /^earn\.superteam\.fun$/, path: /^\/t\/([^/]+)\/?$/, url: (h) => `https://earn.superteam.fun/t/${h}` },
  youtube: { prefix: "@", re: /^[A-Za-z0-9._-]{3,30}$/, host: /^(?:www\.|m\.)?youtube\.com$/, path: /^\/@([^/]+)\/?$/, url: (h) => `https://www.youtube.com/@${h}` },
  twitch: { prefix: "@", re: /^[A-Za-z0-9_]{4,25}$/, host: /^(?:www\.)?twitch\.tv$/, path: /^\/([^/]+)\/?$/, url: (h) => `https://www.twitch.tv/${h}` },
  reddit: {
    prefix: "u/",
    re: /^[A-Za-z0-9_-]{3,20}$/,
    host: /^(?:www\.|old\.)?reddit\.com$/,
    path: /^\/(?:user|u)\/([^/]+)\/?$/,
    strip: /^\/?u(?:ser)?\//i,
    url: (h) => `https://www.reddit.com/user/${h}`,
  },
  // Bluesky: o handle tem pontos (ana.bsky.social), então não pode cair na regra de domínio.
  bluesky: {
    prefix: "@",
    re: /^(?=.{1,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/,
    host: /^(?:www\.)?bsky\.app$/,
    path: /^\/profile\/([^/]+)\/?$/,
    lower: true,
    url: (h) => `https://bsky.app/profile/${h}`,
  },
  // SteamID64 (17 dígitos) vira /profiles/; qualquer outro nome é URL personalizada (/id/).
  steam: {
    prefix: "",
    re: /^[A-Za-z0-9._-]{1,60}$/,
    host: /^steamcommunity\.com$/,
    path: /^\/(?:id|profiles)\/([^/]+)\/?$/,
    url: (h) => (/^\d{17}$/.test(h) ? `https://steamcommunity.com/profiles/${h}` : `https://steamcommunity.com/id/${h}`),
  },
};

function specOf(key: LinkKey): HandleSpec | null {
  return key in SPECS ? SPECS[key as HandleKey] : null;
}

// Prefixo fixo exibido dentro do campo de cada rede ("@", "in/", "u/").
export const LINK_PREFIX: Partial<Record<LinkKey, string>> = Object.fromEntries(
  Object.entries(SPECS).map(([k, v]) => [k, v.prefix]),
);

// Redes em que a pessoa digita só o handle e o Connex monta a URL.
export function isHandleKey(key: LinkKey): boolean {
  return key in SPECS;
}

function handleFromPath(spec: HandleSpec, pathname: string): string | null {
  const m = pathname.match(spec.path);
  if (!m) return null;
  let h = m[1];
  if (spec.lower) h = h.toLowerCase();
  return spec.re.test(h) ? h : null;
}

// WhatsApp: número com DDI (8 a 15 dígitos), aceita espaços, traços, parênteses e "+".
function whatsappLink(v: string): string | null {
  const m = v.match(/^https:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?\+?(\d{8,15})\/?$/i);
  if (m) return `https://wa.me/${m[1]}`;
  if (!/^\+?[\d\s().-]+$/.test(v)) return null;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

const DISCORD_USER_RE = /^[a-z0-9_.]{2,32}$/;

export type LinkResult = { ok: true; value: string | null } | { ok: false };

function handleLink(spec: HandleSpec, input: string): LinkResult {
  let v = input.replace(/^@/, "");
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v);
  const startsWithHost = !hasScheme && spec.host.test(v.split(/[/?#]/, 1)[0].toLowerCase());
  if (hasScheme || startsWithHost) {
    v = hasScheme ? v.replace(/^http:\/\//i, "https://") : `https://${v}`;
    let u: URL;
    try {
      u = new URL(v);
    } catch {
      return { ok: false };
    }
    if (u.protocol !== "https:" || !spec.host.test(u.hostname)) return { ok: false };
    const h = handleFromPath(spec, u.pathname);
    if (h) return { ok: true, value: spec.url(h) };
    return v.length <= 300 ? { ok: true, value: v } : { ok: false };
  }
  if (spec.strip) v = v.replace(spec.strip, "");
  if (spec.lower) v = v.toLowerCase();
  if (!spec.re.test(v)) return { ok: false };
  const url = spec.url(v);
  return url.length <= 300 ? { ok: true, value: url } : { ok: false };
}

export function normalizeLink(key: LinkKey, input: string): LinkResult {
  let v = input.trim();
  if (!v) return { ok: true, value: null };
  if (key === "whatsapp") {
    const url = whatsappLink(v.replace(/^http:\/\//i, "https://"));
    return url ? { ok: true, value: url } : { ok: false };
  }
  const spec = specOf(key);
  if (spec) return handleLink(spec, v);
  if (/\s/.test(v)) return { ok: false };
  if (key === "discord") {
    const name = v.replace(/^@/, "").toLowerCase();
    if (DISCORD_USER_RE.test(name)) return { ok: true, value: name };
  }
  if (/^http:\/\//i.test(v)) v = `https://${v.slice(7)}`;
  if (!/^https:\/\//i.test(v) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v)) v = `https://${v}`;
  if (!/^https:\/\//i.test(v)) return { ok: false };
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || !u.hostname.includes(".")) return { ok: false };
  } catch {
    return { ok: false };
  }
  return v.length <= 300 ? { ok: true, value: v } : { ok: false };
}

// URL salva -> o que aparece no campo (só o handle). Se não der para extrair, devolve o valor como está.
export function linkDisplayValue(key: LinkKey, stored: string | null | undefined): string {
  if (!stored) return "";
  const spec = specOf(key);
  if (!spec || !/^https:\/\//i.test(stored)) return stored;
  try {
    const u = new URL(stored);
    if (!spec.host.test(u.hostname)) {
      // Versões antigas tratavam handles com ponto ("dayon.news") como site e salvavam
      // "https://dayon.news". Se a URL é só um host que vale como handle, devolve o handle.
      if ((u.pathname === "/" || u.pathname === "") && !u.search && !u.hash) {
        const h = spec.lower ? u.hostname.toLowerCase() : u.hostname;
        if (spec.re.test(h)) return h;
      }
      return stored;
    }
    return handleFromPath(spec, u.pathname) ?? stored;
  } catch {
    return stored;
  }
}

export function linkEntries(links: Links | null | undefined): [LinkKey, string][] {
  if (!links) return [];
  return LINK_KEYS.flatMap((k) => (typeof links[k] === "string" && links[k] ? [[k, links[k] as string] as [LinkKey, string]] : []));
}

export function safeHttps(url: string): boolean {
  return /^https:\/\//i.test(url);
}

export function isUrl(value: string): boolean {
  return /^https:\/\//i.test(value);
}
