/**
 * TX Small Claims Petition — official-PDF-backed form.
 *
 * Overlays pre-filled case data onto the official Travis County Precinct 3
 * small claims petition PDF (tx-small-claims-petition.pdf, 1 page).  All
 * plaintiff, defendant, claim description, and amount fields are written at
 * the calibrated coordinates derived from pdftotext -bbox-layout analysis of
 * the source form.
 *
 * Rendering technique:
 *   PDFDocument.load() on tx-small-claims-petition.pdf → getPages()[0] →
 *   coordinate overlay with drawText.  No AcroForm fields exist in the source
 *   PDF (pdftk dump_data_fields returns nothing); all data is drawn directly.
 *
 * Coordinate reference (pdftotext yMax → pdf-lib y = 792 − pdftotext_yMax):
 *   Plaintiff name  : x=96,  y=747  (label yMin=44.244 → appears on same visual line)
 *   Defendant name  : x=103, y=696  (label yMax=96)
 *   Street address  : x=175, y=677  (blank above "Street Address" label yMin=117)
 *   City            : x=153, y=649  (blank above "City" label yMin=143)
 *   State           : x=257, y=649
 *   Zip             : x=349, y=649
 *   Service address : x=115, y=504  (label yMax=288)
 *   Complaint lines : y=477,458,439,420,401,382 (6 blank lines, ~19pt spacing)
 *   Claim amount    : x=340, y=336  (RELIEF "$" at yMax=456)
 *
 * Right-column signature block — content = label_bottom + 13pt (established pattern):
 *   "Phone & Fax" label bottom      : 792 − 722.215 = 69.8  → phone content  y=83  ✓
 *   "Address of Plaintiff" label bot: 792 − 666.475 = 125.5 → addr content   y=139 ✓
 *   "Signature of Plaintiff" label  : 792 − 638.635 = 153.4 → sig image      y=166
 *   "Petitioner's Printed Name" bot : 792 − 630.655 = 161.3 → printed name   y=174
 *   (Left sig block removed — printed name goes left, signature goes right only)
 *
 * Legal basis:
 *   Texas Rules of Civil Procedure, Part V — Rules of Practice in Justice Courts
 *   Tex. Gov't Code § 27.031 et seq.; OCA Form "Petition: Small Claims Case"
 *   Claim limit: $20,000 (exclusive of attorneys' fees, interest, and court costs)
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { FORMS_DIR } from "../../routes/forms-common";

const TX_PETITION_PDF_PATH = path.join(FORMS_DIR, "tx-small-claims-petition.pdf");

const BLACK = rgb(0, 0, 0);

// ─── Main generator ───────────────────────────────────────────────────────────

export async function buildTXPetition(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  // Load the official Travis County Precinct 3 Small Claims Petition form.
  const txPdfBytes = fs.readFileSync(TX_PETITION_PDF_PATH);
  const doc  = await PDFDocument.load(txPdfBytes);
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

  // ── Case number ─────────────────────────────────────────────────────────────
  t((d as any).caseNumber ?? "", 265, 750);

  // ── Plaintiff name ─────────────────────────────────────────────────────────
  t(d.plaintiffName ?? "", 96, 747);

  // ── Defendant name ─────────────────────────────────────────────────────────
  t(d.defendantName ?? "", 103, 696);

  // ── Defendant address ──────────────────────────────────────────────────────
  // Street address blank sits above the "Street Address" label (pdftotext y=117)
  t(d.defendantAddress ?? "", 175, 677);
  // City / State / Zip blanks sit above their labels (pdftotext y=143)
  t(d.defendantCity ?? "", 153, 649);
  t(d.defendantState ?? "TX", 257, 649);
  t(d.defendantZip ?? "", 349, 649);

  // ── Service address ("To be served at:") ──────────────────────────────────
  const cszDef = [d.defendantCity, d.defendantState ?? "TX", d.defendantZip]
    .filter(Boolean)
    .join(", ");
  const defService = [d.defendantName, d.defendantAddress, cszDef]
    .filter(Boolean)
    .join(", ");
  // Truncate so the text fits the single blank line (approx 90 chars at 8.5pt)
  t(defService.slice(0, 90), 115, 504);

  // ── Claim description (6 blank lines, ~19pt spacing) ─────────────────────
  const desc = d.claimDescription ?? "";
  const lineYs: number[] = [477, 458, 439, 420, 401, 382];
  const maxLineW = 540;
  if (desc) {
    const words = desc.replace(/\r/g, "").split(/\s+/).filter(Boolean);
    let cur = "";
    let li = 0;
    for (const w of words) {
      const candidate = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, 8.5) > maxLineW && cur) {
        if (li < lineYs.length) {
          t(cur, 36, lineYs[li]!);
          li++;
        }
        cur = w;
      } else {
        cur = candidate;
      }
    }
    if (cur && li < lineYs.length) t(cur, 36, lineYs[li]!);
  }

  // ── Claim amount ───────────────────────────────────────────────────────────
  const amt = d.claimAmount
    ? Number(d.claimAmount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
  t(amt, 340, 336);

  // ── Signature + contact block ─────────────────────────────────────────────
  // Left column: "Petitioner's Printed Name" label bottom at pdf-lib y=161.3
  //   → printed name goes on blank line 13pt above label → y=174.
  // Right column: "Signature of Plaintiff" label bottom at pdf-lib y=153.4
  //   → signature image goes on blank line 13pt above label → y=166.
  //   Same +13pt pattern as address (label y=125.5 → content y=139) and
  //   phone (label y=69.8 → content y=83).
  t(d.plaintiffName ?? "", 36, 174, 8);

  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: 307, y: 166, width: 175, height: 20, opacity: 1 });
      }
    } catch { /* ignore */ }
  }
  const pltAddr  = d.plaintiffAddress ?? "";
  const pltCSZ   = [d.plaintiffCity, d.plaintiffState ?? "TX", d.plaintiffZip]
    .filter(Boolean).join(", ");
  const pltPhone = d.plaintiffPhone ?? "";
  t(pltAddr,  307, 139, 8);
  t(pltCSZ,   307, 111, 8);
  t(pltPhone, 307,  83, 8);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ─── Form definition registration ────────────────────────────────────────────

const txPetitionDefinition: FormDefinition = {
  state: "TX",
  formId: "TX-PETITION",
  renderingTechnique: "pdf-overlay",

  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXPetition(d, b, opts);
  },
};

FormRegistry.register(txPetitionDefinition);

export { txPetitionDefinition };
