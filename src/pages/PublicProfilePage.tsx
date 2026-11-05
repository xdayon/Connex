import { useParams } from "react-router";
import { UserRound } from "lucide-react";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { strings } from "../i18n/strings";

export function PublicProfilePage() {
  const { handle } = useParams();
  const s = strings.publicProfile;
  return (
    <PagePlaceholder title={s.title} description={s.description} icon={UserRound} empty={s.empty} emptyHint={s.emptyHint}>
      <p className="mt-3 break-all font-mono text-volt">@{handle}</p>
    </PagePlaceholder>
  );
}
