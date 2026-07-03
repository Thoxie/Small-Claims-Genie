---
name: Multi-state SEO copy pattern
description: Where state names may/may not appear on public marketing pages after the CA-only copy cleanup
---

The product supports multiple states (CA, FL, TX, IL, NC per `SUPPORTED_STATES` in `pricing.tsx`), but only California and Florida have real county/court data wired up.

**Rule:** state names should appear in exactly one place on public marketing pages — the "Available in ..." badge on the pricing page (driven by `SUPPORTED_STATES`). All other public pages (landing, how-it-works, faq, resources) and their meta/JSON-LD should use generic "small claims court" / "your state" language, not name specific states.

**Why:** the product is being marketed as a multi-state platform even though only CA/FL have full data; naming California everywhere overclaims scope and undersells the other states.

**Exceptions (intentionally left state-specific):**
- `counties.tsx` — the one page whose entire purpose is per-state/county data (courthouse address, filing fees); it keeps a CA/FL toggle and explicit state names.
- `sc100-generator.tsx` — generates a real, judicially-specific California SC-100 form; not linked from generic marketing pages, so left untouched rather than genericized.
- `resources.tsx` external links (courts.ca.gov URLs, SC-100/SC-101/etc. form names) — kept as-is since these are the only concrete jurisdiction resources currently available; only the surrounding descriptive copy was genericized (e.g. "California Courts Self-Help" → "State Courts Self-Help").
