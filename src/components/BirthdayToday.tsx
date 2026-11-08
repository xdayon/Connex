import { Link } from "react-router";
import { Cake } from "lucide-react";
import { Avatar } from "./ui/Avatar";
import { Card } from "./ui/Card";
import { strings } from "../i18n/strings";
import { supabase } from "../lib/supabase";
import { profileName, type ContactProfile } from "../lib/types";
import { useAsync } from "../lib/useAsync";

type Row = { id: string; contact: Pick<ContactProfile, "id" | "handle" | "display_name" | "avatar_url"> };

// Conexões que fazem aniversário hoje (dia e mês locais). Não renderiza nada se não houver ninguém.
export function BirthdayToday() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const { data } = useAsync(async () => {
    const { data: rows, error } = await supabase
      .from("connections")
      .select("id, contact:profiles!connections_contact_id_fkey!inner(id,handle,display_name,avatar_url)")
      .eq("contact.birth_day", day)
      .eq("contact.birth_month", month);
    if (error) throw error;
    return rows as unknown as Row[];
  }, [day, month]);

  if (!data || data.length === 0) return null;
  return (
    <Card className="w-full p-4">
      <h2 className="flex items-center gap-2 font-display font-semibold">
        <Cake size={18} className="text-lilac" aria-hidden />
        {strings.badge.birthdayToday}
      </h2>
      <ul className="mt-2 flex flex-col">
        {data.map((r) => {
          const name = profileName(r.contact);
          return (
            <li key={r.id}>
              <Link to={`/connections/${r.id}`} className="flex min-h-12 items-center gap-3 rounded-2xl py-1 hover:bg-surface-2">
                <Avatar src={r.contact.avatar_url} name={name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
