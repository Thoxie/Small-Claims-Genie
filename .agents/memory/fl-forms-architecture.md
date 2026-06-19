---
name: FL Forms Architecture
description: FL small claims form definitions — all programmatic (pdf-lib), no template PDFs required
---

# FL Forms Architecture

## Pattern (UPDATED — no template PDFs)

FL forms are ALL programmatic pdf-lib forms (renderingTechnique: "png-overlay"). No template PDF assets are required. The `buildFLStatementOfClaim()` function in `fl-statement-of-claim-definition.ts` is the core renderer that takes optional `countyOverride` and `clerkAddressOverride` parameters to customize the county header and filing address.

**Why:** FL court form PDFs are not downloadable from official county/state websites programmatically (URLs return HTML error pages). The programmatic approach generates professional-looking PDFs that include all required fields and can serve all 67 FL counties from a single code path.

## Form Definitions

### Statewide — FL-STATEMENT-OF-CLAIM
- **Form ID:** `FL-STATEMENT-OF-CLAIM`
- **Definition:** `forms/definitions/fl-statement-of-claim-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/statement-of-claim`
- **Used for:** All FL counties except Miami-Dade and Volusia
- **Renders:** County court header dynamically from `countyId` in case data

### Miami-Dade — CLK-CT-333
- **Form ID:** `CLK-CT-333`
- **County ID:** `fl-miami-dade`
- **Definition:** `forms/definitions/fl-clkct333-miami-dade-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/clkct333`
- **Renders:** Delegates to `buildFLStatementOfClaim()` with county="Miami-Dade" + filing address

### Volusia — CL-219-VOLUSIA
- **Form ID:** `CL-219-VOLUSIA`
- **County ID:** `fl-volusia`
- **Definition:** `forms/definitions/fl-cl219-volusia-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/cl219-volusia`
- **Renders:** Delegates to `buildFLStatementOfClaim()` with county="Volusia" + filing address

### Broward — FL-BROWARD-SOC
- **Form ID:** `FL-BROWARD-SOC`
- **County ID:** `fl-broward`
- **Definition:** `forms/definitions/fl-broward-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/broward`
- **Filing address:** 201 SE 6th St., Room 01250, Fort Lauderdale, FL 33301

### Orange — FL-ORANGE-SOC
- **Form ID:** `FL-ORANGE-SOC`
- **County ID:** `fl-orange`
- **Definition:** `forms/definitions/fl-orange-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/orange`
- **Filing address:** 425 N. Orange Ave., Suite 100, Orlando, FL 32801

### Hillsborough — FL-HILLSBOROUGH-SOC
- **Form ID:** `FL-HILLSBOROUGH-SOC`
- **County ID:** `fl-hillsborough`
- **Definition:** `forms/definitions/fl-hillsborough-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/hillsborough`
- **Filing address:** 800 E. Twiggs St., Tampa, FL 33602

### Palm Beach — FL-PALM-BEACH-SOC
- **Form ID:** `FL-PALM-BEACH-SOC`
- **County ID:** `fl-palm-beach`
- **Definition:** `forms/definitions/fl-palm-beach-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/palm-beach`
- **Filing address:** 205 N. Dixie Hwy., West Palm Beach, FL 33401

## Adding a new FL county

If a county wants a distinct form in the future:
1. Create `forms/definitions/fl-<county>-definition.ts` delegating to `buildFLStatementOfClaim()` with appropriate county and address overrides
2. Register in `forms/definitions/index.ts` (after the statewide form export)
3. Add POST route in `routes/forms-unified.ts`
4. Add county ID check block in `forms-tab.tsx` FL section (and add county ID to the statewide fallback exclusion list)
5. Update AI prompts in `prompts/chat-prompt.ts` and `prompts/help-chat-prompt.ts`

### Orange County — Plain Statement of Claim
- **Form ID:** `PLAIN-SOC-ORANGE`
- **County ID:** `fl-orange`
- **PDF:** `src/assets/fl-forms/plain-statement-of-claim-orange.pdf`
- **Definition:** `forms/definitions/fl-plain-soc-orange-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/plain-soc-orange`

**Key field mapping (confirmed via pdftk dump_data_fields):**
- `Name` → plaintiffName, `Street Address` → plaintiffAddress, `City State and Zip` → city/state/zip (single line), `Phone Number` → plaintiffPhone
- `Name_2` → defendantName, `Street Address_2`, `City State and Zip_2`, `Phone Number_2`
- `of interest court costs and attorney fees` → formatted claim amount ($X,XXX.XX)
- `Plaintiffs` → plaintiffName in sworn-statement section
- `Text1` → claimDescription
- `Case Number` → left blank

### Hillsborough County — Statement of Claim
- **Form ID:** `SOC-HILLSBOROUGH`
- **County ID:** `fl-hillsborough`
- **PDF:** `src/assets/fl-forms/statement-of-claim-hillsborough.pdf`
- **Definition:** `forms/definitions/fl-soc-hillsborough-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/soc-hillsborough`

**Key field mapping (confirmed via pdftk dump_data_fields):**
- `PlaintiffName1`/`PlaintiffName2`, `DefendantName1`/`DefendantName2`
- Defendant: `DefAddress`, `DefCity`, `DefState`, `DefZipCode`, `DefPhone`
- Checkboxes use `"On"` export value (NOT `"Yes"`): `GoodsCheckBox`, `WorkCheckBox`, `MoneyCheckBox`, `PMCheckBox`, `ASCheckBox`, `OtherCheckBox`, `AutoCheckBox`, `AttachCheckBox`
- `Explanation1`–`Explanation4` → description split at ~200 chars/field
- `Principal` and `Total` → formatted amount (no $ prefix); `Costs` and `Interest` → blank
- `Plaintiff Address 1`–`Plaintiff Address 4`, `PlaintiffName4`, `TelephoneNumber`, `EmailAddresses`

**Why "On" not "Yes":** Hillsborough form uses `FieldStateOption: On` not the AcroForm standard `FieldStateOption: Yes`. Must pass the string "On" explicitly.

## Broward County — FL-BROWARD-SOC (downloadable programmatic form)
- **County ID:** `fl-broward`
- **Definition:** `forms/definitions/fl-broward-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/broward`
- **Filing address:** 201 SE 6th St., Room 01250, Fort Lauderdale, FL 33301
- Delegates to `buildFLStatementOfClaim()` with county="Broward" and filing address.
- UI shows a Download PDF button (not a link card).

## Palm Beach County — FL-PALM-BEACH-SOC (downloadable programmatic form)
- **County ID:** `fl-palm-beach`
- **Definition:** `forms/definitions/fl-palm-beach-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/palm-beach`
- **Filing address:** 205 N. Dixie Hwy., West Palm Beach, FL 33401
- Delegates to `buildFLStatementOfClaim()` with county="Palm Beach" and filing address.
- UI shows a Download PDF button (not a link card).

## Frontend routing (forms-tab.tsx)

FL forms section shows based on `currentCase.countyId`:
- `fl-miami-dade` → CLK/CT. 333 card (route: `fl/clkct333`)
- `fl-volusia` → CL-219 card (route: `fl/cl219-volusia`)
- `fl-broward` → Broward county-specific card (route: `fl/broward`)
- `fl-orange` → Orange county-specific card (route: `fl/orange`); also `fl/plain-soc-orange` (alternate definition using actual county PDF)
- `fl-hillsborough` → Hillsborough county-specific card (route: `fl/hillsborough`); also `fl/soc-hillsborough` (alternate definition using actual county PDF)
- `fl-palm-beach` → Palm Beach county-specific card (route: `fl/palm-beach`)
- Any other FL county → statewide Statement of Claim card (route: `fl/statement-of-claim`)

## Counties data

All 67 FL counties are in `artifacts/api-server/src/routes/counties.ts` as `FLORIDA_COUNTIES`.
They are served at `/api/counties?state=FL` and displayed on the Counties page with a FL toggle.
County IDs follow the pattern `fl-<name>` (e.g., `fl-miami-dade`, `fl-broward`, `fl-orange`).
