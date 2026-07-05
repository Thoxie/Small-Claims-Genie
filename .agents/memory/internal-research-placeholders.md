---
name: Internal research placeholders in county data
description: County seed data from AI-assisted research can contain internal QA phrasing that leaks into user-facing UI if not audited before shipping.
---

When onboarding a new state's county directory (address/phone/notes fields sourced from AI-assisted or manual research), the source data can contain internal QA/placeholder phrasing such as "NEEDS VERIFICATION -- not confirmed by research" or "UNKNOWN" embedded directly in fields that get rendered to users (e.g. a `notes` field shown as a fallback "Filing Fee" description).

**Why:** This happened across three states (NJ, VA, WA) simultaneously — the placeholder text was never meant to reach end users, but a UI fallback path read the raw `notes` field instead of the state-level canonical fee note, so hundreds of county rows displayed unprofessional/alarming text like "UNKNOWN — needs verification" on a public resources page.

**How to apply:**
- After adding or updating any state's county data file, grep the whole file for case-insensitive `NEEDS VERIFICATION|UNKNOWN|TODO|FIXME|not confirmed` before considering the state "shipped."
- Also check every UI component that reads a free-text field (like `notes`) as a display fallback — prefer a canonical, reviewed source (e.g. a per-state `filingFeeNote` constant) over per-row research notes for anything user-facing.
- A change to display logic in one component can affect many rows uniformly across states — a single field misuse can silently contaminate the entire user-facing dataset for a state.
