/**
 * IL Application for Waiver of Court Fees (Civil) — official IL Supreme Court form
 *
 * Fills the official Illinois Supreme Court "Application for Waiver of Court Fees (Civil)"
 * (ATJ 601.9, 735 ILCS 5/5-105) using pdftk FDF fill, then post-processes with pdf-lib
 * to embed the optional signature image on the last page.
 *
 * Template PDF: assets/il-forms/il-fee-waiver-civil.pdf
 * Source: https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/
 *         52beec8c-25fc-4d0f-bc56-82a93b68d395/FW-CIV%20Application.pdf
 *
 * Key AcroForm fields (pdftk dump_data_fields + pdf-lib inspection confirmed):
 *   "1 - County"                       PDFDropdown  (page 0)
 *   "2 - Plaintiff/Petitioner or In RE" PDFTextField (page 0)
 *   "3 - Defendant/Respondent"          PDFTextField (page 0)
 *   "4 - Case Number"                   PDFTextField (page 0)
 *   "6 - Your Name"                     PDFTextField (page 0, section 1B Name)
 *
 *   Signature page (page 3, index 3):
 *   "Last - Signature"    x=96.98, y=550.09, w=196.93, h=14.4
 *   "Last - Print Name"   x=355.39, y=550.48, w=209.34, h=14.4
 *   "Last - Telephone"    x=106.81, y=507.92, w=137.79, h=14.4
 *   "Last - Email"        x=359.91, y=508.05, w=204.02, h=14.4
 *   "Last - Street Address" x=73.82, y=487.21, w=489.56, h=14.4
 *
 * Legal basis: 735 ILCS 5/5-105; Illinois Supreme Court Rule 298; ATJ 601.9 (08/25)
 */

import * as path from "path";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";
const PDF_PATH = path.join(ASSET_DIR, "il-forms", "il-fee-waiver-civil.pdf");

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^il-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function buildILFeeWaiver(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const countyId: string = (d as any).countyId ?? "";
  const county = countyDisplay(countyId);

  const pltAddr = d.plaintiffAddress ?? "";
  const cityStateZip = [d.plaintiffCity, "IL", d.plaintiffZip].filter(Boolean).join(", ");
  const fullAddr = [pltAddr, cityStateZip].filter(Boolean).join(", ");

  const filled = await pdftk_fill_form(PDF_PATH, {
    text: {
      // Page 0: case caption
      "1 - County":                         county,
      "2 - Plaintiff/Petitioner or In RE":   d.plaintiffName ?? "",
      "3 - Defendant/Respondent":            d.defendantName ?? "",
      "4 - Case Number":                     d.caseNumber ?? "",

      // Section 1: Applicant basic information
      "6 - Your Name":                       d.plaintiffName ?? "",

      // Last page: signature block
      "Last - Print Name":                   d.plaintiffName ?? "",
      "Last - Telephone":                    d.plaintiffPhone ?? "",
      "Last - Email":                        d.plaintiffEmail ?? "",
      "Last - Street Address":               fullAddr,
      // Check "completing for myself" by default
      "Last - Completing this form myself checkbox": "Yes",
    },
  }, { flatten: false });

  // Both unsigned and signed run through pdf-lib with the same settings so
  // they share the same compression baseline.  The signed variant then adds
  // the signature image on top, guaranteeing signed > unsigned.
  const doc = await PDFDocument.load(filled, { ignoreEncryption: true });

  if (opts?.signatureBytes) {
    // "Last - Signature" widget: page 3 (index 3), x=96.98, y=550.09, w=196.93, h=14.4
    const sigPage = doc.getPage(3);
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        sigPage.drawImage(sigImg, { x: 97, y: 550, width: 180, height: 18, opacity: 1 });
      }
    } catch { /* ignore */ }
  }

  return Buffer.from(await doc.save({ updateFieldAppearances: true, useObjectStreams: false }));
}

const ilFeeWaiverDefinition: FormDefinition = {
  state: "IL",
  formId: "IL-FEE-WAIVER",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildILFeeWaiver(d, b, opts);
  },
};

FormRegistry.register(ilFeeWaiverDefinition);
export { ilFeeWaiverDefinition };
