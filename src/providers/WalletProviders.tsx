import type { ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from "@solana-mobile/wallet-standard-mobile";
import { rpcEndpoint, walletChain } from "../lib/config";

if (typeof window !== "undefined") {
  registerMwa({
    appIdentity: {
      name: "conneX",
      uri: window.location.origin,
      icon: "/pwa-192x192.png",
    },
    authorizationCache: createDefaultAuthorizationCache(),
    chains: [walletChain],
    chainSelector: createDefaultChainSelector(),
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  });
}

const wallets: never[] = [];

export function WalletProviders({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
