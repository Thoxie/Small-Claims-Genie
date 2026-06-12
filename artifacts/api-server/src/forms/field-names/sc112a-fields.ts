/**
 * sc112a-fields.ts
 *
 * Typed field name constants for SC-112A (Proof of Service by Mail).
 * All names confirmed via: pdftk sc112a_acroform.pdf dump_data_fields_utf8
 *
 * Note: field names containing "\." are literal in the PDF (backslash + dot).
 * In TypeScript string literals these must be written as "\\." to produce "\.".
 *
 * Use these constants instead of raw strings when calling pdf-lib so that
 * TypeScript catches typos at compile time and editors provide autocomplete.
 */

export const SC112A_FIELDS = {
  text: {
    // Page 1 — header
    caseNumber: "SC-112A[0].Page1[0].Header[0].CaseNumber_ft[0]",

    // Page 1 — server info
    serverName:          "SC-112A[0].Page1[0].List1[0].Item1[0].FillText01[0]",
    serverPhone:         "SC-112A[0].Page1[0].List1[0].Item1[0].FillText02[0]",
    serverAddress:       "SC-112A[0].Page1[0].List1[0].Item1[0].FillText03[0]",
    serverCity:          "SC-112A[0].Page1[0].List1[0].Item1[0].FillText04[0]",
    serverState:         "SC-112A[0].Page1[0].List1[0].Item1[0].FillText05[0]",
    serverZip:           "SC-112A[0].Page1[0].List1[0].Item1[0].FillText06[0]",
    registrationCounty:  "SC-112A[0].Page1[0].List1[0].Item1[0].FillText07[0]",
    registrationNumber:  "SC-112A[0].Page1[0].List1[0].Item1[0].FillText08[0]",

    // Page 1 — other document name
    documentServedOther: "SC-112A[0].Page1[0].List2[0].Lig[0].FillText09[0]",

    // Page 1 — party table (name column; 5 rows in order)
    partyName1: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.11[0]",
    partyName2: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.12[0]",
    partyName3: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.13[0]",
    partyName4: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.14[0]",
    partyName5: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.1[0]",

    // Page 1 — party table (address column; 5 rows in order)
    partyAddr1: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.11[0]",
    partyAddr2: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.12[0]",
    partyAddr3: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.13[0]",
    partyAddr4: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.14[0]",
    partyAddr5: "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.1[0]",

    // Page 1 — mailing details
    mailingDate: "SC-112A[0].Page1[0].List3[0].Lic[0].FillText12[0]",
    mailingCity: "SC-112A[0].Page1[0].List3[0].Lic[0].FillText13[0]",

    // Page 1 — signature
    signDate:   "SC-112A[0].Page1[0].Sign[0].FillText14[0]",
    signerName: "SC-112A[0].Page1[0].Sign[0].FillText16[0]",
  },
  checkboxes: {
    // Page 1 — server is a registered process server
    isRegisteredProcessServer: "SC-112A[0].Page1[0].List1[0].Item1[0].CheckBox1[0]",

    // Page 1 — document served selection
    docSC105: "SC-112A[0].Page1[0].List2[0].Lia[0].CheckBox2[0]",
    docSC109: "SC-112A[0].Page1[0].List2[0].Lib[0].CheckBox3[0]",
    docSC114: "SC-112A[0].Page1[0].List2[0].Lic[0].CheckBox4[0]",
    docSC133: "SC-112A[0].Page1[0].List2[0].Lid[0].CheckBox5[0]",
    docSC150: "SC-112A[0].Page1[0].List2[0].Lie[0].CheckBox6[0]",
    docSC221: "SC-112A[0].Page1[0].List2[0].Lif[0].CheckBox7[0]",
    docOther: "SC-112A[0].Page1[0].List2[0].Lig[0].CheckBox8[0]",
  },
} as const;

export type SC112ATextField    = typeof SC112A_FIELDS.text[keyof typeof SC112A_FIELDS.text];
export type SC112ACheckboxField = typeof SC112A_FIELDS.checkboxes[keyof typeof SC112A_FIELDS.checkboxes];
