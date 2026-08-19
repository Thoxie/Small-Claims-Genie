---
name: GitHub push method
description: Safe GitHub push guidance that never puts a token in a URL or defaults to rewriting remote history
---

# GitHub push method

## The rule

Use the repository's `push.sh` script for routine pushes:

```bash
bash push.sh
```

The script uses Git's credential helper by default, or receives a token through
the process environment when a non-interactive credential helper is required.
It never puts a credential in the remote URL or in the command line.

**Why:** URL and command-line credentials can leak through shell history,
process listings, or copied configuration. A non-force default prevents an
accidental remote-history overwrite.

**How to apply:**
- Confirm the push output reports a normal ref update and verify the remote
  branch SHA afterward.
- Do not bypass the pre-push scanner. A historical finding needs remediation,
  not a bypass.
- If Git transport cannot authenticate, use the GitHub connector fallback
  documented separately; it must not embed a token in a URL.
