import { Calendar } from "lucide-react";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { strings } from "../i18n/strings";

export function EventsPage() {
  const s = strings.events;
  return <PagePlaceholder title={s.title} description={s.description} icon={Calendar} empty={s.empty} emptyHint={s.emptyHint} />;
}
