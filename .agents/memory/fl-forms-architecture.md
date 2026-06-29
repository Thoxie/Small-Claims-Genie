---
name: FL Forms Architecture
description: FL small claims form definitions — programmatic (pdf-lib) only; pdftk removed from all 4 signed forms due to JVM timeout
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

### 2. pdf-lib AcroForm (template PDFs in `assets/fl-forms/`) — formerly pdftk
- `fl-clkct333-miami-dade-definition.ts` → `clkct333-miami-dade.pdf`
- `fl-cl219-volusia-pdf-definition.ts` → `cl-219-volusia.pdf`
- `fl-plain-soc-orange-definition.ts` → `plain-statement-of-claim-orange.pdf`
- `fl-soc-hillsborough-definition.ts` → `statement-of-claim-hillsborough.pdf`

**Why migrated from pdftk:** pdftk-java JVM cold start = 6+ seconds per call; Replit proxy timeout is ~1 second → 502 on every form download. pdf-lib AcroForm fill + flatten = 78–189ms.

All 4 forms follow this pattern:
1. `PDFDocument.load(pdfBytes)` → `doc.getForm()` → `safeSetText()` / `safeSetSingleLine()` / `safeCheck()` helpers
2. **Critical:** For header/party name fields that are typed as multiline in the PDF, call `f.disableMultiline()` BEFORE `f.setText()`. Without this, pdf-lib wraps the text at word boundaries and pdftotext extracts it as separate lines (e.g. "South Florida\nContractors LLC"), causing test assertions like `.includes("South Florida Contractors LLC")` to fail.
3. `form.flatten()` → then pdf-lib overlay: embed font, `page.drawText()` for today's date, and embed signature image bytes if provided.
4. `renderingTechnique: "acroform-pdflib"` in the definition.
5. Date positions (pdf-lib y = from bottom of page):
   - CLK/CT.333: x=54, y=244 (left column of three-column sig row)
   - CL-219 Volusia PDF: x=54, y=126 (left of right-aligned sig at x=342)
   - Plain SOC Orange: x=54, y=78 (left of right-aligned sig at x=378)
   - SOC Hillsborough (page 2): x=54, y=598 (left of sig at x=346)

## Signature overlay coords (pdftk forms, visually confirmed 2026-06-21/22)
- CLK/CT.333: x=323, y=235, width=130, height=36 (middle column)
- CL-219 Volusia PDF page 1 ("Plaintiff's Signature"): x=342, y=120, width=180, height=20
- CL-219 Volusia PDF page 2 ("Signature of Plaintiff(s)"): x=295, y=640, width=180, height=25
  — page 2 has NO AcroForm fields; "Signature of Plaintiff(s)" is a printed blank at y≈641 from bottom
- Plain SOC Orange: x=378, y=68, width=150, height=28
- SOC Hillsborough (page 2): x=346, y=582, width=180, height=36

## CL-219 Volusia caption field naming quirk
The two caption fields at y=631 have misleading pdf-lib-generated names:
- `STATEMENT OF CLAIM` (x=31, y=631) = plaintiff name (LEFT of "Sues")
- `undefined` (x=337, y=631) = defendant name (RIGHT of "Sues")
These were previously left blank as "court-use" fields. They must be filled with plaintiffName / defendantName.
Also: `undefined_2` (x=28, y=590) and `undefined_3` (x=334, y=590) are secondary party name lines — leave blank unless there are multiple parties.
All 22 AcroForm fields in the CL-219 Volusia form are on page 1. Page 2 and 3 are print-only.

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
