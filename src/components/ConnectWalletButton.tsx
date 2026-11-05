import { useEffect, useRef, useState } from "react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { LogOut, X } from "lucide-react";
import { strings } from "../i18n/strings";
import { shortAddress } from "../lib/format";

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-volt px-5 text-sm font-semibold text-ink transition active:scale-95 disabled:opacity-60";

export function ConnectWalletButton() {
  const { wallets, wallet, select, connect, connected, connecting, publicKey, disconnect } = useWallet();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<WalletName | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // select() only updates state; connect() needs the new wallet to be committed first.
  useEffect(() => {
    if (!pending || wallet?.adapter.name !== pending || connected || connecting) return;
    setPending(null);
    connect().catch(() => {});
  }, [pending, wallet, connected, connecting, connect]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  const choose = (name: WalletName) => {
    setSheetOpen(false);
    if (wallet?.adapter.name === name) {
      connect().catch(() => {});
    } else {
      setPending(name);
      select(name);
    }
  };

  if (connected && publicKey) {
    return (
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label={strings.wallet.account}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex h-10 items-center rounded-full border border-line bg-surface px-4 font-mono text-sm text-text"
        >
          {shortAddress(publicKey.toBase58())}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-12 z-50 min-w-40 rounded-2xl border border-line bg-surface-2 p-1 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                disconnect().catch(() => {});
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-danger hover:bg-surface"
            >
              <LogOut size={16} />
              {strings.wallet.disconnect}
            </button>
          </div>
        )}
      </div>
    );
  }

  const usable = wallets.filter((w) => w.readyState !== WalletReadyState.Unsupported);

  return (
    <>
      <button type="button" className={buttonClass} disabled={connecting} onClick={() => setSheetOpen(true)}>
        {connecting ? strings.wallet.connecting : strings.wallet.connect}
      </button>
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={strings.wallet.chooseTitle}>
          <button
            type="button"
            aria-label={strings.wallet.close}
            className="absolute inset-0 bg-black/60"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative w-full max-w-120 rounded-t-3xl border border-b-0 border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">{strings.wallet.chooseTitle}</h2>
                <p className="text-sm text-muted">{strings.wallet.chooseSubtitle}</p>
              </div>
              <button type="button" aria-label={strings.wallet.close} onClick={() => setSheetOpen(false)} className="p-1 text-muted">
                <X size={20} />
              </button>
            </div>
            {usable.length === 0 ? (
              <p className="rounded-2xl border border-line bg-surface-2 p-4 text-sm text-muted">{strings.wallet.noWallets}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {usable.map((w) => (
                  <li key={w.adapter.name}>
                    <button
                      type="button"
                      onClick={() => choose(w.adapter.name)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 text-left transition active:scale-[0.99]"
                    >
                      <img src={w.adapter.icon} alt="" width={32} height={32} className="size-8 rounded-lg" />
                      <span className="flex-1 font-medium">{w.adapter.name}</span>
                      <span className="text-xs text-muted">
                        {w.readyState === WalletReadyState.Installed ? strings.wallet.installed : strings.wallet.detected}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
