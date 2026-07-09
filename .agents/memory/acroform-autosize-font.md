---
name: AcroForm auto-size font inconsistency under pdftk flatten
description: Why sequential single-line text fields render at different sizes, and how to pin them
---

# AcroForm DA font size 0 (auto-size) makes short lines render larger

Many official court PDFs leave a text field's Default Appearance (DA) font size at `0`
(`/Helv 0 Tf`), meaning "auto-size to fit". When you fill a block of sequential
single-line fields (e.g. "Complaint Line 1..7") with wrapped text and let pdftk flatten,
each field auto-sizes independently: **long lines shrink, short lines balloon**, so the
last short line looks much bigger than the rest. The output is legible but visibly
inconsistent — a quality flag on a legal form.

**Fix that works:** pin the DA font size on those fields before pdftk fills.
- pdf-lib: `form.getTextField(name).setFontSize(9)` rewrites the DA to `/Helv 9 Tf`.
- pdftk **honors** the modified DA when it generates appearances during flatten.
- So: load the template with pdf-lib, `setFontSize` on the affected fields, save to a
  temp file, and hand that temp path to `pdftk_fill_form` instead of the raw asset.
  Cache the derived template (regenerate if the OS clears the temp file).

**Why do it in code, not by editing the committed asset:** court PDFs get re-downloaded
when field names drift across revisions; a DA baked into the asset is silently lost on
replacement. Deriving it at runtime survives asset swaps and is self-documenting.

**How to apply:** only touch the fields that actually look wrong (varying-length wrapped
text). Fields with uniform short content (names, addresses) auto-size fine — pinning all
fields to one size would shrink names that currently fill their boxes nicely. Match the
pinned size to the width used by your wrap measurement (e.g. wrap at 525pt → pin 9pt).
Some forms already ship a fixed DA (TX JP5's claim fields) and need no change — check the
render first.
