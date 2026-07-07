---
name: VA Official Form PDFs
description: VA DC-402 and DC-409 official PDF details, field maps, and pdftk fill approach
---

# VA DC-402 (Warrant in Debt)

**URL:** https://www.vacourts.gov/forms/district/dc402.pdf  
**Asset path:** `artifacts/api-server/assets/va-forms/dc-402.pdf`  
**Size:** ~61 KB; 2 pages; AcroForm; landscape (rotation=90)  
**Rendering:** pdftk FDF fill — `renderingTechnique: "xfa-pdftk"`

Key fields:
- `User.CourtName`, `User.CourtAddress` — court header
- `User.PlaintiffName`, `User.PlaintiffAddress1/2/3` — plaintiff block
- `User.DefendantName`, `User.DefendantAddress1/2/3` — defendant block
- `User.Net` — claim amount (no $ prefix; pdftk formats it)
- `User.Date3` — incident/interest-from date (MM/DD/YYYY)
- `User.Date4` — today/signing date (MM/DD/YYYY)
- `User.Other` — claim description narrative
- `User.RB2` — basis radio: "1"=Open Account, "2"=Contract, "3"=Note, "4"=Other
- `User.RB3` — homestead: "3"=cannot be demanded
- `User.RB4` — filer type: "1"=PLAINTIFF
- `User.ReturnName1`, `User.ReturnAddress1`, `User.ReturnPhone1` — back-page service stub

**Why:** Page rotation=90 (landscape) is handled transparently by pdftk; pdf-lib required explicit rotation math. The `User.*` prefix is consistent across the whole form.

**How to apply:** When adding new fields or verifying field names, use `pdftk dc-402.pdf dump_data_fields | grep FieldName`.

---

# VA DC-409 (Petition to Proceed In Forma Pauperis)

**URL:** https://www.vacourts.gov/forms/district/dc409.pdf  
**Asset path:** `artifacts/api-server/assets/va-forms/dc-409.pdf`  
**Size:** ~93 KB; 2 pages; AcroForm; portrait (no rotation)  
**Rendering:** pdftk FDF fill + optional pdf-lib signature overlay

Key fields:
- `DC409CaseNumber` — case number
- `DC409CourtName` — court name
- `DC409Plantif` (typo in official PDF) — plaintiff name
- `DC409Defendant` — defendant name
- `DC409AcknowName` — acknowledgment name
- `DC409AcknowAddress` — acknowledgment address
- `DC409AcknowDate` — acknowledgment date (MM/DD/YYYY)
- `CB02` — GDC court checkbox: "1" to check

Financial fields (income/assets) are left blank — CaseData has no income data; user fills those by hand.

**Signature overlay:** Page 2, x=208, y=686 (above "SIGNATURE–PETITIONER" label). Uses same pdf-lib overlay technique as SC-100A. Coordinates found by `pdftotext -bbox-layout` on the pdftk-filled output.

**Why:** The field name typo `DC409Plantif` (missing 'i') is in the official PDF — it must be used exactly or pdftk silently skips the fill.
