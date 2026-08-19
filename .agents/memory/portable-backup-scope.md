---
name: Portable backup scope
description: Constraints to preserve when preparing or restoring a non-Replit backup.
---

The portable backup should remain source/configuration/schema-only: never add
database rows, uploaded documents, credentials, certificates, or connection
strings to the repository. A separately retained database dump and object-store
export are required for a full data restore.

**Why:** The application’s source can run elsewhere, but its present runtime
still depends on Replit object-storage sidecar authentication, the Replit
OpenAI proxy, and Stripe’s Replit synchronization/connector fallback. A Docker
image is valuable for reproducible builds, but it does not make those managed
services portable by itself.

**How to apply:** Keep `RESTORE.md`, `DATABASE.md`, `PORTABILITY.md`,
`AI_CONFIG.md`, `schema.sql`, and the source archive current when preparing a
handoff. Include the one ignored logo imported by the web app in Docker/source
archives, while continuing to exclude unrelated chat attachments. Do not claim
an off-Replit production deployment is complete until the documented external
service replacements have been implemented and verified.