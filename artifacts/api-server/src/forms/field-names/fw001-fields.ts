/**
 * fw001-fields.ts
 *
 * Typed field name constants for FW-001 (Request to Waive Court Fees).
 * All names confirmed via: pdftk fw001_acroform.pdf dump_data_fields_utf8
 *
 * Use these constants instead of raw strings when calling pdf-lib so that
 * TypeScript catches typos at compile time and editors provide autocomplete.
 */

export const FW001_FIELDS = {
  text: {
    // Page 1 — court caption
    courtInfo:  "FW-001[0].Page1[0].RightCaption[0].CourtInfo[0]",
    caseNumber: "FW-001[0].Page1[0].RightCaption[0].CaseNumber[0]",
    caseName:   "FW-001[0].Page1[0].RightCaption[0].CaseName[0]",

    // Page 1 — petitioner contact info
    petitionerName:    "FW-001[0].Page1[0].List1[0].item1[0].PetitionerName1[0]",
    petitionerAddress: "FW-001[0].Page1[0].List1[0].item1[0].PetitionerStrAddress[0]",
    petitionerCity:    "FW-001[0].Page1[0].List1[0].item1[0].PetitionerCity[0]",
    petitionerState:   "FW-001[0].Page1[0].List1[0].item1[0].PetitionerState[0]",
    petitionerZip:     "FW-001[0].Page1[0].List1[0].item1[0].PetitionerZip[0]",
    petitionerPhone:   "FW-001[0].Page1[0].List1[0].item1[0].PetitionerTel[0]",

    // Page 1 — employment
    petitionerJobTitle:    "FW-001[0].Page1[0].List2[0].item2[0].PetitionerJobTitle[0]",
    petitionerEmployerName: "FW-001[0].Page1[0].List2[0].item2[0].PetitionerEmployerName[0]",

    // Page 1 — signature block
    signerName: "FW-001[0].Page1[0].Sign[0].PetitionerName[0]",

    // Page 2 — continuation caption
    page2PetitionerName: "FW-001[0].Page2[0].pXCaption[0].PetitionerName1[0]",
    page2CaseNumber:     "FW-001[0].Page2[0].pXCaption[0].CaseNumber[0]",
  },
  checkboxes: {
    // Page 1 — fee waiver type
    waiveSuperiorCourtFee: "FW-001[0].Page1[0].List4[0].item4[0].WaiveSuperiorCrtFee[0]",
  },
} as const;

export type FW001TextField    = typeof FW001_FIELDS.text[keyof typeof FW001_FIELDS.text];
export type FW001CheckboxField = typeof FW001_FIELDS.checkboxes[keyof typeof FW001_FIELDS.checkboxes];
