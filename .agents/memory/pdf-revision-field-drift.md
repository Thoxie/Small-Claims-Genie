---
name: PDF revision field-name drift
description: Court form PDFs can completely rename all AcroForm fields across revisions; re-verify with pdftk before assuming old field names still apply.
---

When a court form PDF is updated to a new revision, all AcroForm field names may change completely — even if the form layout looks visually identical.

**Example:** NC AOC-CVM-200 Rev. 9/13 → Rev. 7/24 renamed every single field:
- `FileNo` → `FileNumber`
- `County1`/`County2`/`County3` → `CountyName` (consolidated to one field)
- `NamPltf` → `PlaintiffName`
- `PltfStreetAddr` → `PlaintiffAddr1`, `PltfMailAddr` → `PlaintiffAddr2`
- `TeleNo1` → `PlaintiffTelephone`, `TeleNo2` → `Defendant1Telephone`
- `NameDef` → `Defendant1Name`, `DefCity` → `Defendant1City`, etc.
- `Reason` → `ReasonTextField`, `AmtOwed` → `PrincipalAmountOwed`/`TotalAmountOwed`
- `Date5` → `SignedByPlaintiffOrAttorneyDate`
- `CkBox_001`-`CkBox_006` → `OnAnAccountCkBox`, `ForGoodsSoldCkBox`, etc.
- `Ind_01`/`Corp_01` (plaintiff type) removed entirely from Rev. 7/24
- `Ind_02`/`Corp_02` → `Defendant1IndividualCkBox`/`Defendant1CorporationCkBox`
- Claim sub-fields added: `ForGoodsSoldBeginningDate`, `PrincipalAmountOwed`, `InterestOwed`

**Why:** AOC and similar agencies modernize their PDF form systems, switching from terse positional IDs to verbose descriptive names. The form visually looks the same but the underlying AcroForm field dictionary is completely regenerated.

**How to apply:**
- When user provides a new PDF revision, always run `pdftk <new.pdf> dump_data_fields` and compare field names against what the definition sets.
- If any field names differ, update ALL of them — a partial remap silently drops unfilled fields.
- Symptom of wrong field names: HTTP 200, valid PDF, correct size, but pdftotext finds no user data.
- After updating definitions, restart the API server (it rebuilds from source) before running tests — the old compiled code will still use old field names.
