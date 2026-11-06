import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { MapPin } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { TextField } from "../ui/TextField";
import { useToast } from "../ui/Toast";
import { strings } from "../../i18n/strings";
import { setCurrentEventId } from "../../lib/currentEvent";
import { friendlyError } from "../../lib/errors";
import { formatDateTime } from "../../lib/format";
import { checkInToEvent, fetchLiveEvents } from "../../lib/liveEvents";
import { supabase } from "../../lib/supabase";
import type { EventRow } from "../../lib/types";
import { useAsync } from "../../lib/useAsync";

export function StepEvent() {
  const navigate = useNavigate();
  const toast = useToast();
  const t = strings.events;
  const w = strings.welcomeSteps;
  const { data, loading } = useAsync(fetchLiveEvents, []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const checkIn = async (id: string) => {
    setBusyId(id);
    try {
      await checkInToEvent(id);
      navigate(`/events/${id}`, { replace: true });
    } catch (e) {
      setBusyId(null);
      toast(friendlyError(e), "error");
    }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length !== 6) return setCodeError(t.codeInvalid);
    setCodeError(null);
    setJoining(true);
    const { data: row, error } = await supabase.rpc("join_event", { p_code: c });
    setJoining(false);
    if (error) return setCodeError(friendlyError(error));
    const ev = row as EventRow;
    setCurrentEventId(ev.id);
    toast(t.joined, "success");
    navigate(`/events/${ev.id}`, { replace: true });
  };

  return (
    <div className="mt-6 flex flex-col gap-5">
      {loading ? (
        <Skeleton className="h-20" />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted">{w.noLiveEvents}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((ev) => (
            <li key={ev.id}>
              <Card className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold">{ev.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                    {ev.starts_at && <span>{formatDateTime(ev.starts_at)}</span>}
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} aria-hidden />
                        {ev.location}
                      </span>
                    )}
                  </p>
                </div>
                <Button size="sm" loading={busyId === ev.id} disabled={busyId !== null} onClick={() => void checkIn(ev.id)}>
                  {t.checkIn}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={join} className="flex flex-col gap-3" noValidate>
        <TextField
          label={w.haveCode}
          value={code}
          maxLength={6}
          placeholder={t.codePlaceholder}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="text-center font-mono text-xl uppercase tracking-[0.3em]"
          error={codeError}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Button type="submit" variant="secondary" full loading={joining} disabled={busyId !== null}>
          {t.joinSubmit}
        </Button>
      </form>

      <Button variant="ghost" full disabled={busyId !== null || joining} onClick={() => navigate("/", { replace: true })}>
        {w.skipEvent}
      </Button>
    </div>
  );
}
