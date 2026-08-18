/**
 * AZ Application for Deferral or Waiver of Court Fees — AOCDFGF1F
 *
 * Fills the Arizona Courts "Application for Deferral or Waiver of Court Fees
 * or Costs and Consent to Entry of Judgment" (AOCDFGF1F) AcroForm PDF using
 * pdftk FDF fill, then post-processes with pdf-lib to embed the optional
 * signature image.
 *
 * Template PDF: assets/forms/az-aocdfgf1f-fee-waiver.pdf
 * Source: Pima County Consolidated Justice Court distribution of the statewide
 *   AOCDFGF1F form (https://www.jp.pima.gov/Forms/), which carries the full
 *   AZ county dropdown and identical field schema.
 *
 * Field names verified with:
 *   pdftk artifacts/api-server/assets/forms/az-aocdfgf1f-fee-waiver.pdf dump_data_fields
 *
 * Pre-filled fields (case data):
 *   Case Number, Petitioner (plaintiff), Respondent (defendant),
 *   Person Filing (applicant name), City State Zip Code, Telephone
 *
 * Left blank for user to complete:
 *   All financial eligibility sections, COUNTY dropdown, COURT name
 *
 * Signature placement (calibrated):
 *   Page 5 (index 4), Applicant_Signature widget: x=324, y=294, w=180, h=18
 *   Derived from pdf-lib widget walk — see lib/form-signatures/src/index.ts
 *
 * Legal basis:
 *   A.R.S. § 12-302 — waiver/deferral of court fees for qualified persons
 *   AOCDFGF1F — statewide form issued by the Arizona Supreme Court Admin Office
 */

import * as path from "path";
import { PDFDocument, PDFTextField } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(FORMS_DIR, "az-aocdfgf1f-fee-waiver.pdf");

function cityStateZip(
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  if (state && zip) parts.push(`${state} ${zip}`);
  else if (state) parts.push(state);
  else if (zip) parts.push(zip);
  return parts.join(", ");
}

export async function buildAZFeeWaiver(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const pltAddr = d.plaintiffAddress ?? "";
  const pltCSZ = cityStateZip(d.plaintiffCity, d.plaintiffState ?? "AZ", d.plaintiffZip);

  // ── pdftk FDF fill ─────────────────────────────────────────────────────────
  // Field names verified against the placed PDF with `pdftk dump_data_fields`.
  const filled = await pdftk_fill_form(PDF_PATH, {
    text: {
      // Caption
      "Case Number":            d.caseNumber ?? "",
      "Petitioner":             d.plaintiffName ?? "",
      "Respondent":             d.defendantName ?? "",

      // Applicant / person filing (applicant = plaintiff in small claims)
      "Person Filing":          d.plaintiffName ?? "",
      "Address if not protected": pltAddr,
      "City State Zip Code":    pltCSZ,
      "Telephone":              d.plaintiffPhone ?? "",

      // Print name on signature line (page 5)
      "ApplicantName":          d.plaintiffName ?? "",
    },
  }, { flatten: false });

  // ── pdf-lib post-processing ────────────────────────────────────────────────
  // Both unsigned and signed run through pdf-lib with the same settings so
  // they share the same compression baseline. The signed variant adds the
  // signature image on top, guaranteeing signed > unsigned file size.
  const doc = await PDFDocument.load(filled, { ignoreEncryption: true });

  // Strip Comb + DoNotScroll flags so fields are editable in all viewers.
  const form = doc.getForm();
  for (const field of form.getFields()) {
    if (field instanceof PDFTextField) {
      field.disableCombing();
      field.enableScrolling();
    }
  }

  if (opts?.signatureBytes) {
    // Signature placement calibrated from the Applicant_Signature AcroForm widget
    // on page 5 (index 4): widget rect x=324, y=293.5, w=252, h=18.7.
    // We draw the image at w=180 (sigW) × h=18 (sigH), left-aligned within the field.
    // Matches FORM_SIGNATURE_PLACEMENTS["az-fee-waiver"] in lib/form-signatures/src/index.ts.
    const pages = doc.getPages();
    const sigPage = pages[4] ?? pages[pages.length - 1] ?? pages[0];
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        sigPage.drawImage(sigImg, { x: 324, y: 294, width: 180, height: 18, opacity: 1 });
      }
    } catch { /* ignore invalid signature data */ }
  }

  return Buffer.from(
    await doc.save({ updateFieldAppearances: false, useObjectStreams: false }),
  );
}

const azFeeWaiverDefinition: FormDefinition = {
  state: "AZ",
  formId: "AZ-FEE-WAIVER",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildAZFeeWaiver(d, b, opts);
  },
};

FormRegistry.register(azFeeWaiverDefinition);
export { azFeeWaiverDefinition };
