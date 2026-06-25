---
name: FL Fee Waiver Coordinate Calibration
description: Empirical formula for mapping pdf-lib y values to pdftotext screen coords for fl-fee-waiver-1998.pdf overlay text
---

# FL Fee Waiver Coordinate Calibration

## The Formula

```
pdftotext_yMax = (792 - pdf_lib_y) + 1.863
```

Equivalently: `pdf_lib_y = 792 - (target_pdftotext_yMax - 1.863)`

**Why:** The fee waiver template PDF embeds a 1.863pt offset in its coordinate system relative to a plain 612×792 page. The +1.863 is consistent across all text sizes and positions tested.

**How to apply:** To land overlay text on the same extraction line as a template blank, set `pdf_lib_y = 792 - (blank_yMax - 1.863)`. Always verify with `pdftotext -bbox` on a generated PDF — don't trust the server's hot-reload; restart explicitly after each coordinate change.

## Verified Coordinates (2026-06-25)

| Field | pdf_lib_y | pdftotext_yMax | Template_yMax | Notes |
|---|---|---|---|---|
| Plaintiff name | 700 | 93.863 | 91.206 | Visually on blank; 2.7pt below blank baseline is correct |
| Case number | 700 | 93.863 | 91.206 | Same blank line as plaintiff |
| Date ("Signed on") | 239 | 554.863 | 554.600 | 0.26pt below — imperceptible |
| Print Full Legal Name | 215 | 578.863 | 576.620 | x=382, right of label end at x=379.664 |
| Address | 191 | — | 611.650 | On blank rule line, NOT the "Address:" label at y=180 |

## Hot-Reload Quirk

tsx dev server does NOT reliably hot-reload `definitions/` files when running `pnpm run dev`. After any coordinate edit, always `restart_workflow "artifacts/api-server: API Server"` before regenerating the test PDF.
