---
name: PDF signed-size guarantee
description: How to ensure signed PDF is always larger than unsigned when using pdftk + pdf-lib
---

## Rule

When a form uses **pdftk** for field filling and **pdf-lib** for post-processing (e.g., to embed a signature image), run **both** the unsigned and signed variants through pdf-lib with `{ useObjectStreams: false }`. Only add the image in the signed path.

**Why:** pdf-lib's `doc.save()` applies object stream compression. When it re-serializes a pdftk-filled PDF, it typically produces a *smaller* file than the raw pdftk output (even with `useObjectStreams: false`, pdf-lib still normalizes other things). If only the signed path goes through pdf-lib, the compression saving can exceed the bytes added by a small image (e.g., a 1×1 transparent PNG adds ~200 bytes, but pdf-lib can save 1–2 KB on a multi-MB file), causing signed < unsigned and failing tests.

**How to apply:**
1. Call `pdftk_fill_form(...)` to fill text/checkbox fields.
2. Load the result with `await PDFDocument.load(filled, { ignoreEncryption: true })`.
3. If `opts?.signatureBytes` is present, embed the image on the appropriate page.
4. Always call `doc.save({ updateFieldAppearances: false, useObjectStreams: false })` and return that buffer — for **both** unsigned and signed paths.

This way, both variants start from the same pdf-lib-normalized baseline, and the image bytes in the signed path make it reliably larger.

**Affected forms:** TX-FEE-WAIVER, IL-FEE-WAIVER (both use pdftk fill + pdf-lib post-process). Forms that use only pdf-lib throughout (e.g., FL-FEE-WAIVER, SC-100) do not have this issue.
