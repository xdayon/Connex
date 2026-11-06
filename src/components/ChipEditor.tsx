import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { strings } from "../i18n/strings";
import { Chip } from "./ui/Chip";

type Props = { label: string; items: string[]; onChange: (items: string[]) => void; maxItems: number; maxLength: number; placeholder: string };

export function ChipEditor({ label, items, onChange, maxItems, maxLength, placeholder }: Props) {
  const [draft, setDraft] = useState("");
  const full = items.length >= maxItems;

  const add = (e: FormEvent) => {
    e.preventDefault();
    const v = draft.trim().slice(0, maxLength);
    if (!v || full || items.some((i) => i.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...items, v]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-xs text-muted">
          {items.length}/{maxItems}
        </span>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((i) => (
            <Chip key={i} onRemove={() => onChange(items.filter((x) => x !== i))}>
              {i}
            </Chip>
          ))}
        </div>
      )}
      <form onSubmit={add} className="flex gap-2">
        <input
          aria-label={label}
          value={draft}
          maxLength={maxLength}
          disabled={full}
          placeholder={full ? strings.me.itemLimit : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 text-base placeholder:text-muted/70 focus:border-volt focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={full || !draft.trim()}
          aria-label={strings.me.addItem}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 disabled:opacity-50"
        >
          <Plus size={18} aria-hidden />
        </button>
      </form>
    </div>
  );
}
