/**
 * TX Fee Waiver — Official Rule 145 "Statement of Inability to Afford Payment of Court Costs"
 *
 * Fills the official Texas Supreme Court bilingual Rule 145 form using pdftk FDF fill,
 * then post-processes with pdf-lib to embed date and optional signature image.
 *
 * Template PDF: assets/tx-forms/tx-rule145-statement.pdf
 * Source: https://www.txcourts.gov/media/1456942/statement-of-inability-to-afford-payment-of-court-costs-or-an-appeal-bond-bilingual.pdf
 * Approved by TX Supreme Court in Misc. Docket No. 22-9090
 *
 * Key AcroForm fields (pdftk dump_data_fields confirmed):
 *   Page 0: "Cause Number / Número de Caso"     x=329,y=498  w=187 h=21
 *            "County / Condado"                  x=77, y=154  w=180 h=25
 *   Page 1: "My full legal name is / ..."        x=113,y=654  w=419 h=19
 *            "Mailing  Dirección Postal"          x=270,y=449  w=247 h=19
 *            "My phone number  Mi número..."      x=335,y=405  w=187 h=19
 *            "My email I check often  Mi correo…" x=113,y=336  w=414 h=19
 *   Page 10: "Signature"  (PDF sig field)        x=96, y=366  w=367 h=25
 *             "Today"     (date text)             x=98, y=302  w=150 h=22
 *             "County state"                      x=96, y=236  w=367 h=25
 *
 * Legal basis: Tex. R. Civ. P. 145 (amended Sept 1, 2021, SB 2336)
 */

import * as path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "tx-forms", "tx-rule145-statement.pdf");

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^tx-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function buildTXFeeWaiver(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const county = countyDisplay((d as any).countyId ?? "");
  const pltAddr = [d.plaintiffAddress, d.plaintiffCity, d.plaintiffState ?? "TX", d.plaintiffZip]
    .filter(Boolean)
    .join(", ");

  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const filled = await pdftk_fill_form(PDF_PATH, {
    text: {
      // Page 0: case caption
      "Cause Number / Número de Caso": d.caseNumber ?? "",
      "County / Condado":              county,

      // Page 1: affiant information
      "My full legal name is / Mi nombre legal completo es": d.plaintiffName ?? "",
      "My address is / Mi dirección es": pltAddr,
      "Mailing  Dirección Postal":        pltAddr,
      "My phone number  Mi número telefónico": d.plaintiffPhone ?? "",
      "My email I check often  Mi correo electrónico que reviso con frecuencia":
        d.plaintiffEmail ?? "",

      // Page 10: unsworn declaration block
      "My name is  Mi nombre es":       d.plaintiffName ?? "",
      "My address is  Mi domicilio es": pltAddr,
      "County state":                   county ? `${county} County, Texas` : "____________ County, Texas",
      "Today":                          today,
      "Your printed name":              d.plaintiffName ?? "",
    },
  }, { flatten: false });

  // Both unsigned and signed run through pdf-lib with the same settings so
  // they share the same compression baseline.  The signed variant then adds
  // the signature image on top, guaranteeing signed > unsigned.
  const doc = await PDFDocument.load(filled, { ignoreEncryption: true });

  // ── Page 0: plaintiff v. defendant caption overlay ─────────────────────────
  // The caption blanks are graphical (not AcroForm fields). Overlay text with
  // pdf-lib. "v." is at pdf-lib y≈367 (top). Plaintiff sits ~25pt above;
  // defendant ~32pt below.
  {
    const captionPage = doc.getPage(0);
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const plaintiffLine = [
      d.plaintiffName,
      d.plaintiffIsBusiness && d.plaintiffDbaName ? `d/b/a ${d.plaintiffDbaName}` : null,
    ].filter(Boolean).join(" ");
    if (plaintiffLine) {
      // Plaintiff writing area: template instruction text ends at pdftotext yMax=364.140;
      // first underline top is at pdftotext yMin=399.168. That is a 35pt blank space.
      // y=413 (pdf-lib) places the baseline near the center-top of that space (≈18pt above
      // the underline, ≈8pt below the instruction text) — visually "on top of the line."
      captionPage.drawText(plaintiffLine, { x: 84, y: 413, size: 9, font: helvetica });
    }
    if (d.defendantName) {
      // Defendant space sits below the second underline (pdftotext yMax=468 → pdf-lib y=324).
      // Draw at y=320 so the name appears just below the second underline.
      captionPage.drawText(d.defendantName, { x: 84, y: 320, size: 9, font: helvetica });
    }

    // ── Court type checkbox ─────────────────────────────────────────────────────
    // Court type boxes are graphical (not AcroForm) — no checkbox fields in pdftk dump.
    // TX small claims are always filed in Justice Court (JP Courts).
    // Justice Court checkbox square: pdftotext xMin=395.28, yMin=648.972, xMax=405.972,
    // yMax=662.292 → pdf-lib x=395-406, y_bottom=129.708, y_top=143.028 (box 10.7×13.3pt).
    // Draw "X" centered in box: x=398, y=133 at 8pt gives caps centered in the square.
    captionPage.drawText("X", { x: 398, y: 133, size: 8, font: helvetica });
  }

  if (opts?.signatureBytes) {
    const sigImg =
      (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
      (await doc.embedJpg(opts.signatureBytes).catch(() => null));
    if (sigImg) {
      // Declaration section — page 11 (index 10)
      doc.getPage(10).drawImage(sigImg, { x: 96, y: 366, width: 240, height: 25, opacity: 1 });
      // Affidavit section — page 12 (index 11)
      // "Your signature" label: pdftotext yMin=303.840 → pdf-lib y_top=488
      doc.getPage(11).drawImage(sigImg, { x: 96, y: 488, width: 240, height: 25, opacity: 1 });
    }
  }

  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

const txFeeWaiverDefinition: FormDefinition = {
  state: "TX",
  formId: "TX-FEE-WAIVER",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXFeeWaiver(d, b, opts);
  },
};

FormRegistry.register(txFeeWaiverDefinition);
export { txFeeWaiverDefinition };
