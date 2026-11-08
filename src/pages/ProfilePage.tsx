import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ChevronDown, Copy, LogOut } from "lucide-react";
import { AvatarUpload } from "../components/AvatarUpload";
import { BrandIcon } from "../components/BrandIcon";
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
import { linkValuesFrom, normalizeAll, type LinkValues } from "../lib/linkForm";
import { supabase } from "../lib/supabase";
import { LINK_KEYS, type LinkKey, type ShareKey } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";

const t = strings.me;
const w = strings.welcomeSteps;
const LINKS_OPEN_KEY = "connex.profile.links";

function readLinksOpen(): boolean {
  try {
    return localStorage.getItem(LINKS_OPEN_KEY) !== "closed";
  } catch {
    return true;
  }
}

// Mesma regra do banco: dia e mês juntos precisam existir (29/02 vale sem ano; com ano, só em bissexto).
function birthdayInvalid(day: string, month: string, year: string): boolean {
  const d = Number(day);
  const m = Number(month);
  if (!d || !m) return false;
  const max = year ? new Date(Number(year), m, 0).getDate() : m === 2 ? 29 : [4, 6, 9, 11].includes(m) ? 30 : 31;
  return d > max;
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

const selectCls =
  "min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-3 text-base text-text focus:border-cyan focus:outline-none";

export function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [bDay, setBDay] = useState(profile?.birth_day?.toString() ?? "");
  const [bMonth, setBMonth] = useState(profile?.birth_month?.toString() ?? "");
  const [bYear, setBYear] = useState(profile?.birth_year?.toString() ?? "");
  const [links, setLinks] = useState<LinkValues>(() => linkValuesFrom(profile?.links));
  const [linksOpen, setLinksOpen] = useState(readLinksOpen);
  const [fullOpen, setFullOpen] = useState(false);
  const [hidden, setHidden] = useState<ShareKey[]>(profile?.share_hidden ?? []);
  const [skills, setSkills] = useState(profile?.skills ?? []);
  const [lookingFor, setLookingFor] = useState(profile?.looking_for ?? []);
  const [offering, setOffering] = useState(profile?.offering ?? []);
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
  const [errors, setErrors] = useState<
    Partial<Record<LinkKey | "name" | "birthday", string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Erro de rede com o cartão recolhido: abre para a pessoa ver o que corrigir.
  const hasLinkError = LINK_KEYS.some((k) => errors[k]);
  useEffect(() => {
    if (hasLinkError) setLinksOpen(true);
  }, [hasLinkError]);

  if (!profile) return null;

  const toggleLinksOpen = () => {
    const next = !linksOpen;
    setLinksOpen(next);
    try {
      localStorage.setItem(LINKS_OPEN_KEY, next ? "open" : "closed");
    } catch {
      /* storage unavailable */
    }
  };

  const saved = linkValuesFrom(profile.links);
  const num = (v: string) => (v ? Number(v) : null);
  const dirty =
    name !== (profile.display_name ?? "") ||
    headline !== (profile.headline ?? "") ||
    bio !== (profile.bio ?? "") ||
    company !== (profile.company ?? "") ||
    location !== (profile.location ?? "") ||
    num(bDay) !== profile.birth_day ||
    num(bMonth) !== profile.birth_month ||
    num(bYear) !== profile.birth_year ||
    isPublic !== profile.is_public ||
    LINK_KEYS.some((k) => links[k] !== saved[k]) ||
    !sameList([...hidden].sort(), [...(profile.share_hidden ?? [])].sort()) ||
    !sameList(skills, profile.skills ?? []) ||
    !sameList(lookingFor, profile.looking_for ?? []) ||
    !sameList(offering, profile.offering ?? []);

  const save = async () => {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = t.nameRequired;
    if (birthdayInvalid(bDay, bMonth, bYear)) {
      errs.birthday = t.birthdayInvalid;
      setFullOpen(true);
    }
    const { out, errors: linkErrs } = normalizeAll(links);
    Object.assign(errs, linkErrs);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast(t.fixErrors, "error");
      // Espera as seções com erro abrirem e leva a pessoa até o primeiro campo inválido.
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>('section [aria-invalid="true"]');
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      }, 80);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        company: company.trim() || null,
        location: location.trim() || null,
        birth_day: num(bDay),
        birth_month: num(bMonth),
        birth_year: num(bYear),
        links: out,
        share_hidden: hidden,
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
    setName(name.trim());
    setHeadline(headline.trim());
    setBio(bio.trim());
    setCompany(company.trim());
    setLocation(location.trim());
    setLinks(linkValuesFrom(out));
    await refreshProfile();
    toast(t.savedToast, "success");
  };

  const onAvatar = async (url: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", profile.id);
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

  const walletCopy = async () =>
    toast(
      (await copyText(profile.wallet ?? ""))
        ? strings.common.copied
        : strings.errors.generic,
      "success",
    );

  // Links recolhido mostra o que está ligado para sair automaticamente: a carteira e as redes preenchidas.
  const activeKeys: ShareKey[] = [
    ...(profile.wallet ? (["wallet"] as const) : []),
    ...LINK_KEYS.filter((k) => links[k].trim() !== ""),
  ].filter((k) => !hidden.includes(k));
  const years = Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => new Date().getFullYear() - i);

  return (
    <section className={`flex flex-col gap-6 ${dirty ? "pb-20" : ""}`}>
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">
        {t.title}
      </h1>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          <AvatarUpload
            uid={profile.id}
            name={name || profile.handle || "?"}
            src={avatar}
            label={t.changePhoto}
            onUploaded={onAvatar}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <input
              value={name}
              maxLength={60}
              aria-label={t.displayName}
              aria-invalid={!!errors.name}
              placeholder={t.displayName}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(({ name: _, ...rest }) => rest);
              }}
              className={`min-h-11 w-full rounded-2xl border bg-surface-2 px-3 text-base text-text focus:border-cyan focus:outline-none ${errors.name ? "border-danger" : "border-line"}`}
            />
            {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
            <p className="truncate font-mono text-sm text-muted">@{profile.handle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {profile.handle && (
            <Link
              to={`/u/${profile.handle}?preview=1`}
              className={buttonClass({ variant: "secondary", size: "sm", full: true })}
            >
              {t.viewProfile}
            </Link>
          )}
          <Button
            variant="secondary"
            size="sm"
            full
            aria-expanded={fullOpen}
            onClick={() => setFullOpen((o) => !o)}
            className="px-3!"
          >
            {/* Texto e seta num bloco só, sem quebrar: no celular o botão tem ~150px. */}
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              {t.editFull}
              <ChevronDown size={14} className={`shrink-0 text-muted transition ${fullOpen ? "rotate-180" : ""}`} aria-hidden />
            </span>
          </Button>
        </div>
        {fullOpen && (
          <div className="flex flex-col gap-4">
            <TextField
              label={t.headline}
              value={headline}
              maxLength={120}
              onChange={(e) => setHeadline(e.target.value)}
            />
            <TextArea
              label={t.bio}
              value={bio}
              maxLength={500}
              onChange={(e) => setBio(e.target.value)}
            />
            <TextField
              label={t.company}
              value={company}
              maxLength={80}
              onChange={(e) => setCompany(e.target.value)}
            />
            <TextField
              label={t.location}
              value={location}
              maxLength={80}
              onChange={(e) => setLocation(e.target.value)}
            />
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">{t.birthday}</legend>
              <div className="flex gap-2">
                <select aria-label={t.birthdayDay} value={bDay} onChange={(e) => setBDay(e.target.value)} className={selectCls}>
                  <option value="">—</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select aria-label={t.birthdayMonth} value={bMonth} onChange={(e) => setBMonth(e.target.value)} className={`${selectCls} flex-[2]`}>
                  <option value="">—</option>
                  {t.months.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select aria-label={t.birthdayYear} value={bYear} onChange={(e) => setBYear(e.target.value)} className={selectCls}>
                  <option value="">—</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <p className={`text-xs ${errors.birthday ? "text-danger" : "text-muted"}`}>
                {errors.birthday || t.birthdayHint}
              </p>
            </fieldset>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <button
          type="button"
          aria-expanded={linksOpen}
          aria-label={linksOpen ? t.collapseLinks : t.expandLinks}
          onClick={toggleLinksOpen}
          className="-my-1 flex min-h-11 w-full items-center justify-between gap-3 text-left"
        >
          <span className="font-display text-lg font-semibold">{t.links}</span>
          <ChevronDown size={18} className={`text-muted transition ${linksOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {linksOpen ? (
          <>
            <LinkFields
              values={links}
              errors={errors}
              onChange={(k, v) => {
                setLinks((l) => ({ ...l, [k]: v }));
                if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest);
              }}
              hidden={hidden}
              onHiddenChange={setHidden}
              wallet={profile.wallet}
            />
          </>
        ) : (
          activeKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-text">
              {activeKeys.map((k) => (
                <BrandIcon key={k} k={k} size={20} />
              ))}
            </div>
          )
        )}
      </Card>

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-display text-lg font-semibold">{t.bringTitle}</h2>
        <ChipEditor
          label={t.skills}
          items={skills}
          onChange={setSkills}
          maxItems={30}
          maxLength={40}
          placeholder={t.skillsPlaceholder}
          suggestions={w.skillSuggestions}
          collapsibleSuggestions
        />
        <ChipEditor
          label={t.lookingFor}
          items={lookingFor}
          onChange={setLookingFor}
          maxItems={10}
          maxLength={60}
          placeholder={t.lookingForPlaceholder}
          suggestions={w.lookingForSuggestions}
          collapsibleSuggestions
        />
        <ChipEditor
          label={t.offering}
          items={offering}
          onChange={setOffering}
          maxItems={10}
          maxLength={60}
          placeholder={t.offeringPlaceholder}
          suggestions={w.offeringSuggestions}
          collapsibleSuggestions
        />
      </Card>

      <Card className="p-5">
        <Switch
          checked={isPublic}
          onChange={setIsPublic}
          label={t.publicLabel}
          hint={t.publicHint}
        />
      </Card>

      <Button size="lg" full loading={saving} onClick={save}>
        {t.saveChanges}
      </Button>

      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-120 px-4">
          <div className="flex items-center justify-between gap-3 rounded-full border border-line bg-surface/95 py-2 pl-5 pr-2 shadow-lg backdrop-blur">
            <span className="min-w-0 truncate text-sm text-muted">{t.saveBarLabel}</span>
            <Button size="sm" loading={saving} onClick={save}>
              {t.saveChanges}
            </Button>
          </div>
        </div>
      )}

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-lg font-semibold">{t.wallet}</h2>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-sm">
            {profile.wallet ? shortAddress(profile.wallet) : ""}
          </span>
          <button
            type="button"
            onClick={walletCopy}
            aria-label={strings.common.copy}
            className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-text"
          >
            <Copy size={18} />
          </button>
        </div>
        <p className="text-xs text-muted">{t.walletHint}</p>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-lg font-semibold">{t.account}</h2>
        <Button
          variant="secondary"
          full
          icon={<LogOut size={16} aria-hidden />}
          onClick={() => void signOut()}
        >
          {strings.auth.signOut}
        </Button>
        <Button variant="danger" full onClick={() => setDeleteOpen(true)}>
          {t.deleteAccount}
        </Button>
      </Card>

      <footer className="flex flex-col items-center gap-1 text-sm text-muted">
        <div className="flex gap-6">
          <Link
            to="/legal/terms"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
          >
            {strings.legal.terms}
          </Link>
          <Link
            to="/legal/privacy"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
          >
            {strings.legal.privacy}
          </Link>
        </div>
        <p className="font-mono text-xs">
          {strings.app.version} {__APP_VERSION__}
        </p>
      </footer>

      <Sheet
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title={t.deleteTitle}
      >
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
          <Button
            variant="danger"
            full
            loading={deleting}
            disabled={confirm !== t.deleteWord}
            onClick={deleteAccount}
          >
            {t.deleteSubmit}
          </Button>
          <Button
            variant="ghost"
            full
            onClick={() => setDeleteOpen(false)}
            disabled={deleting}
          >
            {strings.common.cancel}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
