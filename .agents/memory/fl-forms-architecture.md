---
name: FL forms architecture
description: Florida court form generation — statewide AcroForms (7.330–7.337, 7.322, INDIGENT) for specific claim types; legacy county-specific programmatic/AcroForm for General/Other
---

# FL Forms Architecture

## Asset Path — Critical

**Runtime asset directory:** `artifacts/api-server/assets/fl-forms/` (NOT `src/assets/fl-forms/`)

`ASSET_DIR` is defined as `path.join(__dirname, "..", "assets")` in `forms-common.ts`. At runtime the bundle lives in `dist/`, so `ASSET_DIR` resolves to `artifacts/api-server/assets/`. The `src/assets/fl-forms/` directory is a development copy NOT used at runtime.

## Layer 1: Statewide AcroForm PDFs (all 67 counties, primary for specific claim types)

Forms in `assets/fl-forms/` using pdf-lib AcroForm fill:

| FormId | PDF asset | Claim types / purpose |
|--------|-----------|----------------------|
| FL-SOC | fl-7330 through fl-7337 | 8 specific claim types; dispatches to correct PDF in `fl-soc-acroform-definition.ts` based on `d.claimType` |
| FL-7322-SUMMONS | fl-7322-summons.pdf | All 67 counties (except Miami-Dade which uses CLK/CT.423); clerk fills dates/courtroom — **no plaintiff_signature field**, render as Download-only |
| FL-INDIGENT-FEE-WAIVER | fl-indigent-fee-waiver.pdf | Application for Civil Indigent Status; financial fields left blank; `applicant_signature` overlay |

Shared utilities: `fl-acroform-util.ts`
- `flJudicialCircuit(countyId)` — all 67 counties → 1st–20th circuit string
- `FL_SOC_FORM_META` — 8 claim types → `{formNo, formName, assetFile}`
- `flSocFormMeta(claimType)` — returns meta or null for General/Other
- `FL_CLAIM_TYPES_UI` — 8 specific types + "General / Other" (for intake dropdown)

Signature overlay pattern (FL-SOC forms):
1. `form.getTextField('plaintiff_signature').acroField.getWidgets()[0].getRectangle()`
2. `doc.embedPng(opts.signatureBytes)` → `page.drawImage(sigImg, rect)`
3. `sigField.setText("")`

## Layer 2: County-specific programmatic/AcroForm (legacy, for General/Other claim type)

### pdf-lib AcroForm fills (template PDFs)
- `fl-clkct333-miami-dade-definition.ts` → `clkct333-miami-dade.pdf` — `disableMultiline()` before setText for header fields
- `fl-cl219-volusia-pdf-definition.ts` → `cl-219-volusia.pdf`
- `fl-plain-soc-orange-definition.ts` → `plain-statement-of-claim-orange.pdf`
- `fl-soc-hillsborough-definition.ts` → `statement-of-claim-hillsborough.pdf`

**Key detail:** For multiline AcroForm fields in headers, call `f.disableMultiline()` BEFORE `f.setText()` or pdf-lib word-wraps text causing test assertion failures.

### Programmatic (pdf-lib, no template)
- `fl-statement-of-claim-definition.ts` — statewide SOC fallback
- `fl-summons-definition.ts` — old county summons variants (kept for CLK/CT.423 Miami-Dade)

## UI routing (florida-forms-section.tsx)

```tsx
const socMeta = FL_SOC_TYPES[ctx.currentCase.claimType ?? ""] ?? null;
// Step 0: socMeta ? statewide AcroForm (fl/soc) : county-specific fallbacks
// Step 1: miami-dade → CLK/CT.423 (fl/clkct423); all others → statewide 7.322 (Download-only)
// Step 3: fl/indigent-fee-waiver (replaced old fl/fee-waiver overlay)
```

## Intake (intake-step-2.tsx)

When `jurisdictionState === "FL"`: show FL_CLAIM_TYPES_UI (8 specific + General/Other).
All other states: show the generic claim type list.

## Date positions for legacy county AcroForm signature overlays

- CLK/CT.333: sig x=323, y=235, w=130, h=36; date x=54, y=244
- CL-219 Volusia PDF page 1: sig x=342, y=120, w=180, h=20; date x=54, y=126
- CL-219 Volusia PDF page 2: sig x=295, y=640, w=180, h=25 (no AcroForm fields on page 2)
- Plain SOC Orange: sig x=378, y=68, w=150, h=28; date x=54, y=78
- SOC Hillsborough (page 2): sig x=346, y=582, w=180, h=36; date x=54, y=598

**Why:** pdftk-java JVM cold start = 6+ seconds; Replit proxy timeout ~1s → 502. pdf-lib AcroForm = 78–189ms. New statewide AcroForms use the official FL court PDFs and cover all 67 counties uniformly.

## Adding a new FL statewide form type

1. Add PDF to `artifacts/api-server/assets/fl-forms/`
2. Add entry to `FL_SOC_FORM_META` in `fl-acroform-util.ts`
3. Handle in `fl-soc-acroform-definition.ts` generate() switch
4. Add to `FL_CLAIM_TYPES_UI` array and `admin.ts FL_CLAIM_TYPES`
5. Update AI prompts in `routes/chat.ts` and `routes/help-chat.ts`

## All FL counties

All 67 FL counties in `artifacts/api-server/src/routes/counties.ts` as `FLORIDA_COUNTIES`. Served at `/api/counties?state=FL`. County IDs follow `fl-<name>` pattern. Circuit map in `fl-acroform-util.ts` covers all 67.
