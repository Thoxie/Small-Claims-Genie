/**
 * TX Small Claims Petition — Travis County Precinct 2 (J2-CV)
 *
 * Fills the official Travis County Justice Court Precinct 2 "Petition: Small
 * Claims Case" PDF by populating its AcroForm fields via pdftk FDF fill, then
 * flattening. A pdf-lib pass overlays the signature image for the signed variant.
 *
 * Source PDF: assets/forms/tx-small-claims-petition-jp2.pdf (1 page, 612×792)
 * AcroForm fields verified via: pdftk tx-small-claims-petition-jp2.pdf dump_data_fields
 *
 * Field mapping (verified field names + widget positions):
 *   Cause Number                                        — case number (label "J2-CV-")
 *   Plaintiffs                                          — plaintiff name(s)
 *   Defendants                                          — defendant name(s)
 *   Text2 / Text3                                       — defendant address (street; city/state/zip)
 *   Name of person to be served                         — agent name (business defendant only)
 *   To be served at                                     — defendant service address (full)
 *   Complaint Line 1..7                                 — claim description (wrapped)
 *   damages in the amount of                            — claim amount
 *   DEFENDANT'S PHONE NUMBER                            — defendant phone
 *   Petitioner's Printed Name                           — plaintiff name (typed signature)
 *   Address of Plaintiff or Plaintiffs Attorney if any  — plaintiff street address
 *   City / State / Zip Code                             — plaintiff city / state / zip
 *   Phone and Fax Number of Plaintiff ...               — plaintiff phone
 *   Signature of Plaintiff or Attorney (Signature fld)  — signature image overlay (signed only)
 *
 * Left blank (filer/notary/court completes): consent-to-email checkbox + address,
 * Role of person in the entity radio, defendant DOB / last-3 DL / last-3 SSN,
 * personal-property description + value, additional damages, other service addresses.
 *
 * Legal basis:
 *   Texas Rules of Civil Procedure, Part V — Rules of Practice in Justice Courts
 *   Tex. Gov't Code § 27.031; Claim limit: $20,000 (excl. fees, interest, costs)
 *   Filed in Travis County Justice Court Precinct 2 (Case No. J2-CV-XXXXXX)
 */

import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";
import { pdftk_fill_form } from "../pdftk-fdf";

const PDF_PATH = path.join(FORMS_DIR, "tx-small-claims-petition-jp2.pdf");

/**
 * The official JP2 template leaves the 7 "Complaint Line" fields at DA font size 0
 * (auto-size), so pdftk renders short lines much larger than long ones — producing
 * an inconsistent complaint block. We derive a one-time template variant with those
 * fields pinned to 9pt (matching the wrap measurement) so every line renders at the
 * same size. Cached to a temp file and regenerated if the OS clears it.
 */
let complaintFontTemplatePath: string | null = null;
async function ensureComplaintFontTemplate(): Promise<string> {
  const finalPath = path.join(os.tmpdir(), "scg-tx-jp2-complaint9.pdf");
  if (complaintFontTemplatePath && fs.existsSync(complaintFontTemplatePath)) {
    return complaintFontTemplatePath;
  }
  const doc = await PDFDocument.load(fs.readFileSync(PDF_PATH));
  const form = doc.getForm();
  for (let i = 1; i <= 7; i++) form.getTextField(`Complaint Line ${i}`).setFontSize(9);
  const bytes = await doc.save();
  // Atomic publish: write to a unique temp file, then rename into place. rename
  // is atomic on the same filesystem, so a concurrent pdftk read never sees a
  // partially-written PDF. If two first requests race, each writes its own temp
  // and the last rename wins — readers always observe a complete file.
  const tmp = path.join(
    os.tmpdir(),
    `scg-tx-jp2-complaint9.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
  );
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, finalPath);
  complaintFontTemplatePath = finalPath;
  return finalPath;
}

// Signature field "Signature of Plaintiff or Attorney" widget: y=149 x=313 w=270 h=26.
const SIG_X = 316;
const SIG_Y = 151;
const SIG_W = 180;
const SIG_H = 22;

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fullAddress(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const line2 = [city, state, zip].filter(Boolean).join(", ").replace(/, (\S+)$/, " $1");
  return [street, line2].filter(Boolean).join(", ");
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

export async function buildTXPetitionJP2(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const measureDoc = await PDFDocument.create();
  const measureFont = await measureDoc.embedFont(StandardFonts.Helvetica);

  const defIsBiz = !!d.defendantIsBusinessOrEntity;
  const defState = d.defendantState ?? "TX";
  const pltState = d.plaintiffState ?? "TX";

  const textFields: Record<string, string> = {
    Plaintiffs: d.plaintiffName ?? "",
    Defendants: d.defendantName ?? "",

    // Defendant address (Text2 = street, Text3 = city/state/zip)
    Text2: d.defendantAddress ?? "",
    Text3: [d.defendantCity, defState, d.defendantZip].filter(Boolean).join(", ").replace(/, (\S+)$/, " $1"),

    // Service address (where the citation is served)
    "To be served at": fullAddress(d.defendantAddress, d.defendantCity, defState, d.defendantZip),

    "damages in the amount of": fmtAmount(d.claimAmount),
    "DEFENDANT'S PHONE NUMBER": d.defendantPhone ?? "",

    // Plaintiff signature block
    "Petitioner's Printed Name": d.plaintiffName ?? "",
    "Address of Plaintiff or Plaintiffs Attorney if any": d.plaintiffAddress ?? "",
    City: d.plaintiffCity ?? "",
    State: pltState,
    "Zip Code": d.plaintiffZip ?? "",
    "Phone and Fax Number of Plaintiff or Plaintiff's Attorney": d.plaintiffPhone ?? "",
  };

  // Case number: the form pre-prints the "J2-CV-" prefix beside the field, so strip
  // any leading "J2-CV-" from the stored value to avoid doubling it (e.g. a stored
  // "J2-CV-24-001234" renders as "24-001234" beside the pre-printed "J2-CV-").
  if (d.caseNumber) {
    textFields["Cause Number"] = d.caseNumber.replace(/^\s*J2[-\s]?CV[-\s]?/i, "").trim();
  }

  // Business-entity defendant: name the person served (registered agent, etc.).
  if (defIsBiz && d.defendantAgentName) {
    textFields["Name of person to be served"] = d.defendantAgentName;
  }

  // Complaint description across the 7 lines.
  const complaintLines = [
    "Complaint Line 1", "Complaint Line 2", "Complaint Line 3", "Complaint Line 4",
    "Complaint Line 5", "Complaint Line 6", "Complaint Line 7",
  ];
  Object.assign(
    textFields,
    wrapToFields(d.claimDescription, complaintLines, measureFont, 9, 525),
  );

  const templatePath = await ensureComplaintFontTemplate();
  const filled = await pdftk_fill_form(templatePath, { text: textFields });

  // Reload through pdf-lib (both variants) so the signed PDF is reliably larger
  // than the unsigned one, and overlay the signature image when signed.
  const pdfDoc = await PDFDocument.load(filled);
  const page = pdfDoc.getPages()[0]!;

  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await pdfDoc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await pdfDoc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: SIG_X, y: SIG_Y, width: SIG_W, height: SIG_H });
      }
    } catch {
      /* ignore invalid image data */
    }
  }

  return Buffer.from(await pdfDoc.save({ updateFieldAppearances: false, useObjectStreams: false }));
}

const txPetitionJP2Definition: FormDefinition = {
  state: "TX",
  formId: "TX-PETITION-JP2",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdftk",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXPetitionJP2(d, b, opts);
  },
};

FormRegistry.register(txPetitionJP2Definition);
export { txPetitionJP2Definition };
