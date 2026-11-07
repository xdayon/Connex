import type { LinkKey, Links } from "./types";
import { LINK_KEYS } from "./types";

const builders: Record<Exclude<LinkKey, "website" | "calendar" | "discord" | "whatsapp" | "bluesky">, (u: string) => string> = {
  x: (u) => `https://x.com/${u}`,
  github: (u) => `https://github.com/${u}`,
  linkedin: (u) => `https://www.linkedin.com/in/${u}`,
  instagram: (u) => `https://instagram.com/${u}`,
  telegram: (u) => `https://t.me/${u}`,
  farcaster: (u) => `https://farcaster.xyz/${u}`,
  superteam: (u) => `https://earn.superteam.fun/t/${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
  tiktok: (u) => `https://www.tiktok.com/@${u}`,
  twitch: (u) => `https://www.twitch.tv/${u}`,
  // SteamID64 (17 dígitos) vira /profiles/; qualquer outro nome é URL personalizada (/id/).
  steam: (u) => (/^\d{17}$/.test(u) ? `https://steamcommunity.com/profiles/${u}` : `https://steamcommunity.com/id/${u}`),
  reddit: (u) => `https://www.reddit.com/user/${u}`,
};

// WhatsApp: número com DDI (8 a 15 dígitos), aceita espaços, traços, parênteses e "+".
function whatsappLink(v: string): string | null {
  const m = v.match(/^https:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?\+?(\d{8,15})\/?$/i);
  if (m) return `https://wa.me/${m[1]}`;
  if (!/^\+?[\d\s().-]+$/.test(v)) return null;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

// Bluesky: o handle tem pontos (ana.bsky.social), então não pode cair na regra de domínio.
function blueskyLink(v: string): string | null {
  const h = v.replace(/^@/, "").toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) && h.length <= 253 ? `https://bsky.app/profile/${h}` : null;
}

const DISCORD_USER_RE = /^[a-z0-9_.]{2,32}$/;

export type LinkResult = { ok: true; value: string | null } | { ok: false };

export function normalizeLink(key: LinkKey, input: string): LinkResult {
  let v = input.trim();
  if (!v) return { ok: true, value: null };
  if (key === "whatsapp") {
    const url = whatsappLink(v.replace(/^http:\/\//i, "https://"));
    return url ? { ok: true, value: url } : { ok: false };
  }
  if (/\s/.test(v)) return { ok: false };
  if (key === "reddit") v = v.replace(/^\/?u\//i, "");
  if (key === "bluesky" && !/^https?:\/\//i.test(v)) {
    const url = blueskyLink(v);
    return url ? { ok: true, value: url } : { ok: false };
  }
  if (key === "discord") {
    const name = v.replace(/^@/, "").toLowerCase();
    if (DISCORD_USER_RE.test(name)) return { ok: true, value: name };
  }
  if (/^http:\/\//i.test(v)) v = `https://${v.slice(7)}`;
  if (!/^https:\/\//i.test(v) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v)) v = `https://${v}`;
  if (/^https:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      if (u.protocol !== "https:" || !u.hostname.includes(".")) return { ok: false };
    } catch {
      return { ok: false };
    }
    return v.length <= 300 ? { ok: true, value: v } : { ok: false };
  }
  if (key === "website" || key === "calendar" || key === "discord") return { ok: false };
  const user = v.replace(/^@/, "");
  if (!/^[A-Za-z0-9._-]{1,60}$/.test(user)) return { ok: false };
  const url = builders[key as keyof typeof builders](user);
  return url.length <= 300 ? { ok: true, value: url } : { ok: false };
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
