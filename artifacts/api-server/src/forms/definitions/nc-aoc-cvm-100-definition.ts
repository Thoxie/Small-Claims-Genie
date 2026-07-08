/**
 * NC AOC-CVM-100 — Magistrate's Summons (Small Claims)
 *
 * Uses the official NC Administrative Office of the Courts form PDF
 * provided by the user (nccourts.gov blocks automated downloads via
 * Cloudflare WAF / HTTP 403).
 *
 * Technique: acroform-pdftk (pdftk FDF fill + flatten).
 * AcroForm fields verified via: pdftk nc-aoc-cvm-100.pdf dump_data_fields
 *
 * Legal basis:
 *   N.C. Gen. Stat. § 7A-216 — magistrate's summons issued by clerk
 *   N.C. Gen. Stat. § 7A-217, -232, Rule 4 — service by sheriff
 *   Sheriff service fee: $30.00 per defendant (G.S. 7A-311)
 *
 * Notes:
 *   - The clerk signs this form and forwards it to the sheriff.
 *   - Plaintiff brings a pre-filled copy to the clerk when filing.
 *   - DateTrial, TimeTrial, DateIssued, and clerk-signature fields
 *     are intentionally left blank — the clerk completes them.
 */

import * as path from "path";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { pdftk_fill_form } from "../pdftk-fdf";
import { FORMS_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(FORMS_DIR, "nc-aoc-cvm-100.pdf");

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^nc-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function buildNCAocCvm100(
  d: CaseData,
  _body: FormBody,
  _opts?: GenerateOptions,
): Promise<Buffer> {
  const countyName = countyDisplay((d as any).countyId);

  const pName = (d as any).plaintiffDbaName
    ? `${d.plaintiffName ?? ""} d/b/a ${(d as any).plaintiffDbaName}`
    : (d.plaintiffName ?? "");

  const pCityStateZip = [
    d.plaintiffCity,
    (d as any).plaintiffState ?? "NC",
    d.plaintiffZip,
  ]
    .filter(Boolean)
    .join(", ");

  const def1CityStateZip = [
    d.defendantCity,
    d.defendantState ?? "NC",
    d.defendantZip,
  ]
    .filter(Boolean)
    .join(", ");

  // PlaceTrial: courthouse name + address if available
  const placeTrial = [
    d.courthouseName,
    d.courthouseAddress,
    d.courthouseCity ? `${d.courthouseCity}, NC` : null,
    d.courthouseZip,
  ]
    .filter(Boolean)
    .join(", ");

  const textFields: Record<string, string> = {
    County:          countyName,
    FileNo:          (d as any).caseNumber ?? "",

    // Plaintiff(s) block (multiline)
    Pltf_1:          pName,

    // Defendant(s) block (multiline caption)
    Def_1:           d.defendantName ?? "",

    // Defendant 1 address block
    Def1Nam:         d.defendantName ?? "",
    Def1StreetAddr:  d.defendantAddress ?? "",
    Def1MailAddr:    d.defendantAddress ?? "",
    Def1City:        def1CityStateZip,
    Def1State:       d.defendantState ?? "NC",
    Def1Zip:         d.defendantZip ?? "",
    Def1Telephone:   d.defendantPhone ?? "",

    // Plaintiff / attorney address block (plaintiff is pro se)
    NamPltfAtty:     pName,
    PltfAttyStAddr:  d.plaintiffAddress ?? "",
    PltfAttyMailAddr: d.plaintiffAddress ?? "",
    PltfAttyCity:    pCityStateZip,
    PltfAttyState:   (d as any).plaintiffState ?? "NC",
    PltfAttyZip:     d.plaintiffZip ?? "",

    // Courthouse location for trial (clerk may override)
    PlaceTrial:      placeTrial,
  };

  const filled = await pdftk_fill_form(PDF_PATH, { text: textFields });

  // Run through pdf-lib to normalise the output (same pattern as CVM-200).
  const pdfDoc = await PDFDocument.load(filled);
  return Buffer.from(
    await pdfDoc.save({ updateFieldAppearances: false, useObjectStreams: false }),
  );
}

const ncAocCvm100Definition: FormDefinition = {
  state: "NC",
  formId: "NC-AOC-CVM-100",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdftk",
  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildNCAocCvm100(d, body, opts);
  },
};

FormRegistry.register(ncAocCvm100Definition);
export { ncAocCvm100Definition };
