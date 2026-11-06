export const LINK_KEYS = ["telegram", "x", "website", "github", "farcaster", "linkedin", "discord", "superteam", "calendar", "instagram", "youtube", "tiktok"] as const;
export type LinkKey = (typeof LINK_KEYS)[number];
export type Links = Partial<Record<LinkKey, string>>;

export type Profile = {
  id: string;
  wallet: string;
  handle: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  company: string | null;
  location: string | null;
  links: Links;
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
  note: string | null;
  tags: string[];
  met_at: string;
  created_at: string;
  updated_at: string;
};

export type ConnectionWithContact = Connection & {
  contact: Profile | null;
  event: { id: string; name: string } | null;
};

export const CONNECTION_SELECT = "*, contact:profiles!connections_contact_id_fkey(*), event:events(id,name)";

export function profileName(p: Pick<Profile, "display_name" | "handle"> | null | undefined): string {
  return p?.display_name?.trim() || (p?.handle ? `@${p.handle}` : "Connex user");
}
