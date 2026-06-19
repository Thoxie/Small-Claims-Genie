---
name: FL Forms Architecture
description: County-specific FL small claims form definitions, PDF field mappings, and county IDs
---

# FL Forms Architecture

## Pattern
FL forms follow the same FormRegistry + makeFormHandler pattern as CA forms, using pdftk FDF fill (renderingTechnique: "xfa-pdftk"). Each county has its own FormDefinition registered in `forms/definitions/index.ts`.

## Implemented forms

### Miami-Dade — CLK/CT. 333 Statement of Claim
- **Form ID:** `CLK-CT-333`
- **County ID:** `fl-miami-dade`
- **PDF:** `src/assets/fl-forms/clk-ct-333.pdf`
- **Definition:** `forms/definitions/fl-clkct333-miami-dade-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/clkct333`

**Key field mapping (confirmed via pdf-lib inspection):**
- `Plaintiff` (x=40, y=131, w=186) → plaintiffName (header)
- `Defendant` → defendantName (header)
- `Address` → defendant full address
- `Phone` → defendantPhone
- `Text1` (x=452, y=72) → plaintiffEmail (top right)
- `Text7` (y=383), `Text8` (y=401), `Text9` (y=419) → description (3 lines ~90 chars each)
- `Text10` (x=250, y=438, w=80) → claim amount ($X,XXX.00)
- `Text11` (y=474) → plaintiffName (sworn statement "The Plaintiff, ___")
- `Text12` (y=558), `Text14` (y=591), `Text15` (y=591), `Text16` (y=609) → signature section
- Check Box1 = CIVIL (always true), Check Box4–10 = claim types, Check Box11 = additional facts

**Why:** Miami-Dade uses positional field names (Text1-Text25). The named fields (Plaintiff, Defendant, Address, Phone) were only visible via pdf-lib inspection, NOT in pdftk dump_data_fields output. Always use pdf-lib to inspect Miami-Dade fields.

### Volusia — CL-219 Statement of Claim
- **Form ID:** `CL-219-VOLUSIA`
- **County ID:** `fl-volusia`
- **PDF:** `src/assets/fl-forms/cl-219-volusia.pdf`
- **Definition:** `forms/definitions/fl-cl219-volusia-definition.ts`
- **Route:** POST `/api/cases/:id/forms/fl/cl219-volusia`

**Key field mapping (all descriptive names, from pdftk):**
- `Plaintiff 1`, `Plaintiff 2`, `Defendant 1`, `Defendant 2`
- `Plaintiffs Address 1` (street), `Plaintiffs Address 2` (city, state zip)
- `Defendants Address 1`, `Defendants Address 2`
- `Plaintiffs Telephone Number`, `Defendants Telephone Number`
- `Brief Statement Explaining Reasons For Filing Case` (500 chars max)
- `Continuation of Explanation for Filing Case` (next 500 chars)
- `Requested Judgment Amount` ($X,XXX.00)
- `Plaintiff or Plaintiffs Address 2`, `Plaintiff or Plaintiffs Telephone Number`
- `Plaintiff Address` (signature section)

## Adding a new FL county
1. Get the county's PDF form (AcroForm preferred)
2. Run: `pdftk <form.pdf> dump_data_fields` + pdf-lib inspection for named fields
3. Copy PDF to `src/assets/fl-forms/<form-id>.pdf`
4. Create `forms/definitions/fl-<formid>-<county>-definition.ts`
5. Register in `forms/definitions/index.ts`
6. Add POST route in `routes/forms-unified.ts`
7. Update `forms-tab.tsx` FL section with new county ID check
8. Update AI prompts in `prompts/chat-prompt.ts` and `prompts/help-chat-prompt.ts`

## Frontend routing (forms-tab.tsx)
FL forms section shows based on `currentCase.countyId`:
- `fl-miami-dade` → CLK/CT. 333 card
- `fl-volusia` → CL-219 card
- Any other FL county → "coming soon" message
