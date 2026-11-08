import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0") },
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: "autoUpdate",
      // Registered in src/main.tsx so updates apply right away (see registerSW there).
      injectRegister: false,
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png", "logo.svg"],
      manifest: {
        name: "conneX",
        short_name: "conneX",
        description: "Your smart badge for IRL connections.",
        theme_color: "#0A0D16",
        background_color: "#0A0D16",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Arquivos de verdade (imagens de /press, .well-known, qualquer coisa com extensão) não caem no app.
        navigateFallbackDenylist: [/^\/api\//, /^\/press\//, /^\/\.well-known\//, /\/[^/?]+\.[a-z0-9]+$/i],
        // A new version must take over without waiting for every tab to close:
        // the Android WebView shell is rarely closed, so a waiting worker would never activate.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
});
