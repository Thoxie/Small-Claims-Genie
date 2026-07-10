---
name: Signed-form pixel drift tests
description: How the non-CA signed-PDF regression tests detect signature placement drift, and why presence-only checks are insufficient.
---

# Signed-form pixel drift tests

Each non-CA signed form has a pixel-level regression test that POSTs a
solid-black signature PNG and diffs the signed vs unsigned render.

**Rule:** For any form whose signature lands at a stable position, assert the
signature is DARK **at calibrated coordinates** and that the diff bounding box's
center stays within a pixel tolerance of the expected center. Do NOT settle for a
"some dark pixels exist on page N" presence check.

**Why:** A presence-only check passes even if the signature moves to the wrong
place on the page, so it cannot catch coordinate drift — which is the whole point
of these tests. A code review rejected presence-only guards for fixed-position
forms for exactly this reason.

**How to apply:** Calibrate the expected region directly from the signed-vs-
unsigned diff bbox (map image-space bbox back through the guard's
`imgY = pageH - pdfY - h` formula). Setting the region equal to the observed diff
gives a Δ=0 baseline, so any later placement change fails the test. Reserve a
dynamic/presence-only guard only for forms whose signature position genuinely
varies run-to-run; if the position is stable, always calibrate.
