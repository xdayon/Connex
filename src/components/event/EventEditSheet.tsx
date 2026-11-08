import { useEffect, useState, type FormEvent } from "react";
import { strings } from "../../i18n/strings";
import { friendlyError } from "../../lib/errors";
import { supabase } from "../../lib/supabase";
import type { EventRow } from "../../lib/types";
import { Button } from "../ui/Button";
import { Sheet } from "../ui/Sheet";
import { TextArea, TextField } from "../ui/TextField";
import { useToast } from "../ui/Toast";

// ISO (UTC) -> valor de <input type="datetime-local"> no fuso do aparelho.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = { event: EventRow; open: boolean; onClose: () => void; onSaved: () => void };

// Edição do evento por quem o criou. O banco só aceita a mudança do criador (RLS) e só nestes campos.
export function EventEditSheet({ event, open, onClose, onSaved }: Props) {
  const t = strings.events;
  const toast = useToast();
  const [name, setName] = useState(event.name);
  const [location, setLocation] = useState(event.location ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [starts, setStarts] = useState(toLocalInput(event.starts_at));
  const [ends, setEnds] = useState(toLocalInput(event.ends_at));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Abrir de novo recomeça do que está salvo.
  useEffect(() => {
    if (!open) return;
    setName(event.name);
    setLocation(event.location ?? "");
    setDescription(event.description ?? "");
    setStarts(toLocalInput(event.starts_at));
    setEnds(toLocalInput(event.ends_at));
    setError(null);
  }, [open, event]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 3 || n.length > 80) return setError(t.nameInvalid);
    if (starts && ends && new Date(ends) < new Date(starts)) return setError(t.endBeforeStart);
    setSaving(true);
    const { error: err } = await supabase
      .from("events")
      .update({
        name: n,
        location: location.trim() || null,
        description: description.trim() || null,
        starts_at: starts ? new Date(starts).toISOString() : null,
        ends_at: ends ? new Date(ends).toISOString() : null,
      })
      .eq("id", event.id);
    setSaving(false);
    if (err) return setError(friendlyError(err));
    toast(t.saved, "success");
    onSaved();
    onClose();
  };

  return (
    <Sheet open={open} onClose={() => !saving && onClose()} title={t.editTitle}>
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        <TextField label={t.name} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <TextField label={t.location} value={location} maxLength={120} placeholder={t.locationPlaceholder} onChange={(e) => setLocation(e.target.value)} />
        <TextArea label={t.description} value={description} maxLength={500} placeholder={t.descriptionPlaceholder} onChange={(e) => setDescription(e.target.value)} />
        <TextField label={t.starts} type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
        <TextField label={t.ends} type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" full loading={saving}>
          {t.saveEvent}
        </Button>
      </form>
    </Sheet>
  );
}
