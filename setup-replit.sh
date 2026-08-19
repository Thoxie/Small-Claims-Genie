#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Small Claims Genie — Replit Setup Script  (Replit-only)
#
# NOTE: This script sets up a fresh Replit workspace ONLY.
# It does NOT import the database. For a complete platform-neutral
# restore (including loading small-claims-genie-db.sql), follow
# RESTORE.md instead.
# ─────────────────────────────────────────────────────────────────

set -e

echo ""
echo "=============================================="
echo "  Small Claims Genie — Replit Setup Script"
echo "=============================================="
echo ""

# ── Step 1: Dependencies ───────────────────────────────────────────
echo "► Step 1/3: Installing dependencies..."
pnpm install
echo "  ✓ Dependencies installed"
echo ""

# ── Step 2: Check secrets ──────────────────────────────────────────
echo "► Step 2/3: Checking required secrets..."

MISSING=0

check_secret() {
  if [ -z "${!1}" ]; then
    echo "  ✗ MISSING: $1"
    MISSING=1
  else
    echo "  ✓ Found:   $1"
  fi
}

check_secret "CLERK_SECRET_KEY"
check_secret "VITE_CLERK_PUBLISHABLE_KEY"
check_secret "SESSION_SECRET"
check_secret "DATABASE_URL"

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "  ⚠ One or more secrets are missing."
  echo "  Add them in Replit's Secrets panel (padlock icon in sidebar)."
  echo "  See .env.example for details on where to get each one."
  echo ""
  echo "  Cannot continue until all secrets are set. Re-run this script after adding them."
  exit 1
fi

echo ""

# ── Step 3: Database schema push ───────────────────────────────────
# Applies the Drizzle schema to the Replit-managed PostgreSQL database.
# Does NOT import reference data (counties, etc.) from small-claims-genie-db.sql.
# To load the full data export, see RESTORE.md § "Import the data".
echo "► Step 3/3: Applying database schema..."
pnpm --filter @workspace/db run push
echo "  ✓ Database schema applied"
echo ""

# ── Done ───────────────────────────────────────────────────────────
echo "=============================================="
echo "  ✓ Replit setup complete!"
echo ""
echo "  ⚠ DATA NOT LOADED: county reference data and other seeded"
echo "  rows are not imported by this script. To load them run:"
echo "    psql \"\$DATABASE_URL\" -f small-claims-genie-db.sql"
echo "  See RESTORE.md for the complete restore procedure."
echo ""
echo "  Next: Start the workflows in Replit:"
echo "    - artifacts/api-server: API Server"
echo "    - artifacts/small-claims-genie: web"
echo ""
echo "  Your app will be fully functional at the"
echo "  preview URL shown in the Replit sidebar."
echo "=============================================="
echo ""
