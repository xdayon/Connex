import { clusterApiUrl } from "@solana/web3.js";

export type SolanaCluster = "devnet" | "mainnet-beta";

// URL e chave publicável do Supabase são públicas por natureza (vão no bundle de qualquer jeito);
// a segurança vem das policies de RLS. Variáveis de ambiente sobrescrevem, se definidas.
export const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || "https://krqbccfxrtpycfsgtbtb.supabase.co";
export const supabasePublishableKey: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_toOU9TiY_ZHj17Plg9dKPg_dsLwQ48-";

// Mainnet por padrão (loja e jurados). VITE_SOLANA_NETWORK=devnet só para testes locais.
export const cluster: SolanaCluster = import.meta.env.VITE_SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet-beta";
export const rpcEndpoint = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(cluster);
export const walletChain = cluster === "mainnet-beta" ? "solana:mainnet" : "solana:devnet";
