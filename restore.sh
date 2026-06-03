#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Small Claims Genie — Full Restore Script
# Run this after cloning the repo into a fresh Replit project.
# ─────────────────────────────────────────────────────────────────

set -e

echo ""
echo "=============================================="
echo "  Small Claims Genie — Restore Script"
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

# ── Step 3: Database migration ─────────────────────────────────────
echo "► Step 3/3: Running database migration..."
pnpm --filter @workspace/db run push
echo "  ✓ Database tables created"
echo ""

# ── Done ───────────────────────────────────────────────────────────
echo "=============================================="
echo "  ✓ Restore complete!"
echo ""
echo "  Next: Start the workflows in Replit:"
echo "    - artifacts/api-server: API Server"
echo "    - artifacts/small-claims-genie: web"
echo ""
echo "  Your app will be fully functional at the"
echo "  preview URL shown in the Replit sidebar."
echo "=============================================="
echo ""
