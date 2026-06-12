---
name: Plaintiff-only system
description: Small Claims Genie is built exclusively for plaintiffs. Defendant-side forms are permanently out of scope.
---

## Rule

Small Claims Genie is a **plaintiff-only** system. Never implement, surface, or suggest defendant-side court forms.

**Why:** The product is designed to help lower-income individuals and small businesses *file* claims, not defend against them. Building defendant flows would dilute focus and add unneeded complexity.

**How to apply:**
- SC-120 (Defendant's Claim / counterclaim) — do not implement, do not surface in UI
- SC-140 (Notice of Appeal) — do not implement, do not surface in UI
- Any future form described as "defendant" or "respondent" in its title or purpose — skip
- Forms that *both sides can use* (e.g. SC-150 Postpone Trial, FW-001 Fee Waiver) are in scope for the plaintiff path

## In-scope plaintiff forms (as of June 2026)

| Form | Purpose | Status |
|---|---|---|
| SC-100 | Main claim | ✅ AcroForm + pdftk |
| MC-030 | Declaration (AI-generated) | ✅ Working |
| SC-104 | Proof of service | ✅ AcroForm + pdftk |
| FW-001 | Fee waiver | ✅ AcroForm + pdftk |
| SC-105 | Plaintiff using fictitious name | ✅ AcroForm |
| SC-112A | Declaration of service | ✅ AcroForm |
| SC-100A | Additional plaintiffs/defendants | ✅ PNG-overlay |
| SC-103 | Plaintiff doing business under fictitious name | ✅ AcroForm + pdftk |
| SC-150 | Postpone trial (plaintiff can file) | ✅ AcroForm + pdftk |
