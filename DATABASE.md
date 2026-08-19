# Database Portability Record

## Verified source database

| Item | Value |
| --- | --- |
| Engine | PostgreSQL |
| Version | PostgreSQL 16.10 |
| Current hosting | Replit-managed PostgreSQL development database |
| Query layer | Drizzle ORM 0.45.2 with `node-postgres` (`pg`) |
| Connection variable | `DATABASE_URL` |
| Live schema names | `public`, `stripe` |
| Required extensions | `plpgsql` only (installed by PostgreSQL by default) |

The application creates a plain `pg.Pool` with only
`connectionString: process.env.DATABASE_URL`. It does not set a custom pool
size, connection timeout, statement timeout, or SSL object in code. Configure
those in the destination connection string or extend the pool configuration
after a separate review.

## Connection setup outside Replit

Use a PostgreSQL 16-compatible host and set `DATABASE_URL` in the host secret
manager. Typical managed-host form:

```text
postgresql://APP_USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

For the local Compose database:

```text
postgresql://small_claims:PASSWORD@db:5432/small_claims_genie?sslmode=disable
```

No code uses `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, or `PGDATABASE`
directly. They may still be used by `psql`/`pg_dump` command-line tooling.

## Schema export

`schema.sql` is an exact `pg_dump --schema-only --no-owner --no-privileges`
export captured from the development database. It includes:

- `public` and `stripe` schemas
- tables and columns, defaults, identity/sequence state definitions
- enum/custom types
- primary keys, unique constraints, check constraints, foreign keys, and
  `ON DELETE` behavior
- indexes
- functions and triggers
- the complete Stripe synchronization schema

The export contains no application table rows or connection credentials.

## Migration ledger

The project’s application schema source is `lib/db/src/schema/` and its schema
command is:

```bash
pnpm --filter @workspace/db run push
```

This current workflow uses Drizzle Kit’s schema push rather than a tracked,
application-owned migration ledger. A query of the live development database
found no public Drizzle migration table. The only migration ledger present is
`stripe._migrations`, which belongs to `stripe-replit-sync` and must not be
used to decide whether application migrations ran.

For a faithful restore:

1. Restore `schema.sql` first.
2. Restore a separately secured data dump if one is required.
3. Preserve any `stripe._migrations` rows only as part of the full database
   restore; do not synthesize or edit them.
4. Do not run `drizzle-kit push` until you have compared the restored schema
   to the checked-in Drizzle definitions.

## Required extensions and database objects

The only extension reported by the source database is:

```sql
CREATE EXTENSION IF NOT EXISTS plpgsql;
```

`plpgsql` is normally installed by default in PostgreSQL. No `uuid-ossp`,
`pgcrypto`, `pg_trgm`, `vector`, RLS policies, views, or materialized views
were present at capture time.

The dump contains two trigger functions:

- `public.set_updated_at()` for Stripe-style `_updated_at` values
- `public.set_updated_at_metadata()` for metadata update timestamps

It also contains the matching triggers in the `stripe` schema.

## Current row-count baseline

The exact counts captured from the development database are reproduced in
`RESTORE.md` under **Verify the restore**. Use the following query after a
restore to compare all non-system tables:

```sql
SELECT n.nspname AS schema_name, c.relname AS table_name,
  (xpath(
    '/row/count/text()',
    query_to_xml(
      format('SELECT count(*) AS count FROM %I.%I', n.nspname, c.relname),
      true, true, ''
    )
  ))[1]::text::bigint AS row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname;
```

## Outside-database application data

| Location | Contains | Export/migration requirement |
| --- | --- | --- |
| Replit-backed Google Cloud Storage | Uploaded user documents and object ACL metadata | Export through GCS tooling and migrate object keys/metadata to the replacement store |
| Clerk | User accounts, sessions, identity configuration | Migrate/recreate in Clerk or replace with another identity provider |
| Stripe | Payment system of record; local `stripe` schema is synchronized cache/state | Retain the Stripe account and recreate webhook/sync architecture |
| Resend | Email sender/domain configuration and delivery account | Reconfigure in destination account |
| Browser localStorage / mobile AsyncStorage | Per-device UI preferences, drafts, cached values | Not server backup data; users must re-enter or re-download |
| Server `/tmp` | Temporary PDFs, FDF files, converted audio | Ephemeral only; no durable export needed |

There is no application use of a Replit key-value database, and no durable
server-local uploads directory was found.