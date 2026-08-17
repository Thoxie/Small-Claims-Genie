---
name: Mobile parity rule
description: Standing user preference — every web app change must also be applied to the mobile app in the same task.
---

# Mobile parity rule

**Rule:** Whenever a change is made to the web app (`artifacts/small-claims-genie`), the equivalent change must also be applied to the mobile app (`artifacts/mobile`) in the same task — not deferred.

**Why:** The user explicitly stated this requirement. The mobile app is a first-class product, not an afterthought. Shipping web-only changes creates a split experience and silent gaps the user discovers later.

**How to apply:** For every web task, before marking complete, ask: "Does this also need to exist in mobile?" If yes, implement it in the same response. Scope includes:

- New states / jurisdictions → add state pill, claim limit check, forms constant, collect steps, checklist, deadlines block, isXX variables, and type union in `app/case/[id].tsx`; also update AIGeniePanel.tsx and HelpGenieSheet.tsx type unions
- New features on any tab → add equivalent section to the matching mobile tab component
- UI copy changes → find and update the same string in mobile components
- Language / translation additions → apply to mobile language context and translated screens
- Form wiring / new form types → wire in mobile CourtFormsTab FORMS constant
- New checklist / deadline content → add to mobile DeadlinesTab
- Blog / marketing page changes → note: mobile has no marketing pages; skip unless explicitly requested
- Intake field additions → add to IntakeTab in `app/case/[id].tsx`
