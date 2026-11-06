// Conta de demonstração para os screenshots da loja.
// Cria uma pessoa fictícia principal (Marina) e ~18 pessoas fictícias, todas entrando com
// carteiras geradas na hora e usando só a API pública (como usuários reais): perfis, fotos
// ilustradas (DiceBear "notionists", licença CC0), eventos, check-in, conexões ao vivo
// (QR com token) e salvas pelo crachá, notas e tags.
//
// Uso:
//   node scripts/seed-demo.mjs seed  <arquivo-de-estado.json>
//   node scripts/seed-demo.mjs clean <arquivo-de-estado.json>   (apaga todas as contas criadas)
//
// O arquivo de estado guarda as chaves das carteiras de teste (contas descartáveis).
// Guarde-o fora do repositório. APP_URL precisa estar nas URLs permitidas do Supabase Auth.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519.js";

const SUPABASE_URL = "https://krqbccfxrtpycfsgtbtb.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_toOU9TiY_ZHj17Plg9dKPg_dsLwQ48-";
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const STATEMENT = "Sign in to Connex. This request does not trigger a blockchain transaction or cost any fees.";

const [cmd, statePath] = process.argv.slice(2);
if (!["seed", "clean"].includes(cmd) || !statePath) {
  console.error("uso: node scripts/seed-demo.mjs seed|clean <estado.json>");
  process.exit(2);
}

const MAIN = {
  handle: "marina",
  display_name: "Marina Costa",
  headline: "Founder · onchain loyalty for cafés",
  company: "Grão Labs",
  location: "São Paulo",
  bio: "Building loyalty that customers actually own. Ex-product at a fintech. Always up for coffee.",
  skills: ["Product", "Growth", "Payments", "Community"],
  looking_for: ["Co-founder (tech)", "Investors", "Designers"],
  offering: ["Intros", "Product feedback", "Grants advice"],
  links: { telegram: "https://t.me/example", x: "https://x.com/example", website: "https://example.com", farcaster: "https://farcaster.xyz/example" },
  bg: "ffd5c2",
};

// event: chave do evento; mode: live (QR ao vivo, verificada) | badge (crachá, perfil público) | none (só presente no evento)
const PEOPLE = [
  { handle: "lucas_dev", display_name: "Lucas Moreira", headline: "Backend dev · DePIN indexer", company: "Hotspot Labs", skills: ["Python", "Rust", "Postgres", "DePIN"], looking_for: ["Hackathon team"], offering: ["Dev work"], event: "island", mode: "live", minutesAgo: 60 * 26, note: "Built a Python indexer for hotspot rewards. Wants to test on Seeker. Follow up about our data pipeline.", tags: ["dev", "follow-up"], bg: "c9e4ff" },
  { handle: "ana_data", display_name: "Ana Ribeiro", headline: "Data engineer · open to co-founding", company: null, skills: ["Python", "SQL", "AI"], looking_for: ["Co-founder"], offering: ["Data work"], event: "island", mode: "live", minutesAgo: 60 * 22, note: "Ex-fintech data team. Wants to co-found something in payments. Great fit for the loyalty analytics.", tags: ["co-founder"], bg: "e3d7ff" },
  { handle: "rafa_anchor", display_name: "Rafael Tanaka", headline: "Rust & Anchor engineer", company: "Indie", skills: ["Rust", "Anchor", "Solana"], looking_for: ["Grants"], offering: ["Audits", "Dev work"], event: "island", mode: "live", minutesAgo: 60 * 20, note: "Audits Anchor programs. Offered to review our escrow before mainnet.", tags: ["audit"], bg: "d4f5e0" },
  { handle: "julia_ux", display_name: "Júlia Martins", headline: "Product designer · wallets & onboarding", company: "Studio Maré", skills: ["Design", "UX", "Figma"], looking_for: ["Partners"], offering: ["Design", "Feedback"], event: "island", mode: "live", minutesAgo: 60 * 5, note: "Designed onboarding for 3 wallets. Loved the badge idea — send her the Figma.", tags: ["design", "follow-up"], bg: "fff0b8" },
  { handle: "pedro_vc", display_name: "Pedro Alves", headline: "Pre-seed investor · consumer crypto", company: "Atlântico Ventures", skills: ["Investment", "DeFi"], looking_for: ["Founders"], offering: ["Investment", "Intros"], event: "island", mode: "badge", minutesAgo: 60 * 4, note: "Writes $25–50k checks in DePIN and consumer. Asked for the deck by Friday.", tags: ["investor", "follow-up"], bg: "ffd9e8" },
  { handle: "larissa_law", display_name: "Larissa Gomes", headline: "Lawyer · crypto regulation in Brazil", company: null, skills: ["Legal", "Compliance"], looking_for: ["Clients"], offering: ["Legal advice"], event: "island", mode: "live", minutesAgo: 60 * 3, note: "Explained the new VASP rules in 10 minutes. Free first call for builders.", tags: ["legal"], bg: "dff3ff" },
  { handle: "sofia_pay", display_name: "Sofia Carvalho", headline: "Payments PM · Pix ↔ USDC", company: "Ponte Pay", skills: ["Payments", "Product", "Python"], looking_for: ["Developers"], offering: ["Intros"], event: "island", mode: "live", minutesAgo: 90, note: "Working on Pix to USDC ramps. Could plug into our café checkout.", tags: ["payments", "partner"], bg: "e6ffd1" },
  { handle: "isa_devrel", display_name: "Isabela Ramos", headline: "DevRel · TypeScript & docs", company: null, skills: ["TypeScript", "Content", "Community"], looking_for: ["Speaking slots"], offering: ["Workshops"], event: "island", mode: "badge", minutesAgo: 40, note: "Runs monthly workshops in SP. Invite her to speak at our meetup.", tags: ["community"], bg: "ffe6cc" },
  { handle: "camila_comm", display_name: "Camila Souza", headline: "Community lead · Builders Night", company: null, skills: ["Community", "Growth", "Content"], looking_for: ["Sponsors"], offering: ["Intros"], event: "builders", mode: "live", minutesAgo: 60 * 24 * 15, note: "Organizes Builders Night. Can intro us to 3 café owners in Pinheiros.", tags: ["community"], bg: "f2e1ff" },
  { handle: "diego_mobile", display_name: "Diego Fernandes", headline: "Mobile dev · React Native", company: "Freelance", skills: ["React Native", "TypeScript", "Mobile"], looking_for: ["Projects"], offering: ["Dev work"], event: "builders", mode: "live", minutesAgo: 60 * 24 * 15 + 50, note: "Shipped two Solana Mobile apps. Available from December.", tags: ["dev"], bg: "d6f0ff" },
  { handle: "mateus_games", display_name: "Mateus Pereira", headline: "Founder · casual onchain games", company: "Pixel Raposa", skills: ["Gaming", "Unity"], looking_for: ["Investors"], offering: ["Feedback"], event: "builders", mode: "badge", minutesAgo: 60 * 24 * 15 + 120, note: null, tags: [], bg: "ffe0d6" },
  { handle: "bia_ai", display_name: "Beatriz Lima", headline: "AI researcher · on-device agents", company: null, skills: ["AI", "Python", "Research"], looking_for: ["Co-founder"], offering: ["Mentoring"], event: "rio", mode: "live", minutesAgo: 60 * 24 * 50, note: "Fine-tunes small models for on-device agents. Ask about the receipt-reading idea.", tags: ["ai"], bg: "e0f7f1" },
  { handle: "thiago_growth", display_name: "Thiago Rocha", headline: "Growth · referral loops", company: null, skills: ["Marketing", "Growth"], looking_for: ["Startups"], offering: ["Marketing help"], event: "rio", mode: "live", minutesAgo: 60 * 24 * 51, note: "Grew a wallet from 0 to 40k with referrals.", tags: [], bg: "fff3d1" },
  { handle: "gabriel_sol", display_name: "Gabriel Nunes", headline: "Solidity → Solana · TypeScript", company: null, skills: ["TypeScript", "Solidity", "Anchor"], looking_for: ["A job"], offering: ["Dev work"], event: "rio", mode: "badge", minutesAgo: 60 * 24 * 52, note: null, tags: ["hiring"], bg: "e8e4ff" },
  // No IslandDAO, ainda não conectados com a Marina (aparecem com "Unlock").
  { handle: "felipe_rs", display_name: "Felipe Duarte", headline: "Rust dev looking for a co-founder", company: null, skills: ["Rust", "Anchor"], looking_for: ["Co-founder", "Product"], offering: ["Dev work"], event: "island", mode: "none", bg: "d9f2ff" },
  { handle: "renata_angel", display_name: "Renata Oliveira", headline: "Angel investor · fintech", company: null, skills: ["Investment"], looking_for: ["Founders"], offering: ["Investment", "Mentoring"], event: "island", mode: "none", bg: "ffe3ec" },
  { handle: "carla_design", display_name: "Carla Mendes", headline: "Brand designer joining a team", company: null, skills: ["Design", "Branding"], looking_for: ["A team"], offering: ["Design"], event: "island", mode: "none", bg: "fdf0c4" },
  { handle: "bruno_audit", display_name: "Bruno Castro", headline: "Smart contract auditor", company: "Farol Security", skills: ["Security", "Rust"], looking_for: ["Clients"], offering: ["Audits"], event: "island", mode: "none", private: true, bg: "dcefe6" },
];

const EVENTS = {
  island: { name: "IslandDAO", location: "Florianópolis", starts: "2026-11-06T12:00:00Z", ends: "2026-11-11T21:00:00Z", description: "Solana builders on an island for a week of hacking, talks and late-night ideas." },
  builders: { name: "Builders Night SP", location: "São Paulo", starts: "2026-10-22T21:00:00Z", ends: "2026-10-23T02:00:00Z", description: null },
  rio: { name: "Hacker House Rio", location: "Rio de Janeiro", starts: "2026-09-15T12:00:00Z", ends: "2026-09-20T21:00:00Z", description: null },
};

function walletFor(kp) {
  return {
    publicKey: { toBase58: () => kp.publicKey.toBase58() },
    signMessage: async (message) => ed25519.sign(message, kp.secretKey.slice(0, 32)),
  };
}

async function signIn(secret) {
  const kp = Keypair.fromSecretKey(Uint8Array.from(secret));
  const sb = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.signInWithWeb3({ chain: "solana", statement: STATEMENT, wallet: walletFor(kp), options: { url: APP_URL } });
  if (error) throw new Error(`login: ${error.message}`);
  const { error: e2 } = await sb.rpc("ensure_profile");
  if (e2) throw new Error(`ensure_profile: ${e2.message}`);
  return { sb, uid: data.user.id };
}

function must(step, { data, error }) {
  if (error) throw new Error(`${step}: ${error.message}`);
  return data;
}

async function uploadAvatar(sb, uid, seed, bg) {
  const url = `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(seed)}&size=256&backgroundColor=${bg}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`avatar ${seed}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const path = `${uid}/${Date.now()}.png`;
  must("upload avatar", await sb.storage.from("avatars").upload(path, bytes, { contentType: "image/png", upsert: true }));
  return sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

async function setProfile(sb, uid, p) {
  const avatar_url = await uploadAvatar(sb, uid, p.display_name, p.bg);
  must(
    `perfil ${p.handle}`,
    await sb
      .from("profiles")
      .update({
        handle: p.handle,
        display_name: p.display_name,
        headline: p.headline,
        company: p.company ?? null,
        location: p.location ?? null,
        bio: p.bio ?? null,
        skills: p.skills,
        looking_for: p.looking_for,
        offering: p.offering,
        links: p.links ?? { telegram: "https://t.me/example", x: "https://x.com/example" },
        is_public: !p.private,
        avatar_url,
      })
      .eq("id", uid),
  );
}

async function seed() {
  if (existsSync(statePath)) throw new Error(`${statePath} já existe; rode clean antes ou use outro arquivo`);
  const state = { main: Array.from(Keypair.generate().secretKey), people: {}, events: {}, metAt: {} };
  for (const p of PEOPLE) state.people[p.handle] = Array.from(Keypair.generate().secretKey);
  writeFileSync(statePath, JSON.stringify(state));

  const main = await signIn(state.main);
  await setProfile(main.sb, main.uid, MAIN);
  console.log("marina ok");

  for (const [key, ev] of Object.entries(EVENTS)) {
    const row = must(
      `evento ${key}`,
      await main.sb.rpc("create_event", { p_name: ev.name, p_description: ev.description, p_location: ev.location, p_starts_at: ev.starts, p_ends_at: ev.ends }),
    );
    state.events[key] = { id: row.id, code: row.join_code };
  }
  writeFileSync(statePath, JSON.stringify(state));
  console.log("eventos ok");

  for (const p of PEOPLE) {
    const who = await signIn(state.people[p.handle]);
    await setProfile(who.sb, who.uid, p);
    must(`join ${p.handle}`, await who.sb.rpc("join_event", { p_code: state.events[p.event].code }));
    const ev = state.events[p.event];
    if (p.mode === "live") {
      const token = must("token", await who.sb.rpc("live_qr_token"));
      const c = must(`connect ${p.handle}`, await main.sb.rpc("connect", { p_handle: p.handle, p_token: token, p_event_id: ev.id }));
      must("nota", await main.sb.from("connections").update({ note: p.note, tags: p.tags }).eq("id", c.id));
    } else if (p.mode === "badge") {
      const c = must(`badge ${p.handle}`, await main.sb.rpc("connect", { p_handle: p.handle, p_token: null, p_event_id: ev.id }));
      must("nota", await main.sb.from("connections").update({ note: p.note, tags: p.tags }).eq("id", c.id));
    }
    if (p.minutesAgo) state.metAt[p.handle] = new Date(Date.now() - p.minutesAgo * 60_000).toISOString();
    console.log(`${p.handle} ok (${p.mode})`);
  }
  writeFileSync(statePath, JSON.stringify(state));

  // met_at não é editável pelo app; este SQL (service role, SQL Editor) espalha os encontros no tempo.
  const values = Object.entries(state.metAt)
    .map(([h, t]) => `('${h}', '${t}'::timestamptz)`)
    .join(",\n  ");
  console.log(`\n-- SQL para o SQL Editor (datas dos encontros da demo):\nupdate public.connections c set met_at = v.t\nfrom (values\n  ${values}\n) as v(h, t), public.profiles p, public.profiles o\nwhere p.handle = v.h and c.contact_id = p.id and o.id = c.owner_id and o.handle = 'marina';\n`);
  console.log("pronto. chave da Marina (para o dev wallet, localStorage connex.devKeypair):");
  console.log(JSON.stringify(state.main));
}

async function clean() {
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const all = [["marina", state.main], ...Object.entries(state.people)];
  for (const [name, secret] of all) {
    try {
      const { sb, uid } = await signIn(secret);
      const { data: files } = await sb.storage.from("avatars").list(uid);
      if (files?.length) await sb.storage.from("avatars").remove(files.map((f) => `${uid}/${f.name}`));
      must("delete_my_account", await sb.rpc("delete_my_account"));
      console.log(`${name} apagado`);
    } catch (e) {
      console.error(`${name}: ${e.message}`);
    }
  }
}

await (cmd === "seed" ? seed() : clean());
