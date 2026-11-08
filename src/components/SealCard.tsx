import { SealPanel } from "./SealPanel";
import { profileName } from "../lib/types";
import { useSeal } from "../lib/useSeal";
import { useAuth } from "../providers/AuthProvider";

type Props = { me: string; contactId: string; name: string; avatar?: string | null };

// Selo de encontro na página da conexão: só aparece em conexões verificadas e com as provas ligadas.
export function SealCard({ me, contactId, name, avatar }: Props) {
  const { profile } = useAuth();
  const seal = useSeal(me, contactId);
  return <SealPanel seal={seal} contactId={contactId} me={{ name: profileName(profile), avatar: profile?.avatar_url }} contact={{ name, avatar }} />;
}
