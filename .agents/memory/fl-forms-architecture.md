---
name: FL Forms Architecture
description: FL small claims form definitions — mix of programmatic (pdf-lib) and pdftk FDF template forms
---

# FL Forms Architecture

## Asset Path — Critical

**Runtime asset directory:** `artifacts/api-server/assets/fl-forms/` (NOT `src/assets/fl-forms/`)

`ASSET_DIR` is defined as `path.join(__dirname, "..", "assets")` in `forms-common.ts`. At runtime the bundle lives in `dist/`, so `ASSET_DIR` resolves to `artifacts/api-server/assets/`. The `src/assets/fl-forms/` directory is a development copy that is NOT used at runtime — only `assets/fl-forms/` (at the artifact root, outside `src/`) matters.

**Why:** esbuild bundles everything into `dist/index.mjs`, so `__dirname` is `dist/`, and `../assets` resolves to `artifacts/api-server/assets/` — not `src/assets/`.

**How to apply:** When adding or renaming a PDF asset for an FL pdftk form, always place or rename the file in `artifacts/api-server/assets/fl-forms/`. Never change code paths to match a filename only in `src/assets/`.

## Pattern

FL forms are split into two groups:

### 1. Programmatic (pdf-lib, no template PDF)
- `fl-statement-of-claim-definition.ts` → `buildFLStatementOfClaim()` — covers Broward, Orange (programmatic), Hillsborough (programmatic), Palm Beach, Volusia (programmatic), and statewide FL SOC
- `fl-summons-definition.ts` → `buildFLSummons()` — covers all county summons variants
- Both accept optional `countyOverride` / `clerkAddressOverride`
- Date is drawn inline: `new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })` replacing placeholder text

### 2. pdftk FDF + pdf-lib overlay (template PDFs in `assets/fl-forms/`)
- `fl-clkct333-miami-dade-definition.ts` → `clkct333-miami-dade.pdf`
- `fl-cl219-volusia-pdf-definition.ts` → `cl-219-volusia.pdf`
- `fl-plain-soc-orange-definition.ts` → `plain-statement-of-claim-orange.pdf`
- `fl-soc-hillsborough-definition.ts` → `statement-of-claim-hillsborough.pdf`

All pdftk forms follow this pattern:
1. `pdftk_fill_form(PDF_PATH, { text, checkboxes })` → fills FDF fields
2. Always post-process with pdf-lib to draw the current date (and optionally embed the signature image):
   ```typescript
   try {
     const todayStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
     const doc = await PDFDocument.load(buf);
     const helv = await doc.embedFont(StandardFonts.Helvetica);
     // draw date + optional signature
     return Buffer.from(await doc.save({ updateFieldAppearances: false }));
   } catch { /* return plain fill */ }
   ```
3. Date positions (pdf-lib y = from bottom of page):
   - CLK/CT.333: x=54, y=244 (left column of three-column sig row)
   - CL-219 Volusia PDF: x=54, y=126 (left of right-aligned sig at x=342)
   - Plain SOC Orange: x=54, y=78 (left of right-aligned sig at x=378)
   - SOC Hillsborough (page 2): x=54, y=598 (left of sig at x=346)

## Signature overlay coords (pdftk forms, visually confirmed 2026-06-21)
- CLK/CT.333: x=323, y=235, width=130, height=36 (middle column)
- CL-219 Volusia PDF: x=342, y=120, width=180, height=20
- Plain SOC Orange: x=378, y=68, width=150, height=28
- SOC Hillsborough (page 2): x=346, y=582, width=180, height=36

## Form IDs and Routes

| Form ID | Route | County |
|---|---|---|
| CLK-CT-333 | `fl/clkct333` | Miami-Dade |
| CL-219-VOLUSIA-PDF | `fl/cl219-volusia-pdf` | Volusia (PDF) |
| PLAIN-SOC-ORANGE | `fl/plain-soc-orange` | Orange (PDF) |
| SOC-HILLSBOROUGH | `fl/soc-hillsborough` | Hillsborough (PDF) |
| FL-STATEMENT-OF-CLAIM | `fl/statement-of-claim` | Statewide |
| FL-BROWARD-SOC | `fl/broward` | Broward |
| FL-ORANGE-SOC | `fl/orange` | Orange (programmatic) |
| FL-HILLSBOROUGH-SOC | `fl/hillsborough` | Hillsborough (programmatic) |
| FL-PALM-BEACH-SOC | `fl/palm-beach` | Palm Beach |

## Adding a new FL county

1. Create `forms/definitions/fl-<county>-definition.ts` (delegate to `buildFLStatementOfClaim()` or new pdftk form)
2. Register in `forms/definitions/index.ts`
3. Add POST route in `routes/forms-unified.ts`
4. Add county ID check block in `forms-tab.tsx` FL section
5. Update AI prompts in `routes/chat.ts` and `routes/help-chat.ts`
6. For pdftk forms: put PDF in `artifacts/api-server/assets/fl-forms/` (NOT `src/assets/`)

## Counties data

All 67 FL counties in `artifacts/api-server/src/routes/counties.ts` as `FLORIDA_COUNTIES`.
Served at `/api/counties?state=FL`. County IDs follow `fl-<name>` pattern.
