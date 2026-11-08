// Checagem rápida da normalização de links: node --experimental-strip-types scripts/check-links.ts
import { linkDisplayValue, normalizeLink } from "../src/lib/links.ts";
import type { LinkKey } from "../src/lib/types.ts";

let failed = 0;

function expect(key: LinkKey, input: string, want: string | null | "invalid") {
  const r = normalizeLink(key, input);
  const got = r.ok ? r.value : "invalid";
  if (got !== want) {
    failed++;
    console.error(`FAIL ${key} ${JSON.stringify(input)}: esperado ${want}, veio ${got}`);
  }
}

const ig = "https://www.instagram.com/dion.news";
expect("instagram", "dion.news", ig);
expect("instagram", "@dion.news", ig);
expect("instagram", "instagram.com/dion.news/", ig);
expect("instagram", "https://www.instagram.com/dion.news?igsh=x", ig);
expect("instagram", "evil.com/dion", "invalid");
expect("instagram", "https://evil.com/dion", "invalid");
expect("instagram", "", null);
expect("tiktok", "dion.news", "https://www.tiktok.com/@dion.news");
expect("tiktok", "https://www.tiktok.com/@dion.news", "https://www.tiktok.com/@dion.news");
expect("x", "https://twitter.com/dion_x?s=20", "https://x.com/dion_x");
expect("x", "@dion_x", "https://x.com/dion_x");
expect("telegram", "abc", "invalid");
expect("telegram", "t.me/dion_tg", "https://t.me/dion_tg");
expect("linkedin", "linkedin.com/company/acme", "https://linkedin.com/company/acme");
expect("linkedin", "https://br.linkedin.com/in/dion-x/", "https://www.linkedin.com/in/dion-x");
expect("linkedin", "dion-x", "https://www.linkedin.com/in/dion-x");
expect("youtube", "https://www.youtube.com/channel/UCabcdefghijk", "https://www.youtube.com/channel/UCabcdefghijk");
expect("youtube", "@dion", "https://www.youtube.com/@dion");
expect("reddit", "u/spez", "https://www.reddit.com/user/spez");
expect("reddit", "https://old.reddit.com/u/spez", "https://www.reddit.com/user/spez");
expect("farcaster", "Dion.ETH", "https://farcaster.xyz/dion.eth");
expect("farcaster", "warpcast.com/dion", "https://farcaster.xyz/dion");
expect("bluesky", "Ana.bsky.social", "https://bsky.app/profile/ana.bsky.social");
expect("bluesky", "ana", "invalid");
expect("website", "yoursite.com", "https://yoursite.com");
expect("website", "yoursite", "invalid");
expect("discord", "@Dion_1", "dion_1");
expect("steam", "76561198000000000", "https://steamcommunity.com/profiles/76561198000000000");
expect("whatsapp", "+55 48 99999-0000", "https://wa.me/5548999990000");

const handles: [LinkKey, string][] = [
  ["telegram", "dion_tg"], ["x", "dion_x"], ["github", "dion-x"], ["linkedin", "dion-x"],
  ["instagram", "dion.news"], ["tiktok", "dion.news"], ["farcaster", "dion.eth"], ["superteam", "dion"],
  ["youtube", "dion.news"], ["twitch", "dion_tv"], ["reddit", "spez"], ["bluesky", "ana.bsky.social"],
  ["steam", "dionx"],
];
for (const [key, h] of handles) {
  const r = normalizeLink(key, h);
  if (!r.ok || !r.value) {
    failed++;
    console.error(`FAIL ida ${key} ${h}`);
    continue;
  }
  const shown = linkDisplayValue(key, r.value);
  if (shown !== h) {
    failed++;
    console.error(`FAIL volta ${key}: ${r.value} -> ${shown}, esperado ${h}`);
  }
}
if (linkDisplayValue("linkedin", "https://linkedin.com/company/acme") !== "https://linkedin.com/company/acme") {
  failed++;
  console.error("FAIL volta linkedin company");
}

if (failed) {
  console.error(`${failed} falha(s)`);
  process.exit(1);
}
console.log("check-links: ok");
