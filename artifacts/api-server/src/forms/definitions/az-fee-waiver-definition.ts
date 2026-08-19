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
 *   Person Filing (applicant name), City State Zip Code, Telephone,
 *   COUNTY dropdown (export value 1–15 mapped from case county),
 *   COURT text field (justice court name from AZ county directory)
 *
 * Left blank for user to complete:
 *   All financial eligibility sections
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
import { resolveAzCountyName } from "./az-complaint-definition";
import { ARIZONA_COUNTIES } from "../../data/counties-az";

const PDF_PATH = path.join(FORMS_DIR, "az-aocdfgf1f-fee-waiver.pdf");

/**
 * Maps AZ county names (title-case, as returned by resolveAzCountyName) to the
 * COUNTY dropdown export values defined in the AOCDFGF1F AcroForm PDF.
 * Verified with: pdftk … dump_data_fields | grep -A1 FieldStateOption
 */
const AZ_COUNTY_EXPORT_VALUES: Record<string, string> = {
  "Apache":     "1",
  "Cochise":    "2",
  "Coconino":   "3",
  "Gila":       "4",
  "Graham":     "5",
  "Greenlee":   "6",
  "La Paz":     "7",
  "Maricopa":   "8",
  "Mohave":     "9",
  "Navajo":     "10",
  "Pima":       "11",
  "Pinal":      "12",
  "Santa Cruz": "13",
  "Yavapai":    "14",
  "Yuma":       "15",
};

/**
 * Normalize a court name string so it is safe for FDF PDF string encoding.
 *
 * pdftk writes FDF text values as raw byte sequences using PDF string syntax.
 * The FDF helper (pdftk-fdf.ts) does not encode non-Latin-1 code-points, so
 * characters outside U+00FF — including the em dash (U+2014) used throughout
 * ARIZONA_COUNTIES courthouse names — are written as raw UTF-8 multi-byte
 * sequences that pdftk then mis-interprets, producing mojibaked field values.
 *
 * Replace the em dash with an ASCII " - " (space-hyphen-space) so the string
 * round-trips correctly through FDF without needing UTF-16BE encoding.
 * Any other non-ASCII characters are similarly replaced with "?".
 */
function toAsciiCourtName(name: string): string {
  return name
    .replace(/\u2014/g, " - ")   // em dash → " - "
    .replace(/\u2013/g, " - ")   // en dash → " - " (defensive)
    .replace(/[^\x00-\x7F]/g, "?");  // remaining non-ASCII → "?"
}

/**
 * Resolve the court name for the COURT text field on the fee waiver.
 * Uses the courthouse name from case data or the AZ county directory,
 * falling back to a generic "<County> County Justice Court" string.
 * The result is normalized to ASCII so it encodes correctly in FDF.
 */
function resolveAzFeeWaiverCourtName(d: CaseData): string {
  if (d.courthouseName) return toAsciiCourtName(d.courthouseName);
  const rec =
    ARIZONA_COUNTIES.find((c) => c.id === d.courthouseId) ??
    ARIZONA_COUNTIES.find((c) => c.id === d.countyId);
  if (rec) return toAsciiCourtName(rec.courthouseName);
  const countyName = resolveAzCountyName(d);
  if (countyName) return `${countyName} County Justice Court`;
  return "";
}

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

  // Resolve county → COUNTY dropdown export value and court name
  const countyName = resolveAzCountyName(d);
  const countyExportValue = countyName ? (AZ_COUNTY_EXPORT_VALUES[countyName] ?? "") : "";
  const courtName = resolveAzFeeWaiverCourtName(d);

  // ── pdftk FDF fill ─────────────────────────────────────────────────────────
  // Field names verified against the placed PDF with `pdftk dump_data_fields`.
  // COUNTY is a Choice field; its export values are "1"–"15" (see AZ_COUNTY_EXPORT_VALUES).
  // COURT is a plain Text field pre-filled with the justice court name.
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

      // Pre-fill court & county so users don't have to look them up.
      // COUNTY uses the numeric export value for the AcroForm Choice field.
      // Left blank ("") when the county cannot be determined — user fills manually.
      "COUNTY":                 countyExportValue,
      "COURT":                  courtName,
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
