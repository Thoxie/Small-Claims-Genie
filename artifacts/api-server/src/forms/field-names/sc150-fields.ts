/**
 * sc150-fields.ts
 *
 * Typed field name constants for SC-150 (Request to Postpone Trial).
 * All names confirmed via: pdftk sc150_acroform.pdf dump_data_fields_utf8
 *
 * Use these constants instead of raw strings when calling pdftk_fill_form so
 * that TypeScript catches typos at compile time and editors provide autocomplete.
 */

export const SC150_FIELDS = {
  text: {
    // Caption
    courtInfo:  "SC-150[0].Page1[0].Caption_sf[0].supcourt[0].CourtInfo[0]",
    caseNumber: "SC-150[0].Page1[0].Caption_sf[0].casenumbername[0].CaseNumber[0]",
    caseName:   "SC-150[0].Page1[0].Caption_sf[0].casenumbername[0].CaseName[0]",

    // Item 1 — requesting party
    requestingPartyName:    "SC-150[0].Page1[0].List1[0].item1[0].FillText01[0]",
    requestingPartyAddress: "SC-150[0].Page1[0].List1[0].item1[0].FillText03[0]",
    requestingPartyPhone:   "SC-150[0].Page1[0].List1[0].item1[0].FillText04[0]",

    // Items 2–5 — postponement details
    currentTrialDate:   "SC-150[0].Page1[0].List2[0].item2[0].FillText05[0]",
    postponeUntilDate:  "SC-150[0].Page1[0].List3[0].item3[0].FillText06[0]",
    postponeReason:     "SC-150[0].Page1[0].List4[0].item4[0].FillText08[0]",
    withinTenDaysReason:"SC-150[0].Page1[0].List5[0].item5[0].FillText15[0]",

    // Signature
    signDate:   "SC-150[0].Page1[0].sign[0].Date1[0]",
    printName:  "SC-150[0].Page1[0].sign[0].printname[0]",
  },
  checkboxes: {
    // Item 1 — plaintiff/defendant indicator
    // XFA export values: CheckBox01[0] (plaintiff) = "1", CheckBox01[1] (defendant) = "2"
    isPlaintiff: "SC-150[0].Page1[0].List1[0].item1[0].CheckBox01[0]",
    isDefendant: "SC-150[0].Page1[0].List1[0].item1[0].CheckBox01[1]",
  },
} as const;

export type SC150TextField     = typeof SC150_FIELDS.text[keyof typeof SC150_FIELDS.text];
export type SC150CheckboxField = typeof SC150_FIELDS.checkboxes[keyof typeof SC150_FIELDS.checkboxes];
