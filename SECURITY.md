# Security policy

conneX handles wallet sign-in, personal contact data and a wallet that pays network fees, so we take reports seriously.

## Reporting a vulnerability

Email **hello@connex.contact** with "Security" in the subject. Please include steps to reproduce and the impact you expect. Do not open a public issue for security problems.

We aim to reply within 72 hours and to keep you posted until it is fixed.

## Scope

- The web app at https://connex.contact and the Android app
- The API under `/api/*` (Cloudflare Worker in `worker/`)
- Database policies and functions in `supabase/migrations/`

Please don't access other people's data, run denial-of-service tests or spend the fee-payer wallet's funds beyond what a proof of concept needs.

## Design notes

- Every table has row-level security; sensitive writes go through database functions that check every rule. See `supabase/tests/rls_test.sql`.
- The Worker only signs Solana transactions it built from a fixed template, where the fee payer is the only signer and the only writable account.
- Users sign plain text messages, never transactions, for seals and presence proofs.
- No secrets live in this repository. Production secrets are stored as Cloudflare Worker secrets; the database keeps only a SHA-256 of the server secret.
