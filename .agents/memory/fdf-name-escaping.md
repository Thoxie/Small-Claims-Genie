---
name: FDF name-object escaping for pdftk checkbox/radio values
description: Checkbox/radio export values with spaces or delimiters must be #xx-escaped in the FDF /V name, or pdftk fails to fill the entire form
---

pdftk fills forms from an FDF where each checkbox/radio selection is written as
`/V /ExportValue` — a PDF *name object*. PDF names (ISO 32000-1 §7.3.5) only
allow "regular" chars (0x21–0x7E minus the delimiters `( ) < > [ ] { } / % #`);
anything else (spaces, delimiters, non-ASCII) must be written as `#` + two hex
digits. A raw space in the name (e.g. `/V /I have no written agreement with
Defendants.`) makes pdftk abort with **"Failed to open form data file"**, so the
*entire* fill fails — not just that one field.

**Why:** Some court-form radio groups use a full human-readable sentence as the
on-value (confirm with `pdftk <pdf> dump_data_fields` — the real on-value
literally contains spaces). Illinois' SMC complaint is the form that surfaced
this; it broke every IL fill regardless of case data. Only IL uses a spaced
export value today; CA/TX/NC/WA use `Yes`/`Off`/numeric on-values, so the escape
is a byte-identical no-op for them.

**How to apply:** Escape export values with `fdfNameEscape()` in
`forms/pdftk-fdf.ts` before writing `/V /...`. When adding a new state/form, run
`pdftk <pdf> dump_data_fields` and inspect the checkbox/radio on-values: any
value containing a space or delimiter *requires* the escape. Verify by filling
and checking the fill exits 0 and `dump_data_fields` shows the expected
`FieldValue` afterward.
