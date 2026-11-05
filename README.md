# Connex

Mobile-first PWA for IRL event networking on Solana (QR badge, connections, tips). React + Vite on Cloudflare Workers (Hono API), wrapped as an Android APK with `solana-mobile webshell`.

```
npm install
npm run dev      # local dev (app + Worker)
npm run build    # typecheck + production build
npm run deploy   # build + wrangler deploy
```

Config: `.env` (VITE_* vars, see `.env.example`), `.dev.vars` (Worker secrets), `wrangler.jsonc` (Worker/assets), `vite.config.ts` (PWA), `src/styles.css` (design tokens), `src/i18n/strings.ts` (copy). Plan: `docs/PLANO.md`.
