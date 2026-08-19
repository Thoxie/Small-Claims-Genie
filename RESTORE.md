# Restore Small Claims Genie

This document restores the **source tree and database structure** represented
by this repository. It deliberately does not contain a database data dump,
uploaded documents, credentials, certificates, or third-party account data.
Those must be retained separately and imported using the commands below.

## What this backup contains

- All tracked source, configuration, static court-form assets, PDFs, images,
  tests, package manifests, and the lockfile.
- `schema.sql`, a schema-only PostgreSQL 16.10 export from the development
  database. It includes schemas, enum/custom types, functions, tables,
  indexes, foreign keys, sequences, defaults, constraints, and triggers.
- `DATABASE.md`, `PORTABILITY.md`, `AI_CONFIG.md`, and `BACKUP_MANIFEST.md`.
- A Docker build and Compose configuration for an API, static web frontend,
  and PostgreSQL 16 database.

## Runtime baseline

| Component | Verified version |
| --- | --- |
| Node.js | 24.13.0 |
| pnpm | 10.26.1 |
| PostgreSQL source database | 16.10 |
| Package manager | pnpm workspaces |
| API | Express API bundled with esbuild |
| Web frontend | React + Vite |

Install Node 24 and enable Corepack before installing dependencies:

```bash
corepack enable
corepack prepare pnpm@10.26.1 --activate
node --version
pnpm --version
```

## Restore source code

1. Clone the repository:

   ```bash
   git clone https://github.com/Thoxie/Small-Claims-Genie.git
   cd Small-Claims-Genie
   ```

2. Confirm source integrity:

   ```bash
   git status --short
   git ls-files | wc -l
   ```

   The source snapshot used for this backup had 1,499 tracked files and no
   non-ignored untracked files before this backup bundle was added.

   A downloadable source archive can be generated at any time with:

   ```bash
   bash scripts/archive-source.sh
   ```

   It includes every tracked file—including hidden configuration, lockfiles,
   PDFs, images, and static court-form assets—plus non-ignored backup files.
   It also includes the one application-required logo imported from
   `attached_assets`. It intentionally excludes `.env`, dependency folders,
   build output, unrelated chat attachments, and database data-dump files.

3. Install dependencies exactly from the committed lockfile:

   ```bash
   pnpm install --frozen-lockfile
   ```

4. Copy the safe environment template and fill in values from the owning
   service accounts:

   ```bash
   cp .env.example .env
   chmod 600 .env
   ```

   Do not reuse Replit runtime credentials. `PORTABILITY.md` identifies code
   that must be migrated before hosting outside Replit.

## Restore PostgreSQL

### Create a fresh database

```bash
createdb small_claims_genie
export DATABASE_URL='postgresql://app_user:replace_me@localhost:5432/small_claims_genie?sslmode=require'
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f schema.sql
```

The local Docker database uses `sslmode=disable`; a managed production host
normally requires `sslmode=require` or its provider-specific CA settings.

### Import separately retained data

Keep data dumps outside Git. The following commands use PostgreSQL custom
format because it preserves dependency-aware restore ordering:

```bash
# On the source database: schema only
pg_dump --schema-only --no-owner --no-privileges \
  --file=small-claims-genie-schema.sql "$SOURCE_DATABASE_URL"

# On the source database: data only
pg_dump --data-only --format=custom --no-owner --no-privileges \
  --file=small-claims-genie-data.dump "$SOURCE_DATABASE_URL"

# On the source database: schema + data in one portable archive
pg_dump --format=custom --no-owner --no-privileges \
  --file=small-claims-genie-full.dump "$SOURCE_DATABASE_URL"

# On a fresh destination: restore a data-only dump after schema.sql.
# --disable-triggers requires a database owner/superuser; it prevents
# foreign-key ordering errors during restore.
pg_restore --dbname="$DATABASE_URL" --no-owner --no-privileges \
  --disable-triggers small-claims-genie-data.dump

# Or restore a complete custom archive to an empty destination:
pg_restore --dbname="$DATABASE_URL" --clean --if-exists \
  --no-owner --no-privileges --disable-triggers small-claims-genie-full.dump
```

Do not store `*.dump`, `*.backup`, `*.sql.gz`, or data-export folders in the
repository. `.gitignore` now excludes them.

### Schema management and migrations

The current application uses Drizzle ORM with schema definitions in
`lib/db/src/schema/` and `drizzle-kit push` (`pnpm --filter @workspace/db run
push`) for schema reconciliation. It does **not** maintain a normal
application-owned Drizzle migration ledger in this database. The only live
`_migrations` table is `stripe._migrations`, owned by `stripe-replit-sync`.

For an exact restore, load `schema.sql` and any retained data dump. Do not run
`drizzle-kit push` automatically against a restored production database; use
it only after reviewing a schema diff. Before enabling payments outside
Replit, replace `stripe-replit-sync` as described in `PORTABILITY.md`.

## Build and run locally without Docker

```bash
# Build shared TypeScript libraries first, then application artifacts.
pnpm run typecheck

# Build API and web client.
pnpm --filter @workspace/api-server run build
NODE_ENV=production BASE_PATH=/ \
  pnpm --filter @workspace/small-claims-genie run build

# Start the API on http://localhost:8080
PORT=8080 APP_ENV=production CHROMIUM_PATH=/path/to/chromium \
  pnpm --filter @workspace/api-server run start

# In another terminal, serve the web bundle with a reverse proxy that routes
# /api and /form-assets to port 8080. docker/nginx.conf is a working example.
```

The API host must provide `pdftk`, `pdftotext`/Poppler, Chromium, and `ffmpeg`
for all existing form and voice workflows. The Docker image installs these.

## Run with Docker Compose

1. Create a real `.env` from `.env.example`, including valid Clerk, OpenAI,
   Stripe, Resend, admin, and any enabled Tyler EFM values.
2. Replace the Compose database password before exposing PostgreSQL.
3. Build and start:

   ```bash
   docker compose up --build
   ```

4. Browse `http://localhost:8080`; the API is mapped to
   `http://localhost:8081`.

The Compose stack starts the local database from `schema.sql`. It cannot make
the Replit object-storage sidecar or the Replit AI/Stripe connector services
appear; finish the replacements in `PORTABILITY.md` before treating it as a
fully functional non-Replit deployment.

## Restore external data

| Data | Source | Restore action |
| --- | --- | --- |
| PostgreSQL rows | Retained private `pg_dump` archive | Restore with `pg_restore` above |
| Uploaded documents | Replit-backed GCS object storage | Export with `gcloud storage`/GCS tooling, then migrate object names and access-control metadata to the replacement store |
| Clerk users and configuration | Clerk development/production tenant | Export/manage in Clerk; tenants are environment-separated |
| Stripe product, customer, payment, and webhook state | Stripe account | Retain Stripe account and recreate webhook endpoints; do not treat the local `stripe` schema as a standalone payment system |
| Resend sender/domain settings | Resend account | Verify the sending domain and API key in the replacement environment |
| Tyler EFM credentials/certificates | Tyler EFM account | Securely transfer/reissue credentials and test each e-filing endpoint |

## Verify the restore

### Database row-count checklist

These are the source development-database counts captured for this backup.
Counts in the `stripe` schema will differ if the replacement Stripe sync is
not yet configured.

| Table | Expected rows |
| --- | ---: |
| public.ai_rate_limits | 2 |
| public.beta_access | 0 |
| public.cases | 8 |
| public.chat_messages | 0 |
| public.conversations | 0 |
| public.counties | 740 |
| public.documents | 0 |
| public.download_tokens | 710 |
| public.efile_court_locations | 0 |
| public.efile_submissions | 0 |
| public.genie_conversions | 0 |
| public.messages | 0 |
| public.purchases | 0 |
| public.tester_access | 0 |
| stripe._managed_webhooks | 2 |
| stripe._migrations | 53 |
| stripe._sync_status | 0 |
| stripe.accounts | 2 |
| stripe.checkout_session_line_items | 1 |
| stripe.checkout_sessions | 1 |
| stripe.customers | 0 |
| stripe.events | 0 |
| stripe.prices | 15 |
| stripe.products | 14 |

All other captured Stripe tables had zero rows: `active_entitlements`, `charges`,
`coupons`, `credit_notes`, `disputes`, `early_fraud_warnings`, `features`,
`invoices`, `payment_intents`, `payment_methods`, `payouts`, `plans`, `refunds`,
`reviews`, `setup_intents`, `subscription_items`, `subscription_schedules`,
`subscriptions`, and `tax_ids`.

### Health and manual flow checklist

1. Confirm the API process is listening:

   ```bash
   curl -i http://localhost:8081/
   ```

   A 404 at `/` confirms the API is reachable; application routes are mounted
   under `/api`. Use an authenticated API endpoint or the browser app for a
   full health check.
2. Open the web app, complete Clerk sign-up/sign-in, and verify the user can
   create and reopen a case.
3. Upload a test document and confirm it reaches the replacement object store.
4. Generate one unsigned court form and one signed form, confirming the PDF
   download succeeds.
5. Test a Stripe checkout in Stripe test mode and confirm the webhook updates
   access status.
6. Send a test reminder email through Resend and, if enabled, test a Tyler EFM
   sandbox workflow.