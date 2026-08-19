#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Small Claims Genie — Refresh Database Export
#
# Regenerates small-claims-genie-db.sql from the live development
# database. Run this before creating a new portable backup archive.
#
# What it dumps:
#   - All rows in the public and stripe schemas
#   - Format: plain SQL INSERT statements (human-readable, version-safe)
#   - Excludes: schema DDL (schema.sql is the canonical schema export)
#   - Excludes: ownership and privilege statements
#
# What it does NOT dump:
#   - Uploaded user documents (stored in Replit object storage / GCS)
#   - Clerk user accounts (managed by Clerk, not the database)
#   - Live credentials or webhook signing secrets (redacted before writing)
#
# When to run:
#   - Before generating a new portable backup archive
#   - After any significant data change you want preserved
#     (e.g. adding counties, updating Stripe product catalog)
#
# Prerequisites:
#   - DATABASE_URL must be set in the environment
#   - pg_dump (PostgreSQL 16 client tools) must be on PATH
#
# Usage:
#   bash scripts/refresh-db-export.sh
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

OUTPUT="small-claims-genie-db.sql"
TMPFILE="${OUTPUT}.tmp.$$"

echo "Exporting all schema data from database..."

pg_dump \
  --data-only \
  --inserts \
  --no-owner \
  --no-privileges \
  "$DATABASE_URL" \
  > "$TMPFILE"

# Stripe's synchronized cache can contain webhook signing secrets. Keep the
# data structure but replace credential values with explicit redaction markers
# before this export becomes a tracked file.
python3 scripts/redact-db-export-secrets.py "$TMPFILE"

# Verify the export contains the critical counties reference data
if ! grep -q 'Data for Name: counties' "$TMPFILE"; then
  echo "ERROR: Export does not contain public.counties rows. Aborting." >&2
  rm -f "$TMPFILE"
  exit 1
fi

mv "$TMPFILE" "$OUTPUT"

ROWS=$(grep -c '^INSERT INTO' "$OUTPUT" || true)
echo "Done. Wrote ${ROWS} INSERT statements to ${OUTPUT}."
echo ""
echo "Tables included:"
grep '^INSERT INTO' "$OUTPUT" | sed -E 's/^INSERT INTO ([^ (]+).*/\1/' | sort -u | sed 's/^/  /'
echo ""
echo "Commit this file if the counts look correct:"
echo "  git add ${OUTPUT} && git commit -m 'Refresh DB export'"
