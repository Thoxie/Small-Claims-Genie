/**
 * SC-120 Defendant's Claim and ORDER — AcroForm definition.
 *
 * Migrated from 3-page PNG-overlay to the official California Judicial Council
 * AcroForm PDF.  Fields are filled via pdftk FDF fill.
 *
 * Source PDF: assets/forms/sc120_acroform.pdf
 * Field names confirmed via: pdftk sc120_acroform.pdf dump_data_fields
 *
 * Notes:
 * - Page 1 (court order) is clerk-filled — we populate only the court caption.
 * - Page 2 contains plaintiff/defendant info and the counterclaim.
 * - Page 3 contains yes/no questions and the defendant signature.
 */

import * as path from "path";
import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { buildCourtInfo, today } from "../enrichment";
import { ASSET_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(ASSET_DIR, "forms", "sc120_acroform.pdf");

const sc120Definition: FormDefinition = {
  state: "CA",
  formId: "SC-120",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d, body) {
    const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");

    // Yes/No checkbox helpers — each question has [0]=Yes [1]=No
    function yn(yes: any, yesField: string, noField: string): Record<string, boolean> {
      const v = yes === true || yes === "true";
      return { [yesField]: v, [noField]: !v };
    }

    return pdftk_fill_form(PDF_PATH, {
      text: {
        // Page 1 — court caption (clerk fills the order section)
        "SC-120[0].Page1[0].rightcaption[0].CRT[0].CourtInfo[0]": buildCourtInfo(d),
        "SC-120[0].Page1[0].rightcaption[0].CSN[0].CaseNumber[0]": String(d.caseNumber || ""),
        "SC-120[0].Page1[0].rightcaption[0].CSN[0].CaseName[0]":   caseName,

        // Page 2 — header
        "SC-120[0].Page2[0].Header[0].Defendants_ft[0]": String(d.defendantName || ""),
        "SC-120[0].Page2[0].Header[0].CN[0].CaseNumber[0]": String(d.caseNumber || ""),

        // Page 2 — plaintiff (the original plaintiff, listed as "plaintiff" on the counterclaim)
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].FillText19[0]": String(d.plaintiffName || ""),
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].FillText7[0]":  String(d.plaintiffPhone || ""),
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffAdress[0]": String(d.plaintiffAddress || ""),
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffCity[0]":   String(d.plaintiffCity || ""),
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffState[0]":  String(d.plaintiffState || "CA"),
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffZip[0]":    String(d.plaintiffZip || ""),
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffMailAdress[0]": String(d.plaintiffMailingAddress || ""),
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffMailCity[0]":   String(d.plaintiffMailingCity || ""),
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffMailState[0]":  String(d.plaintiffMailingState || ""),
        "SC-120[0].Page2[0].List1[0].plaintiffInfo[0].PlaintiffMailZip[0]":    String(d.plaintiffMailingZip || ""),

        // Page 2 — defendant (the person filing the counterclaim)
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefName[0]":      String(d.defendantName || ""),
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefPhone[0]":     String(d.defendantPhone || ""),
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefAddress[0]":   String(d.defendantAddress || ""),
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefCity[0]":      String(d.defendantCity || ""),
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefState[0]":     String(d.defendantState || "CA"),
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefZip[0]":       String(d.defendantZip || ""),
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefMailAdress[0]": String(d.defendantMailingAddress || ""),
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefMailCity[0]":   String(d.defendantMailingCity || ""),
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefMailState[0]":  String(d.defendantMailingState || ""),
        "SC-120[0].Page2[0].List2[0].defInfo[0].DefMailZip[0]":    String(d.defendantMailingZip || ""),

        // Page 2 — counterclaim
        "SC-120[0].Page2[0].List3[0].FillText63[0]":           body.counterClaimAmount ? Number(body.counterClaimAmount).toFixed(2) : "",
        "SC-120[0].Page2[0].List3[0].Lia[0].FillText64[0]":   String(body.counterClaimReason || ""),
        "SC-120[0].Page2[0].List3[0].Lib[0].FillText66[0]":   String(body.counterClaimDate || ""),
        "SC-120[0].Page2[0].List3[0].Lic[0].FillText70[0]":   String(body.counterClaimHowCalculated || ""),

        // Page 3 — header
        "SC-120[0].Page3[0].Header[0].Defendants_ft[0]": String(d.defendantName || ""),
        "SC-120[0].Page3[0].Header[0].CN[0].CaseNumber[0]": String(d.caseNumber || ""),

        // Page 3 — signature
        "SC-120[0].Page3[0].List10[0].Date1[0]":  String(body.signDate || today()),
        "SC-120[0].Page3[0].List10[0].Field1[0]": String(d.defendantName || ""),
      },
      checkboxes: {
        // Page 3 — yes/no questions
        ...yn(body.priorDemand,       "SC-120[0].Page3[0].List4[0].item4[0].Ch1[0]", "SC-120[0].Page3[0].List4[0].item4[0].Ch1[1]"),
        ...yn(body.attyFeeDispute,    "SC-120[0].Page3[0].List5[0].item5[0].Ch2[0]", "SC-120[0].Page3[0].List5[0].item5[0].Ch2[1]"),
        ...yn(body.suingPublicEntity, "SC-120[0].Page3[0].List6[0].item6[0].Ch3[0]", "SC-120[0].Page3[0].List6[0].item6[0].Ch3[1]"),
        ...yn(body.moreThan12,        "SC-120[0].Page3[0].List7[0].item7[0].Ch4[0]", "SC-120[0].Page3[0].List7[0].item7[0].Ch4[1]"),
      },
    });
  },
};

FormRegistry.register(sc120Definition);
