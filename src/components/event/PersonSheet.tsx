import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Building2, LockKeyhole, ScanLine, UserCheck, UserPlus } from "lucide-react";
import { ChipGroup, LinkButtons } from "../ProfileDetails";
import { Avatar } from "../ui/Avatar";
import { Button, buttonClass } from "../ui/Button";
import { Sheet } from "../ui/Sheet";
import { VerifiedBadge } from "../ui/VerifiedBadge";
import { useToast } from "../ui/Toast";
import { strings } from "../../i18n/strings";
import { friendlyError } from "../../lib/errors";
import { supabase } from "../../lib/supabase";
import { CONNECTION_SELECT, profileName, type ConnectionWithContact, type EventPerson } from "../../lib/types";

type Props = { person: EventPerson | null; eventId: string; onClose: () => void; onUnlocked: () => void };

export function PersonSheet({ person, eventId, onClose, onUnlocked }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const t = strings.events;
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [full, setFull] = useState<ConnectionWithContact | null>(null);
  const userId = person?.user_id;
  const inNetwork = !!person && (person.in_network || unlocked);

  useEffect(() => {
    setUnlocked(false);
    setFull(null);
  }, [userId]);

  useEffect(() => {
    if (!userId || !inNetwork) return;
    let alive = true;
    void supabase
      .from("connections")
      .select(CONNECTION_SELECT)
      .eq("contact_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data) setFull(data as ConnectionWithContact);
      });
    return () => {
      alive = false;
    };
  }, [userId, inNetwork]);

  const openInNetwork = async () => {
    if (!person) return;
    setBusy(true);
    const { data, error } = await supabase.from("connections").select("id").eq("contact_id", person.user_id).maybeSingle();
    setBusy(false);
    if (error || !data) return toast(friendlyError(error), "error");
    navigate(`/connections/${data.id as string}`);
  };

  const unlock = async () => {
    if (!person) return;
    setBusy(true);
    const { error } = await supabase.rpc("connect", { p_handle: person.handle, p_token: null, p_event_id: eventId, p_share: null });
    setBusy(false);
    if (error) return toast(friendlyError(error), "error");
    toast(t.unlocked, "success");
    setUnlocked(true);
    onUnlocked();
  };

  const name = person ? profileName(person) : "";

  return (
    <Sheet open={!!person} onClose={onClose} title={name} hideTitle>
      {person && (
        <div className="-mt-4 flex flex-col gap-5">
          <div className="flex flex-col items-center text-center">
            <Avatar src={person.avatar_url} name={name} size="xl" />
            <h1 className="mt-3 break-words font-display text-2xl font-bold tracking-[-0.02em]">{name}</h1>
            <p className="font-mono text-sm text-cyan">@{person.handle}</p>
            {person.seeker_verified && (
              <span className="mt-2 inline-flex items-center rounded-full bg-lilac/20 px-2.5 py-1 text-xs font-semibold text-lilac">{strings.ui.seeker}</span>
            )}
            {person.verified && <VerifiedBadge label className="mt-2" />}
            {person.headline && <p className="mt-2 max-w-80 break-words">{person.headline}</p>}
            {person.company && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
                <Building2 size={14} aria-hidden />
                {person.company}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <ChipGroup title={strings.publicProfile.skills} items={person.skills} />
            <ChipGroup title={strings.publicProfile.lookingFor} items={person.looking_for} />
            <ChipGroup title={strings.publicProfile.offering} items={person.offering} />
          </div>

          {inNetwork ? (
            <>
              <Button size="lg" full loading={busy} onClick={openInNetwork} icon={<UserCheck size={18} aria-hidden />}>
                {t.openInNetwork}
              </Button>
              {full && <LinkButtons links={full.shared_links} wallet={full.shared_wallet} />}
            </>
          ) : person.is_public ? (
            <Button size="lg" full loading={busy} onClick={unlock} icon={<UserPlus size={18} aria-hidden />}>
              {t.unlockContact}
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="flex items-start gap-2 text-sm text-muted">
                <LockKeyhole size={16} className="mt-0.5 shrink-0" aria-hidden />
                {t.privateProfile}
              </p>
              <Link to="/scan" className={buttonClass({ variant: "secondary", size: "lg", full: true })}>
                <ScanLine size={18} aria-hidden />
                {t.scanBadge}
              </Link>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
