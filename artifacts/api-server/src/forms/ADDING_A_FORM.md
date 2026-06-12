# Adding a New Court Form

This guide explains how to add a new court form to Small Claims Genie using the unified form engine.

## Quick start (3 steps)

### 1. Create a form definition file

Create `artifacts/api-server/src/forms/definitions/<id>-definition.ts`:

```typescript
import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
// Import your rendering helpers here

const myFormDefinition: FormDefinition = {
  state: "CA",
  formId: "SC-999",           // official form number
  async generate(data, body, opts) {
    // data  = full case record from the database
    // body  = request body (user-supplied overrides, signDate, etc.)
    // opts  = { signatureBytes?, download? }
    //
    // Return a filled, ready-to-stream PDF Buffer.
    const pdfBytes = await buildMyFormPdf(data, body, opts?.signatureBytes);
    return pdfBytes;
  },
};

FormRegistry.register(myFormDefinition);
```

### 2. Add an import to the definitions barrel

Open `artifacts/api-server/src/forms/definitions/index.ts` and add:

```typescript
export * from "./sc999-definition";
```

### 3. Add a route to forms-unified.ts

Open `artifacts/api-server/src/routes/forms-unified.ts` and add a line in the appropriate section:

```typescript
router.post(
  "/cases/:id/forms/sc999",
  makeFormHandler("SC-999", (id) => `SC999-Case-${id}.pdf`)
);
```

For a signed variant:

```typescript
router.post(
  "/cases/:id/forms/sc999/signed",
  makeFormHandler("SC-999", (id) => `SC999-Signed-Case-${id}.pdf`, { signed: true })
);
```

That's it. No other files need to change.

---

## Choosing a rendering approach

| Scenario | Approach |
|---|---|
| Official Judicial Council PDF with standard AcroForm fields | pdf-lib fill (see SC-104, SC-105, SC-112A, FW-001 definitions) |
| Official Judicial Council PDF with XFA form technology | pdftk FDF fill (see SC-103, SC-120, SC-150 definitions) |
| Custom layout or complex document assembly | PNG overlay with pdf-lib (see SC-100A, SC-140, MC-030 definitions) |

### How to tell which approach to use

Run these commands on the downloaded PDF:

```bash
# Check if pdftk can see fields (XFA forms show up here even if pdf-lib can't)
pdftk <file.pdf> dump_data_fields | head -40

# Check if pdf-lib can see fields
node -e "
const {PDFDocument} = require('pdf-lib');
const bytes = require('fs').readFileSync('<file.pdf>');
PDFDocument.load(bytes, {ignoreEncryption:true}).then(doc => {
  const fields = doc.getForm().getFields();
  console.log(fields.length, 'fields');
  fields.slice(0,10).forEach(f => console.log(f.constructor.name, f.getName()));
});
"
```

Decision tree:
- pdf-lib shows **> 0 fields** → use **pdf-lib fill** (standard AcroForm)
- pdf-lib shows **0 fields** but pdftk shows **> 0 fields** → use **pdftk FDF fill** (XFA form)
- Neither shows fields → use **PNG overlay**

---

## pdftk FDF fill (XFA forms)

Use `pdftk_fill_form` from `../pdftk-fdf`:

```typescript
import { pdftk_fill_form } from "../pdftk-fdf";
import path from "path";
import { ASSET_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(ASSET_DIR, "forms", "sc999_acroform.pdf");

// In generate():
return pdftk_fill_form(PDF_PATH, {
  text: {
    "SC-999[0].Page1[0].Header[0].CaseNumber_ft[0]": data.caseNumber || "",
    "SC-999[0].Page1[0].Sign[0].SignDate[0]": body.signDate || today(),
  },
  checkboxes: {
    "SC-999[0].Page1[0].CheckBox1[0]": true,
    "SC-999[0].Page1[0].CheckBox2[0]": false,
  },
});
```

Get exact field names by running:

```bash
pdftk <file.pdf> dump_data_fields | grep -E "FieldName:|FieldType:"
```

---

## pdf-lib fill (standard AcroForm)

Use pdf-lib directly. See `sc104-definition.ts` or `sc105-definition.ts` as examples.

Key pattern:

```typescript
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { loadAsset } from "../../routes/forms-common";

const acroBytes = loadAsset("forms/sc999_acroform.pdf");
const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
const form = pdfDoc.getForm();

// Text field
try {
  const f = form.getTextField("SC-999[0].Page1[0].FieldName[0]");
  f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 9 Tf 0 g"));
  f.setText(value || "");
} catch { /* field absent — skip */ }

// Checkbox
try {
  if (checked) form.getCheckBox("SC-999[0].Page1[0].CheckBox[0]").check();
  else form.getCheckBox("SC-999[0].Page1[0].CheckBox[0]").uncheck();
} catch { /* skip */ }

// Optional: flatten for non-editable output
import { pdftkFlatten } from "../acroform-filler";
return pdftkFlatten(Buffer.from(await pdfDoc.save()));
```

---

## PNG overlay (custom layout)

Use the overlay helpers from `forms-common.ts`. See `sc100a-definition.ts` or `sc140-definition.ts` as examples:

```typescript
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PW, PH, loadAsset, val, xmark } from "../../routes/forms-common";

const pdfDoc   = await PDFDocument.create();
const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
const bg       = await pdfDoc.embedPng(loadAsset("sc999_hq-1.png"));
const page     = pdfDoc.addPage([PW, PH]);
page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

const LIFT = 4.5;
const v  = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

v(data.caseNumber, 404, 730);
xm(68, 543);   // checkbox at (68, 543)

return Buffer.from(await pdfDoc.save());
```

Background PNGs are rendered at 300 DPI from the original PDF. To generate one:

```bash
pdftoppm -r 300 -png -singlefile form.pdf form
# Outputs form-1.png (3300×2550 for letter-size)
# Convert to the coordinate system used here (792×612 pts) at 72 DPI:
# x_pts = x_px * 72/300   y_pts = (2550 - y_px) * 72/300
```

---

## Shared utilities

| Import | From | What it does |
|---|---|---|
| `today()` | `../enrichment` | Today's date as MM/DD/YYYY |
| `formatDate(s)` | `../enrichment` | ISO YYYY-MM-DD → MM/DD/YYYY |
| `formatTime(t)` | `../enrichment` | HH:MM → 12h a.m./p.m. |
| `buildCourtInfo(d)` | `../enrichment` | Multi-line court address from case data |
| `buildCourtInfoFormal(d)` | `../enrichment` | Same but prefixed with "Superior Court of California, County of …" |
| `nameWithTitle(name, title)` | `../enrichment` | "Name, Title" or just "Name" |
| `str(v)` | `../enrichment` | Safe string coercion (null → "") |
| `loadAsset(path)` | `../../routes/forms-common` | Load a Buffer from assets/ |
| `ASSET_DIR` | `../../routes/forms-common` | Absolute path to assets/ dir |

---

## Form assets

PDF templates and PNG backgrounds live in:
```
artifacts/api-server/assets/forms/     # AcroForm PDFs (for pdftk/pdf-lib fill)
artifacts/api-server/assets/           # PNG backgrounds (for overlay forms)
```

Download the official Judicial Council PDFs from [courts.ca.gov/forms](https://www.courts.ca.gov/forms.htm) and save them as `<id>_acroform.pdf`.

---

## Deprecation note

The 10 individual `routes/forms-<id>.ts` files (forms-sc100.ts, forms-sc103.ts, etc.) that existed before June 2026 have been deleted and replaced by this unified engine. Do not create new individual route files; add to `forms-unified.ts` and `forms/definitions/` instead.
