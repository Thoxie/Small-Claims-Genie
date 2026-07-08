/**
 * AZ Summons — LJSC00002F (Small Claims)
 *
 * Fills the official Arizona Justice Court "Summons (Small Claims)"
 * (LJSC00002F-012220) with case data via pdf-lib coordinate overlay.
 *
 * Source PDF: assets/forms/az-ljsc00002f-summons.pdf
 * No AcroForm fields (pdftk dump_data_fields returns nothing).
 *
 * Coordinate reference (pdftotext -bbox-layout, y from top of 792pt page):
 *   pdf-lib y = 792 − pdftotext_yMax
 *
 * "Person Filing:" section (top-left):
 *   Name    : x=200, y=706  (label yMax=85.872)
 *   Address : x=200, y=689  (label yMax=103.122)
 *   CSZ     : x=200, y=672  (label yMax=120.392)
 *   Phone   : x=145, y=654  (label yMax=137.642)
 *   Email   : x=160, y=637  (label yMax=154.892)
 *
 * Plaintiff party box (left column, x=77–282):
 *   Name    : x=77,  y=572  (blank area above "(  )" paren row)
 *   Address : x=77,  y=554
 *   CSZ     : x=77,  y=537
 *   Phone   : x=95,  y=387  (paren row yMax=404.962)
 *
 * Defendant party box (right column, x=365–571, below form title):
 *   Name    : x=365, y=437  (just above "vs." at top y=370)
 *   Address : x=365, y=422
 *   Phone   : x=400, y=387
 *
 * Signature coordinates (page 1):
 *   Plaintiff sig image: x=36, y=165 (signature line above "Date" at yMax=681)
 *
 * Legal basis:
 *   A.R.S. § 22-513 — Service in Small Claims
 *   Arizona Rules of Small Claims Procedure (ARSCP) 5(b)
 *   Issued by plaintiff and served on defendant; clerk stamps and dates.
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(FORMS_DIR, "az-ljsc00002f-summons.pdf");
const BLACK = rgb(0, 0, 0);

function csz(
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

export async function buildAZSummons(
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

  const pltCSZ = csz(d.plaintiffCity, d.plaintiffState ?? "AZ", d.plaintiffZip);
  const defCSZ = csz(d.defendantCity, d.defendantState ?? "AZ", d.defendantZip);

  // ── Person Filing (top-left section) ─────────────────────────────────────────
  t(d.plaintiffName ?? "", 200, 706);
  t(d.plaintiffAddress ?? "", 200, 689);
  t(pltCSZ, 200, 672);
  t(d.plaintiffPhone ?? "", 145, 654);
  t(d.plaintiffEmail ?? "", 160, 637);

  // ── Plaintiff party box (left column) ────────────────────────────────────────
  t(d.plaintiffName ?? "", 77, 572);
  t(d.plaintiffAddress ?? "", 77, 554);
  t(pltCSZ, 77, 537);
  // Phone in the "(  )" row
  t(d.plaintiffPhone ?? "", 95, 387);

  // ── Defendant party box (right column, below form title) ─────────────────────
  t(d.defendantName ?? "", 365, 437);
  t(d.defendantAddress ?? "", 365, 422);
  t(defCSZ, 365, 408);
  t(d.defendantPhone ?? "", 400, 387);

  // ── Signature ─────────────────────────────────────────────────────────────────
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: 72, y: 165, width: 180, height: 24, opacity: 1 });
      }
    } catch { /* ignore */ }
  }
  // Plaintiff printed name and date near signature line
  t(d.plaintiffName ?? "", 72, 153);
  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });
  t(today, 310, 153);

  return Buffer.from(await doc.save());
}

const azSummonsDefinition: FormDefinition = {
  state: "AZ",
  formId: "AZ-SUMMONS",
  renderingTechnique: "pdf-overlay",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildAZSummons(d, b, opts);
  },
};

FormRegistry.register(azSummonsDefinition);
export { azSummonsDefinition };
