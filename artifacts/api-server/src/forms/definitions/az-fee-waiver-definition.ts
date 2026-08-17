/**
 * AZ Application for Deferral or Waiver of Court Fees — AOCDFGF1F
 *
 * Fills the official Arizona Courts "Application for Deferral or Waiver of
 * Court Fees" (AOCDFGF1F) AcroForm PDF using pdftk FDF fill, then
 * post-processes with pdf-lib to embed the optional signature image.
 *
 * Template PDF: assets/forms/az-aocdfgf1f-fee-waiver.pdf
 * Source: https://www.azcourts.gov/selfservicecenter/Forms
 *
 * ⚠️  FIELD NAMES NEED VERIFICATION
 * Once the PDF is placed at the path above, run:
 *   pdftk artifacts/api-server/assets/forms/az-aocdfgf1f-fee-waiver.pdf dump_data_fields
 * and update the field name strings in the pdftk_fill_form call below to match
 * the actual AcroForm field names. The current names are best-guess placeholders.
 *
 * ⚠️  SIGNATURE COORDINATES NEED CALIBRATION
 * After the PDF is placed and filled, calibrate the signature overlay coords:
 *   1. Generate a signed PDF (hit az/fee-waiver/signed with a black PNG sig)
 *   2. pdftoppm -png -r 72 signed.pdf out
 *   3. Check the pixel bounding box of the signature line
 *   4. Update FORM_SIGNATURE_PLACEMENTS["az-fee-waiver"].draw in lib/form-signatures/src/index.ts
 *      AND the draw coords in the opts.signatureBytes block below
 *   5. Update the sigcheck config region in scripts/src/signed-form-configs.ts
 *
 * Pre-filled fields (case data):
 *   Applicant / plaintiff name, defendant name, case number, county,
 *   plaintiff address, plaintiff phone
 *
 * Left blank for user to complete:
 *   All financial eligibility sections
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
import { resolveAzCountyName } from "./az-complaint-definition";

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
  // Guard: return a clear error until the PDF asset is placed.
  // Once az-aocdfgf1f-fee-waiver.pdf is committed, remove this block and
  // verify field names with `pdftk dump_data_fields` (see header comment).
  const { existsSync } = await import("fs");
  if (!existsSync(PDF_PATH)) {
    throw new Error(
      "AZ fee waiver PDF asset not yet available. " +
      "Place az-aocdfgf1f-fee-waiver.pdf in artifacts/api-server/assets/forms/ " +
      "and calibrate field names per az-fee-waiver-definition.ts.",
    );
  }

  const countyName = resolveAzCountyName(d) ?? "";
  const pltAddr = d.plaintiffAddress ?? "";
  const pltCSZ = cityStateZip(d.plaintiffCity, d.plaintiffState ?? "AZ", d.plaintiffZip);
  const fullAddr = [pltAddr, pltCSZ].filter(Boolean).join(", ");

  // ── pdftk FDF fill ─────────────────────────────────────────────────────────
  // Field names below are placeholders — verify with `pdftk dump_data_fields`
  // once the PDF asset is in place and update to the actual AcroForm field names.
  const filled = await pdftk_fill_form(PDF_PATH, {
    text: {
      // Caption / header fields
      "County":         countyName,
      "Case Number":    d.caseNumber ?? "",
      "Plaintiff":      d.plaintiffName ?? "",
      "Defendant":      d.defendantName ?? "",

      // Applicant information (applicant = plaintiff)
      "Applicant Name": d.plaintiffName ?? "",
      "Address":        fullAddr,
      "Phone":          d.plaintiffPhone ?? "",

      // Print name on signature line
      "Print Name":     d.plaintiffName ?? "",
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
    // ⚠️  Signature page/coordinates need calibration against the actual PDF.
    // Current values are placeholders matching the IL fee waiver pattern.
    // See header comment above for calibration steps.
    const pages = doc.getPages();
    const sigPage = pages[pages.length - 1] ?? pages[0];
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        // PLACEHOLDER coords — update after calibrating against the actual PDF
        sigPage.drawImage(sigImg, { x: 97, y: 110, width: 180, height: 18, opacity: 1 });
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
