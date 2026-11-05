import { clusterApiUrl } from "@solana/web3.js";

export type SolanaCluster = "devnet" | "mainnet-beta";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const cluster: SolanaCluster = import.meta.env.VITE_SOLANA_CLUSTER === "mainnet-beta" ? "mainnet-beta" : "devnet";
export const rpcEndpoint = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(cluster);
export const walletChain = cluster === "mainnet-beta" ? "solana:mainnet" : "solana:devnet";
