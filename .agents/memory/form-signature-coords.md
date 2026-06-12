---
name: Form signature overlay coordinates
description: How to find exact signature placement coordinates for any CA court form PDF
---

## The problem
CA Judicial Council PDFs are certified (contain `adbe.pkcs7.detached` signatures), which causes pdf-lib's high-level `getForm()` and low-level `enumerateIndirectObjects()` widget walks to both fail — even with `ignoreEncryption: true`. Raw `/Rect` grep also fails because entries are in compressed object streams.

## The solution — fill first, then read
pdftk generates a NEW, uncertified output PDF when it fills the form. That output CAN be read by pdf-lib's widget walk. Workflow:

```js
// 1. Write minimal empty FDF
const fdf = '%FDF-1.2\n1 0 obj<</FDF<</Fields[]>>>>\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
fs.writeFileSync(fdfPath, fdf);

// 2. Fill via pdftk — output is uncertified, readable by pdf-lib
execSync(`pdftk ${pdfPath} fill_form ${fdfPath} output ${outPath}`);

// 3. Walk widgets in output
const doc = await PDFDocument.load(fs.readFileSync(outPath), { ignoreEncryption: true, throwOnInvalidObject: false });
const context = doc.context;
context.enumerateIndirectObjects().forEach(([ref, obj]) => {
  if (!(obj instanceof PDFDict)) return;
  if (obj.get(PDFName.of('Subtype'))?.toString() !== '/Widget') return;
  const arr = context.lookup(obj.get(PDFName.of('Rect')));
  // arr is PDFArray with [x1, y1, x2, y2] — y1 is bottom-left (PDF bottom-up coords)
});
```

Run from the `artifacts/api-server` directory (needs local `node_modules/pdf-lib`).

## SC-103 calibration result
Page: 612×792pt. Declaration section bottom ~300pt of page.

| Field | x1 | y1 | x2 | y2 |
|---|---|---|---|---|
| FillText9 (Date) | 88 | 280 | 214 | 292 |
| FillText10 (Name/title) | 63 | 250 | 303 | 262 |

Signature line sits at same row as Date (y≈280–292), to the right.
"Sign your name" label is at y≈263–279 (gap between the two fields).

**Final coords:** `SIG_X=268, SIG_Y=278, SIG_W=280, SIG_H=22`

## Why coords matter only for signature overlay
Field FILL (pdftk FDF) doesn't need coords — pdftk places text automatically.
Coords are only needed when overlaying a signature IMAGE on top of the filled PDF.
Most forms don't require this; SC-103 does because it needs a handwritten signature image.

**Why:** The certified PDF blocks all standard coordinate-reading paths. The fill-first trick is the only reliable method.
