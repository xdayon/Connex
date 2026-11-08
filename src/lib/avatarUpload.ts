import type { PreparedAvatar } from "./avatar";
import { supabase } from "./supabase";

const BUCKET = "avatars";

function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

export async function uploadAvatar(uid: string, prepared: PreparedAvatar, previousUrl?: string | null): Promise<string> {
  const { blob, ext, type } = prepared;
  const path = `${uid}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  const prev = pathFromUrl(previousUrl);
  if (prev && prev.startsWith(`${uid}/`) && prev !== path) {
    void supabase.storage.from(BUCKET).remove([prev]);
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteAllAvatars(uid: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).list(uid, { limit: 100 });
  if (error) throw error;
  if (data && data.length > 0) {
    const { error: rmError } = await supabase.storage.from(BUCKET).remove(data.map((f) => `${uid}/${f.name}`));
    if (rmError) throw rmError;
  }
}
