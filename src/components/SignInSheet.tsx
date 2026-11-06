import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { ExternalLink, FlaskConical, Loader2 } from "lucide-react";
import { strings } from "../i18n/strings";
import { Sheet } from "./ui/Sheet";

function walletBrowseLink(wallet: "phantom" | "solflare"): string {
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  return wallet === "phantom"
    ? `https://phantom.app/ul/browse/${url}?ref=${ref}`
    : `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
}

type Props = {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onChoose: (name: WalletName) => void;
  onChooseDev: () => void;
};

const rowClass =
  "flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 text-left transition active:scale-[0.99] disabled:opacity-50";

export function SignInSheet({ open, busy, error, onClose, onChoose, onChooseDev }: Props) {
  const { wallets } = useWallet();
  const usable = wallets.filter((w) => w.readyState !== WalletReadyState.Unsupported);

  return (
    <Sheet open={open} onClose={onClose} title={strings.wallet.chooseTitle}>
      <p className="-mt-3 mb-4 text-sm text-muted">{strings.wallet.chooseSubtitle}</p>
      {busy && (
        <p className="mb-3 flex items-center gap-2 text-sm text-volt" role="status">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          {strings.wallet.signing}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-2xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {usable.length === 0 && !import.meta.env.DEV ? (
        <div className="flex flex-col gap-2">
          <p className="rounded-2xl border border-line bg-surface-2 p-4 text-sm text-muted">{strings.wallet.noWallets}</p>
          {/* iOS and desktop browsers without an extension: open this page in the wallet's in-app browser. */}
          <a className={rowClass} href={walletBrowseLink("phantom")}>
            <span className="flex-1 font-medium">{strings.wallet.openInPhantom}</span>
            <ExternalLink size={16} className="text-muted" aria-hidden />
          </a>
          <a className={rowClass} href={walletBrowseLink("solflare")}>
            <span className="flex-1 font-medium">{strings.wallet.openInSolflare}</span>
            <ExternalLink size={16} className="text-muted" aria-hidden />
          </a>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {usable.map((w) => (
            <li key={w.adapter.name}>
              <button type="button" disabled={busy} onClick={() => onChoose(w.adapter.name)} className={rowClass}>
                <img src={w.adapter.icon} alt="" width={32} height={32} className="size-8 rounded-lg" />
                <span className="flex-1 font-medium">{w.adapter.name}</span>
                <span className="text-xs text-muted">
                  {w.readyState === WalletReadyState.Installed ? strings.wallet.installed : strings.wallet.detected}
                </span>
              </button>
            </li>
          ))}
          {import.meta.env.DEV && (
            <li>
              <button type="button" disabled={busy} onClick={onChooseDev} className={rowClass}>
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet/20 text-violet">
                  <FlaskConical size={18} aria-hidden />
                </span>
                <span className="flex-1 font-medium">{strings.wallet.dev}</span>
                <span className="text-xs text-muted">{strings.wallet.devHint}</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </Sheet>
  );
}
