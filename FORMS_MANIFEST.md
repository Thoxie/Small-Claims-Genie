# Small Claims Genie — Forms Manifest

**Last updated:** July 2026
**Purpose:** Living inventory of every court form implemented in the system. Update this file immediately whenever a form, route, or state is added, changed, or removed.

---

## How to read this document

- **Route** — the API path under `/api/cases/:id/forms/`
- **Render method** — how the PDF is produced: `acroform` (pdf-lib), `xfa-pdftk` (pdftk FDF fill), `overlay` (pdf-lib coordinate drawing), or `chromium` (Playwright HTML→PDF)
- **Signed?** — whether a `/signed` variant exists that embeds a plaintiff signature image
- **Asset** — template PDF filename in `artifacts/api-server/assets/forms/` (blank = programmatically generated, no template)

---

## California (CA)

Court: Small Claims Court | Claim limit: $12,500 individual / $6,250 business | Filing fee: $30–$75

| Form | Name | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| SC-100 | Plaintiff's Claim and Order | `sc100` (GET) | chromium + overlay | ✅ `sc100/signed` | `sc100_acroform.pdf` |
| SC-100A | Amendment to Claim | `sc100a` | overlay | ✅ `sc100a/signed` | `sc100a_acroform.pdf` |
| SC-103 | Fictitious Business Name Declaration | `sc103` | xfa-pdftk | ✅ (inline) | `sc103_acroform.pdf` |
| SC-103 (secondary) | SC-103 for defendant DBA | `sc103-secondary` | xfa-pdftk | ✅ (inline) | `sc103_acroform.pdf` |
| SC-104 | Proof of Service by Mail | `sc104` | acroform | ✅ `sc104/signed` | `sc104_acroform.pdf` |
| SC-105 | Proof of Service — Personally Delivered | `sc105` | acroform | — | `sc105_acroform.pdf` |
| SC-112A | Request for Entry of Judgment | `sc112a` | acroform | — | `sc112a_acroform.pdf` |
| SC-120 | Defendant's Claim | `sc120` | xfa-pdftk | — | `sc120_acroform.pdf` |
| SC-140 | Claim of Exemption | `sc140` | overlay | — | `sc140_acroform.pdf` |
| SC-150 | Notice of Denial of Claims | `sc150` | xfa-pdftk | — | `sc150_acroform.pdf` |
| MC-030 | Declaration (+ AI generation + exhibits) | `mc030`, `mc030/signed`, `mc030-with-exhibits` | overlay | ✅ `mc030/signed` | `mc030_acroform.pdf` |
| FW-001 | Fee Waiver | `fw001` | acroform | — | `fw001_acroform.pdf` |

**Definition files:** `sc100-definition.ts`, `sc100a-definition.ts`, `sc103-definition.ts`, `sc104-definition.ts`, `sc105-definition.ts`, `sc112a-definition.ts`, `sc120-definition.ts`, `sc140-definition.ts`, `sc150-definition.ts`, `mc030-definition.ts`, `fw001-definition.ts`

---

## Florida (FL)

Court: County Court Small Claims | Claim limit: $8,000 | Filing fee: $55–$300 (Fla. Stat. 34.041)

### Statewide AcroForm forms (all 67 counties)

| Form | Name | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| FL 7.330–7.337 | Statement of Claim (dispatches by claim type) | `fl/soc`, `fl/soc/signed` | acroform (pdftk) | ✅ | `fl-soc-7340.pdf` / `fl-soc-form7340.pdf` |
| FL 7.322 | Summons — Notice to Appear | `fl/7322-summons`, `fl/7322-summons/signed` | acroform | ✅ | `fl-summons-7322.pdf` |
| FL Indigent | Application for Civil Indigent Status (fee waiver) | `fl/indigent-fee-waiver`, `fl/indigent-fee-waiver/signed` | acroform | ✅ | *(built-in)* |
| FL 7.340 | Proof of Service | `fl/proof-of-service`, `fl/proof-of-service/signed` | overlay | ✅ | *(programmatic)* |
| FL Fee Waiver | Application for Determination of Civil Indigent Status | `fl/fee-waiver`, `fl/fee-waiver/signed` | acroform | ✅ | *(built-in)* |

### County-specific forms

| County | Form | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| Miami-Dade | CLK/CT.333 Statement of Claim | `fl/clkct333`, `fl/clkct333/signed` | xfa-pdftk | ✅ | *(built-in)* |
| Miami-Dade | CLK/CT.423 Summons / Notice to Appear | `fl/clkct423`, `fl/clkct423/signed` | acroform | ✅ | `fl-clkct423-summons.pdf` |
| Volusia | CL-219 Statement of Claim (programmatic) | `fl/cl219-volusia`, `fl/cl219-volusia/signed` | overlay | ✅ | *(programmatic)* |
| Volusia | CL-219 Statement of Claim (official PDF) | `fl/cl219-volusia-pdf`, `fl/cl219-volusia-pdf/signed` | acroform | ✅ | *(county PDF)* |
| Broward | Statement of Claim | `fl/broward`, `fl/broward/signed` | overlay | ✅ | *(programmatic)* |
| Broward | Summons (Form 7.322) | `fl/broward-summons`, `fl/broward-summons/signed` | overlay | ✅ | *(programmatic)* |
| Orange | Statement of Claim | `fl/orange`, `fl/orange/signed` | overlay | ✅ | *(programmatic)* |
| Orange | Statement of Claim (official PDF) | `fl/plain-soc-orange`, `fl/plain-soc-orange/signed` | acroform | ✅ | *(county PDF)* |
| Orange | Summons (Form 7.322) | `fl/orange-summons`, `fl/orange-summons/signed` | overlay | ✅ | *(programmatic)* |
| Hillsborough | Statement of Claim | `fl/hillsborough`, `fl/hillsborough/signed` | overlay | ✅ | *(programmatic)* |
| Hillsborough | Statement of Claim (official PDF) | `fl/soc-hillsborough`, `fl/soc-hillsborough/signed` | acroform | ✅ | *(county PDF)* |
| Hillsborough | Summons (Form 7.322) | `fl/hillsborough-summons`, `fl/hillsborough-summons/signed` | overlay | ✅ | *(programmatic)* |
| Palm Beach | Statement of Claim | `fl/palm-beach`, `fl/palm-beach/signed` | overlay | ✅ | *(programmatic)* |
| Palm Beach | Summons (Form 7.322) | `fl/palm-beach-summons`, `fl/palm-beach-summons/signed` | overlay | ✅ | *(programmatic)* |
| Statewide fallback | Statement of Claim (programmatic) | `fl/statement-of-claim`, `fl/statement-of-claim/signed` | overlay | ✅ | *(programmatic)* |
| Statewide fallback | Summons | `fl/summons`, `fl/summons/signed` | overlay | ✅ | `fl-summons-7322.pdf` |

**Definition files:** `fl-statement-of-claim-definition.ts`, `fl-soc-acroform-definition.ts`, `fl-statewide-summons-definition.ts`, `fl-summons-definition.ts`, `fl-broward-definition.ts`, `fl-orange-definition.ts`, `fl-hillsborough-definition.ts`, `fl-palm-beach-definition.ts`, `fl-plain-soc-orange-definition.ts`, `fl-soc-hillsborough-definition.ts`, `fl-cl219-volusia-definition.ts`, `fl-cl219-volusia-pdf-definition.ts`, `fl-clkct333-miami-dade-definition.ts`, `fl-clkct423-miami-dade-summons-definition.ts`, `fl-proof-of-service-definition.ts`, `fl-fee-waiver-definition.ts`, `fl-indigent-fee-waiver-acroform-definition.ts`

---

## Texas (TX)

Court: Justice of the Peace (JP) Courts | Claim limit: $20,000 | Filing fee: $46–$321 (Tex. Gov't Code § 118.121)

| Form | Name | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| TX Petition | Small Claims Petition (statewide, all 254 counties) | `tx/petition`, `tx/petition/signed` | acroform | ✅ | `tx-small-claims-petition.pdf` |
| TX Citation | Citation — issued by clerk after petition (Tex. R. Civ. P. 502.5) | `tx/citation`, `tx/citation/signed` | acroform | ✅ | *(programmatic)* |
| TX Return of Service | Return of Service — filed after defendant served | `tx/return-of-service`, `tx/return-of-service/signed` | overlay | ✅ | `tx-return-of-service.pdf` |
| TX Fee Waiver | Affidavit of Inability to Pay (Tex. R. Civ. P. 145) | `tx/fee-waiver`, `tx/fee-waiver/signed` | acroform | ✅ | *(programmatic)* |
| Travis Co. JP2 | Precinct 2 Petition (J2-CV) | `tx/petition-jp2`, `tx/petition-jp2/signed` | overlay | ✅ | `tx-small-claims-petition-jp2.pdf` |
| Travis Co. JP5 | Precinct 5 Petition (J5-CV) | `tx/petition-jp5`, `tx/petition-jp5/signed` | overlay | ✅ | `tx-small-claims-petition-jp5.pdf` |
| Denton Co. | Request for Service of Process / Citation | `tx/denton-citation-request` | acroform | — | *(programmatic)* |

**Definition files:** `tx-petition-definition.ts`, `tx-citation-definition.ts`, `tx-return-of-service-definition.ts`, `tx-fee-waiver-definition.ts`, `tx-petition-jp2-definition.ts`, `tx-petition-jp5-definition.ts`, `denton-citation-request-definition.ts`

---

## Illinois (IL)

Court: Circuit Court Small Claims | Claim limit: $10,000 | Filing fee: ~$189–$264 (varies by county)

| Form | Name | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| IL Complaint | Small Claims Complaint (statewide, all 102 counties) | `il/smc-complaint`, `il/smc-complaint/signed` | xfa-pdftk | ✅ | `il-smc-complaint.pdf` |
| IL Summons | Small Claims Summons (clerk-issued — no plaintiff signature) | `il/summons` | xfa-pdftk | — | *(built-in)* |
| IL Proof of Service | Proof of Service | `il/proof-of-service`, `il/proof-of-service/signed` | overlay | ✅ | *(programmatic)* |
| IL Fee Waiver | Application for Waiver of Court Fees | `il/fee-waiver`, `il/fee-waiver/signed` | xfa-pdftk | ✅ | *(built-in)* |
| IL Letter to Sheriff | CS-L 706.1 Letter to the Sheriff | `il/letter-to-sheriff` | xfa-pdftk | — | `il-letter-to-sheriff.pdf` |

**Definition files:** `il-smc-complaint-definition.ts`, `il-summons-definition.ts`, `il-proof-of-service-definition.ts`, `il-fee-waiver-definition.ts`, `il-letter-to-sheriff-definition.ts`

---

## New Jersey (NJ)

Court: Special Civil Part — Small Claims Section | Claim limit: $5,000 | Filing fee: $35 + $5/additional defendant

| Form | Name | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| CN 10532 | Small Claims Complaint (Appendix XI-C) — general cases | `nj/complaint`, `nj/complaint/signed` | acroform | ✅ | `nj_complaint_acroform.pdf` |
| CN 10148 | Motor Vehicle Complaint — Auto Negligence cases only | `nj/mv-complaint`, `nj/mv-complaint/signed` | acroform | ✅ | `nj_mv_complaint_acroform.pdf` |

**UI note:** The MV Complaint (CN 10148) is shown only when claim type is "Auto Negligence"; CN 10532 is hidden for those cases. All other claim types show only CN 10532.

**Definition files:** `nj-complaint-definition.ts`, `nj-mv-complaint-definition.ts`

---

## North Carolina (NC)

Court: District Court — Small Claims / Magistrate Court | Claim limit: $10,000 | Filing fee: $96 flat (G.S. 7A-311)

| Form | Name | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| AOC-CVM-200 | Complaint for Money Owed (primary filing form) | `nc/aoc-cvm-200`, `nc/aoc-cvm-200/signed` | acroform | ✅ | `nc-aoc-cvm-100.pdf` |
| AOC-CVM-100 | Magistrate's Summons (clerk completes and issues) | `nc/aoc-cvm-100` | acroform | — | `nc-aoc-cvm-100.pdf` |
| AOC-G-106 | Petition to Sue as Indigent (fee waiver) | `nc/aoc-g-106`, `nc/aoc-g-106/signed` | acroform | ✅ | `nc-aoc-g-106.pdf` |

**Definition files:** `nc-aoc-cvm-200-definition.ts`, `nc-aoc-cvm-100-definition.ts`, `nc-aoc-g-106-definition.ts`

---

## Virginia (VA)

Court: General District Court — Small Claims Division | Claim limit: $5,000 | Filing fee: varies by locality

| Form | Name | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| DC-402 | Warrant in Debt (primary filing form) | `va/dc-402`, `va/dc-402/signed` | acroform (pdftk) | ✅ | *(built-in)* |
| DC-409 | Petition to Proceed In Forma Pauperis (fee waiver) | `va/dc-409`, `va/dc-409/signed` | acroform | ✅ | *(built-in)* |

**Note:** DC-402 PDF has 90° page rotation; pdftk handles this correctly — do not attempt to correct it.

**Definition files:** `va-dc-402-definition.ts`, `va-dc-409-definition.ts`

---

## Washington (WA)

Court: District Court — Small Claims Department | Claim limit: $10,000 individual / $5,000 business | Filing fee: $35–$50

| Form | Name | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| MISC 05.0100 | Notice of Small Claim (primary filing form) | `wa/notice`, `wa/notice/signed` | overlay | ✅ | `wa-misc-05-0200.pdf` |
| MISC 05.0200 | Certificate of Service | `wa/service`, `wa/service/signed` | overlay | ✅ | `wa-misc-05-0200.pdf` |

**Definition files:** `wa-notice-definition.ts`, `wa-service-definition.ts`

---

## Arizona (AZ)

Court: Small Claims Division of the Justice Court | Claim limit: $5,000 | Filing fee: $30 flat (A.R.S. § 22-281)

| Form | Name | Route | Render | Signed? | Asset |
|---|---|---|---|---|---|
| LJSC00001F | Small Claims Complaint | `az/complaint`, `az/complaint/signed` | acroform | ✅ | `az-ljsc00001f-complaint.pdf` |
| LJSC00002F | Small Claims Summons | `az/summons`, `az/summons/signed` | overlay | ✅ | `az-ljsc00002f-summons.pdf` |
| LJSC00003F | Proof of Service by Certified Mail | `az/proof-of-service`, `az/proof-of-service/signed` | overlay | ✅ | `az-ljsc00003f-proof-of-service.pdf` |

**Note:** Arizona has NO appeal from a small claims judgment (A.R.S. § 22-519) — decision is final and binding.

**Definition files:** `az-complaint-definition.ts`, `az-summons-definition.ts`, `az-proof-of-service-definition.ts`

---

## Form Engine — Key Rules

1. **All template PDFs** go in `artifacts/api-server/assets/forms/` (not `src/`). Wrong path = silent failure.
2. **All routes** go through `makeFormHandler()` in `forms/generic-handler.ts`. No inline handlers.
3. **All form definitions** must be registered in `artifacts/api-server/src/forms/definitions/index.ts`.
4. **Signature coordinates** are the single source of truth in `lib/form-signatures/`. Never hardcode in definition files or test scripts.
5. **Clerk-issued forms** (summons where the clerk fills in case number/stamp) must NOT have a plaintiff signature route — do not add one.
6. **Signed tests** live in `scripts/src/` and use `signed-form-test-kit.ts`. Add a test for every new `/signed` route before shipping.
7. **Adding a new state:** follow the 8-step checklist in `.agents/skills/state-expansion/SKILL.md` and update this manifest.

---

## Regression Tests

Every form with a `/signed` route has a pixel-level regression test in `scripts/src/`:

| Test script | What it checks |
|---|---|
| `signed-form-configs.ts` | Central config for all `"image"`, `"typed-bright"`, and `"clerk-blank"` guard types |
| `signed-form-test-kit.ts` | Shared test harness: mints download token, POSTs signature PNG, renders pages, diffs signed vs unsigned |
| `test-<state>-<form>-sigcheck.ts` | Per-form thin wrapper calling `runSignedFormTest(CONFIGS["<key>"])` |

Run a single test manually:
```bash
pnpm --filter @workspace/scripts exec tsx src/test-<state>-<form>-sigcheck.ts
```

**Known issue:** Running all signed-form tests simultaneously via workflow triggers parallel OOM (SIGABRT / exit 134). Run tests one at a time or in small batches.
