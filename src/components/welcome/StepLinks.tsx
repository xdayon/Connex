import { useState } from "react";
import { LinkFields } from "../LinkFields";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { strings } from "../../i18n/strings";
import { friendlyError } from "../../lib/errors";
import { normalizeLink } from "../../lib/links";
import { supabase } from "../../lib/supabase";
import { LINK_KEYS, type LinkKey, type Links, type Profile } from "../../lib/types";

type Props = { profile: Profile; onDone: (saved: boolean) => void | Promise<void> };

export function StepLinks({ profile, onDone }: Props) {
  const toast = useToast();
  const [values, setValues] = useState<Record<LinkKey, string>>(
    () => Object.fromEntries(LINK_KEYS.map((k) => [k, profile.links?.[k] ?? ""])) as Record<LinkKey, string>,
  );
  const [errors, setErrors] = useState<Partial<Record<LinkKey, string>>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const errs: typeof errors = {};
    const out: Links = {};
    for (const k of LINK_KEYS) {
      const r = normalizeLink(k, values[k]);
      if (!r.ok) errs[k] = strings.me.linkInvalid;
      else if (r.value) out[k] = r.value;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ links: out }).eq("id", profile.id);
    if (error) {
      setBusy(false);
      toast(friendlyError(error), "error");
      return;
    }
    await onDone(true);
  };

  return (
    <div className="mt-6 flex flex-col gap-5">
      <LinkFields values={values} errors={errors} onChange={(k, v) => setValues((l) => ({ ...l, [k]: v }))} />
      <Button size="lg" full loading={busy} onClick={save}>
        {strings.welcomeSteps.continue}
      </Button>
      <Button variant="ghost" full disabled={busy} onClick={() => void onDone(false)}>
        {strings.welcomeSteps.skip}
      </Button>
    </div>
  );
}
