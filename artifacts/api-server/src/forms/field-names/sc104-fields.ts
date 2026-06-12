/**
 * sc104-fields.ts
 *
 * Typed field name constants for SC-104 (Proof of Service by First-Class Mail).
 * All names confirmed via: pdftk sc104_acroform.pdf dump_data_fields_utf8
 *
 * Use these constants instead of raw strings when calling pdf-lib so that
 * TypeScript catches typos at compile time and editors provide autocomplete.
 */

export const SC104_FIELDS = {
  text: {
    // Page 1 — court caption
    courtInfo:   "SC-104[0].Page1[0].RightCaption[0].CourtInfo[0]",
    caseNumber:  "SC-104[0].Page1[0].RightCaption[0].CaseNumber[0]",
    caseName:    "SC-104[0].Page1[0].RightCaption[0].CaseName[0]",
    hearingDate: "SC-104[0].Page1[0].RightCaption[0].Hearindate[0]",
    hearingTime: "SC-104[0].Page1[0].RightCaption[0].Time[0]",
    dept:        "SC-104[0].Page1[0].RightCaption[0].Dept[0]",

    // Page 1 — party being served
    servedIndividualName: "SC-104[0].Page1[0].List1[0].Lia[0].FullName[0]",
    servedBusinessName:   "SC-104[0].Page1[0].List1[0].Lib[0].FullName1[0]",
    servedBusinessRep:    "SC-104[0].Page1[0].List1[0].Lib[0].FullName2[0]",

    // Page 1 — other docs
    otherDocsList: "SC-104[0].Page1[0].List3[0].Lid[0].T1865[0]",

    // Page 2 — continuation caption
    page2CaseName:   "SC-104[0].Page2[0].PxCaption[0].CaseName[0]",
    page2CaseNumber: "SC-104[0].Page2[0].PxCaption[0].CaseNumber[0]",

    // Page 2 — service address
    serviceStreet: "SC-104[0].Page2[0].List4[0].Lia[0].RestrainedStreet_ft2[0]",
    serviceCity:   "SC-104[0].Page2[0].List4[0].Lia[0].RestrainedCity_ft2[0]",
    serviceState:  "SC-104[0].Page2[0].List4[0].Lia[0].RestrainedState_ft2[0]",
    serviceZip:    "SC-104[0].Page2[0].List4[0].Lia[0].RestrainedZip_ft2[0]",
  },
  checkboxes: {
    // Page 1 — documents served
    filedAtSameTime:    "SC-104[0].Page1[0].List3[0].Lia[0].Filed_cb[0]",
    otherDocsIncluded:  "SC-104[0].Page1[0].List3[0].Lid[0].NotYet_cb[0]",
  },
} as const;

export type SC104TextField    = typeof SC104_FIELDS.text[keyof typeof SC104_FIELDS.text];
export type SC104CheckboxField = typeof SC104_FIELDS.checkboxes[keyof typeof SC104_FIELDS.checkboxes];
