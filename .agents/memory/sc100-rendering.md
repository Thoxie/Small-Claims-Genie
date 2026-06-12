---
name: SC-100 form rendering
description: Why SC-100 uses queueDirectField for every field instead of setField, and the correct font/baseline values.
---

## Rule
SC-100 must use `queueDirectField` for **all** text fields — never `setField` / `updateAppearances` for any field on any page.

**Why:** pdf-lib's `updateAppearances()` places text vertically centered inside the AcroForm widget rect. In the SC-100 template, the printed lines sit at the *bottom* edge of each field rect. Centered text therefore floats visually between two printed lines rather than sitting on one.

**How to apply:** Every call that populates a text field in `sc100-acroform.ts` goes through `queueDirectField()`. After `form.flatten()`, the direct-draw loop renders text onto page content streams at a computed baseline, completely bypassing pdf-lib's appearance-stream centering.

## Correct draw parameters (verified against pdftk field dump)
- Single-line field heights: **11–13 pt** (names, phones, addresses, dates)
- Large text area heights: **86 pt** (claim description), **~40–50 pt** (how calculated, prior demand)
- Font size: **9 pt** Helvetica
- Line height: **11 pt**
- Baseline formula: `startY = spec.y + Math.max(1, spec.h - 10)`
  - Small field (h=11): spec.y + 1 — 1 pt above printed line ✓
  - Large field (h=86): spec.y + 76 — starts 10 pt below top, wraps down ✓

## Contrast with other AcroForm forms
SC-104, SC-105, SC-112A, FW-001 use **pdftk FDF fill** (`acroform-filler.ts`), which places text at the field baseline automatically. They work correctly with no direct-draw step. Do not apply the queueDirectField pattern to those forms.
