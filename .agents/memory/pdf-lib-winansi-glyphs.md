---
name: pdf-lib WinAnsi glyph limitations
description: Unicode symbols (checkboxes, special glyphs) crash pdf-lib's drawText with standard fonts
---

pdf-lib's `StandardFonts` (Helvetica, etc.) use WinAnsi encoding, which cannot encode most Unicode symbols — e.g. `☐` (U+2610 ballot box) throws `WinAnsi cannot encode "☐" (0x2610)` at render time, not at compile time.

**Why:** Overlay-based form definitions sometimes copy checkbox-style labels like "☐ Yes ☐ No" from source PDFs/specs without checking font support. The crash only surfaces when that code path actually runs (e.g. a specific form/state), so it can slip past typecheck and even basic manual testing of other forms.

**How to apply:** When authoring new overlay form definitions with `page.drawText`, avoid Unicode symbol glyphs entirely. Use ASCII alternatives like `[ ]` for checkboxes, or draw a rectangle with `page.drawRectangle`/`drawLine` instead of a glyph. Grep new definition files for non-ASCII characters before considering a form "done," and always exercise every generated form end-to-end (not just typecheck) since this class of bug only appears at runtime.
