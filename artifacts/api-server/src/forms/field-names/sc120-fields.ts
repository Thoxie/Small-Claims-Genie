/**
 * sc120-fields.ts
 *
 * Typed field name constants for SC-120 (Defendant's Claim and ORDER).
 * All names confirmed via: pdftk sc120_acroform.pdf dump_data_fields_utf8
 *
 * Use these constants instead of raw strings when calling pdftk_fill_form so
 * that TypeScript catches typos at compile time and editors provide autocomplete.
 */

export const SC120_FIELDS = {
  text: {
    // Page 1 — court caption
    page1CourtInfo:  "SC-120[0].Page1[0].rightcaption[0].CRT[0].CourtInfo[0]",
    page1CaseNumber: "SC-120[0].Page1[0].rightcaption[0].CSN[0].CaseNumber[0]",
    page1CaseName:   "SC-120[0].Page1[0].rightcaption[0].CSN[0].CaseName[0]",

    // Page 2 — header
    page2DefendantName: "SC-120[0].Page2[0].Header[0].Defendants_ft[0]",
    page2CaseNumber:    "SC-120[0].Page2[0].Header[0].CN[0].CaseNumber[0]",

    // Page 2 — plaintiff info
    plaintiffName:          "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].FillText19[0]",
    plaintiffPhone:         "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].FillText7[0]",
    plaintiffAddress:       "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffAdress[0]",
    plaintiffCity:          "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffCity[0]",
    plaintiffState:         "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffState[0]",
    plaintiffZip:           "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffZip[0]",
    plaintiffMailAddress:   "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffMailAdress[0]",
    plaintiffMailCity:      "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffMailCity[0]",
    plaintiffMailState:     "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffMailState[0]",
    plaintiffMailZip:       "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffMailZip[0]",

    // Page 2 — second plaintiff
    plaintiff2Name:         "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2Name[0]",
    plaintiff2Phone:        "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2Phone[0]",
    plaintiff2Address:      "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2Adress[0]",
    plaintiff2City:         "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2City[0]",
    plaintiff2State:        "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2State[0]",
    plaintiff2Zip:          "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2Zip[0]",
    plaintiff2MailAddress:  "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2MailAdress[0]",
    plaintiff2MailCity:     "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2MailCity[0]",
    plaintiff2MailState:    "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2MailState[0]",
    plaintiff2MailZip:      "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].Plaintiff2MailZip[0]",

    // Page 2 — defendant info
    defendantName:        "SC-120[0].Page2[0].List2[0].defInfo[0].DefName[0]",
    defendantPhone:       "SC-120[0].Page2[0].List2[0].defInfo[0].DefPhone[0]",
    defendantAddress:     "SC-120[0].Page2[0].List2[0].defInfo[0].DefAddress[0]",
    defendantCity:        "SC-120[0].Page2[0].List2[0].defInfo[0].DefCity[0]",
    defendantState:       "SC-120[0].Page2[0].List2[0].defInfo[0].DefState[0]",
    defendantZip:         "SC-120[0].Page2[0].List2[0].defInfo[0].DefZip[0]",
    defendantMailAddress: "SC-120[0].Page2[0].List2[0].defInfo[0].DefMailAdress[0]",
    defendantMailCity:    "SC-120[0].Page2[0].List2[0].defInfo[0].DefMailCity[0]",
    defendantMailState:   "SC-120[0].Page2[0].List2[0].defInfo[0].DefMailState[0]",
    defendantMailZip:     "SC-120[0].Page2[0].List2[0].defInfo[0].DefMailZip[0]",

    // Page 2 — second defendant (body-supplied)
    def2Name:         "SC-120[0].Page2[0].List2[0].NextDef[0].Def2Name[0]",
    def2Phone:        "SC-120[0].Page2[0].List2[0].NextDef[0].Def2Phone[0]",
    def2Address:      "SC-120[0].Page2[0].List2[0].NextDef[0].Def2Address[0]",
    def2City:         "SC-120[0].Page2[0].List2[0].NextDef[0].Def2City[0]",
    def2State:        "SC-120[0].Page2[0].List2[0].NextDef[0].Def2State[0]",
    def2Zip:          "SC-120[0].Page2[0].List2[0].NextDef[0].Def2Zip[0]",
    def2MailAddress:  "SC-120[0].Page2[0].List2[0].NextDef[0].Def2MailAdress[0]",
    def2MailCity:     "SC-120[0].Page2[0].List2[0].NextDef[0].Def2MailCity[0]",
    def2MailState:    "SC-120[0].Page2[0].List2[0].NextDef[0].Def2MailState[0]",
    def2MailZip:      "SC-120[0].Page2[0].List2[0].NextDef[0].Def2MailZip[0]",

    // Page 2 — counterclaim
    counterClaimAmount:         "SC-120[0].Page2[0].List3[0].FillText63[0]",
    counterClaimReason:         "SC-120[0].Page2[0].List3[0].Lia[0].FillText64[0]",
    counterClaimDate:           "SC-120[0].Page2[0].List3[0].Lib[0].FillText66[0]",
    counterClaimHowCalculated:  "SC-120[0].Page2[0].List3[0].Lic[0].FillText70[0]",

    // Page 3 — header
    page3DefendantName: "SC-120[0].Page3[0].Header[0].Defendants_ft[0]",
    page3CaseNumber:    "SC-120[0].Page3[0].Header[0].CN[0].CaseNumber[0]",

    // Page 3 — public entity claim date
    publicEntityClaimDate: "SC-120[0].Page3[0].List6[0].item6[0].FillText71[0]",

    // Page 3 — signature
    signDate:      "SC-120[0].Page3[0].List10[0].Date1[0]",
    signerName:    "SC-120[0].Page3[0].List10[0].Field1[0]",
  },
  checkboxes: {
    // Page 2 — more than 2 plaintiffs/defendants
    moreThan2Plaintiffs: "SC-120[0].Page2[0].List1[0].NextPlaintiff[0].CheckBox01[0]",
    moreThan2Defendants: "SC-120[0].Page2[0].List2[0].NextDef[0].CheckBox03[0]",

    // Page 3 — yes/no questions (yes variant [0], no variant [1])
    priorDemandYes:          "SC-120[0].Page3[0].List4[0].item4[0].Ch1[0]",
    priorDemandNo:           "SC-120[0].Page3[0].List4[0].item4[0].Ch1[1]",
    attyFeeDisputeYes:       "SC-120[0].Page3[0].List5[0].item5[0].Ch2[0]",
    attyFeeDisputeNo:        "SC-120[0].Page3[0].List5[0].item5[0].Ch2[1]",
    suingPublicEntityYes:    "SC-120[0].Page3[0].List6[0].item6[0].Ch3[0]",
    suingPublicEntityNo:     "SC-120[0].Page3[0].List6[0].item6[0].Ch3[1]",
    moreThan12Yes:           "SC-120[0].Page3[0].List7[0].item7[0].Ch4[0]",
    moreThan12No:            "SC-120[0].Page3[0].List7[0].item7[0].Ch4[1]",

    // Page 3 — sub-checkboxes
    arbitrationCompleted:    "SC-120[0].Page3[0].List5[0].item5[0].CheckBox09[0]",
    publicEntityClaimFiled:  "SC-120[0].Page3[0].List6[0].item6[0].CheckBox11[0]",
  },
} as const;

export type SC120TextField     = typeof SC120_FIELDS.text[keyof typeof SC120_FIELDS.text];
export type SC120CheckboxField = typeof SC120_FIELDS.checkboxes[keyof typeof SC120_FIELDS.checkboxes];
