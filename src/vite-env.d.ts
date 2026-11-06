/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SOLANA_NETWORK?: "devnet" | "mainnet-beta";
  readonly VITE_SOLANA_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
