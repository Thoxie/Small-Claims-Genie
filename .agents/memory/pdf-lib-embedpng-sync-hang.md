---
name: pdf-lib embedPng sync-hang on degenerate PNGs
description: Why a malformed signature PNG can DoS the whole API server, and why try/catch cannot save you
---

# pdf-lib embedPng synchronously spins on degenerate PNGs

`PDFDocument.embedPng(bytes)` decodes via UPNG **synchronously**. If the bytes are a
technically-valid PNG (correct `89504e47` signature) but degenerate (e.g. a tiny hand-rolled
base64 test fixture), the decode can enter an **infinite loop on the main thread**.

**Why this is dangerous:** it blocks the Node event loop, so the whole API server stops
answering — health checks return `000`, every in-flight request hangs. It looks like a crash
but the process is alive and spinning.

**Why you can't rescue it:** `await embedPng(...).catch(...)` and `try/catch` only catch
*thrown* errors or rejected promises. A synchronous infinite loop never yields and never
throws, so the `.catch()`/`catch` block is never reached. Awaiting it does not help.

**How to apply:**
- This is app-wide behavior for every signed form that overlays a signature image — it is
  NOT specific to any one form definition. Do not "fix" it inside a single form.
- Test signature fixtures must be **real** PNGs. Generate with e.g.
  `magick -size WxH ... PNG32:/tmp/sig.png` (8-bit RGBA). A proper PNG embeds in ~20ms.
- If you ever need to make embedPng safe against hostile/degenerate input, it must run off
  the main thread (worker) or behind a pre-validation step — a try/catch is not a guard.
