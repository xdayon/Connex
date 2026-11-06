import { useState } from "react";
import { useParams } from "react-router";
import { CalendarX, Copy, MapPin, Share2, UserPlus, Users } from "lucide-react";
import { LinkButtons, ProfileExtras, ProfileHeader } from "../components/ProfileDetails";
import { QRCode } from "../components/QRCode";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Sheet } from "../components/ui/Sheet";
import { Skeleton } from "../components/ui/Skeleton";
import { Switch } from "../components/ui/Switch";
import { useToast } from "../components/ui/Toast";
import { strings } from "../i18n/strings";
import { copyText } from "../lib/clipboard";
import { setCurrentEventId, useCurrentEventId } from "../lib/currentEvent";
import { friendlyError } from "../lib/errors";
import { formatDateTime } from "../lib/format";
import { supabase } from "../lib/supabase";
import { profileName, type EventRow, type Profile } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../providers/AuthProvider";

const t = strings.events;

type Attendee = { user_id: string; visible: boolean; profile: Profile | null };

export function EventDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const currentId = useCurrentEventId();
  const [selected, setSelected] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const { data: ev, error: e1 } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    if (e1) throw e1;
    if (!ev) return null;
    const { data: rows, error: e2 } = await supabase
      .from("event_attendees")
      .select("user_id, visible, profile:profiles!event_attendees_user_id_fkey(*)")
      .eq("event_id", id);
    if (e2) throw e2;
    return { event: ev as EventRow, attendees: (rows ?? []) as unknown as Attendee[] };
  }, [id]);

  if (loading) {
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

  const { event, attendees } = data;
  const me = attendees.find((a) => a.user_id === user?.id);
  const others = attendees.filter((a) => a.user_id !== user?.id && a.visible && a.profile?.handle);
  const isCurrent = currentId === event.id;
  const link = `${window.location.origin}/e/${event.join_code}`;

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

  const saveContact = async () => {
    if (!selected?.handle) return;
    setSaving(true);
    const { error: err } = await supabase.rpc("connect", { p_handle: selected.handle, p_token: null, p_event_id: event.id });
    setSaving(false);
    if (err) return toast(friendlyError(err), "error");
    toast(t.contactSaved, "success");
    setSelected(null);
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
      </div>

      <Card className="flex flex-col items-center gap-4 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">{t.code}</p>
        <p className="font-mono text-4xl font-bold tracking-[0.25em] text-volt">{event.join_code}</p>
        <div className="rounded-3xl bg-white p-2">
          <QRCode value={link} size={200} label={t.qrHint} />
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
      </Card>

      <Button variant={isCurrent ? "secondary" : "primary"} size="lg" full onClick={toggleCurrent}>
        {isCurrent ? t.clearCurrent : t.setCurrent}
      </Button>

      {me && (
        <Card className="p-5">
          <Switch checked={me.visible} onChange={toggleVisible} label={t.visible} hint={t.visibleHint} />
        </Card>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Users size={18} className="text-violet" aria-hidden />
          {t.attendees}
        </h2>
        {others.length === 0 ? (
          <EmptyState icon={Users} title={t.attendeesEmpty} hint={t.attendeesEmptyHint} />
        ) : (
          <ul className="flex flex-col gap-2">
            {others.map((a) => (
              <li key={a.user_id}>
                <button
                  type="button"
                  onClick={() => setSelected(a.profile)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-card border border-line bg-surface p-3 text-left transition active:scale-[0.99]"
                >
                  <Avatar src={a.profile?.avatar_url} name={profileName(a.profile)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{profileName(a.profile)}</p>
                    {a.profile?.headline && <p className="truncate text-sm text-muted">{a.profile.headline}</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? profileName(selected) : ""} hideTitle>
        {selected && (
          <div className="-mt-4 flex flex-col gap-5">
            <ProfileHeader profile={selected} />
            <Button size="lg" full loading={saving} onClick={saveContact} icon={<UserPlus size={18} aria-hidden />}>
              {t.saveContact}
            </Button>
            <LinkButtons profile={selected} />
            <ProfileExtras profile={selected} />
          </div>
        )}
      </Sheet>
    </section>
  );
}
