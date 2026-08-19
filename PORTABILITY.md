# Replit Exit / Portability Audit

## Honest status

The source code, static court forms, assets, configuration, PostgreSQL schema,
and package lockfile are portable. The application is **not yet fully
independent of Replit at runtime** because object storage, AI proxy routing,
Stripe synchronization/credential fallback, and development-only Vite plugins
depend on Replit services or environment conventions.

`Dockerfile` and `docker-compose.yml` are intentionally a reproducible
starting point, not a claim that the existing unmodified runtime can replace
those managed services. This audit does not change application logic.

## Replit-specific code and required replacement

| Dependency or behavior | Current locations | Why it is not portable | Replacement and code work required |
| --- | --- | --- | --- |
| Replit object-storage sidecar | `artifacts/api-server/src/lib/objectStorage.ts` | Hard-codes `127.0.0.1:1106`, Replit external-account credentials, and Replit signed-URL endpoint | Replace the storage client construction and `signObjectURL` with direct GCS service-account credentials, AWS S3, Cloudflare R2, or another object store’s SDK/presigning API. Preserve object-key and ACL semantics. |
| Replit AI integration proxy | `lib/integrations-openai-ai-server/src/client.ts`, `audio/client.ts`, `image/client.ts`, `lib/integrations-openai-ai-react/` | Requires `AI_INTEGRATIONS_OPENAI_BASE_URL` and Replit-issued proxy key | Point the OpenAI SDK at `https://api.openai.com/v1` with a user-owned API key, or replace the client module and all environment names. |
| Stripe Replit connector fallback | `artifacts/api-server/src/stripeClient.ts` | Falls back to `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`, `WEB_REPL_RENEWAL`, and Replit deployment identity | Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` directly in the new host and remove the connector fallback after validation. |
| Stripe managed synchronization | `artifacts/api-server/src/index.ts`, `stripeClient.ts`, `routes/stripe.ts`, `webhookHandlers.ts`, root `package.json` | `stripe-replit-sync` owns the `stripe` schema and migration ledger; this is not a portable application database model | Replace with Stripe webhooks plus an application-owned subscription/payment projection, or operate an equivalent supported Stripe sync service. Do not manually edit synced tables. |
| Replit Vite development plugins | Vite configs under `artifacts/small-claims-genie/`, `artifacts/admin/`, `artifacts/beta-access/`, `artifacts/mockup-sandbox/` | Development UI/cartography plugins are Replit-only | Remove or conditionally omit `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, and runtime overlay packages in the non-Replit build. Production Vite builds already omit the development-only plugins. |
| Replit artifact routing/config | `.replit`, artifact Vite configs, workflow settings | Provides workflow ports, artifact base paths, and deployment routing | Replace with host process definitions, reverse proxy rules, health checks, and environment configuration. `docker/nginx.conf` supplies the web/API routing baseline. |
| Replit deployment/database split | `.replit`, `replit.md`, environment assumptions | Development and production database/Clerk tenants are auto-separated by Replit | Create explicit staging and production databases, Clerk instances, secrets, storage buckets, and Stripe webhook endpoints in the new host. |

## Third-party services to re-provision

| Service | Current use | Account/dashboard needed |
| --- | --- | --- |
| PostgreSQL | Cases, court directory, conversations, documents metadata, access records, Stripe sync cache | Any PostgreSQL 16-compatible provider or self-hosted PostgreSQL |
| Clerk | User sign-up, sign-in, JWT verification | Clerk dashboard; development and production tenants are separate |
| OpenAI | Case Advisor, Help Genie, document analysis/OCR, demand letters, hearing prep, transcription, image generation | OpenAI platform project and API key |
| Stripe | Checkout, payment status, webhooks, product/price data | Stripe Dashboard |
| Resend | Hearing/reminder email delivery | Resend Dashboard and verified sender domain |
| Google Cloud Storage / Replit Object Storage | Uploaded documents and object ACLs | Existing GCS project/bucket or a replacement object-storage provider |
| Tyler EFM | Optional Texas/Illinois e-filing and court sync | Tyler EFM credentials, certificates, sandbox/production endpoint access |
| Court/government source sites | Court forms and directories are referenced/researched externally | No runtime account normally required; revalidate links and forms periodically |

## Background work to replace

The API starts process-local intervals at boot. A horizontally scaled non-Replit
deployment must replace these with a singleton worker, distributed lock, or
managed scheduler so work is not duplicated:

| Job | Current implementation | Recommended non-Replit runtime |
| --- | --- | --- |
| Hearing reminder email | `lib/reminder-scheduler.ts`, hourly | Managed cron/queue worker with database locking |
| Pending object cleanup | `lib/pending-upload-cleanup.ts`, every 15 minutes | Managed cron/queue worker with object-store delete permissions |
| Genie conversion cleanup | `lib/genie-conversions-cleanup.ts` | Managed cron/queue worker |
| Tyler court sync | `lib/tyler-court-sync.ts`, daily | Managed scheduler with retry/alerting |

## Asset and data inventory

Repository-tracked static assets include:

- `artifacts/api-server/assets/` — official court PDFs, PDF page images, form
  maps, Florida/Illinois/Texas/Virginia form assets
- `artifacts/api-server/src/assets/` — source-side asset copies used by some
  build/test paths
- `artifacts/small-claims-genie/public/`, `artifacts/admin/public/`,
  `artifacts/mobile/assets/`, and `artifacts/mockup-sandbox/` — web/mobile UI
  assets and development preview resources
- `attached_assets/2small-claims-genie-logo_1775074104796.png` — the one
  ignored attachment imported by the web layouts; Docker and the source-archive
  script include it explicitly. Other `attached_assets` files are uploaded
  research/chat material, not a runtime application dependency.
- root PDF/document resources listed in `BACKUP_MANIFEST.md`

The source audit found no tracked user-upload directory. User uploads live in
object storage and must be exported separately.

## Additional host requirements

- Node.js 24
- PostgreSQL 16
- `pdftk`, Poppler (`pdftotext`), Chromium, and `ffmpeg`
- HTTPS and reverse proxy support for SSE (`/api`) and form assets
- A secret manager; never bake credentials into images or source
- A data retention and backup policy for PostgreSQL and object storage

## What cannot be determined from this workspace

- The exact contents of the object-storage buckets
- Secrets, certificates, or external account settings
- Clerk user/export availability and tenant-level configuration
- Stripe/Resend/Tyler dashboard state outside the credentials configured here
- Production database rows, which are intentionally separate from development

Those items require authorized export from the respective provider accounts.