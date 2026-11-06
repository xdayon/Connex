import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { CalendarX } from "lucide-react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { strings } from "../i18n/strings";
import { setCurrentEventId } from "../lib/currentEvent";
import { friendlyError } from "../lib/errors";
import { saveIntent } from "../lib/intent";
import { supabase } from "../lib/supabase";
import type { EventRow } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";

export function EventJoinPage() {
  const { code = "" } = useParams();
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const ready = !loading && !!session && !!profile?.handle;

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    supabase.rpc("join_event", { p_code: code }).then(({ data, error: err }) => {
      if (err) return setError(friendlyError(err));
      const ev = data as EventRow;
      setCurrentEventId(ev.id);
      toast(strings.events.joined, "success");
      navigate(`/events/${ev.id}`, { replace: true });
    });
  }, [ready, code, navigate, toast]);

  useEffect(() => {
    if (!loading && (!session || !profile)) saveIntent({ path: `/e/${code}` });
  }, [loading, session, profile, code]);

  if (!loading && (!session || !profile)) return <Navigate to="/" replace />;
  if (!loading && profile && !profile.handle) {
    saveIntent({ path: `/e/${code}` });
    return <Navigate to="/welcome" replace />;
  }
  if (error) {
    return (
      <EmptyState
        icon={CalendarX}
        title={strings.events.notFound}
        hint={error}
        action={<Button onClick={() => navigate("/events")}>{strings.events.title}</Button>}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={strings.events.joining}>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-32" />
    </div>
  );
}
