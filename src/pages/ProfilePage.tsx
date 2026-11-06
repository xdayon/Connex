import { useState } from "react";
import { Link } from "react-router";
import { Copy, ExternalLink, LogOut } from "lucide-react";
import { AvatarUpload } from "../components/AvatarUpload";
import { ChipEditor } from "../components/ChipEditor";
import { LinkFields } from "../components/LinkFields";
import { Button, buttonClass } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Sheet } from "../components/ui/Sheet";
import { Switch } from "../components/ui/Switch";
import { TextArea, TextField } from "../components/ui/TextField";
import { useToast } from "../components/ui/Toast";
import { strings } from "../i18n/strings";
import { copyText } from "../lib/clipboard";
import { deleteAllAvatars } from "../lib/avatarUpload";
import { friendlyError } from "../lib/errors";
import { shortAddress } from "../lib/format";
import { normalizeLink } from "../lib/links";
import { supabase } from "../lib/supabase";
import { LINK_KEYS, type LinkKey, type Links } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";

const t = strings.me;

export function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [links, setLinks] = useState<Record<LinkKey, string>>(
    () => Object.fromEntries(LINK_KEYS.map((k) => [k, profile?.links?.[k] ?? ""])) as Record<LinkKey, string>,
  );
  const [skills, setSkills] = useState(profile?.skills ?? []);
  const [lookingFor, setLookingFor] = useState(profile?.looking_for ?? []);
  const [offering, setOffering] = useState(profile?.offering ?? []);
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
  const [errors, setErrors] = useState<Partial<Record<LinkKey | "name", string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!profile) return null;

  const save = async () => {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = t.nameRequired;
    const out: Links = {};
    for (const k of LINK_KEYS) {
      const r = normalizeLink(k, links[k]);
      if (!r.ok) errs[k] = t.linkInvalid;
      else if (r.value) out[k] = r.value;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        company: company.trim() || null,
        location: location.trim() || null,
        links: out,
        skills,
        looking_for: lookingFor,
        offering,
        is_public: isPublic,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    setLinks(Object.fromEntries(LINK_KEYS.map((k) => [k, out[k] ?? ""])) as Record<LinkKey, string>);
    await refreshProfile();
    toast(t.savedToast, "success");
  };

  const onAvatar = async (url: string) => {
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    if (error) throw error;
    setAvatar(url);
    await refreshProfile();
    toast(t.photoUpdated, "success");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAllAvatars(profile.id).catch(() => {});
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      setDeleteOpen(false);
      await signOut();
    } catch (e) {
      const msg = friendlyError(e);
      toast(msg === strings.errors.generic ? t.deleteFailed : msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const walletCopy = async () => toast((await copyText(profile.wallet)) ? strings.common.copied : strings.errors.generic, "success");

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">{t.title}</h1>

      <Card className="flex flex-col gap-5 p-5">
        <AvatarUpload uid={profile.id} name={name || profile.handle || "?"} src={avatar} label={t.changePhoto} onUploaded={onAvatar} />
        <TextField label={t.displayName} value={name} maxLength={60} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <TextField label={t.handle} value={profile.handle ?? ""} readOnly className="font-mono opacity-70" />
        <TextField label={t.headline} value={headline} maxLength={120} onChange={(e) => setHeadline(e.target.value)} />
        <TextArea label={t.bio} value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} />
        <TextField label={t.company} value={company} maxLength={80} onChange={(e) => setCompany(e.target.value)} />
        <TextField label={t.location} value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} />
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">{t.links}</h2>
          <p className="text-sm text-muted">{t.linksHint}</p>
        </div>
        <LinkFields values={links} errors={errors} onChange={(k, v) => setLinks((l) => ({ ...l, [k]: v }))} />
      </Card>

      <Card className="flex flex-col gap-5 p-5">
        <ChipEditor label={t.skills} items={skills} onChange={setSkills} maxItems={30} maxLength={40} placeholder={t.skillsPlaceholder} />
        <ChipEditor label={t.lookingFor} items={lookingFor} onChange={setLookingFor} maxItems={10} maxLength={60} placeholder={t.lookingForPlaceholder} />
        <ChipEditor label={t.offering} items={offering} onChange={setOffering} maxItems={10} maxLength={60} placeholder={t.offeringPlaceholder} />
      </Card>

      <Card className="p-5">
        <Switch checked={isPublic} onChange={setIsPublic} label={t.publicLabel} hint={t.publicHint} />
      </Card>

      <Button size="lg" full loading={saving} onClick={save}>
        {t.saveChanges}
      </Button>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-lg font-semibold">{t.wallet}</h2>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-sm">{shortAddress(profile.wallet)}</span>
          <button type="button" onClick={walletCopy} aria-label={strings.common.copy} className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-text">
            <Copy size={18} />
          </button>
        </div>
        <p className="text-xs text-muted">{t.walletHint}</p>
        {profile.handle && (
          <Link to={`/u/${profile.handle}`} className={buttonClass({ variant: "secondary", full: true })}>
            <ExternalLink size={16} aria-hidden />
            {t.viewPublic}
          </Link>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-lg font-semibold">{t.account}</h2>
        <Button variant="secondary" full icon={<LogOut size={16} aria-hidden />} onClick={() => void signOut()}>
          {strings.auth.signOut}
        </Button>
        <Button variant="danger" full onClick={() => setDeleteOpen(true)}>
          {t.deleteAccount}
        </Button>
      </Card>

      <footer className="flex flex-col items-center gap-1 text-sm text-muted">
        <div className="flex gap-6">
          <Link to="/legal/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
            {strings.legal.terms}
          </Link>
          <Link to="/legal/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
            {strings.legal.privacy}
          </Link>
        </div>
        <p className="font-mono text-xs">
          {strings.app.version} {__APP_VERSION__}
        </p>
      </footer>

      <Sheet open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title={t.deleteTitle}>
        <p className="-mt-2 text-sm text-muted">{t.deleteBody}</p>
        <div className="mt-4">
          <TextField
            label={t.deleteConfirmLabel}
            value={confirm}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="danger" full loading={deleting} disabled={confirm !== t.deleteWord} onClick={deleteAccount}>
            {t.deleteSubmit}
          </Button>
          <Button variant="ghost" full onClick={() => setDeleteOpen(false)} disabled={deleting}>
            {strings.common.cancel}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
