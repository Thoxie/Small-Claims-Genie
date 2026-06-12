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
 *
 * Field name strings live in `forms/field-names/sc120-fields.ts` as typed
 * constants — use those instead of raw strings so TypeScript catches typos
 * at compile time and editors provide autocomplete.
 */

import * as path from "path";
import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { buildCourtInfo, today } from "../enrichment";
import { ASSET_DIR } from "../../routes/forms-common";
import { SC120_FIELDS } from "../field-names/sc120-fields";

const PDF_PATH = path.join(ASSET_DIR, "forms", "sc120_acroform.pdf");

const sc120Definition: FormDefinition = {
  state: "CA",
  formId: "SC-120",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d, body) {
    const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");

    // Yes/No checkbox helpers — each question has [0]=Yes [1]=No.
    // XFA export values: Yes field uses "1", No field uses "2" (not the AcroForm default "Yes").
    // Pass false for the unchecked state so the FDF generator emits /Off.
    function yn(yes: any, yesField: string, noField: string): Record<string, string | boolean> {
      const v = yes === true || yes === "true";
      return { [yesField]: v ? "1" : false, [noField]: !v ? "2" : false };
    }

    return pdftk_fill_form(PDF_PATH, {
      text: {
        // Page 1 — court caption (clerk fills the order section)
        [SC120_FIELDS.text.page1CourtInfo]:  buildCourtInfo(d),
        [SC120_FIELDS.text.page1CaseNumber]: String(d.caseNumber || ""),
        [SC120_FIELDS.text.page1CaseName]:   caseName,

        // Page 2 — header
        [SC120_FIELDS.text.page2DefendantName]: String(d.defendantName || ""),
        [SC120_FIELDS.text.page2CaseNumber]:    String(d.caseNumber || ""),

        // Page 2 — plaintiff (the original plaintiff, listed on the counterclaim)
        [SC120_FIELDS.text.plaintiffName]:        String(d.plaintiffName || ""),
        [SC120_FIELDS.text.plaintiffPhone]:        String(d.plaintiffPhone || ""),
        [SC120_FIELDS.text.plaintiffAddress]:      String(d.plaintiffAddress || ""),
        [SC120_FIELDS.text.plaintiffCity]:         String(d.plaintiffCity || ""),
        [SC120_FIELDS.text.plaintiffState]:        String(d.plaintiffState || "CA"),
        [SC120_FIELDS.text.plaintiffZip]:          String(d.plaintiffZip || ""),
        [SC120_FIELDS.text.plaintiffMailAddress]:  String(d.plaintiffMailingAddress || ""),
        [SC120_FIELDS.text.plaintiffMailCity]:     String(d.plaintiffMailingCity || ""),
        [SC120_FIELDS.text.plaintiffMailState]:    String(d.plaintiffMailingState || ""),
        [SC120_FIELDS.text.plaintiffMailZip]:      String(d.plaintiffMailingZip || ""),

        // Page 2 — second plaintiff (if present)
        [SC120_FIELDS.text.plaintiff2Name]:        String(d.secondPlaintiffName || ""),
        [SC120_FIELDS.text.plaintiff2Phone]:       String(d.secondPlaintiffPhone || ""),
        [SC120_FIELDS.text.plaintiff2Address]:     String(d.secondPlaintiffAddress || ""),
        [SC120_FIELDS.text.plaintiff2City]:        String(d.secondPlaintiffCity || ""),
        [SC120_FIELDS.text.plaintiff2State]:       String(d.secondPlaintiffState || ""),
        [SC120_FIELDS.text.plaintiff2Zip]:         String(d.secondPlaintiffZip || ""),
        [SC120_FIELDS.text.plaintiff2MailAddress]: String(d.secondPlaintiffMailingAddress || ""),
        [SC120_FIELDS.text.plaintiff2MailCity]:    String(d.secondPlaintiffMailingCity || ""),
        [SC120_FIELDS.text.plaintiff2MailState]:   String(d.secondPlaintiffMailingState || ""),
        [SC120_FIELDS.text.plaintiff2MailZip]:     String(d.secondPlaintiffMailingZip || ""),

        // Page 2 — defendant (the person filing the counterclaim)
        [SC120_FIELDS.text.defendantName]:        String(d.defendantName || ""),
        [SC120_FIELDS.text.defendantPhone]:       String(d.defendantPhone || ""),
        [SC120_FIELDS.text.defendantAddress]:     String(d.defendantAddress || ""),
        [SC120_FIELDS.text.defendantCity]:        String(d.defendantCity || ""),
        [SC120_FIELDS.text.defendantState]:       String(d.defendantState || "CA"),
        [SC120_FIELDS.text.defendantZip]:         String(d.defendantZip || ""),
        [SC120_FIELDS.text.defendantMailAddress]: String(d.defendantMailingAddress || ""),
        [SC120_FIELDS.text.defendantMailCity]:    String(d.defendantMailingCity || ""),
        [SC120_FIELDS.text.defendantMailState]:   String(d.defendantMailingState || ""),
        [SC120_FIELDS.text.defendantMailZip]:     String(d.defendantMailingZip || ""),

        // Page 2 — second defendant (body-supplied; no schema field for a second defendant)
        [SC120_FIELDS.text.def2Name]:        String(body.def2Name || ""),
        [SC120_FIELDS.text.def2Phone]:       String(body.def2Phone || ""),
        [SC120_FIELDS.text.def2Address]:     String(body.def2Address || ""),
        [SC120_FIELDS.text.def2City]:        String(body.def2City || ""),
        [SC120_FIELDS.text.def2State]:       String(body.def2State || ""),
        [SC120_FIELDS.text.def2Zip]:         String(body.def2Zip || ""),
        [SC120_FIELDS.text.def2MailAddress]: String(body.def2MailingAddress || ""),
        [SC120_FIELDS.text.def2MailCity]:    String(body.def2MailingCity || ""),
        [SC120_FIELDS.text.def2MailState]:   String(body.def2MailingState || ""),
        [SC120_FIELDS.text.def2MailZip]:     String(body.def2MailingZip || ""),

        // Page 3 — public entity claim filing date (shown when suingPublicEntity is yes)
        [SC120_FIELDS.text.publicEntityClaimDate]: String(body.publicEntityClaimDate || ""),

        // Page 2 — counterclaim
        [SC120_FIELDS.text.counterClaimAmount]:        body.counterClaimAmount ? Number(body.counterClaimAmount).toFixed(2) : "",
        [SC120_FIELDS.text.counterClaimReason]:        String(body.counterClaimReason || ""),
        [SC120_FIELDS.text.counterClaimDate]:          String(body.counterClaimDate || ""),
        [SC120_FIELDS.text.counterClaimHowCalculated]: String(body.counterClaimHowCalculated || ""),

        // Page 3 — header
        [SC120_FIELDS.text.page3DefendantName]: String(d.defendantName || ""),
        [SC120_FIELDS.text.page3CaseNumber]:    String(d.caseNumber || ""),

        // Page 3 — signature
        [SC120_FIELDS.text.signDate]:   String(body.signDate || today()),
        [SC120_FIELDS.text.signerName]: String(d.defendantName || ""),
      },
      checkboxes: {
        // Page 2 — more than 2 plaintiffs indicator (StateOption: "CheckBox6")
        [SC120_FIELDS.checkboxes.moreThan2Plaintiffs]:
          body.moreThan2Plaintiffs ? "CheckBox6" : false,

        // Page 2 — more than 2 defendants indicator (StateOption: "1")
        [SC120_FIELDS.checkboxes.moreThan2Defendants]:
          body.moreThan2Defendants ? "1" : false,

        // Page 3 — yes/no questions
        ...yn(body.priorDemand,       SC120_FIELDS.checkboxes.priorDemandYes,       SC120_FIELDS.checkboxes.priorDemandNo),
        ...yn(body.attyFeeDispute,    SC120_FIELDS.checkboxes.attyFeeDisputeYes,    SC120_FIELDS.checkboxes.attyFeeDisputeNo),
        ...yn(body.suingPublicEntity, SC120_FIELDS.checkboxes.suingPublicEntityYes, SC120_FIELDS.checkboxes.suingPublicEntityNo),
        ...yn(body.moreThan12,        SC120_FIELDS.checkboxes.moreThan12Yes,        SC120_FIELDS.checkboxes.moreThan12No),

        // Page 3 — arbitration completed (sub-checkbox under attyFeeDispute yes; StateOption: "1")
        [SC120_FIELDS.checkboxes.arbitrationCompleted]:
          body.arbitrationCompleted ? "1" : false,

        // Page 3 — public entity claim was filed on [date] (sub-checkbox under suingPublicEntity yes; StateOption: "1")
        [SC120_FIELDS.checkboxes.publicEntityClaimFiled]:
          (body.suingPublicEntity === true || body.suingPublicEntity === "true") && body.publicEntityClaimDate ? "1" : false,
      },
    });
  },
};

FormRegistry.register(sc120Definition);
