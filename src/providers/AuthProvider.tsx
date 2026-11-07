import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import type { Session, SolanaWallet, User } from "@supabase/supabase-js";
import { SignInSheet } from "../components/SignInSheet";
import { strings } from "../i18n/strings";
import { takeIntent } from "../lib/intent";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

type Web3Wallet = SolanaWallet;

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { wallet, select, connect, connected, connecting, publicKey, signIn: walletSignIn, signMessage, disconnect } = useWallet();

  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wantSignIn = useRef(false);
  const running = useRef(false);
  const [pendingName, setPendingName] = useState<WalletName | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!sessionReady) return;
    if (!userId) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    let cancelled = false;
    setProfileReady(false);
    supabase
      .rpc("ensure_profile")
      .then(({ data }) => {
        if (!cancelled) setProfile((data as Profile | null) ?? null);
      })
      .then(
        () => {
          if (!cancelled) setProfileReady(true);
        },
        () => {
          if (!cancelled) setProfileReady(true);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [sessionReady, userId]);

  const refreshProfile = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return null;
    const { data } = await supabase.rpc("my_profile").maybeSingle();
    const next = (data as Profile | null) ?? null;
    setProfile(next);
    return next;
  }, []);

  const afterSignIn = useCallback(async () => {
    const { data } = await supabase.rpc("ensure_profile");
    const p = (data as Profile | null) ?? null;
    setProfile(p);
    setProfileReady(true);
    if (!p?.handle) {
      navigate("/welcome", { replace: true });
      return;
    }
    const intent = takeIntent();
    if (intent) navigate(intent.path, { replace: true });
  }, [navigate]);

  const finishSignIn = useCallback(
    async (w: Web3Wallet) => {
      setBusy(true);
      setError(null);
      try {
        const { error: err } = await supabase.auth.signInWithWeb3({ chain: "solana", statement: strings.auth.statement, wallet: w });
        if (err) throw err;
        setPickerOpen(false);
        await afterSignIn();
      } catch (e) {
        const msg = (e as { message?: string })?.message?.toLowerCase() ?? "";
        setError(msg.includes("redirect") || msg.includes("url") || msg.includes("domain") ? strings.wallet.redirectUrl : strings.wallet.signFailed);
      } finally {
        setBusy(false);
        running.current = false;
        wantSignIn.current = false;
      }
    },
    [afterSignIn],
  );

  // After the user picks a wallet: select it, connect, then sign in with the connected wallet.
  useEffect(() => {
    if (!pendingName || wallet?.adapter.name !== pendingName || connected || connecting) return;
    setPendingName(null);
    connect().catch(() => {
      setBusy(false);
      wantSignIn.current = false;
      setError(strings.wallet.signFailed);
    });
  }, [pendingName, wallet, connected, connecting, connect]);

  useEffect(() => {
    if (!wantSignIn.current || running.current || !connected || !publicKey) return;
    running.current = true;
    void finishSignIn({
      publicKey,
      signIn: walletSignIn as unknown as Web3Wallet["signIn"],
      signMessage: signMessage as Web3Wallet["signMessage"],
    });
  }, [connected, publicKey, walletSignIn, signMessage, finishSignIn]);

  const chooseWallet = useCallback(
    (name: WalletName) => {
      setError(null);
      setBusy(true);
      wantSignIn.current = true;
      if (wallet?.adapter.name === name) {
        if (connected) {
          // connected effect won't re-run; trigger manually
          if (publicKey && !running.current) {
            running.current = true;
            void finishSignIn({
              publicKey,
              signIn: walletSignIn as unknown as Web3Wallet["signIn"],
              signMessage: signMessage as Web3Wallet["signMessage"],
            });
          }
        } else {
          connect().catch(() => {
            setBusy(false);
            wantSignIn.current = false;
            setError(strings.wallet.signFailed);
          });
        }
      } else {
        setPendingName(name);
        select(name);
      }
    },
    [wallet, connected, publicKey, walletSignIn, signMessage, finishSignIn, connect, select],
  );

  const chooseDev = useCallback(async () => {
    if (!import.meta.env.DEV) return;
    setBusy(true);
    setError(null);
    try {
      const { createDevWallet } = await import("../lib/devWallet");
      await finishSignIn(createDevWallet());
    } catch {
      setBusy(false);
      setError(strings.wallet.signFailed);
    }
  }, [finishSignIn]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    try {
      await disconnect();
    } catch {
      // wallet already disconnected
    }
    navigate("/", { replace: true });
  }, [disconnect, navigate]);

  const openPicker = useCallback(() => {
    setError(null);
    setPickerOpen(true);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading: !sessionReady || !profileReady,
      signIn: openPicker,
      signOut,
      refreshProfile,
    }),
    [session, profile, sessionReady, profileReady, openPicker, signOut, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SignInSheet
        open={pickerOpen}
        busy={busy}
        error={error}
        onClose={() => {
          if (!busy) setPickerOpen(false);
        }}
        onChoose={chooseWallet}
        onChooseDev={chooseDev}
      />
    </AuthContext.Provider>
  );
}
