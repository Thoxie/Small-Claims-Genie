/**
 * TX Small Claims Petition — Travis County Precinct 2 (J2-CV)
 *
 * Fills the official Travis County Justice Court Precinct 2 "Petition: Small
 * Claims Case" PDF via pdf-lib coordinate overlay.
 *
 * Source PDF: assets/forms/tx-small-claims-petition-jp2.pdf (1 page, 612×792)
 * No AcroForm fields (flat PDF).
 *
 * Coordinate reference (pdftotext -bbox-layout, y from top of 792pt page):
 *   pdf-lib y = 792 − pdftotext_yMax
 *
 * Key label positions:
 *   "Plaintiff(s):"    yMax=107.476  → pdf-lib y=684; name at x=110, y=684
 *   "Defendant(s):"    yMax=147.801  → pdf-lib y=644; name at x=125, y=644
 *   "Address:"         yMax=167.964  → pdf-lib y=624; def street at x=95, y=624
 *   "COMPLAINT:"       yMax=287.794  → pdf-lib y=504; description below
 *   "RELIEF: ... $"    xMax=281.987, yMax=448.303  → amount at x=290, y=344
 *
 *   Signature area (right col):
 *   "Signature of Plt" yMax=654.338  → pdf-lib y=138; sig image at x=313, y=150
 *   "Petitioner Printed Name" yMax=653.627 → pdf-lib y=138; name at x=48, y=150
 *   "Address of Plt"           → data at x=313, y=118
 *   City/State/Zip             → data at x=313, y=100
 *   "Phone & Fax"   yMax=757.964 → pdf-lib y=34 ; phone at x=313, y=56
 *
 * Legal basis:
 *   Texas Rules of Civil Procedure, Part V — Rules of Practice in Justice Courts
 *   Tex. Gov't Code § 27.031; Claim limit: $20,000 (excl. fees, interest, costs)
 *   Filed in Travis County Justice Court Precinct 2 (Case No. J2-CV-XXXXXX)
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(FORMS_DIR, "tx-small-claims-petition-jp2.pdf");
const BLACK = rgb(0, 0, 0);

export async function buildTXPetitionJP2(
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
    size = 8.5,
  ) => {
    if (!text) return;
    page.drawText(String(text), { x, y, size, font, color: BLACK });
  };

  // ── Plaintiff name ────────────────────────────────────────────────────────────
  t(d.plaintiffName ?? "", 110, 684);

  // ── Defendant name ────────────────────────────────────────────────────────────
  t(d.defendantName ?? "", 125, 644);

  // ── Defendant address ─────────────────────────────────────────────────────────
  t(d.defendantAddress ?? "", 95, 624);
  const defCSZ = [d.defendantCity, d.defendantState ?? "TX", d.defendantZip]
    .filter(Boolean).join(", ");
  t(defCSZ, 95, 606);

  // ── Claim description (lines below "COMPLAINT:", ~17pt spacing) ───────────────
  const desc = d.claimDescription ?? "";
  const lineYs = [490, 473, 456, 439, 422, 405, 388, 371, 354];
  if (desc) {
    const words = desc.replace(/\r/g, "").split(/\s+/).filter(Boolean);
    let cur = "";
    let li = 0;
    const maxLineW = 540;
    for (const w of words) {
      const candidate = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, 8.5) > maxLineW && cur) {
        if (li < lineYs.length) { t(cur, 48, lineYs[li]!); li++; }
        cur = w;
      } else {
        cur = candidate;
      }
    }
    if (cur && li < lineYs.length) t(cur, 48, lineYs[li]!);
  }

  // ── Claim amount ──────────────────────────────────────────────────────────────
  const amt = d.claimAmount
    ? Number(d.claimAmount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
  t(amt, 290, 344);

  // ── Signature area ────────────────────────────────────────────────────────────
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        // Right column: "Signature of Plaintiff or Attorney"
        page.drawImage(sigImg, { x: 313, y: 150, width: 175, height: 22, opacity: 1 });
      }
    } catch { /* ignore */ }
  }

  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });

  // Left: Petitioner's Printed Name
  t(d.plaintiffName ?? "", 48, 150);

  // Right column: Address of Plaintiff
  t(d.plaintiffAddress ?? "", 313, 118);
  const pltCSZ = [d.plaintiffCity, d.plaintiffState ?? "TX", d.plaintiffZip]
    .filter(Boolean).join(", ");
  t(pltCSZ, 313, 100);
  t(d.plaintiffPhone ?? "", 313, 56);
  t(today, 313, 34);

  return Buffer.from(await doc.save());
}

const txPetitionJP2Definition: FormDefinition = {
  state: "TX",
  formId: "TX-PETITION-JP2",
  renderingTechnique: "pdf-overlay",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXPetitionJP2(d, b, opts);
  },
};

FormRegistry.register(txPetitionJP2Definition);
export { txPetitionJP2Definition };
