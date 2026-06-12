/**
 * sc105-fields.ts
 *
 * Typed field name constants for SC-105 (Request for Court Order and Answer).
 * All names confirmed via: pdftk sc105_acroform.pdf dump_data_fields_utf8
 *
 * Use these constants instead of raw strings when calling pdf-lib so that
 * TypeScript catches typos at compile time and editors provide autocomplete.
 */

export const SC105_FIELDS = {
  text: {
    // Page 1 — court caption
    courtInfo:   "SC-105[0].Page1[0].RightCaption[0].CourtInfo[0]",
    caseNumber:  "SC-105[0].Page1[0].RightCaption[0].CaseNumber[0]",
    caseName:    "SC-105[0].Page1[0].RightCaption[0].CaseName[0]",

    // Page 1 — requesting party
    requestingPartyName:    "SC-105[0].Page1[0].List1[0].Item[0].FullName3[0]",
    requestingPartyAddress: "SC-105[0].Page1[0].List1[0].Item[0].FullName2[0]",

    // Page 1 — parties to be notified
    party1Name:    "SC-105[0].Page1[0].List2[0].Item1[0].Make1_ft[0]",
    party1Address: "SC-105[0].Page1[0].List2[0].Item1[0].Model1_ft[0]",
    party2Name:    "SC-105[0].Page1[0].List2[0].Item1[0].Make2_ft[0]",
    party2Address: "SC-105[0].Page1[0].List2[0].Item1[0].Model2_ft[0]",
    party3Name:    "SC-105[0].Page1[0].List2[0].Item1[0].Make3_ft[0]",
    party3Address: "SC-105[0].Page1[0].List2[0].Item1[0].Model3_ft[0]",

    // Page 1 — order and reason
    orderRequested: "SC-105[0].Page1[0].List3[0].item3[0].Specify[0].Disagree_ft1[0]",
    orderReason:    "SC-105[0].Page1[0].List4[0].item4[0].Explain[0].Disagree_ft6[0]",

    // Page 1 — signature
    signDate:   "SC-105[0].Page1[0].Sign[0].SigDate4[0]",
    signerName: "SC-105[0].Page1[0].Sign[0].SigName[0]",

    // Page 2 — court caption
    page2CourtInfo:  "SC-105[0].Page2[0].RightCaption[0].CourtInfo[0]",
    page2CaseNumber: "SC-105[0].Page2[0].RightCaption[0].CaseNumber[0]",
    page2CaseName:   "SC-105[0].Page2[0].RightCaption[0].CaseName[0]",
  },
  checkboxes: {
    // Page 1 — requesting party role
    roleIsDefendant: "SC-105[0].Page1[0].List1[0].Item[0].Level5[0]",
    roleIsPlaintiff: "SC-105[0].Page1[0].List1[0].Item[0].Level5[1]",
  },
} as const;

export type SC105TextField    = typeof SC105_FIELDS.text[keyof typeof SC105_FIELDS.text];
export type SC105CheckboxField = typeof SC105_FIELDS.checkboxes[keyof typeof SC105_FIELDS.checkboxes];
