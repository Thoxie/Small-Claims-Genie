---
name: Multi-state SEO copy pattern
description: Where state names may/may not appear on public marketing pages after the CA-only copy cleanup
---

The product supports multiple states (`SUPPORTED_STATES` in `pricing.tsx` — check that file for the current live list) with full county/court data wired up for each one.

**Rule:** state names should appear in exactly one place on public marketing pages — the "Available in ..." badge on the pricing page (driven by `SUPPORTED_STATES`). All other public pages (landing, how-it-works, faq, resources) and their meta/JSON-LD should use generic "small claims court" / "your state" language, not name specific states.

**Why:** avoids the marketing copy on generic pages needing an edit every time a new state is added; the pricing badge is the single place that enumerates supported states.

**Exceptions (intentionally left state-specific):**
- `counties.tsx` — the one page whose entire purpose is per-state/county data (courthouse address, filing fees); it has a tab per supported state with explicit state names, and its `FilingFeesPanel` branches per state based on the actual shape of that state's county fee data (3-tier numeric grid, flat fee, or notes-only fallback). Every new state must be added here — see `state-expansion` skill rollout checklist.
- `sc100-generator.tsx` — generates a real, judicially-specific California SC-100 form; not linked from generic marketing pages, so left untouched rather than genericized.
- `resources.tsx` external links (courts.ca.gov URLs, SC-100/SC-101/etc. form names) — kept as-is since these are the only concrete jurisdiction resources currently available; only the surrounding descriptive copy was genericized (e.g. "California Courts Self-Help" → "State Courts Self-Help").
