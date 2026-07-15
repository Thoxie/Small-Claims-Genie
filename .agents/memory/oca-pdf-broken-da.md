---
name: OCA AcroForm broken DA strings
description: TX OCA small claims petition PDF has 36/53 fields missing a Tf operator in their DA string — pdf-lib fill is impossible; use pdftk FDF fill instead.
---

## Rule
When a government PDF has AcroForm fields whose Default Appearance (DA) string lacks a `Tf` operator, pdf-lib's `setFontSize()` throws `"No Tf operator found for DA"`. The exception is swallowed by the silent `catch {}` in the `queueDirectField` helper, resulting in an entirely blank form.

**How to apply:** Before using pdf-lib AcroForm fill on any new government PDF, inspect a sample of field DA strings with `pdftk dump_data_fields` or via a quick pdf-lib fill test. If fields come back blank, switch to `pdftk_fill_form` (FDF fill + flatten).

**Why:** The TX OCA small claims petition PDF has this exact defect — 36 of 53 fields are unfillable by pdf-lib. Switching to `pdftk_fill_form` resolved the issue completely. The signature overlay (image embed) is still done with pdf-lib after pdftk fills the text fields.

## Diagnostic
- All fields fill as blank even though no JS error surfaces
- `pdfinfo` or `pdftk dump_data_fields` shows DA strings like `( 0 Tf 0 g)` with size 0 but no font name, or completely missing Tf

## Pattern
```
const filled = await pdftk_fill_form(PDF_PATH, { text: { ... }, checkboxes: { ... } });
// then for signed variant:
const pdfDoc = await PDFDocument.load(filled);
// embed signature image...
```
