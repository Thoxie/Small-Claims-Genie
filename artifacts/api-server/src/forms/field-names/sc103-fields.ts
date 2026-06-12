/**
 * sc103-fields.ts
 *
 * Typed field name constants for SC-103 (Fictitious Business Name attachment).
 * All names confirmed via: pdftk sc103_acroform.pdf dump_data_fields_utf8
 *
 * Use these constants instead of raw strings when calling pdftk_fill_form so
 * that TypeScript catches typos at compile time and editors provide autocomplete.
 */

export const SC103_FIELDS = {
  text: {
    caseNumber:       "SC-103[0].Page1[0].Header[0].case[0].CaseNumber_ft[0]",
    bizName:          "SC-103[0].Page1[0].List1[0].item1[0].FillText1[0]",
    bizAddress:       "SC-103[0].Page1[0].List1[0].item1[0].FillText2[0]",
    mailingAddress:   "SC-103[0].Page1[0].List1[0].item1[0].FillText3[0]",
    bizTypeOtherDesc: "SC-103[0].Page1[0].List2[0].item2[0].FillText4[0]",
    fbnCounty:        "SC-103[0].Page1[0].List3[0].item3[0].FillText5[0]",
    fbnNumber:        "SC-103[0].Page1[0].List4[0].item4[0].FillText6[0]",
    fbnExpiry:        "SC-103[0].Page1[0].List5[0].item5[0].FillText7[0]",
    signDate:         "SC-103[0].Page1[0].List6[0].item6[0].FillText9[0]",
    signerLine:       "SC-103[0].Page1[0].List6[0].item6[0].FillText10[0]",
  },
  checkboxes: {
    attachedToSC100:    "SC-103[0].Page1[0].Attachement[0].CheckBox1[0]",
    attachedToSC120:    "SC-103[0].Page1[0].Attachement[0].CheckBox2[0]",
    bizTypeIndividual:  "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[0]",
    bizTypeCorporation: "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[1]",
    bizTypeAssociation: "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[2]",
    bizTypeLLC:         "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[3]",
    bizTypePartnership: "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[4]",
    bizTypeOther:       "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[5]",
  },
} as const;

export type SC103TextField    = typeof SC103_FIELDS.text[keyof typeof SC103_FIELDS.text];
export type SC103CheckboxField = typeof SC103_FIELDS.checkboxes[keyof typeof SC103_FIELDS.checkboxes];
