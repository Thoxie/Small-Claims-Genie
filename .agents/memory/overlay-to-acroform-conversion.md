---
name: Overlay → AcroForm conversion audit
description: When converting a coordinate-overlay form to pdftk AcroForm fill, audit every original drawText call — overlay-only fields with no AcroForm equivalent silently regress.
---

# Converting a form from pdf-lib coordinate overlay → pdftk AcroForm fill

**Rule:** Before finalizing, diff the original overlay `generate()` against the new
version and account for EVERY `page.drawText`/`drawImage` in the original. Fields
that were drawn at coordinates but have **no matching AcroForm field** (e.g. a
signature date) must be re-added as a pdf-lib overlay after the pdftk fill, or they
silently disappear.

**Why:** Converting TX JP2/JP5 dropped the signature date entirely — the old code
drew `today` via `drawText`, but neither form has a fillable date field, so mapping
only named AcroForm fields lost it. A code review caught it against the task's
acceptance criteria. Field-mapping alone is not a complete conversion.

**How to apply:**
- `git show <pre-conversion-commit>:<file>` and grep for `drawText|drawImage|toLocale|getFullYear`.
- For each, confirm it maps to an AcroForm field name; if not, keep it as an overlay.
- Some blank date fields are correct: notary "Sworn to Date/Month/Year" jurat fields
  are completed at swearing, not pre-filled. A petitioner signature date is different
  and should be filled/overlaid.
- If a form has no date box at all (TX JP2), overlay the date on the signature line
  next to the signature — do not reuse a page-bottom coordinate that lands on a
  printed label. Always render to PNG and eyeball placement, don't trust coords.
