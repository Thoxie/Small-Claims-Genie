#!/usr/bin/env bash
# archive-source.sh — Generate a complete portable source zip
#
# Usage (from workspace root):
#   bash scripts/archive-source.sh
#
# Output: /tmp/small-claims-genie-source.zip
# Then copy to workspace root for download:
#   cp /tmp/small-claims-genie-source.zip .
#
# Includes every Git-tracked file (including hidden/config files, lockfiles,
# PDFs, images, and other static assets) plus non-ignored working-tree files.
# Excludes ignored runtime state such as node_modules, build output, .env,
# attached chat assets, and locally generated database data dumps.

set -euo pipefail

OUTPUT="/tmp/small-claims-genie-source.zip"

echo "Collecting tracked source, config, and asset files..."

# This follows Git's own definition of repository content instead of filtering
# by extension. It keeps dotfiles, lockfiles, binary court-form templates, and
# all source assets necessary to restore the application.
git ls-files -co --exclude-standard > /tmp/source-file-list.txt

# The web layouts import this historical logo from the otherwise ignored
# attached_assets directory. Keep the application-required file in the archive
# without pulling in unrelated uploaded research/chat files.
printf '%s\n' \
  'attached_assets/2small-claims-genie-logo_1775074104796.png' \
  >> /tmp/source-file-list.txt
sort -u /tmp/source-file-list.txt -o /tmp/source-file-list.txt

FILE_COUNT=$(wc -l < /tmp/source-file-list.txt)
echo "Found $FILE_COUNT source files. Zipping..."

rm -f "$OUTPUT"
cat /tmp/source-file-list.txt | zip "$OUTPUT" -@ > /dev/null

SIZE=$(du -sh "$OUTPUT" | cut -f1)
echo "Done: $OUTPUT ($SIZE, $FILE_COUNT files)"
echo ""
echo "To present for download, run:"
echo "  cp $OUTPUT . && present via Replit agent present_asset tool"
