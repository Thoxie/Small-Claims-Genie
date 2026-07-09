---
name: pdf-lib WinAnsi drawText input hazards
description: Unicode symbols AND newlines/control chars crash pdf-lib's drawText/widthOfTextAtSize with standard fonts
---

pdf-lib's `StandardFonts` (Helvetica, etc.) use WinAnsi encoding, which cannot encode most Unicode symbols — e.g. `☐` (U+2610 ballot box) throws `WinAnsi cannot encode "☐" (0x2610)` at render time, not at compile time.

**Why:** Overlay-based form definitions sometimes copy checkbox-style labels like "☐ Yes ☐ No" from source PDFs/specs without checking font support. The crash only surfaces when that code path actually runs (e.g. a specific form/state), so it can slip past typecheck and even basic manual testing of other forms.

**How to apply:** When authoring new overlay form definitions with `page.drawText`, avoid Unicode symbol glyphs entirely. Use ASCII alternatives like `[ ]` for checkboxes, or draw a rectangle with `page.drawRectangle`/`drawLine` instead of a glyph. Grep new definition files for non-ASCII characters before considering a form "done," and always exercise every generated form end-to-end (not just typecheck) since this class of bug only appears at runtime.

**Also crashes: newlines / control characters.** A `\n` (or other vertical whitespace: `\r\t\f\v`) passed to `drawText`/`widthOfTextAtSize` throws at runtime the same way. The usual source is user free-text (e.g. a multi-line claim description) flowing straight into a coordinate-overlay form. Collapse vertical whitespace to spaces with a small `oneLine()` helper before drawing — and apply it in *every* place the string is measured or drawn (wrapping, truncation, and the final draw), not just one. This is a data-driven crash, so single-line test fixtures pass while real multi-line user data fails in production.
