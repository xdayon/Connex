import { strings } from "../i18n/strings";
import { linkEntries } from "./links";
import type { ContactProfile, LinkKey, Links } from "./types";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  let limit = 75;
  while (rest.length > limit) {
    out.push(rest.slice(0, limit));
    rest = ` ${rest.slice(limit)}`;
    limit = 75;
  }
  out.push(rest);
  return out.join("\r\n");
}

const social: Partial<Record<LinkKey, string>> = {
  x: "twitter",
  linkedin: "linkedin",
  instagram: "instagram",
  github: "github",
  youtube: "youtube",
  telegram: "telegram",
  farcaster: "farcaster",
  tiktok: "tiktok",
};

export function buildVCard(p: ContactProfile, links: Links, origin = window.location.origin): string {
  const name = p.display_name?.trim() || p.handle || "conneX contact";
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(name)}`, `N:;${esc(name)};;;`];
  if (p.handle) lines.push(`NICKNAME:${esc(p.handle)}`);
  if (p.headline) lines.push(`TITLE:${esc(p.headline)}`);
  if (p.company) lines.push(`ORG:${esc(p.company)}`);
  const note = [p.bio?.trim(), strings.publicProfile.viaConnex].filter(Boolean).join(" — ");
  lines.push(`NOTE:${esc(note)}`);
  if (p.handle) lines.push(`URL:${esc(`${origin}/u/${p.handle}`)}`);
  for (const [key, url] of linkEntries(links)) {
    lines.push(`URL:${esc(url)}`);
    const type = social[key];
    if (type) lines.push(`X-SOCIALPROFILE;type=${type}:${url}`);
  }
  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadVCard(p: ContactProfile, links: Links): void {
  const blob = new Blob([buildVCard(p, links)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${p.handle ?? "contact"}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
