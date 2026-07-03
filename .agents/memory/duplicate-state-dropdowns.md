---
name: Duplicate hardcoded state option lists
description: Two independent state-dropdown arrays exist in the frontend; adding a new state to one does not update the other
---

The frontend has at least two separate, independently-hardcoded `STATE_OPTIONS`-style arrays for supported states: one in `artifacts/small-claims-genie/src/pages/cases/new.tsx` (the "start a new case" page) and another inside `artifacts/small-claims-genie/src/pages/cases/tabs/intake-step-1.tsx` (the intake form shown inside an existing case). There's also a state-specific claim-limit hint ternary in `intake-step-2.tsx`.

**Why:** When Virginia was added, only `cases/new.tsx` was updated. `intake-step-1.tsx`'s list was missed, so the new-case page showed VA but the in-case intake dropdown did not — this shipped to production undetected until a user reported it.

**How to apply:** When adding a new supported state, grep the whole `artifacts/small-claims-genie/src` tree for the existing state abbreviations (e.g. `"CA".*"FL".*"IL"` or `STATE_OPTIONS`) to find every hardcoded list before considering the rollout complete, not just the most obvious "new case" entry point.
