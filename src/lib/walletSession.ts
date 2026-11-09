import { createDefaultAuthorizationCache, SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-standard-mobile";
import type { Adapter } from "@solana/wallet-adapter-base";

// Cache de autorização da carteira MWA (Seeker / Android). Fica num módulo próprio para o
// login poder limpá-lo: com uma autorização em cache, o signIn da MWA devolve o cache sem
// assinar nada e o login falha com "no sign in result returned by wallet".
export const mwaAuthorizationCache = createDefaultAuthorizationCache();

export const MWA_WALLET_NAME = SolanaMobileWalletAdapterWalletName;

// Enquanto o login roda, o autoConnect do WalletProvider não pode chamar connect(): na MWA
// isso abriria a carteira uma segunda vez e gravaria uma autorização sem assinatura.
let signingIn = false;

export function setSigningIn(value: boolean) {
  signingIn = value;
}

export async function shouldAutoConnect(_adapter: Adapter): Promise<boolean> {
  return !signingIn;
}
