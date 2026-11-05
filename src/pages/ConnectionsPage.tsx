import { Users } from "lucide-react";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { strings } from "../i18n/strings";

export function ConnectionsPage() {
  const s = strings.connections;
  return <PagePlaceholder title={s.title} description={s.description} icon={Users} empty={s.empty} emptyHint={s.emptyHint} />;
}
