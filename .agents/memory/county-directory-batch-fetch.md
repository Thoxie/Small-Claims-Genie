---
name: County courthouse directory batch-fetch technique
description: Efficient pattern for filling in missing courthouseAddress/phone across dozens of counties from a state courts website
---

For a statewide court system with per-county subpages (e.g. `nccourts.gov/locations/<slug>-county/<slug>-county-courthouse`), fetch all county pages in parallel batches (~10 at a time) rather than one-by-one, and parse address/city/zip/phone with regex anchored on stable markdown landmarks (e.g. `## Visit us` ... `[Maps and directions]`, `Telephone` heading followed by a `tel:` link).

**Why:** One-by-one lookups for 90+ counties burns enormous turns; batch fetching cuts it to a handful of calls. But not every county follows the "obvious" URL slug — some buildings are named differently (e.g. "Justice Center", "Judicial Center", "Governmental Center", "Hall of Justice") and the naive slug 404s.

**How to apply:**
1. Try the naive URL pattern for all counties in parallel first.
2. For any 404s, fetch the parent county's index page and look at its "County Information" section for the actual building-page link, then re-fetch with the corrected slug.
3. When parsing addresses, don't collapse newlines before regex-matching — the street/city/state often sit on separate lines with no other delimiter, and collapsing loses the split point. Split into non-empty lines and locate the line matching the state+zip pattern to anchor city (line before) and street (lines before that).
4. Only overwrite fields that are actually empty in the source data — some entries may already have verified data from a prior pass.
5. After editing generated/static data files served by a long-running dev server, restart the server workflow before trusting API responses — tsx watch mode doesn't reliably pick up data file changes (see FL fee waiver coords memory).
