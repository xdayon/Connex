import { setCurrentEventId } from "./currentEvent";
import { supabase } from "./supabase";
import type { EventRow } from "./types";

export async function fetchLiveEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("listed", true)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function checkInToEvent(id: string): Promise<EventRow> {
  const { data, error } = await supabase.rpc("check_in", { p_event: id });
  if (error) throw error;
  setCurrentEventId(id);
  return data as EventRow;
}
