import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "./config";

export const supabase = supabaseUrl && supabasePublishableKey ? createClient(supabaseUrl, supabasePublishableKey) : null;
