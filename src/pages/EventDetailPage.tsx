import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { CalendarX, Check, ChevronDown, Copy, ExternalLink, List, MapPin, Network, Pencil, QrCode, Share2, ShieldCheck, Users } from "lucide-react";
import { EventBrain } from "../components/event/EventBrain";
import { EventEditSheet } from "../components/event/EventEditSheet";
import { PersonSheet } from "../components/event/PersonSheet";
import { PresenceProofSheet } from "../components/PresenceProofSheet";
import { PresenceQrSheet } from "../components/PresenceQrSheet";
import { QRCode } from "../components/QRCode";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { SealedBadge } from "../components/ui/SealedBadge";
import { Switch } from "../components/ui/Switch";
import { useToast } from "../components/ui/Toast";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { strings } from "../i18n/strings";
import { copyText } from "../lib/clipboard";
import { setCurrentEventId, useCurrentEventId } from "../lib/currentEvent";
import { friendlyError } from "../lib/errors";
import { formatDateTime } from "../lib/format";
import { checkInToEvent } from "../lib/liveEvents";
import { matchPerson, type MatchReason } from "../lib/matching";
import { explorerTx, proofCluster, proofsEnabled, type Proof } from "../lib/proofs";
import { supabase } from "../lib/supabase";
import { profileName, type EventPerson, type EventRow } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../providers/AuthProvider";

const t = strings.events;
const t2 = strings.presence;

type Filter = "matches" | "everyone";

function reasonText(r: MatchReason): string {
  return r.kind === "offers" ? t.reasonOffers(r.item) : r.kind === "looking" ? t.reasonLooking(r.item) : t.reasonAlso(r.item);
}

export function EventDetailPage() {
  const { id = "" } = useParams();
  const { user, profile } = useAuth();
  const toast = useToast();
  const currentId = useCurrentEventId();
  const [selected, setSelected] = useState<EventPerson | null>(null);
  const [filter, setFilter] = useState<Filter | null>(null);
  // Quem está aqui: em lista ou no Brain do evento.
  const [peopleView, setPeopleView] = useState<"list" | "graph">("list");
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState<boolean | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [params, setParams] = useSearchParams();
  const presenceToken = params.get("presence");
  const [proofsOn, setProofsOn] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [proveOpen, setProveOpen] = useState(false);
  const [attend, setAttend] = useState<Proof | null>(null);
  const [attendLoaded, setAttendLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void proofsEnabled().then((ok) => alive && setProofsOn(ok));
    return () => {
      alive = false;
    };
  }, []);

  const loadAttend = async () => {
    if (!user) return;
    const { data: row } = await supabase
      .from("proofs")
      .select("*")
      .eq("kind", "attend")
      .eq("cluster", proofCluster)
      .eq("user_id", user.id)
      .eq("event_id", id)
      .maybeSingle();
    setAttend((row as Proof | null) ?? null);
    setAttendLoaded(true);
  };

  useEffect(() => {
    setAttendLoaded(false);
    void loadAttend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const attended = attend?.status === "confirmed";

  // Chegou pelo QR de presença e ainda não provou: abre a folha de prova sozinha.
  useEffect(() => {
    if (presenceToken && attendLoaded && !attended && proofsOn) setProveOpen(true);
  }, [presenceToken, attendLoaded, attended, proofsOn]);

  const { data, loading, error, reload } = useAsync(async () => {
    const { data: ev, error: e1 } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    if (e1) throw e1;
    if (!ev) return null;
    const { data: mine, error: e2 } = await supabase
      .from("event_attendees")
      .select("visible")
      .eq("event_id", id)
      .eq("user_id", user?.id ?? "")
      .maybeSingle();
    if (e2) throw e2;
    let people: EventPerson[] = [];
    if (mine) {
      const { data: rows, error: e3 } = await supabase.rpc("event_people", { p_event: id });
      if (e3) throw e3;
      people = (rows ?? []) as EventPerson[];
    }
    return { event: ev as EventRow, attendee: mine as { visible: boolean } | null, people };
  }, [id, user?.id]);

  const scored = useMemo(() => {
    return (data?.people ?? [])
      .filter((p) => !p.is_me)
      .map((p) => ({ p, m: profile ? matchPerson(p, profile) : { score: 0, reason: null } }))
      .sort((x, y) => y.m.score - x.m.score);
  }, [data, profile]);

  if (loading && (!data || data.event.id !== id)) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (error) {
    return <EmptyState icon={CalendarX} title={t.errorTitle} hint={friendlyError(error)} action={<Button onClick={reload}>{strings.common.retry}</Button>} />;
  }
  if (!data) return <EmptyState icon={CalendarX} title={t.notFound} hint={t.notFoundHint} />;

  const { event, attendee } = data;
  const isCurrent = currentId === event.id;
  const link = `${window.location.origin}/e/${event.join_code}`;
  const matches = scored.filter((x) => x.m.score > 0);
  const activeFilter: Filter = filter ?? (matches.length > 0 ? "matches" : "everyone");
  const shown = activeFilter === "matches" ? matches : scored;
  const invite = inviteOpen ?? event.created_by === user?.id;

  const checkIn = async () => {
    setCheckingIn(true);
    try {
      await checkInToEvent(event.id);
      toast(t.joined, "success");
      reload();
    } catch (e) {
      toast(friendlyError(e), "error");
    } finally {
      setCheckingIn(false);
    }
  };

  const toggleVisible = async (v: boolean) => {
    if (!user) return;
    const { error: err } = await supabase.from("event_attendees").update({ visible: v }).eq("event_id", event.id).eq("user_id", user.id);
    if (err) return toast(friendlyError(err), "error");
    reload();
  };

  const toggleCurrent = () => {
    setCurrentEventId(isCurrent ? null : event.id);
    toast(isCurrent ? t.currentCleared : t.currentSet, "success");
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: event.name, url: link });
        return;
      }
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
    }
    toast((await copyText(link)) ? strings.badge.linkCopied : strings.errors.generic, "success");
  };

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="break-words font-display text-3xl font-bold tracking-[-0.02em]">{event.name}</h1>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {event.starts_at && <span>{formatDateTime(event.starts_at)}</span>}
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} aria-hidden />
              {event.location}
            </span>
          )}
        </p>
        {event.description && <p className="mt-3 whitespace-pre-line break-words text-sm">{event.description}</p>}
        {attended && attend?.signature && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <SealedBadge label text={t2.proved} />
            <a href={explorerTx(attend.signature)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-cyan underline-offset-2 hover:underline">
              {t2.viewTx}
              <ExternalLink size={14} aria-hidden />
            </a>
          </p>
        )}
      </div>

      {/* Painel de quem organiza: editar o evento e mostrar o QR de presença na entrada. */}
      {event.created_by === user?.id && (
        <Card className="flex flex-col gap-3 border-lilac/30 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-lilac">
            <ShieldCheck size={16} aria-hidden />
            {t.organizerTitle}
          </p>
          <div className={`grid gap-2 ${proofsOn ? "grid-cols-2" : "grid-cols-1"}`}>
            <Button variant="secondary" full icon={<Pencil size={16} aria-hidden />} onClick={() => setEditOpen(true)}>
              {t.editEvent}
            </Button>
            {proofsOn && (
              <Button variant="secondary" full icon={<QrCode size={16} aria-hidden />} onClick={() => setQrOpen(true)}>
                {t2.button}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted">{t.organizerPanelHint}</p>
        </Card>
      )}

      {!attendee ? (
        <Button size="lg" full loading={checkingIn} onClick={checkIn}>
          {t.checkIn}
        </Button>
      ) : (
        <>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Users size={18} className="text-lilac" aria-hidden />
                {t.whosHere(scored.length)}
              </h2>
              <div role="group" aria-label={strings.brain.viewLabel} className="flex shrink-0 rounded-full border border-line bg-surface-2 p-0.5">
                {(["graph", "list"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={peopleView === v}
                    aria-label={v === "list" ? strings.brain.viewList : strings.brain.viewGraph}
                    onClick={() => setPeopleView(v)}
                    className={`inline-flex size-10 items-center justify-center rounded-full transition ${peopleView === v ? "bg-cyan text-ink" : "text-muted"}`}
                  >
                    {v === "list" ? <List size={16} aria-hidden /> : <Network size={16} aria-hidden />}
                  </button>
                ))}
              </div>
            </div>
            {peopleView === "graph" ? (
              <EventBrain eventId={event.id} people={scored.map((x) => x.p)} onPerson={setSelected} />
            ) : (
            <>
            <div className="mb-3 flex flex-wrap gap-2">
              <Chip selected={activeFilter === "matches"} onClick={() => setFilter("matches")}>
                {t.matches}
              </Chip>
              <Chip selected={activeFilter === "everyone"} onClick={() => setFilter("everyone")}>
                {t.everyone}
              </Chip>
            </div>
            {scored.length === 0 ? (
              <EmptyState icon={Users} title={t.attendeesEmpty} hint={t.attendeesEmptyHint} />
            ) : shown.length === 0 ? (
              <EmptyState icon={Users} title={t.noMatches} hint={t.noMatchesHint} />
            ) : (
              <ul className="flex flex-col gap-2">
                {shown.map(({ p, m }) => (
                  <li key={p.user_id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className="flex min-h-16 w-full items-center gap-3 rounded-card border border-line bg-surface p-3 text-left transition active:scale-[0.99]"
                    >
                      <Avatar src={p.avatar_url} name={profileName(p)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{profileName(p)}</p>
                        {m.reason && <p className="truncate text-xs font-semibold text-lilac">{reasonText(m.reason)}</p>}
                        {p.headline && <p className="truncate text-sm text-muted">{p.headline}</p>}
                        {p.skills.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.skills.slice(0, 3).map((sk) => (
                              <span key={sk} className="max-w-full truncate rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs">
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {p.in_network ? (
                        p.verified ? (
                          <VerifiedBadge text={t.inNetwork} />
                        ) : (
                          <span title={t.inNetwork} role="img" aria-label={t.inNetwork} className="inline-flex text-cyan">
                            <Check size={16} />
                          </span>
                        )
                      ) : (
                        <span className="shrink-0 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold">{t.unlock}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            </>
            )}
          </div>

          <Card className="p-5">
            <Switch checked={attendee.visible} onChange={toggleVisible} label={t.visible} hint={t.visibleHint} />
          </Card>

          <Button variant={isCurrent ? "secondary" : "primary"} size="lg" full onClick={toggleCurrent}>
            {isCurrent ? t.clearCurrent : t.setCurrent}
          </Button>

          <Card className="p-5">
            <button
              type="button"
              aria-expanded={invite}
              onClick={() => setInviteOpen(!invite)}
              className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-display text-lg font-semibold"
            >
              {t.invite}
              <ChevronDown size={18} className={`text-muted transition ${invite ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {invite && (
              <div className="mt-4 flex flex-col items-center gap-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">{t.code}</p>
                <p className="font-mono text-4xl font-bold tracking-[0.25em] text-cyan">{event.join_code}</p>
                <div className="rounded-3xl bg-white p-2">
                  <QRCode value={link} size={200} label={t.qrHint} withLogo />
                </div>
                <p className="text-sm text-muted">{t.qrHint}</p>
                <div className="flex w-full gap-3">
                  <Button full variant="secondary" icon={<Share2 size={16} aria-hidden />} onClick={share}>
                    {t.shareCode}
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label={strings.common.copy}
                    onClick={async () => toast((await copyText(event.join_code)) ? strings.common.copied : strings.errors.generic, "success")}
                    icon={<Copy size={16} aria-hidden />}
                  />
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {event.created_by === user?.id && <EventEditSheet event={event} open={editOpen} onClose={() => setEditOpen(false)} onSaved={reload} />}
      {proofsOn && event.created_by === user?.id && (
        <PresenceQrSheet open={qrOpen} onClose={() => setQrOpen(false)} eventId={event.id} joinCode={event.join_code} />
      )}
      {presenceToken && (
        <PresenceProofSheet
          open={proveOpen}
          onClose={() => setProveOpen(false)}
          eventId={event.id}
          token={presenceToken}
          onDone={() => {
            setProveOpen(false);
            const next = new URLSearchParams(params);
            next.delete("presence");
            setParams(next, { replace: true });
            void loadAttend();
            toast(t2.done, "success");
          }}
        />
      )}

      <PersonSheet person={selected} eventId={event.id} onClose={() => setSelected(null)} onUnlocked={() => {
          setSelected((s) => (s ? { ...s, in_network: true } : s));
          reload();
        }}
      />
    </section>
  );
}
