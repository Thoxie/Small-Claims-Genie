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

## Verified Coordinates (2026-06-26 — corrected)

| Field | pdf_lib_y | pdftotext_yMax (measured) | Template_yMax | Delta | Notes |
|---|---|---|---|---|---|
| Plaintiff name | 700 | 93.863 | 91.206 | +2.66pt | Visually on blank; intentional — sits above the label line |
| Case number | 700 | 93.863 | 91.206 | +2.66pt | Same blank line as plaintiff |
| Date ("Signed on") | 239 | 554.863 | 554.600 | +0.26pt | Correct — do NOT change |
| Signature image (bottom edge) | 228 | — | 565.620 | ~+0.24pt | drawImage y=228, h=18 |
| Print Full Legal Name | 217 | 576.863 | 576.620 | +0.24pt | x=382, right of label end at x=379.664 |
| Email address | 206 | 587.760 | 587.620 | +0.14pt | x=130 |
| Phone Number/s | 206 | 587.760 | 587.620 | +0.14pt | x=370, same row as email |
| Address (blank rule) | 193 | 600.760 | 600.620 | +0.14pt | x=84, NOT the "Address:" label row at y≈180 |

## Correction History

- First calibration (2026-06-25): signature section was placed 2.24pt too low because the original
  y values (226/215/204/204/191) used `792 − blank_yMax` without the +1.863 offset.
- Fixed (2026-06-26): corrected to 228/217/206/206/193 using full formula.

## Hot-Reload Quirk

tsx dev server does NOT reliably hot-reload `definitions/` files when running `pnpm run dev`. After any coordinate edit, always `restart_workflow "artifacts/api-server: API Server"` before regenerating the test PDF.

## Test Endpoint

`POST /api/cases/:id/forms/fl/fee-waiver` — returns inline PDF. Token-auth supported via `?token=<uuid>`.
`POST /api/cases/:id/forms/fl/fee-waiver/signed` — includes signature image overlay.
