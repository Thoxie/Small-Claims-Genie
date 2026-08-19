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
- `small-claims-genie-db.sql`, a plain-SQL data export of all rows in the
  `public` and `stripe` schemas (INSERT format, no schema DDL).
- `DATABASE.md`, `PORTABILITY.md`, `AI_CONFIG.md`, and `BACKUP_MANIFEST.md`.
- A Docker build and Compose configuration for an API, static web frontend,
  and PostgreSQL 16 database.

## Git history note

The repository history was rewritten with `git filter-branch` before the
initial push to GitHub. The specific credential that was removed is not known
with certainty. As a precaution, treat any credential that was ever stored in
the development workspace as potentially exposed and confirm it has been rotated
before reusing it outside Replit.

## Schema vs data restore order

Always restore in this order:

1. **`schema.sql`** — creates all schemas, types, tables, indexes, sequences,
   functions, and triggers.
2. **`small-claims-genie-db.sql`** (or a custom-format dump) — loads all data
   rows into the already-created tables.
3. **`drizzle-kit push`** (optional) — only if the checked-in Drizzle schema
   definitions have diverged from `schema.sql`. Do not run it automatically
   against a restored production database.

> **Docker Compose**: the `docker-entrypoint-initdb.d/` init scripts follow
> this order automatically (`001-schema.sql` then `002-data.sql`).

## Replit-only setup

`setup-replit.sh` installs dependencies, checks secrets, and runs
`drizzle-kit push` for a fresh Replit workspace. **It does not import the
database.** Use the commands below to load `small-claims-genie-db.sql` after
running `setup-replit.sh`.

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

### Import the data

The repository includes `small-claims-genie-db.sql`, a plain-SQL data export
of all rows. Load it immediately after `schema.sql`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f small-claims-genie-db.sql
```

This file is kept current with `scripts/refresh-db-export.sh`. Run that script
and commit the result whenever the reference data changes significantly (e.g.
counties updated, Stripe product catalog changed).

For a heavier custom-format archive workflow:

```bash
# On the source database: data only (custom format)
pg_dump --data-only --format=custom --no-owner --no-privileges \
  --file=small-claims-genie-data.dump "$SOURCE_DATABASE_URL"

# Restore after schema.sql. --disable-triggers requires superuser; it prevents
# foreign-key ordering errors during restore.
pg_restore --dbname="$DATABASE_URL" --no-owner --no-privileges \
  --disable-triggers small-claims-genie-data.dump
```

Do not store `*.dump`, `*.backup`, `*.sql.gz`, or data-export folders in the
repository. `.gitignore` excludes them.

### Schema management and migrations

The application uses **Drizzle ORM** with schema definitions in
`lib/db/src/schema/`. The schema command is `drizzle-kit push`
(`pnpm --filter @workspace/db run push`), which diffs the TypeScript schema
against the live database and applies ALTER statements directly — it does **not**
produce a migration file per change.

There is no application-owned Drizzle migration ledger in the database. The
only `_migrations` table is `stripe._migrations`, owned by `stripe-replit-sync`,
which must not be used to gauge application schema state.

**The three SQL files in `lib/db/migrations/`** are one-off DDL patches
(`add_jurisdiction_state.sql`, `add_efile_court_locations_unique_index.sql`,
`add_mc030_declaration_text.sql`) that were applied manually during early
development. Their changes are already reflected in `schema.sql`. **Do not
replay them on a restore from `schema.sql`** — doing so will produce
"column already exists" / "index already exists" errors.

For an exact restore: load `schema.sql` first, then `small-claims-genie-db.sql`.
Run `drizzle-kit push` only if the checked-in TypeScript schema has diverged
from `schema.sql`. Before enabling payments outside Replit, replace
`stripe-replit-sync` as described in `PORTABILITY.md`.

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

The Compose stack loads `schema.sql` then `small-claims-genie-db.sql`
automatically on first boot (the init scripts in `docker-entrypoint-initdb.d/`
run in filename order on an empty data volume). It cannot make the Replit
object-storage sidecar or the Replit AI/Stripe connector services appear;
finish the replacements in `PORTABILITY.md` before treating it as a fully
functional non-Replit deployment.

## Restore external data

| Data | Source | Restore action |
| --- | --- | --- |
| PostgreSQL rows | `small-claims-genie-db.sql` (committed) + any private custom-format dump | Load with `psql -f small-claims-genie-db.sql` or `pg_restore` |
| Uploaded documents | Replit-backed GCS object storage | Export with `gcloud storage`/GCS tooling, then migrate object names and access-control metadata to the replacement store |
| Clerk users and configuration | Clerk development/production tenant | Export/manage in Clerk; tenants are environment-separated |
| Stripe product, customer, payment, and webhook state | Stripe account | Retain Stripe account and recreate webhook endpoints; do not treat the local `stripe` schema as a standalone payment system |
| Resend sender/domain settings | Resend account | Verify the sending domain and API key in the replacement environment |
| Tyler EFM credentials/certificates | Tyler EFM account | Securely transfer/reissue credentials and test each e-filing endpoint |

## Verify the restore

### Database row-count checklist

Counts captured from the live development database on **2026-08-19**.
All 43 tables (14 public + 29 stripe) are listed. Stripe counts will differ
if the replacement Stripe sync is not yet configured.

| Table | Expected rows |
| --- | ---: |
| public.ai_rate_limits | 2 |
| public.beta_access | 0 |
| public.cases | 8 |
| public.chat_messages | 0 |
| public.conversations | 0 |
| public.counties | 740 |
| public.documents | 0 |
| public.download_tokens | 735 |
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
| stripe.active_entitlements | 0 |
| stripe.charges | 0 |
| stripe.checkout_session_line_items | 1 |
| stripe.checkout_sessions | 1 |
| stripe.coupons | 0 |
| stripe.credit_notes | 0 |
| stripe.customers | 0 |
| stripe.disputes | 0 |
| stripe.early_fraud_warnings | 0 |
| stripe.events | 0 |
| stripe.features | 0 |
| stripe.invoices | 0 |
| stripe.payment_intents | 0 |
| stripe.payment_methods | 0 |
| stripe.payouts | 0 |
| stripe.plans | 0 |
| stripe.prices | 15 |
| stripe.products | 14 |
| stripe.refunds | 0 |
| stripe.reviews | 0 |
| stripe.setup_intents | 0 |
| stripe.subscription_items | 0 |
| stripe.subscription_schedules | 0 |
| stripe.subscriptions | 0 |
| stripe.tax_ids | 0 |

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