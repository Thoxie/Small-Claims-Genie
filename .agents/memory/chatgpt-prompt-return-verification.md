---
name: ChatGPT prompt return verification
description: Standing user instruction — always verify externally-gathered data (e.g. via a ChatGPT prompt I wrote) matches the requested schema before using it, and flag any mismatch to the user.
---

Whenever I write a prompt for the user to run in an external tool (ChatGPT, etc.) to gather data for the app, I must check the returned data against the exact schema/fields I asked for before merging it in.

**Why:** The user explicitly said (2026-07-03): "If you create a prompt for me in ChatGPT to gather information and I don't return what you've asked for, it is your obligation to let me know." This is a standing instruction, not a one-off.

**How to apply:**
- After the user pastes back the results, diff the column names/order/count against the original prompt spec before using the data.
- If it matches exactly, it's fine to proceed silently (no need to over-report a non-issue) — but do check.
- If it doesn't match (missing columns, wrong format, incomplete rows, wrong count of expected records), stop and explicitly tell the user what's missing/different before merging it into the codebase.
- Example: VA county courthouse data request specified 8 CSV columns in a fixed order; the returned data matched exactly, so no flag was needed — but the check must still happen every time.
