/**
 * TX Small Claims Petition — Travis County Precinct 5 (J5-CV)
 *
 * Fills the official Travis County Justice Court Precinct 5 "Plaintiff's Original
 * Petition: Small Claims Case" PDF by populating its AcroForm fields via pdftk
 * FDF fill, then flattening. A pdf-lib pass draws the typed plaintiff name on the
 * signature line (or the signature image for the signed variant), because both
 * signature widgets are Signature-type fields that pdftk cannot fill with text.
 *
 * Source PDF: assets/forms/tx-small-claims-petition-jp5.pdf (1 page, 612×792)
 * AcroForm fields verified via: pdftk tx-small-claims-petition-jp5.pdf dump_data_fields
 *
 * Field mapping (verified field names + widget positions):
 *   Cause Number                         — case number (default value "J5-CV-")
 *   Plaintiff(s)                         — plaintiff name(s)
 *   Plaintiff Street Address/City/Zip    — plaintiff address
 *   Plaintiff Phone Number               — plaintiff phone
 *   Defendant(s)                         — defendant name(s)
 *   Individual defendant:
 *     Defendant Street Address/City/Zip  — defendant address
 *     Defendant Phone Number             — defendant phone
 *   Business-entity defendant:
 *     Business Entity Street Address/City/Zip     — business address
 *     Business Entity Owner or Agent Name         — agent/owner name
 *     Service Address Street/City/Zip             — address to be served
 *     Defendant Business Entity Phone Number      — phone
 *     Name of Defendant's Business (radio)        — "Owner"/"Agent"
 *   for briefly describe the nature of the claim 1..6 — claim description (wrapped)
 *   Plaintiff's Damages                  — claim amount ("indebted ... in the sum of $")
 *   Plaintiffs Signature (Signature fld) — typed plaintiff name / signature image
 *
 * Left blank (filer/notary/court completes): Attorney's Fees, all Fax / Work /
 * Business-Entity phone fields, Sworn-to Date/Month/Year jurat, Notary / Civil
 * Court Clerk lines, and the consent-to-email checkbox + address.
 *
 * Legal basis:
 *   Texas Rules of Civil Procedure, Part V — Rules of Practice in Justice Courts
 *   Tex. Gov't Code § 27.031; Claim limit: $20,000 (excl. fees, interest, costs)
 *   Filed in Travis County Justice Court Precinct 5 (Case No. J5-CV-XXXXXX)
 */

import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";
import { pdftk_fill_form } from "../pdftk-fdf";

const PDF_PATH = path.join(FORMS_DIR, "tx-small-claims-petition-jp5.pdf");

// "Plaintiffs Signature" widget: y=153 x=36 w=252 h=19.
const SIG_X = 40;
const SIG_Y = 156;
const SIG_W = 175;
const SIG_H = 20;

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Wraps `text` across sequential single-line fields, measuring with a pdf-lib
 * font so each line fits `maxWidth` at `size`. Returns a name→line map.
 * Text beyond the available fields is dropped (matches prior overlay behavior).
 */
function wrapToFields(
  text: string | null | undefined,
  fieldNames: string[],
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!text) return out;
  const words = text.replace(/\r/g, "").split(/\s+/).filter(Boolean);
  let cur = "";
  let i = 0;
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(cand, size) > maxWidth && cur) {
      out[fieldNames[i]!] = cur;
      i++;
      if (i >= fieldNames.length) return out;
      cur = w;
    } else {
      cur = cand;
    }
  }
  if (cur && i < fieldNames.length) out[fieldNames[i]!] = cur;
  return out;
}

export async function buildTXPetitionJP5(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const measureDoc = await PDFDocument.create();
  const measureFont = await measureDoc.embedFont(StandardFonts.Helvetica);

  const defIsBiz = !!d.defendantIsBusinessOrEntity;

  const textFields: Record<string, string> = {
    "Plaintiff(s)": d.plaintiffName ?? "",
    "Plaintiff Street Address": d.plaintiffAddress ?? "",
    "Plaintiff Address City": d.plaintiffCity ?? "",
    "Plaintiff Address Zip Code": d.plaintiffZip ?? "",
    "Plaintiff Phone Number": d.plaintiffPhone ?? "",

    "Defendant(s)": d.defendantName ?? "",

    "Plaintiff's Damages": fmtAmount(d.claimAmount),
  };
  const checkboxes: Record<string, boolean | string> = {};

  // Case number: field default is "J5-CV-"; only overwrite when we have one.
  if (d.caseNumber) textFields["Cause Number"] = d.caseNumber;

  if (defIsBiz) {
    // Business-entity defendant: fill the entity subsection + service address.
    textFields["Business Entity Street Address"] = d.defendantAddress ?? "";
    textFields["Business Entity Address City"] = d.defendantCity ?? "";
    textFields["Business Entity Address Zip Code"] = d.defendantZip ?? "";
    textFields["Business Entity Owner or Agent Name"] = d.defendantAgentName ?? "";
    textFields["Service Address Street"] = d.defendantAgentStreet ?? d.defendantAddress ?? "";
    textFields["Service Address City"] = d.defendantAgentCity ?? d.defendantCity ?? "";
    textFields["Service Address Zip Code"] = d.defendantAgentZip ?? d.defendantZip ?? "";
    textFields["Defendant Business Entity Phone Number"] = d.defendantPhone ?? "";
    if (d.defendantAgentName) checkboxes["Name of Defendant's Business"] = "Agent";
  } else {
    // Individual defendant.
    textFields["Defendant Street Address"] = d.defendantAddress ?? "";
    textFields["Defendant Address City"] = d.defendantCity ?? "";
    textFields["Defendant Address Zip Code"] = d.defendantZip ?? "";
    textFields["Defendant Phone Number"] = d.defendantPhone ?? "";
  }

  // Claim description across the 6 "nature of the claim" lines.
  const claimLines = [
    "for briefly describe the nature of the claim 1",
    "for briefly describe the nature of the claim 2",
    "for briefly describe the nature of the claim 3",
    "for briefly describe the nature of the claim 4",
    "for briefly describe the nature of the claim 5",
    "for briefly describe the nature of the claim 6",
  ];
  Object.assign(
    textFields,
    wrapToFields(d.claimDescription, claimLines, measureFont, 9, 525),
  );

  const filled = await pdftk_fill_form(PDF_PATH, { text: textFields, checkboxes });

  // Reload through pdf-lib (both variants) so the signed PDF is reliably larger
  // than the unsigned one. Draw the typed name on the signature line, or the
  // signature image when signed (both widgets are Signature-type — not fillable).
  const pdfDoc = await PDFDocument.load(filled);
  const page = pdfDoc.getPages()[0]!;

  let drewImage = false;
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await pdfDoc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await pdfDoc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: SIG_X, y: SIG_Y, width: SIG_W, height: SIG_H });
        drewImage = true;
      }
    } catch {
      /* ignore invalid image data */
    }
  }
  if (!drewImage && d.plaintiffName) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(String(d.plaintiffName), {
      x: SIG_X,
      y: SIG_Y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return Buffer.from(await pdfDoc.save({ updateFieldAppearances: false, useObjectStreams: false }));
}

const txPetitionJP5Definition: FormDefinition = {
  state: "TX",
  formId: "TX-PETITION-JP5",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdftk",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXPetitionJP5(d, b, opts);
  },
};

FormRegistry.register(txPetitionJP5Definition);
export { txPetitionJP5Definition };
