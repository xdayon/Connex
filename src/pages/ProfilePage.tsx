import { User } from "lucide-react";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { strings } from "../i18n/strings";

export function ProfilePage() {
  const s = strings.me;
  return <PagePlaceholder title={s.title} description={s.description} icon={User} empty={s.empty} emptyHint={s.emptyHint} />;
}
