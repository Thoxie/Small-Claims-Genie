/**
 * SC-150 Request to Postpone Trial — AcroForm definition.
 *
 * Migrated from PNG-overlay to the official California Judicial Council
 * AcroForm PDF.  Fields are filled via pdftk FDF fill.
 *
 * Source PDF: assets/forms/sc150_acroform.pdf
 * Field names confirmed via: pdftk sc150_acroform.pdf dump_data_fields
 */

import * as path from "path";
import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { buildCourtInfo, today } from "../enrichment";
import { ASSET_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(ASSET_DIR, "forms", "sc150_acroform.pdf");

const sc150Definition: FormDefinition = {
  state: "CA",
  formId: "SC-150",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d, body) {
    const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
    const requestingPartyName = body.requestingPartyName || d.plaintiffName || "";
    const isPlaintiff  = body.requestingPartyRole !== "defendant";
    const isDefendant  = body.requestingPartyRole === "defendant";

    return pdftk_fill_form(PDF_PATH, {
      text: {
        // Caption
        "SC-150[0].Page1[0].Caption_sf[0].supcourt[0].CourtInfo[0]":          buildCourtInfo(d),
        "SC-150[0].Page1[0].Caption_sf[0].casenumbername[0].CaseNumber[0]":   String(d.caseNumber || ""),
        "SC-150[0].Page1[0].Caption_sf[0].casenumbername[0].CaseName[0]":     caseName,

        // Item 1 — requesting party
        "SC-150[0].Page1[0].List1[0].item1[0].FillText01[0]": requestingPartyName,
        "SC-150[0].Page1[0].List1[0].item1[0].FillText03[0]": String(body.requestingPartyAddress || ""),
        "SC-150[0].Page1[0].List1[0].item1[0].FillText04[0]": String(body.requestingPartyPhone || ""),

        // Items 2–5 — postponement details
        "SC-150[0].Page1[0].List2[0].item2[0].FillText05[0]": String(body.currentTrialDate || ""),
        "SC-150[0].Page1[0].List3[0].item3[0].FillText06[0]": String(body.postponeUntilDate || ""),
        "SC-150[0].Page1[0].List4[0].item4[0].FillText08[0]": String(body.postponeReason || ""),
        "SC-150[0].Page1[0].List5[0].item5[0].FillText15[0]": String(body.withinTenDaysReason || ""),

        // Signature
        "SC-150[0].Page1[0].sign[0].Date1[0]":     String(body.signDate || today()),
        "SC-150[0].Page1[0].sign[0].printname[0]": requestingPartyName,
      },
      // XFA export values: CheckBox01[0] (plaintiff) = "1", CheckBox01[1] (defendant) = "2".
      // These are custom XFA export values, not the AcroForm default "Yes".
      checkboxes: {
        "SC-150[0].Page1[0].List1[0].item1[0].CheckBox01[0]": isPlaintiff ? "1" : false,
        "SC-150[0].Page1[0].List1[0].item1[0].CheckBox01[1]": isDefendant ? "2" : false,
      },
    });
  },
};

FormRegistry.register(sc150Definition);
