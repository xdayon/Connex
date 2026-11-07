import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { AvatarUpload } from "../components/AvatarUpload";
import { Splash } from "../components/Splash";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { useToast } from "../components/ui/Toast";
import { StepBring } from "../components/welcome/StepBring";
import { StepEvent } from "../components/welcome/StepEvent";
import { StepLinks } from "../components/welcome/StepLinks";
import { strings } from "../i18n/strings";
import { errorCode, friendlyError } from "../lib/errors";
import { suggestHandle } from "../lib/format";
import { takeIntent } from "../lib/intent";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const TOTAL_STEPS = 4;

function StepWho({ profile, refreshProfile }: { profile: Profile; refreshProfile: () => Promise<Profile | null> }) {
  const navigate = useNavigate();
  const toast = useToast();
  const t = strings.onboarding;
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [headline, setHeadline] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; handle?: string }>({});
  const [busy, setBusy] = useState(false);

  const onName = (v: string) => {
    setName(v);
    if (!handleTouched) setHandle(suggestHandle(v));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = t.nameRequired;
    if (!HANDLE_RE.test(handle)) next.handle = t.handleInvalid;
    setErrors(next);
    if (next.name || next.handle) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), handle, headline: headline.trim() || null, avatar_url: avatar })
      .eq("id", profile.id);
    if (error) {
      setBusy(false);
      if (errorCode(error) === "23505") setErrors({ handle: strings.errors.handleTaken });
      else toast(friendlyError(error), "error");
      return;
    }
    const intent = takeIntent();
    // Moves to step 2 first: once the handle exists, a bare /welcome would redirect home.
    navigate("/welcome?step=2", { replace: true });
    await refreshProfile();
    if (intent) navigate(intent.path, { replace: true });
  };

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-5" noValidate>
      <AvatarUpload uid={profile.id} name={name || "?"} src={avatar} label={avatar ? t.changePhoto : t.addPhoto} onUploaded={setAvatar} />
      <TextField
        label={t.displayName}
        value={name}
        maxLength={60}
        placeholder={t.displayNamePlaceholder}
        autoComplete="name"
        error={errors.name}
        onChange={(e) => onName(e.target.value)}
      />
      <TextField
        label={t.handle}
        value={handle}
        maxLength={20}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="font-mono"
        hint={t.handleHint}
        error={errors.handle}
        onChange={(e) => {
          setHandleTouched(true);
          setHandle(e.target.value.toLowerCase().replace(/^@/, ""));
        }}
      />
      <TextField
        label={`${t.headline} (${strings.common.optional.toLowerCase()})`}
        value={headline}
        maxLength={120}
        placeholder={t.headlinePlaceholder}
        onChange={(e) => setHeadline(e.target.value)}
      />
      <Button type="submit" size="lg" full loading={busy} className="mt-2">
        {strings.welcomeSteps.continue}
      </Button>
    </form>
  );
}

export function WelcomePage() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const w = strings.welcomeSteps;

  if (loading) return <Splash />;
  if (!session || !profile) return <Navigate to="/" replace />;

  const raw = params.get("step");
  if (!raw && profile.handle) return <Navigate to="/" replace />;
  const parsed = Number(raw ?? 1);
  let step = Number.isInteger(parsed) && parsed >= 1 && parsed <= TOTAL_STEPS ? parsed : 1;
  if (!profile.handle) step = 1;
  else if (step === 1) return <Navigate to="/welcome?step=2" replace />;

  const go = (n: number) => navigate(`/welcome?step=${n}`, { replace: true });
  const titles = [w.step1Title, w.step2Title, w.step3Title, w.step4Title];
  const subtitles = [w.step1Subtitle, w.step2Subtitle, w.step3Subtitle, w.step4Subtitle];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-120 flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Logo size={40} />
        {step > 2 && (
          <Button variant="ghost" size="sm" onClick={() => go(step - 1)}>
            {w.back}
          </Button>
        )}
      </div>
      <div className="mt-5" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={step} aria-label={w.progress(step, TOTAL_STEPS)}>
        <p className="font-mono text-xs text-muted">{w.progress(step, TOTAL_STEPS)}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-cyan transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-[-0.02em]">{titles[step - 1]}</h1>
      <p className="mt-1 text-muted">{subtitles[step - 1]}</p>
      {step === 1 && <StepWho profile={profile} refreshProfile={refreshProfile} />}
      {step === 2 && (
        <StepLinks
          profile={profile}
          onDone={async (saved) => {
            if (saved) await refreshProfile();
            go(3);
          }}
        />
      )}
      {step === 3 && (
        <StepBring
          profile={profile}
          onDone={async () => {
            await refreshProfile();
            go(4);
          }}
        />
      )}
      {step === 4 && <StepEvent />}
    </div>
  );
}
