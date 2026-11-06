import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { AvatarUpload } from "../components/AvatarUpload";
import { Splash } from "../components/Splash";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { useToast } from "../components/ui/Toast";
import { strings } from "../i18n/strings";
import { errorCode, friendlyError } from "../lib/errors";
import { suggestHandle } from "../lib/format";
import { takeIntent } from "../lib/intent";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function WelcomePage() {
  const { session, profile, loading, refreshProfile } = useAuth();
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

  if (loading) return <Splash />;
  if (!session || !profile) return <Navigate to="/" replace />;
  if (profile.handle) return <Navigate to="/" replace />;

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
    await refreshProfile();
    const intent = takeIntent();
    navigate(intent?.path ?? "/", { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-120 flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <Logo size={40} />
      <h1 className="mt-6 font-display text-3xl font-bold tracking-[-0.02em]">{t.title}</h1>
      <p className="mt-1 text-muted">{t.subtitle}</p>
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
          {t.submit}
        </Button>
      </form>
    </div>
  );
}
