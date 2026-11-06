import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Calendar, ChevronRight, KeyRound, MapPin, Plus } from "lucide-react";
import { Button, buttonClass } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Sheet } from "../components/ui/Sheet";
import { Skeleton } from "../components/ui/Skeleton";
import { TextArea, TextField } from "../components/ui/TextField";
import { useToast } from "../components/ui/Toast";
import { strings } from "../i18n/strings";
import { setCurrentEventId, useCurrentEventId } from "../lib/currentEvent";
import { friendlyError } from "../lib/errors";
import { formatDateTime } from "../lib/format";
import { checkInToEvent } from "../lib/liveEvents";
import { supabase } from "../lib/supabase";
import type { EventRow } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../providers/AuthProvider";

const t = strings.events;

function EventMeta({ ev, code = false }: { ev: EventRow; code?: boolean }) {
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
      {ev.starts_at && <span>{formatDateTime(ev.starts_at)}</span>}
      {ev.location && (
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} aria-hidden />
          {ev.location}
        </span>
      )}
      {code && <span className="font-mono text-xs">{ev.join_code}</span>}
    </p>
  );
}

export function EventsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const currentId = useCurrentEventId();
  const [sheet, setSheet] = useState<"create" | "join" | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const { data, loading, error: loadError, reload } = useAsync(async () => {
    const [evs, mine] = await Promise.all([
      supabase.from("events").select("*").order("created_at", { ascending: false }),
      supabase.from("event_attendees").select("event_id").eq("user_id", user?.id ?? ""),
    ]);
    if (evs.error) throw evs.error;
    if (mine.error) throw mine.error;
    const joined = new Set((mine.data ?? []).map((r) => r.event_id as string));
    const now = Date.now();
    const rows = evs.data as EventRow[];
    const isLive = (ev: EventRow) => ev.listed && (!ev.ends_at || new Date(ev.ends_at).getTime() > now);
    return {
      live: rows.filter(isLive).map((ev) => ({ ev, joined: joined.has(ev.id) })),
      mine: rows.filter((ev) => joined.has(ev.id) || ev.created_by === user?.id),
    };
  }, [user?.id]);

  const checkIn = async (id: string) => {
    setCheckingIn(id);
    try {
      await checkInToEvent(id);
      toast(t.joined, "success");
      navigate(`/events/${id}`);
    } catch (e) {
      setCheckingIn(null);
      toast(friendlyError(e), "error");
    }
  };

  const close = () => {
    if (busy) return;
    setSheet(null);
    setError(null);
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 3 || n.length > 80) return setError(t.nameInvalid);
    if (starts && ends && new Date(ends) < new Date(starts)) return setError(t.endBeforeStart);
    setError(null);
    setBusy(true);
    const { data: row, error: err } = await supabase.rpc("create_event", {
      p_name: n,
      p_description: description.trim() || null,
      p_location: location.trim() || null,
      p_starts_at: starts ? new Date(starts).toISOString() : null,
      p_ends_at: ends ? new Date(ends).toISOString() : null,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err));
    const ev = row as EventRow;
    setCurrentEventId(ev.id);
    toast(t.created, "success");
    navigate(`/events/${ev.id}`);
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length !== 6) return setError(t.codeInvalid);
    setError(null);
    setBusy(true);
    const { data: row, error: err } = await supabase.rpc("join_event", { p_code: c });
    setBusy(false);
    if (err) return setError(friendlyError(err));
    const ev = row as EventRow;
    setCurrentEventId(ev.id);
    toast(t.joined, "success");
    navigate(`/events/${ev.id}`);
  };

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">{t.title}</h1>
        <p className="mt-1 text-muted">{t.hint}</p>
      </div>
      <div className="flex gap-3">
        <Button full icon={<Plus size={18} aria-hidden />} onClick={() => setSheet("create")}>
          {t.create}
        </Button>
        <Button full variant="secondary" icon={<KeyRound size={18} aria-hidden />} onClick={() => setSheet("join")}>
          {t.join}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : loadError ? (
        <EmptyState icon={Calendar} title={t.errorTitle} hint={friendlyError(loadError)} action={<Button onClick={reload}>{strings.common.retry}</Button>} />
      ) : (
        <>
          {data && data.live.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-semibold">{t.liveNow}</h2>
              <ul className="flex flex-col gap-3">
                {data.live.map(({ ev, joined }) => (
                  <li key={ev.id}>
                    <Card className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-semibold">{ev.name}</p>
                        <EventMeta ev={ev} />
                      </div>
                      {joined ? (
                        <Link to={`/events/${ev.id}`} className={buttonClass({ variant: "secondary", size: "sm" })}>
                          {t.open}
                        </Link>
                      ) : (
                        <Button size="sm" loading={checkingIn === ev.id} disabled={checkingIn !== null} onClick={() => void checkIn(ev.id)}>
                          {t.checkIn}
                        </Button>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="mb-3 font-display text-lg font-semibold">{t.yourEvents}</h2>
            {!data || data.mine.length === 0 ? (
              <EmptyState icon={Calendar} title={t.empty} hint={t.emptyHint} />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.mine.map((ev) => (
                  <li key={ev.id}>
                    <Link
                      to={`/events/${ev.id}`}
                      className="flex min-h-20 items-center gap-3 rounded-card border border-line bg-surface p-4 transition active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className="truncate font-display font-semibold">{ev.name}</span>
                          {ev.id === currentId && (
                            <span className="shrink-0 rounded-full bg-volt/15 px-2 py-0.5 text-xs font-semibold text-volt">{t.current}</span>
                          )}
                        </p>
                        <EventMeta ev={ev} code />
                      </div>
                      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Sheet open={sheet === "create"} onClose={close} title={t.create}>
        <form onSubmit={create} className="flex flex-col gap-4" noValidate>
          <p className="-mt-2 text-sm text-muted">{t.organizerHint}</p>
          <TextField label={t.name} value={name} maxLength={80} placeholder={t.namePlaceholder} onChange={(e) => setName(e.target.value)} />
          <TextField label={t.location} value={location} maxLength={120} placeholder={t.locationPlaceholder} onChange={(e) => setLocation(e.target.value)} />
          <TextArea label={t.description} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
          <TextField label={t.starts} type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
          <TextField label={t.ends} type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" full loading={busy}>
            {t.createSubmit}
          </Button>
        </form>
      </Sheet>

      <Sheet open={sheet === "join"} onClose={close} title={t.join}>
        <form onSubmit={join} className="flex flex-col gap-4" noValidate>
          <TextField
            label={t.codeLabel}
            value={code}
            maxLength={6}
            placeholder={t.codePlaceholder}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="text-center font-mono text-xl uppercase tracking-[0.3em]"
            error={error}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button type="submit" size="lg" full loading={busy}>
            {t.joinSubmit}
          </Button>
        </form>
      </Sheet>
    </section>
  );
}
