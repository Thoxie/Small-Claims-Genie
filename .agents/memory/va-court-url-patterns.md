---
name: Virginia court website URL patterns
description: vacourts.gov clerkWebsite URL conventions — path style varies per locality, don't assume a single pattern
---

vacourts.gov General District Court pages use `/home` (no `.html` suffix), and the path prefix is locality-specific:
- Most localities: `https://www.vacourts.gov/courts/gd/[slug]/home`
- ~50 rural/smaller localities share a combined GD + J&DR court: `https://www.vacourts.gov/courts/combined/[slug]/home`
- A few independent cities (e.g. Covington, Manassas, Manassas Park, Poquoson) have no page of their own — they share the neighboring county's combined/gd page.
- Some localities share one court across two names (e.g. Frederick/Winchester, Harrisonburg/Rockingham, Lexington/Rockbridge, Wise/Norton, Williamsburg/James City County) — both names map to the same URL.

**Why:** ChatGPT-generated seed data guessed `/courts/gd/[slug]/home.html` uniformly for all 133 VA localities; ~50 actually 404'd because they use `/combined/` or share a URL with another locality.

**How to apply:** Never assume a single URL template for a full-state locality list. Fetch the authoritative directory page (`https://www.vacourts.gov/courts/gd`) to get the real per-locality path before trusting AI-generated URLs, then curl-verify every unique URL (200 check) before shipping.
