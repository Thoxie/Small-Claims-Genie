#!/usr/bin/env bash
# archive-source.sh — Generate a downloadable source zip for external analysis
#
# Usage (from workspace root):
#   bash scripts/archive-source.sh
#
# Output: /tmp/small-claims-genie-source.zip
# Then copy to workspace root for download:
#   cp /tmp/small-claims-genie-source.zip .
#
# Excludes: node_modules, dist, .git, binary PDF assets,
#           lock files, build cache, state files

set -euo pipefail

OUTPUT="/tmp/small-claims-genie-source.zip"

echo "Collecting source files..."

find . \
  \( \
    -path "*/node_modules" \
    -o -path "*/.git" \
    -o -path "*/dist" \
    -o -path "*/.pnpm-store" \
    -o -path "*/.local/state" \
    -o -path "*/attached_assets" \
    -o -path "*/.cache" \
  \) -prune \
  -o -type f \( \
    -name "*.ts" \
    -o -name "*.tsx" \
    -o -name "*.js" \
    -o -name "*.jsx" \
    -o -name "*.json" \
    -o -name "*.yaml" \
    -o -name "*.yml" \
    -o -name "*.css" \
    -o -name "*.html" \
    -o -name "*.md" \
    -o -name "*.toml" \
    -o -name "*.mjs" \
    -o -name "*.cjs" \
    -o -name "*.sql" \
    -o -name "*.sh" \
  \) -print > /tmp/source-file-list.txt

FILE_COUNT=$(wc -l < /tmp/source-file-list.txt)
echo "Found $FILE_COUNT source files. Zipping..."

rm -f "$OUTPUT"
cat /tmp/source-file-list.txt | zip "$OUTPUT" -@ > /dev/null

SIZE=$(du -sh "$OUTPUT" | cut -f1)
echo "Done: $OUTPUT ($SIZE, $FILE_COUNT files)"
echo ""
echo "To present for download, run:"
echo "  cp $OUTPUT . && present via Replit agent present_asset tool"
