import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { strings } from "../i18n/strings";

type Signer = (message: Uint8Array) => Promise<Uint8Array>;

// Devolve uma função que conecta a carteira (se preciso) e entrega o signMessage.
// Lança Error com texto de strings.seal quando não há carteira ou ela não assina mensagens.
export function useProofSigner(): () => Promise<Signer> {
  const { connected, connect, wallet, signMessage } = useWallet();
  return useCallback(async () => {
    if (connected && signMessage) return signMessage;
    if (!connected) {
      if (!wallet) throw new Error(strings.seal.noWallet);
      await connect();
    }
    // Logo após connect() o hook ainda não atualizou; usa o adaptador direto.
    const adapter = wallet?.adapter as { signMessage?: Signer } | undefined;
    if (adapter?.signMessage) return adapter.signMessage.bind(adapter);
    throw new Error(strings.seal.cantSign);
  }, [connected, connect, wallet, signMessage]);
}
