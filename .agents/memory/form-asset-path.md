---
name: Form asset runtime path
description: Where new form PDF/image assets must live so the built server can load them at runtime.
---

New form assets (blank AcroForm PDFs, PNG overlays, etc.) referenced by a `FormDefinition`'s `loadAsset()` call must live under `artifacts/api-server/assets/forms/` — the directory the built/running server actually reads from at runtime.

**Why:** It's easy to drop a newly-sourced form PDF into `src/assets/forms/` (feels natural next to the definition source file), but that directory is never copied into the runtime asset path. The server starts fine and only fails (or silently uses a stale/missing file) when the form-download route is actually hit.

**How to apply:** Whenever adding a new state/county form, verify the asset file resolves correctly by running the real download endpoint end-to-end (e.g. via a script hitting the live route with a download token) before declaring the form complete — don't just trust that a build/typecheck passed.
