/**
 * TX Small Claims Petition — Travis County Precinct 5 (J5-CV)
 *
 * Fills the official Travis County Justice Court Precinct 5 "Plaintiff's Original
 * Petition: Small Claims Case" PDF via pdf-lib coordinate overlay.
 *
 * Source PDF: assets/forms/tx-small-claims-petition-jp5.pdf (1 page, 612×792)
 * No AcroForm fields (flat PDF).
 *
 * This form has a two-section structure (Individual / Business Entity) for
 * both plaintiff and defendant. We fill the INDIVIDUAL case fields; the
 * Business Entity section is left blank for the filer to complete manually
 * if applicable.
 *
 * Coordinate reference (pdftotext -bbox-layout, y from top of 792pt page):
 *   pdf-lib y = 792 − pdftotext_yMax
 *
 * Plaintiff individual section (top, approx pdf-lib y values):
 *   Plaintiff name   : x=54,  y=710  (blank above "PLAINTIFF(S)" header at y=696)
 *   HOME ADDRESS     : x=130, y=665  (label yMax=126.890 → y=665)
 *   CITY             : x=240, y=665  (CITY label col at x=337)
 *   ZIP              : x=426, y=665  (ZIP label col at x=481)
 *   PHONE#           : x=95,  y=650  (label yMax=142.048 → y=650)
 *
 * Defendant individual section (approx, ~175pt below plaintiff section):
 *   Defendant name   : x=54,  y=491  (above "DEFENDANT(S)" header at y=479)
 *   HOME ADDRESS     : x=130, y=464  (label shifted ~175pt below plt HOME ADDRESS)
 *   CITY             : x=240, y=464
 *   ZIP              : x=426, y=464
 *   PHONE#           : x=95,  y=449
 *
 * Claim section:
 *   "indebted ... sum of $" yMax=475.063 → pdf-lib y=317; amount at x=450, y=317
 *   Description lines  : [300, 283, 266, 249, 232, 215]  (17pt spacing below amount)
 *
 * Signature section:
 *   "Plaintiff's Signature" yMax=648.453 → pdf-lib y=144
 *   Sig image at x=36, y=144; printed name at x=36, y=132
 *
 * Legal basis:
 *   Texas Rules of Civil Procedure, Part V — Rules of Practice in Justice Courts
 *   Tex. Gov't Code § 27.031; Claim limit: $20,000 (excl. fees, interest, costs)
 *   Filed in Travis County Justice Court Precinct 5 (Case No. J5-CV-XXXXXX)
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(FORMS_DIR, "tx-small-claims-petition-jp5.pdf");
const BLACK = rgb(0, 0, 0);

export async function buildTXPetitionJP5(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const pdfBytes = fs.readFileSync(PDF_PATH);
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPages()[0]!;

  const t = (
    text: string | null | undefined,
    x: number,
    y: number,
    size = 8,
  ) => {
    if (!text) return;
    page.drawText(String(text), { x, y, size, font, color: BLACK });
  };

  // ── Plaintiff section (individual) ────────────────────────────────────────────
  // Name placed above the "PLAINTIFF(S)" header in the blank space at top
  t(d.plaintiffName ?? "", 54, 710);

  // HOME ADDRESS row
  t(d.plaintiffAddress ?? "", 130, 665);
  t(d.plaintiffCity ?? "", 240, 665);
  t(d.plaintiffZip ?? "", 426, 665);

  // PHONE# row
  t(d.plaintiffPhone ?? "", 95, 650);

  // ── Defendant section (individual) ────────────────────────────────────────────
  // Name placed just above the "DEFENDANT(S)" header
  t(d.defendantName ?? "", 54, 491);

  // HOME ADDRESS row (~175pt below plaintiff's)
  t(d.defendantAddress ?? "", 130, 464);
  t(d.defendantCity ?? "", 240, 464);
  t(d.defendantZip ?? "", 426, 464);

  // PHONE# row
  t(d.defendantPhone ?? "", 95, 449);

  // ── Claim amount ──────────────────────────────────────────────────────────────
  const amt = d.claimAmount
    ? Number(d.claimAmount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
  t(amt, 450, 317);

  // ── Claim description (multi-line below amount row) ───────────────────────────
  const desc = d.claimDescription ?? "";
  const lineYs = [300, 283, 266, 249, 232, 215, 198];
  if (desc) {
    const words = desc.replace(/\r/g, "").split(/\s+/).filter(Boolean);
    let cur = "";
    let li = 0;
    const maxLineW = 500;
    for (const w of words) {
      const candidate = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, 8) > maxLineW && cur) {
        if (li < lineYs.length) { t(cur, 36, lineYs[li]!); li++; }
        cur = w;
      } else {
        cur = candidate;
      }
    }
    if (cur && li < lineYs.length) t(cur, 36, lineYs[li]!);
  }

  // ── Signature ─────────────────────────────────────────────────────────────────
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: 36, y: 144, width: 180, height: 22, opacity: 1 });
      }
    } catch { /* ignore */ }
  }
  t(d.plaintiffName ?? "", 36, 132);

  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });
  t(today, 310, 132);

  return Buffer.from(await doc.save());
}

const txPetitionJP5Definition: FormDefinition = {
  state: "TX",
  formId: "TX-PETITION-JP5",
  renderingTechnique: "pdf-overlay",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXPetitionJP5(d, b, opts);
  },
};

FormRegistry.register(txPetitionJP5Definition);
export { txPetitionJP5Definition };
