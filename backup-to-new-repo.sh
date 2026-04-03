#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Small Claims Genie — Push to a NEW GitHub repo (safe backup)
# This does NOT overwrite your existing repo.
#
# Usage:
#   bash backup-to-new-repo.sh https://github.com/YourUsername/NewRepoName.git
#
# Before running:
#   1. Create a new empty repo on github.com (no README, no .gitignore)
#   2. Copy its URL and paste it after the script name above
# ─────────────────────────────────────────────────────────────────

set -e

NEW_REPO_URL="$1"

if [ -z "$NEW_REPO_URL" ]; then
  echo ""
  echo "  ERROR: No repo URL provided."
  echo ""
  echo "  Usage:"
  echo "    bash backup-to-new-repo.sh https://github.com/YourUsername/NewRepoName.git"
  echo ""
  echo "  Step 1: Go to github.com and create a new EMPTY repo (no README, no .gitignore)"
  echo "  Step 2: Copy the repo URL and run this script with it"
  echo ""
  exit 1
fi

echo ""
echo "=============================================="
echo "  Small Claims Genie — Backup to New Repo"
echo "=============================================="
echo ""
echo "  Target: $NEW_REPO_URL"
echo ""

# Add the new repo as a temporary remote called 'backup'
echo "► Adding new repo as remote..."
git remote remove backup 2>/dev/null || true
git remote add backup "$NEW_REPO_URL"
echo "  ✓ Remote added"
echo ""

# Push all branches and tags to the new repo
echo "► Pushing all code to new repo..."
git push --force backup main
echo "  ✓ Push complete"
echo ""

# Clean up the temporary remote
git remote remove backup
echo "  ✓ Temporary remote cleaned up"
echo ""

echo "=============================================="
echo "  ✓ Backup complete!"
echo ""
echo "  Your code is now at: $NEW_REPO_URL"
echo "  Your original repo is unchanged."
echo "=============================================="
echo ""
