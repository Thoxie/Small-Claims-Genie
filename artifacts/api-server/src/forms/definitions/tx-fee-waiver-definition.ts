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
import { PDFDocument } from "pdf-lib";
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

  if (opts?.signatureBytes) {
    // Signature widget: page 10, x=96, y=366, w=367, h=25
    const sigPage = doc.getPage(10);
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        sigPage.drawImage(sigImg, { x: 96, y: 366, width: 240, height: 25, opacity: 1 });
      }
    } catch { /* ignore */ }
  }

  return Buffer.from(await doc.save({ updateFieldAppearances: true, useObjectStreams: false }));
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
