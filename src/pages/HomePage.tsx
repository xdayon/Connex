import { useWallet } from "@solana/wallet-adapter-react";
import { QrCode } from "lucide-react";
import { ConnectWalletButton } from "../components/ConnectWalletButton";
import { Logo } from "../components/Logo";
import { strings } from "../i18n/strings";
import { shortAddress } from "../lib/format";

export function HomePage() {
  const { publicKey, connected } = useWallet();

  if (connected && publicKey) {
    return (
      <section>
        <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-14 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-volt">
            <QrCode size={32} />
          </div>
          <p className="font-display text-xl font-semibold">{strings.home.badgeTitle}</p>
          <p className="text-sm text-muted">
            {strings.home.badgeHint} <span className="font-mono text-text">{shortAddress(publicKey.toBase58())}</span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center gap-6 pt-10 text-center">
      <Logo size={140} />
      <h1 className="font-display text-4xl font-bold leading-tight tracking-[-0.02em]">{strings.home.headline}</h1>
      <p className="max-w-80 text-muted">{strings.home.subline}</p>
      <ConnectWalletButton />
    </section>
  );
}
