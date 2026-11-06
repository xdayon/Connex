import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Check, Copy, Lock, Trash2, UserX } from "lucide-react";
import { ConnectedSheet } from "../components/ConnectedSheet";
import { LinkButtons, ProfileExtras, ProfileHeader } from "../components/ProfileDetails";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { Sheet } from "../components/ui/Sheet";
import { Skeleton } from "../components/ui/Skeleton";
import { TextArea } from "../components/ui/TextField";
import { useToast } from "../components/ui/Toast";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { strings } from "../i18n/strings";
import { copyText } from "../lib/clipboard";
import { friendlyError } from "../lib/errors";
import { shortAddress } from "../lib/format";
import { supabase } from "../lib/supabase";
import { CONNECTION_SELECT, type ConnectionWithContact } from "../lib/types";
import { useAsync } from "../lib/useAsync";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function ConnectionDetailPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const t = strings.detail;
  const { data, setData, loading, error, reload } = useAsync(async () => {
    const { data: row, error: err } = await supabase.from("connections").select(CONNECTION_SELECT).eq("id", id).maybeSingle();
    if (err) throw err;
    return row as ConnectionWithContact | null;
  }, [id]);

  const [sheet, setSheet] = useState(params.get("new") === "1");
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") {
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data) {
      setNote(data.note ?? "");
      setSavedNote(data.note ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (error) {
    return <EmptyState icon={UserX} title={strings.connections.errorTitle} hint={friendlyError(error)} action={<Button onClick={reload}>{strings.common.retry}</Button>} />;
  }
  if (!data) {
    return (
      <EmptyState
        icon={UserX}
        title={t.notFound}
        hint={t.notFoundHint}
        action={<Button onClick={() => navigate("/connections", { replace: true })}>{strings.nav.connections}</Button>}
      />
    );
  }

  const contact = data.contact;
  const patch = (changes: Partial<ConnectionWithContact>) => setData({ ...data, ...changes });

  const saveNote = async () => {
    setSavingNote(true);
    const value = note.trim() || null;
    const { error: err } = await supabase.from("connections").update({ note: value }).eq("id", data.id);
    setSavingNote(false);
    if (err) {
      toast(friendlyError(err), "error");
      return;
    }
    patch({ note: value });
    setSavedNote(value ?? "");
    toast(t.saved, "success");
  };

  const saveTags = async (tags: string[]) => {
    const prev = data.tags;
    patch({ tags });
    const { error: err } = await supabase.from("connections").update({ tags }).eq("id", data.id);
    if (err) {
      patch({ tags: prev });
      toast(friendlyError(err), "error");
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().slice(0, 40);
    if (!tag) return;
    if (data.tags.some((x) => x.toLowerCase() === tag.toLowerCase())) {
      setTagInput("");
      return;
    }
    if (data.tags.length >= 20) {
      toast(t.tagLimit, "error");
      return;
    }
    setTagInput("");
    void saveTags([...data.tags, tag]);
  };

  const remove = async () => {
    setRemoving(true);
    const { error: err } = await supabase.from("connections").delete().eq("id", data.id);
    setRemoving(false);
    if (err) {
      toast(friendlyError(err), "error");
      return;
    }
    toast(t.removed, "success");
    navigate("/connections", { replace: true });
  };

  const noteDirty = note.trim() !== (savedNote ?? "").trim();

  return (
    <article className="flex flex-col gap-5">
      <button type="button" onClick={() => navigate(-1)} className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start px-2 text-sm text-muted hover:text-text">
        <ArrowLeft size={18} aria-hidden />
        {strings.common.back}
      </button>

      <Card className="flex flex-col gap-1 border-volt/30 p-4">
        <p className="font-display text-lg font-bold">{data.event ? `${t.metAt} ${data.event.name}` : strings.brain.met}</p>
        <p className="text-sm text-muted">{formatWhen(data.met_at)}</p>
        <p className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${data.verified ? "text-volt" : "text-muted"}`}>
          {data.verified ? <VerifiedBadge /> : null}
          {data.verified ? t.contextLive : t.contextBadge}
        </p>
      </Card>

      {contact ? (
        <>
          <Card className="p-5">
            <ProfileHeader profile={contact} />
          </Card>
          <LinkButtons profile={contact} />
          <ProfileExtras profile={contact} labels={{ skills: t.skills, lookingFor: t.lookingFor, offering: t.offering }} />
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted">{t.wallet}</p>
              <p className="font-mono text-sm">{shortAddress(contact.wallet)}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Copy size={16} aria-hidden />}
              onClick={async () => toast((await copyText(contact.wallet)) ? strings.common.copied : strings.errors.generic, "success")}
            >
              {strings.common.copy}
            </Button>
          </div>
        </>
      ) : (
        <EmptyState icon={UserX} title={t.noAccess} />
      )}

      <Card className="flex flex-col gap-4 p-4">
        <p className="flex items-center gap-2 text-xs text-muted">
          <Lock size={14} aria-hidden />
          {t.private}
        </p>
        <TextArea
          label={t.note}
          value={note}
          maxLength={2000}
          rows={4}
          placeholder={t.notePlaceholder}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          loading={savingNote}
          disabled={!noteDirty}
          variant={noteDirty ? "primary" : "secondary"}
          icon={!noteDirty ? <Check size={18} aria-hidden /> : undefined}
          onClick={saveNote}
        >
          {noteDirty ? strings.common.save : t.saved}
        </Button>

        <div>
          <p className="mb-2 text-sm font-medium">{t.tags}</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {data.tags.map((tag) => (
              <Chip key={tag} onRemove={() => void saveTags(data.tags.filter((x) => x !== tag))}>
                {tag}
              </Chip>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addTag();
            }}
          >
            <input
              value={tagInput}
              maxLength={40}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={t.tagPlaceholder}
              aria-label={t.tagPlaceholder}
              className="min-h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 text-base placeholder:text-muted/70 focus:border-volt focus:outline-none"
            />
            <Button type="submit" variant="secondary" disabled={!tagInput.trim()}>
              {t.add}
            </Button>
          </form>
        </div>
      </Card>

      <Button variant="danger" full icon={<Trash2 size={18} aria-hidden />} onClick={() => setConfirmRemove(true)}>
        {t.remove}
      </Button>

      <Sheet open={confirmRemove} onClose={() => setConfirmRemove(false)} title={t.removeTitle}>
        <p className="-mt-2 text-sm text-muted">{t.removeBody}</p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" full onClick={() => setConfirmRemove(false)}>
            {strings.common.cancel}
          </Button>
          <Button variant="danger" full loading={removing} onClick={remove}>
            {strings.common.remove}
          </Button>
        </div>
      </Sheet>

      <ConnectedSheet
        connection={sheet ? data : null}
        showViewProfile={false}
        onClose={() => setSheet(false)}
        onSaved={(_id, n, tags) => {
          patch({ note: n, tags });
          setNote(n ?? "");
          setSavedNote(n ?? "");
        }}
      />
    </article>
  );
}
