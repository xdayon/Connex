import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Sheet } from "./ui/Sheet";
import { Avatar } from "./ui/Avatar";
import { SealPanel } from "./SealPanel";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { TextArea } from "./ui/TextField";
import { useToast } from "./ui/Toast";
import { VerifiedBadge } from "./ui/VerifiedBadge";
import { strings } from "../i18n/strings";
import { supabase } from "../lib/supabase";
import { profileName, type ConnectionWithContact } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";
import { useSeal } from "../lib/useSeal";

export const QUICK_TAGS = ["Builder", "Founder", "Investor", "Designer", "Dev", "Follow up"];

type Props = {
  connection: ConnectionWithContact | null;
  onClose: () => void;
  onSaved?: (id: string, note: string | null, tags: string[]) => void;
  showViewProfile?: boolean;
};

export function ConnectedSheet({ connection, onClose, onSaved, showViewProfile = true }: Props) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const id = connection?.id;

  useEffect(() => {
    setNote(connection?.note ?? "");
    setTags(connection?.tags ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const t = strings.connected;
  const contact = connection?.contact ?? null;
  const name = profileName(contact);
  const seal = useSeal(connection?.verified ? profile?.id : undefined, connection?.verified ? connection.contact_id : undefined);

  const save = async (): Promise<boolean> => {
    if (!connection) return true;
    const nextNote = note.trim() || null;
    if (nextNote === (connection.note ?? null) && tags.join("\u0000") === connection.tags.join("\u0000")) return true;
    setBusy(true);
    const { error } = await supabase.from("connections").update({ note: nextNote, tags }).eq("id", connection.id);
    setBusy(false);
    if (error) {
      toast(t.saveFailed, "error");
      return false;
    }
    onSaved?.(connection.id, nextNote, tags);
    return true;
  };

  const done = async (view: boolean) => {
    if (!(await save())) return;
    onClose();
    if (view && connection) navigate(`/connections/${connection.id}`);
  };

  const toggle = (tag: string) => setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag].slice(0, 20)));

  return (
    <Sheet open={!!connection} onClose={() => void done(false)} title={t.title} hideTitle>
      {connection && (
        <div className="-mt-6 flex flex-col items-center text-center">
          {/* Os dois chegam de lados opostos e a linha (lilás de um lado, ciano do outro) se fecha
              no ponto: o símbolo do conneX desenhado pela própria conexão. */}
          <div className="relative flex items-center justify-center pt-2">
            <div aria-hidden className="anim-meet-glow pointer-events-none absolute inset-x-4 top-1/2 h-20 -translate-y-1/2 rounded-full bg-linear-to-r from-lilac/35 to-cyan/35 blur-2xl" />
            <div className="anim-meet-left relative rounded-full bg-linear-to-br from-lilac to-lilac/30 p-[3px]">
              <Avatar src={profile?.avatar_url} name={profileName(profile)} size="lg" className="border-[3px] border-surface" />
            </div>
            <div aria-hidden className="relative mx-1.5 flex w-14 items-center">
              <span className="anim-link-l h-0.5 flex-1 rounded-full bg-linear-to-r from-lilac/40 to-lilac" />
              <span className="anim-link-dot mx-0.5 size-2.5 shrink-0 rounded-full bg-text shadow-[0_0_14px_2px_rgba(233,236,245,0.55)]" />
              <span className="anim-link-r h-0.5 flex-1 rounded-full bg-linear-to-l from-cyan/40 to-cyan" />
            </div>
            <div className="anim-meet-right relative rounded-full bg-linear-to-bl from-cyan to-cyan/30 p-[3px]">
              <Avatar src={contact?.avatar_url} name={name} size="lg" className="border-[3px] border-surface" />
            </div>
          </div>
          <h2 className="anim-pop mt-4 font-display text-2xl font-bold tracking-[-0.02em]">{connection.verified ? t.title : t.titleSaved}</h2>
          <p className="mt-1 font-medium">{name}</p>
          {contact?.handle && <p className="font-mono text-sm text-muted">@{contact.handle}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {connection.verified && <VerifiedBadge label />}
            {connection.event && (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
                {t.atEvent} {connection.event.name}
              </span>
            )}
          </div>
          {connection.verified && profile && contact && (
            <SealPanel
              seal={seal}
              contactId={connection.contact_id}
              me={{ name: profileName(profile), avatar: profile.avatar_url }}
              contact={{ name, avatar: contact.avatar_url }}
              className="anim-rise mt-5 w-full"
            />
          )}
          <div className="mt-5 w-full text-left">
            <TextArea
              label={t.noteLabel}
              value={note}
              maxLength={2000}
              placeholder={t.notePlaceholder}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2" aria-label={t.tags}>
              {QUICK_TAGS.map((tag) => (
                <Chip key={tag} selected={tags.includes(tag)} onClick={() => toggle(tag)}>
                  {tag}
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-6 flex w-full gap-3">
            {showViewProfile && (
              <Button variant="secondary" full onClick={() => void done(true)} disabled={busy}>
                {strings.common.viewProfile}
              </Button>
            )}
            <Button full loading={busy} onClick={() => void done(false)}>
              {t.done}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
