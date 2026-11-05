import { ScanLine } from "lucide-react";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { strings } from "../i18n/strings";

export function ScanPage() {
  const s = strings.scan;
  return <PagePlaceholder title={s.title} description={s.description} icon={ScanLine} empty={s.empty} emptyHint={s.emptyHint} />;
}
