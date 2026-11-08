import { useCallback, useEffect, useState } from "react";
import { proofCluster, proofsEnabled, sealState, type Proof, type SealState } from "./proofs";
import { supabase } from "./supabase";

const POLL_MS = 5000;

export type Seal = { enabled: boolean; mine?: Proof; theirs?: Proof; state: SealState; reload: () => Promise<void> };

// Estado do selo de encontro entre mim e uma pessoa, ao vivo: quando ela assina a metade
// dela, a tela atualiza sozinha (Realtime na tabela proofs). Se o Realtime cair, uma
// consulta a cada 5 s cobre enquanto alguém espera a outra metade.
export function useSeal(me: string | undefined, contactId: string | undefined): Seal {
  const [enabled, setEnabled] = useState(false);
  const [mine, setMine] = useState<Proof | undefined>();
  const [theirs, setTheirs] = useState<Proof | undefined>();

  useEffect(() => {
    let alive = true;
    void proofsEnabled().then((ok) => alive && setEnabled(ok));
    return () => {
      alive = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!me || !contactId) return;
    const { data, error } = await supabase
      .from("proofs")
      .select("*")
      .eq("kind", "meet")
      .eq("cluster", proofCluster)
      .or(`and(user_id.eq.${me},contact_id.eq.${contactId}),and(user_id.eq.${contactId},contact_id.eq.${me})`);
    if (error || !data) return;
    const rows = data as Proof[];
    setMine(rows.find((r) => r.user_id === me));
    setTheirs(rows.find((r) => r.user_id === contactId));
  }, [me, contactId]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  // As linhas da outra pessoa que apontam para mim. O filtro do Realtime aceita uma coluna só;
  // o resto (quem é a pessoa, o cluster) é conferido aqui.
  useEffect(() => {
    if (!enabled || !me || !contactId) return;
    const channel = supabase
      // Sufixo aleatório: a página da conexão e a tela "conectado" podem ouvir o mesmo par ao mesmo tempo.
      .channel(`seal:${me}:${contactId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "proofs", filter: `contact_id=eq.${me}` }, (p) => {
        const row = p.new as Partial<Proof>;
        if (row.user_id === contactId && row.kind === "meet" && row.cluster === proofCluster) setTheirs(row as Proof);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, me, contactId]);

  const state = sealState(mine, theirs);

  useEffect(() => {
    if (!enabled || state !== "mine") return;
    const id = window.setInterval(() => void reload(), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, state, reload]);

  return { enabled, mine, theirs, state, reload };
}
