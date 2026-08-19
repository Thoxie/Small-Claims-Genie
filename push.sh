#!/usr/bin/env bash
# Push without putting a credential in the command line, shell history, or URL.
#
# Authentication is delegated to the configured Git credential helper. If a
# non-interactive environment requires it, set GITHUB_TOKEN in the environment
# before running this script; Git will use the credential helper entry below.
# The script intentionally does not force-push. Use an explicit
# `git push --force-with-lease` only after reviewing the remote history.

set -euo pipefail

REMOTE="${1:-origin}"
BRANCH="${2:-main}"

if [ "$#" -gt 2 ]; then
  echo "Usage: $0 [remote] [branch]" >&2
  exit 2
fi

if [ -n "${GITHUB_TOKEN:-}" ]; then
  printf 'protocol=https\nhost=github.com\nusername=x-access-token\npassword=%s\n\n' \
    "$GITHUB_TOKEN" | git credential approve
fi

git push "$REMOTE" "$BRANCH"
