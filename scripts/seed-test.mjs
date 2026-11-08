// Dados de teste para uma conta REAL (a sua): cria pessoas fictícias (carteiras geradas na hora,
// só API pública, como usuários reais), coloca parte delas no seu evento (pelo código) e em dois
// eventos passados criados por uma delas. As conexões da sua conta não dá para criar pela API
// (exigiriam a sua assinatura), então o script imprime o SQL para rodar como service role.
//
// Uso:
//   node scripts/seed-test.mjs seed  <estado.json> <CODIGO_DO_SEU_EVENTO> <seu_handle>
//   node scripts/seed-test.mjs clean <estado.json>   (apaga todas as contas fictícias; as conexões somem junto)
//
// O arquivo de estado guarda as chaves das carteiras fictícias. Guarde-o fora do repositório.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519.js";

const SUPABASE_URL = "https://krqbccfxrtpycfsgtbtb.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_toOU9TiY_ZHj17Plg9dKPg_dsLwQ48-";
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const STATEMENT = "Sign in to Connex. This request does not trigger a blockchain transaction or cost any fees.";

const [cmd, statePath, eventCode, myHandle] = process.argv.slice(2);
if (!(cmd === "clean" && statePath) && !(cmd === "seed" && statePath && eventCode && myHandle)) {
  console.error("uso: node scripts/seed-test.mjs seed <estado.json> <CODIGO_EVENTO> <seu_handle> | clean <estado.json>");
  process.exit(2);
}

const today = new Date();
const bdayToday = { birth_day: today.getDate(), birth_month: today.getMonth() + 1 };

// event: island = o seu evento; builders/rio = eventos passados.
// mode: live = conectados ao vivo (verificado) · badge = salvo pelo crachá · none = só no evento (aparece como "Unlock").
const PEOPLE = [
  { handle: "t_lucas_dev", display_name: "Lucas Moreira", headline: "Backend dev · DePIN indexer", company: "Hotspot Labs", skills: ["Python", "Rust", "Postgres", "DePIN"], looking_for: ["Hackathon team"], offering: ["Dev work"], event: "island", mode: "live", hoursAgo: 26, note: "Built a Python indexer for hotspot rewards. Wants to test on Seeker. Follow up about our data pipeline.", tags: ["dev", "follow-up"], bg: "c9e4ff", birth: { birth_day: 14, birth_month: 3, birth_year: 1996 } },
  { handle: "t_ana_data", display_name: "Ana Ribeiro", headline: "Data engineer · open to co-founding", skills: ["Python", "SQL", "AI"], looking_for: ["Co-founder"], offering: ["Data work"], event: "island", mode: "live", hoursAgo: 22, note: "Ex-fintech data team. Wants to co-found something in payments.", tags: ["co-founder"], bg: "e3d7ff", birth: bdayToday },
  { handle: "t_rafa_anchor", display_name: "Rafael Tanaka", headline: "Rust & Anchor engineer", company: "Indie", skills: ["Rust", "Anchor", "Solana"], looking_for: ["Grants"], offering: ["Audits", "Dev work"], event: "island", mode: "live", hoursAgo: 20, note: "Audits Anchor programs. Offered to review our escrow before mainnet.", tags: ["audit"], bg: "d4f5e0", birth: { birth_month: 7 } },
  { handle: "t_julia_ux", display_name: "Júlia Martins", headline: "Product designer · wallets & onboarding", company: "Studio Maré", skills: ["Design", "UX", "Figma"], looking_for: ["Partners"], offering: ["Design", "Feedback"], event: "island", mode: "live", hoursAgo: 5, note: "Designed onboarding for 3 wallets. Loved the badge idea — send her the Figma.", tags: ["design", "follow-up"], bg: "fff0b8" },
  { handle: "t_pedro_vc", display_name: "Pedro Alves", headline: "Pre-seed investor · consumer crypto", company: "Atlântico Ventures", skills: ["Investment", "DeFi"], looking_for: ["Founders"], offering: ["Investment", "Intros"], event: "island", mode: "badge", hoursAgo: 4, note: "Writes $25–50k checks in DePIN and consumer. Asked for the deck by Friday.", tags: ["investor", "follow-up"], bg: "ffd9e8", birth: { birth_day: 2, birth_month: 12, birth_year: 1984 } },
  { handle: "t_larissa_law", display_name: "Larissa Gomes", headline: "Lawyer · crypto regulation in Brazil", skills: ["Legal", "Compliance"], looking_for: ["Clients"], offering: ["Legal advice"], event: "island", mode: "live", hoursAgo: 3, note: "Explained the new VASP rules in 10 minutes. Free first call for builders.", tags: ["legal"], bg: "dff3ff" },
  { handle: "t_sofia_pay", display_name: "Sofia Carvalho", headline: "Payments PM · Pix ↔ USDC", company: "Ponte Pay", skills: ["Payments", "Product", "Python"], looking_for: ["Developers"], offering: ["Intros"], event: "island", mode: "live", hoursAgo: 1.5, note: "Working on Pix to USDC ramps. Could plug into a café checkout.", tags: ["payments", "partner"], bg: "e6ffd1" },
  { handle: "t_isa_devrel", display_name: "Isabela Ramos", headline: "DevRel · TypeScript & docs", skills: ["TypeScript", "Content", "Community"], looking_for: ["Speaking slots"], offering: ["Workshops"], event: "island", mode: "badge", hoursAgo: 0.7, note: "Runs monthly workshops in SP. Invite her to speak at a meetup.", tags: ["community"], bg: "ffe6cc" },
  { handle: "t_camila_comm", display_name: "Camila Souza", headline: "Community lead · Builders Night", skills: ["Community", "Growth", "Content"], looking_for: ["Sponsors"], offering: ["Intros"], event: "builders", mode: "live", hoursAgo: 24 * 15, note: "Organizes Builders Night. Can intro us to café owners in Pinheiros.", tags: ["community"], bg: "f2e1ff", birth: { birth_day: 8, birth_month: 11 } },
  { handle: "t_diego_mobile", display_name: "Diego Fernandes", headline: "Mobile dev · React Native", company: "Freelance", skills: ["React Native", "TypeScript", "Mobile"], looking_for: ["Projects"], offering: ["Dev work"], event: "builders", mode: "live", hoursAgo: 24 * 15 + 1, note: "Shipped two Solana Mobile apps. Available from December.", tags: ["dev"], bg: "d6f0ff" },
  { handle: "t_mateus_games", display_name: "Mateus Pereira", headline: "Founder · casual onchain games", company: "Pixel Raposa", skills: ["Gaming", "Unity"], looking_for: ["Investors"], offering: ["Feedback"], event: "builders", mode: "badge", hoursAgo: 24 * 15 + 2, note: null, tags: [], bg: "ffe0d6" },
  { handle: "t_bia_ai", display_name: "Beatriz Lima", headline: "AI researcher · on-device agents", skills: ["AI", "Python", "Research"], looking_for: ["Co-founder"], offering: ["Mentoring"], event: "rio", mode: "live", hoursAgo: 24 * 50, note: "Fine-tunes small models for on-device agents. Ask about the receipt-reading idea.", tags: ["ai"], bg: "e0f7f1", birth: { birth_year: 1999 } },
  { handle: "t_thiago_growth", display_name: "Thiago Rocha", headline: "Growth · referral loops", skills: ["Marketing", "Growth"], looking_for: ["Startups"], offering: ["Marketing help"], event: "rio", mode: "live", hoursAgo: 24 * 51, note: "Grew a wallet from 0 to 40k with referrals.", tags: [], bg: "fff3d1" },
  { handle: "t_gabriel_sol", display_name: "Gabriel Nunes", headline: "Solidity → Solana · TypeScript", skills: ["TypeScript", "Solidity", "Anchor"], looking_for: ["A job"], offering: ["Dev work"], event: "rio", mode: "badge", hoursAgo: 24 * 52, note: null, tags: ["hiring"], bg: "e8e4ff" },
  { handle: "t_felipe_rs", display_name: "Felipe Duarte", headline: "Rust dev looking for a co-founder", skills: ["Rust", "Anchor"], looking_for: ["Co-founder", "Product"], offering: ["Dev work"], event: "island", mode: "none", bg: "d9f2ff" },
  { handle: "t_renata_angel", display_name: "Renata Oliveira", headline: "Angel investor · fintech", skills: ["Investment"], looking_for: ["Founders"], offering: ["Investment", "Mentoring"], event: "island", mode: "none", bg: "ffe3ec" },
  { handle: "t_carla_design", display_name: "Carla Mendes", headline: "Brand designer joining a team", skills: ["Design", "Branding"], looking_for: ["A team"], offering: ["Design"], event: "island", mode: "none", bg: "fdf0c4" },
  { handle: "t_bruno_audit", display_name: "Bruno Castro", headline: "Smart contract auditor", company: "Farol Security", skills: ["Security", "Rust"], looking_for: ["Clients"], offering: ["Audits"], event: "island", mode: "none", private: true, bg: "dcefe6" },
];

const PAST_EVENTS = {
  builders: { name: "Builders Night SP", location: "São Paulo", starts: "2026-10-22T21:00:00Z", ends: "2026-10-23T02:00:00Z" },
  rio: { name: "Hacker House Rio", location: "Rio de Janeiro", starts: "2026-09-15T12:00:00Z", ends: "2026-09-20T21:00:00Z" },
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
  const res = await fetch(`https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(seed)}&size=256&backgroundColor=${bg}`);
  if (!res.ok) throw new Error(`avatar ${seed}: HTTP ${res.status}`);
  const path = `${uid}/${Date.now()}.png`;
  must("upload avatar", await sb.storage.from("avatars").upload(path, new Uint8Array(await res.arrayBuffer()), { contentType: "image/png", upsert: true }));
  return sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

const sql = (v) => (v == null ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const sqlArr = (a) => `array[${a.map(sql).join(",")}]::text[]`;

async function seed() {
  if (existsSync(statePath)) throw new Error(`${statePath} já existe; rode clean antes ou use outro arquivo`);
  const state = { people: {}, events: {} };
  for (const p of PEOPLE) state.people[p.handle] = Array.from(Keypair.generate().secretKey);
  writeFileSync(statePath, JSON.stringify(state));

  const sessions = {};
  for (const p of PEOPLE) {
    const who = await signIn(state.people[p.handle]);
    sessions[p.handle] = who;
    must(
      `perfil ${p.handle}`,
      await who.sb
        .from("profiles")
        .update({
          handle: p.handle,
          display_name: p.display_name,
          headline: p.headline,
          company: p.company ?? null,
          skills: p.skills,
          looking_for: p.looking_for,
          offering: p.offering,
          links: { telegram: "https://t.me/example", x: "https://x.com/example", github: "https://github.com/example" },
          share_hidden: [],
          is_public: !p.private,
          avatar_url: await uploadAvatar(who.sb, who.uid, p.display_name, p.bg),
          ...(p.birth ?? {}),
        })
        .eq("id", who.uid),
    );
    console.log(`${p.handle} ok`);
  }

  // Eventos passados: criados pela primeira pessoa de cada um.
  for (const [key, ev] of Object.entries(PAST_EVENTS)) {
    const host = sessions[PEOPLE.find((p) => p.event === key).handle];
    const row = must(`evento ${key}`, await host.sb.rpc("create_event", { p_name: ev.name, p_description: null, p_location: ev.location, p_starts_at: ev.starts, p_ends_at: ev.ends }));
    state.events[key] = { id: row.id, code: row.join_code };
  }
  writeFileSync(statePath, JSON.stringify(state));

  for (const p of PEOPLE) {
    const code = p.event === "island" ? eventCode : state.events[p.event].code;
    must(`join ${p.handle}`, await sessions[p.handle].sb.rpc("join_event", { p_code: code }));
  }
  console.log("check-ins ok");

  // SQL das conexões da sua conta (service role / SQL Editor).
  const rows = PEOPLE.filter((p) => p.mode !== "none").map(
    (p) =>
      `(${sql(p.handle)}, ${sql(p.event)}, ${p.mode === "live"}, ${sql(p.mode === "live" ? "live_qr" : "badge")}, ${sql(p.note)}, ${sqlArr(p.tags)}, now() - interval '${Math.round(p.hoursAgo * 60)} minutes')`,
  );
  const pastIds = Object.entries(state.events).map(([k, e]) => `(${sql(k)}, ${sql(e.id)}::uuid)`);
  console.log(`
-- Conexões de teste da conta @${myHandle} (rodar como service role).
with me as (select id from public.profiles where handle = ${sql(myHandle)}),
island as (select id from public.events where join_code = ${sql(eventCode)}),
past(k, id) as (values ${pastIds.join(", ")}),
v(h, ev, verified, method, note, tags, met_at) as (values
  ${rows.join(",\n  ")}
),
src as (
  select p.id as contact_id, v.*, case when v.ev = 'island' then (select id from island) else (select id from past where past.k = v.ev) end as event_id
  from v join public.profiles p on p.handle = v.h
),
mine as (
  insert into public.connections (owner_id, contact_id, event_id, verified, method, note, tags, met_at, shared_keys)
  select (select id from me), contact_id, event_id, verified, method, note, tags, met_at, private.share_keys() from src
  on conflict (owner_id, contact_id) do nothing returning 1
),
theirs as (
  insert into public.connections (owner_id, contact_id, event_id, verified, method, met_at, shared_keys)
  select contact_id, (select id from me), event_id, true, 'live_qr', met_at, private.default_share((select id from me)) from src where verified
  on conflict (owner_id, contact_id) do nothing returning 1
),
att as (
  insert into public.event_attendees (event_id, user_id)
  select id, (select id from me) from past on conflict do nothing returning 1
)
select (select count(*) from mine) as minhas, (select count(*) from theirs) as recíprocas, (select count(*) from att) as eventos_passados;
`);
}

async function clean() {
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  for (const [name, secret] of Object.entries(state.people)) {
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
