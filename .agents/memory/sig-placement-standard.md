---
name: Signature placement standard
description: How to find exact signature image coordinates for any PDF form without guessing
---

## The standard

Run `pdftotext -bbox-layout` to get the exact bounding box of the "Sign here" text, then convert to pdf-lib coordinates.

```bash
pdftotext -f 1 -l 1 -bbox-layout <form.pdf> - | grep -i "sign"
```

Output is in **page-top-left origin** (y increases downward). Convert to pdf-lib (bottom-left origin):

```
pdf-lib_y = page_height − pdftotext_yMin   # top edge of text in pdf-lib coords
```

Place the image:
- `x` = `xMin` of the "Sign here" / "Sign" text
- `y` = `pdf-lib_y_top − 2` (image bottom sits 2pt below the line, which is just above the label)
- `MAX_W` = 220 (standard), `MAX_H` = 20–28 depending on row height

**Why:** "Sign here" is a static text/line element — not an AcroForm widget — so `dump_data_fields_utf8` and widget walks miss it. `pdftotext -bbox-layout` finds it directly.

**Cross-check:** Verify the math by checking a nearby widget (e.g. Date field). Its pdftotext yMax should convert to within 2pt of its widget's y1 from pdf-lib widget walk.

## FW-001 derivation (confirmed)

- "Sign" text: xMin=336.875, yMin=708.425 (pdftotext, page-top origin, 792pt page)
- pdf-lib x=336, y_top = 792−708.425 = 83.6 → image bottom at y=82
- Cross-check: "Date:" pdf-lib y≈99 matches SigDate widget y1=97 ✓
- Final: `x=336, y=82, MAX_W=220, MAX_H=22`

## No new PDFs needed

This works on every existing PDF asset in the repo. Never guess from widget positions alone for the signature — always run the pdftotext command first.
