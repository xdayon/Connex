import { useState } from "react";
import { ChipEditor } from "../ChipEditor";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { useToast } from "../ui/Toast";
import { strings } from "../../i18n/strings";
import { friendlyError } from "../../lib/errors";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/types";

type Props = { profile: Profile; onDone: () => void | Promise<void> };

type EditorProps = {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  suggestions: readonly string[];
  maxItems: number;
  maxLength: number;
};

function SuggestedEditor({ label, placeholder, items, onChange, suggestions, maxItems, maxLength }: EditorProps) {
  const left = suggestions.filter((s) => !items.some((i) => i.toLowerCase() === s.toLowerCase()));
  const full = items.length >= maxItems;
  return (
    <div className="flex flex-col gap-3">
      <ChipEditor label={label} items={items} onChange={onChange} maxItems={maxItems} maxLength={maxLength} placeholder={placeholder} />
      {!full && left.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {left.map((s) => (
            <Chip key={s} onClick={() => onChange([...items, s])}>
              + {s}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

export function StepBring({ profile, onDone }: Props) {
  const toast = useToast();
  const t = strings.me;
  const w = strings.welcomeSteps;
  const [skills, setSkills] = useState(profile.skills ?? []);
  const [lookingFor, setLookingFor] = useState(profile.looking_for ?? []);
  const [offering, setOffering] = useState(profile.offering ?? []);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ skills, looking_for: lookingFor, offering }).eq("id", profile.id);
    if (error) {
      setBusy(false);
      toast(friendlyError(error), "error");
      return;
    }
    await onDone();
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <SuggestedEditor
        label={t.skills}
        placeholder={t.skillsPlaceholder}
        items={skills}
        onChange={setSkills}
        suggestions={w.skillSuggestions}
        maxItems={30}
        maxLength={40}
      />
      <SuggestedEditor
        label={t.lookingFor}
        placeholder={t.lookingForPlaceholder}
        items={lookingFor}
        onChange={setLookingFor}
        suggestions={w.lookingForSuggestions}
        maxItems={10}
        maxLength={60}
      />
      <SuggestedEditor
        label={t.offering}
        placeholder={t.offeringPlaceholder}
        items={offering}
        onChange={setOffering}
        suggestions={w.offeringSuggestions}
        maxItems={10}
        maxLength={60}
      />
      <Button size="lg" full loading={busy} onClick={save}>
        {w.continue}
      </Button>
      <Button variant="ghost" full disabled={busy} onClick={() => void onDone()}>
        {w.skip}
      </Button>
    </div>
  );
}
