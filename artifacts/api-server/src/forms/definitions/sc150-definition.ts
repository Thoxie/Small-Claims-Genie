/**
 * SC-150 Request to Postpone Trial — AcroForm definition.
 *
 * Migrated from PNG-overlay to the official California Judicial Council
 * AcroForm PDF.  Fields are filled via pdftk FDF fill.
 *
 * Source PDF: assets/forms/sc150_acroform.pdf
 * Field names confirmed via: pdftk sc150_acroform.pdf dump_data_fields
 *
 * Field name strings live in `forms/field-names/sc150-fields.ts` as typed
 * constants — use those instead of raw strings so TypeScript catches typos
 * at compile time and editors provide autocomplete.
 */

import * as path from "path";
import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { buildCourtInfo, today } from "../enrichment";
import { ASSET_DIR } from "../../routes/forms-common";
import { SC150_FIELDS } from "../field-names/sc150-fields";

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
        [SC150_FIELDS.text.courtInfo]:  buildCourtInfo(d),
        [SC150_FIELDS.text.caseNumber]: String(d.caseNumber || ""),
        [SC150_FIELDS.text.caseName]:   caseName,

        // Item 1 — requesting party
        [SC150_FIELDS.text.requestingPartyName]:    requestingPartyName,
        [SC150_FIELDS.text.requestingPartyAddress]: String(body.requestingPartyAddress || ""),
        [SC150_FIELDS.text.requestingPartyPhone]:   String(body.requestingPartyPhone || ""),

        // Items 2–5 — postponement details
        [SC150_FIELDS.text.currentTrialDate]:    String(body.currentTrialDate || ""),
        [SC150_FIELDS.text.postponeUntilDate]:   String(body.postponeUntilDate || ""),
        [SC150_FIELDS.text.postponeReason]:      String(body.postponeReason || ""),
        [SC150_FIELDS.text.withinTenDaysReason]: String(body.withinTenDaysReason || ""),

        // Signature
        [SC150_FIELDS.text.signDate]:  String(body.signDate || today()),
        [SC150_FIELDS.text.printName]: requestingPartyName,
      },
      // XFA export values: CheckBox01[0] (plaintiff) = "1", CheckBox01[1] (defendant) = "2".
      // These are custom XFA export values, not the AcroForm default "Yes".
      checkboxes: {
        [SC150_FIELDS.checkboxes.isPlaintiff]: isPlaintiff ? "1" : false,
        [SC150_FIELDS.checkboxes.isDefendant]: isDefendant ? "2" : false,
      },
    });
  },
};

FormRegistry.register(sc150Definition);
