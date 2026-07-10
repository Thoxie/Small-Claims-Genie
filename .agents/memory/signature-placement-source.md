---
name: Signature placement single source
description: Where signature crop coordinates live so signed-PDF tests and form definitions never drift
---

# Signature placement single source of truth

Signed-PDF e2e tests (`scripts/src/test-*-signed.ts`) verify the signature image
landed correctly by rendering the page and checking a crop region for dark pixels.
Both the form definition (which draws the signature) and the test (which crops the
render) need the same coordinates.

**Rule:** those coordinates live once in `lib/form-signatures`
(`@workspace/form-signatures`), keyed by a stable form id. The form definition
reads `FORM_SIGNATURE_PLACEMENTS[id].draw` in its `drawImage` call; the test
resolves its crop via `resolveTestCrop(placement, pageHeight)`. Never re-hardcode
sig crop magic numbers in a test file.

**Why:** when a court reissues a form PDF with a shifted layout, hardcoded coords
in each test silently go stale and tests false-pass/false-fail. One source keeps
definition and test in lockstep.

**How to apply:**
- Two crop modes: `derive-from-draw` (non-rotated pages — crop computed from the
  pdf-lib draw coords via `imgY = pageH - y - height`) and `image-space` (rotated
  pages like VA DC-402 whose page rotation=90 defeats the formula, so an explicit
  calibrated image-space box is stored).
- Recalibration steps (render at 72 DPI, crop, check brightness < 0.98) are
  documented in the `lib/form-signatures/src/index.ts` header comment.
- Adding a new signed form: add an entry to `FORM_SIGNATURE_PLACEMENTS`, have the
  definition consume `.draw`, and have the test consume the placement.
