import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { Download, UserPlus, UserX } from "lucide-react";
import { LinkButtons, ProfileExtras, ProfileHeader } from "../components/ProfileDetails";
import { Button, buttonClass } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { strings } from "../i18n/strings";
import { getCurrentEventId } from "../lib/currentEvent";
import { friendlyError, isMessage } from "../lib/errors";
import { saveIntent } from "../lib/intent";
import { supabase } from "../lib/supabase";
import type { Connection, Links, Profile } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { downloadVCard } from "../lib/vcard";
import { useAuth } from "../providers/AuthProvider";

export function PublicProfilePage() {
  const { handle = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t");
  const auto = params.get("auto") === "1";
  const { session, profile: me, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const autoRan = useRef(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const { data: rows, error: err } = await supabase.rpc("get_profile", { p_handle: handle });
    if (err) throw err;
    return ((rows as Profile[] | null) ?? [])[0] ?? null;
  }, [handle, session?.user.id]);

  useEffect(() => {
    document.title = data ? `${data.display_name || data.handle} (@${data.handle}) · Connex` : "Connex";
    return () => {
      document.title = "Connex";
    };
  }, [data]);

  const isSelf = !!me && !!data && me.id === data.id;
  const preview = isSelf && params.get("preview") === "1";

  const connect = async () => {
    if (!data?.handle) return;
    setBusy(true);
    const call = (t: string | null) =>
      supabase.rpc("connect", { p_handle: data.handle, p_token: t, p_event_id: getCurrentEventId(), p_share: null });
    let res = await call(token);
    if (res.error && token && isMessage(res.error, "qr expired")) res = await call(null);
    setBusy(false);
    if (res.error) {
      toast(friendlyError(res.error), "error");
      return;
    }
    navigate(`/connections/${(res.data as Connection).id}?new=1`);
  };

  useEffect(() => {
    if (!auto || autoRan.current || !data || !me || isSelf || authLoading) return;
    autoRan.current = true;
    void connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, data, me, isSelf, authLoading]);

  const requestSignIn = () => {
    if (!data?.handle) return;
    const q = new URLSearchParams({ auto: "1" });
    if (token) q.set("t", token);
    saveIntent({ path: `/u/${data.handle}?${q.toString()}` });
    signIn();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-12 w-full rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={UserX}
        title={strings.publicProfile.errorTitle}
        hint={friendlyError(error)}
        action={<Button onClick={reload}>{strings.common.retry}</Button>}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={UserX}
        title={strings.publicProfile.notFoundTitle}
        hint={strings.publicProfile.notFoundBody}
        action={
          <Link to="/" className={buttonClass({})}>
            {strings.publicProfile.getConnex}
          </Link>
        }
      />
    );
  }

  // Na prévia, o dono vê só o que um visitante veria: some o que está desligado no compartilhamento.
  const hiddenKeys: string[] = preview ? (data.share_hidden ?? []) : [];
  const links = Object.fromEntries(Object.entries(data.links ?? {}).filter(([k]) => !hiddenKeys.includes(k))) as Links;

  return (
    <article className="flex flex-col gap-5">
      {preview && (
        <div className="flex items-center justify-between gap-3 rounded-card border border-cyan/40 bg-cyan/10 p-3 text-sm">
          <span className="min-w-0 font-medium">{strings.me.previewBanner}</span>
          <Link to="/me" className="inline-flex min-h-11 shrink-0 items-center font-semibold text-cyan underline-offset-4 hover:underline">
            {strings.me.backToEditing}
          </Link>
        </div>
      )}
      <Card className="p-5">
        <ProfileHeader profile={data} />
      </Card>
      <div className="flex flex-col gap-3">
        {!isSelf &&
          (session && me ? (
            <Button size="lg" full loading={busy} onClick={connect} icon={<UserPlus size={18} aria-hidden />}>
              {strings.publicProfile.connect}
            </Button>
          ) : (
            <Button size="lg" full onClick={requestSignIn} icon={<UserPlus size={18} aria-hidden />}>
              {strings.auth.signInToConnect}
            </Button>
          ))}
        <Button variant="secondary" full onClick={() => downloadVCard(data, links)} icon={<Download size={18} aria-hidden />}>
          {strings.publicProfile.saveContact}
        </Button>
      </div>
      <LinkButtons links={links} />
      <ProfileExtras profile={data} />
    </article>
  );
}
