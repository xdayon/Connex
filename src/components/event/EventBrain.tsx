import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { strings } from "../../i18n/strings";
import { loadSeals } from "../../lib/proofs";
import { supabase } from "../../lib/supabase";
import { CONNECTION_SELECT, profileName, type ConnectionWithContact, type EventPerson } from "../../lib/types";
import { useAsync } from "../../lib/useAsync";
import { useAuth } from "../../providers/AuthProvider";
import { Skeleton } from "../ui/Skeleton";

const BrainGraph = lazy(() => import("../BrainGraph").then((m) => ({ default: m.BrainGraph })));

type Props = { eventId: string; people: EventPerson[]; onPerson: (p: EventPerson) => void };

// Brain do evento: as suas conexões feitas aqui ou presentes aqui (inclusive quem se escondeu da
// lista, porque já está na sua rede) e, num anel de fora, quem está no evento e você ainda não
// conhece. Tocar num desconhecido abre o mesmo cartão da lista.
export function EventBrain({ eventId, people, onPerson }: Props) {
  const t = strings.events;
  const { user } = useAuth();
  const [sealed, setSealed] = useState<Set<string>>();
  const { data } = useAsync(async () => {
    const { data: rows, error } = await supabase.from("connections").select(CONNECTION_SELECT);
    if (error) throw error;
    return rows as ConnectionWithContact[];
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void loadSeals(user.id).then((m) => {
      if (alive) setSealed(new Set(Object.keys(m).filter((k) => m[k] === "sealed")));
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const mine = useMemo(() => {
    const here = new Set(people.map((p) => p.user_id));
    return (data ?? []).filter((c) => c.event?.id === eventId || here.has(c.contact_id));
  }, [data, people, eventId]);

  const strangers = useMemo(
    () => people.filter((p) => !p.in_network).map((p) => ({ id: p.user_id, name: profileName(p), avatar: p.avatar_url })),
    [people],
  );

  if (!data) return <Skeleton className="h-[60vh] min-h-80" />;

  return (
    <div className="flex flex-col gap-2">
      <Suspense fallback={<Skeleton className="h-[60vh] min-h-80" />}>
        <BrainGraph
          connections={mine}
          sealed={sealed}
          strangers={strangers}
          onStranger={(id) => {
            const p = people.find((x) => x.user_id === id);
            if (p) onPerson(p);
          }}
        />
      </Suspense>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full border-2 border-cyan" />
          {t.brainMet(mine.length)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full border-2 border-dashed border-muted" />
          {t.brainNotMet(strangers.length)}
        </span>
      </p>
    </div>
  );
}
