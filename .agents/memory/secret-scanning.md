---
name: Secret scanning
description: Durable safety rule for portable database exports and local Git credential scanning.
---

# Secret scanning for portable exports

Treat any committed database export that includes synchronized provider metadata
as potentially sensitive. Redact credential-shaped values during export and
scan both the staged content and the full Git history before claiming the
repository is clean.

**Why:** Provider synchronization tables can contain webhook-signing secrets or
other credentials even when application source uses a secure secret store.

**How to apply:** Keep the redaction step in the export workflow. The local
scanner must fail commits and pushes on configured credential patterns; permit
only clearly bounded local development database URLs, never a broad path-level
exception.