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

## Adding a new FL county

If a county wants a distinct form in the future:
1. Create `forms/definitions/fl-<id>-<county>-definition.ts` delegating to `buildFLStatementOfClaim()` with appropriate county and address overrides
2. Register in `forms/definitions/index.ts` (after the statewide form export)
3. Add POST route in `routes/forms-unified.ts`
4. Add county ID check block in `forms-tab.tsx` FL section
5. Update AI prompts in `prompts/chat-prompt.ts` and `prompts/help-chat-prompt.ts`

## Frontend routing (forms-tab.tsx)

FL forms section shows based on `currentCase.countyId`:
- `fl-miami-dade` → CLK/CT. 333 card (route: `fl/clkct333`)
- `fl-volusia` → CL-219 card (route: `fl/cl219-volusia`)
- Any other FL county → statewide Statement of Claim card (route: `fl/statement-of-claim`)

## Counties data

All 67 FL counties are in `artifacts/api-server/src/routes/counties.ts` as `FLORIDA_COUNTIES`.
They are served at `/api/counties?state=FL` and displayed on the Counties page with a FL toggle.
County IDs follow the pattern `fl-<name>` (e.g., `fl-miami-dade`, `fl-broward`, `fl-orange`).
