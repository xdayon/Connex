// Mesma ordem e mesmas chaves de private.link_keys() no banco.
export const LINK_KEYS = [
  "whatsapp", "telegram", "x", "instagram", "linkedin", "github", "farcaster", "discord",
  "superteam", "website", "calendar", "youtube", "tiktok", "twitch", "steam", "reddit", "bluesky",
] as const;
export type LinkKey = (typeof LINK_KEYS)[number];
export type Links = Partial<Record<LinkKey, string>>;

// O que dá para compartilhar com alguém: as redes e a carteira (private.share_keys()).
export const SHARE_KEYS = [...LINK_KEYS, "wallet"] as const;
export type ShareKey = (typeof SHARE_KEYS)[number];

// Perfil completo: só o próprio dono recebe assim (rpc my_profile / ensure_profile).
// get_profile devolve o mesmo formato, mas filtrado: wallet pode vir null e share_hidden vazio.
export type Profile = {
  id: string;
  wallet: string | null;
  handle: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  company: string | null;
  location: string | null;
  links: Links;
  share_hidden: ShareKey[];
  skills: string[];
  looking_for: string[];
  offering: string[];
  is_public: boolean;
  skr_name: string | null;
  seeker_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRow = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  join_code: string;
  created_by: string;
  listed: boolean;
  created_at: string;
};

export type EventPerson = {
  user_id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  company: string | null;
  skills: string[];
  looking_for: string[];
  offering: string[];
  is_public: boolean;
  seeker_verified: boolean;
  is_me: boolean;
  in_network: boolean;
  verified: boolean;
  joined_at: string;
};

export type Connection = {
  id: string;
  owner_id: string;
  contact_id: string;
  event_id: string | null;
  verified: boolean;
  method: "live_qr" | "badge";
  shared_keys: ShareKey[];
  note: string | null;
  tags: string[];
  met_at: string;
  created_at: string;
  updated_at: string;
};

// Perfil de outra pessoa lido direto da tabela: sem links, carteira e padrão (o banco nega essas colunas).
export type ContactProfile = Omit<Profile, "links" | "wallet" | "share_hidden">;
export const PROFILE_COLS =
  "id,handle,display_name,headline,bio,avatar_url,company,location,skills,looking_for,offering,is_public,skr_name,seeker_verified,created_at,updated_at";

export type ConnectionWithContact = Connection & {
  contact: ContactProfile | null;
  event: { id: string; name: string } | null;
  // O que o contato liberou para mim (colunas calculadas no banco).
  shared_links: Links;
  shared_wallet: string | null;
};

export const CONNECTION_SELECT = `*, shared_links, shared_wallet, contact:profiles!connections_contact_id_fkey(${PROFILE_COLS}), event:events(id,name)`;

export function profileName(p: Pick<Profile, "display_name" | "handle"> | null | undefined): string {
  return p?.display_name?.trim() || (p?.handle ? `@${p.handle}` : "Connex user");
}
