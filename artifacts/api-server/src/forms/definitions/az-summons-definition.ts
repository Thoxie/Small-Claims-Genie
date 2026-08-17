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
 * Signature — NONE. The AZ small-claims summons is CLERK-ISSUED: the bottom
 * "Date" / "Clerk" lines belong to the clerk, and the plaintiff does not sign
 * the summons (they sign the complaint). The /signed route is accepted for
 * routing consistency but no plaintiff signature is embedded. Only the issue
 * date is drawn, above the "Date" line (label baseline pdf-lib y≈111).
 *
 * Court name: the county is drawn on the "____ JUSTICE COURT, ARIZONA" line,
 * right-aligned to end just before the printed "JUSTICE" (x≈348, y≈560).
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
import { ARIZONA_COUNTIES } from "../../data/counties-az";

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

/**
 * Split a phone string into area code and local number so each part can be
 * drawn independently around the form's pre-printed ( ) brackets.
 * "(650) 533-2222" → { areaCode: "650", rest: " 533-2222" }
 */
function splitPhone(phone: string | null | undefined): { areaCode: string; rest: string } {
  const p = (phone ?? "").trim();
  const m = p.match(/^\(?\s*(\d{3})\s*\)(.*)$/);
  if (m) return { areaCode: m[1], rest: m[2] };
  const digits = p.replace(/\D/g, "");
  if (digits.length >= 10)
    return { areaCode: digits.slice(0, 3), rest: ` ${digits.slice(3, 6)}-${digits.slice(6, 10)}` };
  return { areaCode: p, rest: "" };
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

  // ── Court name on the "____ JUSTICE COURT, ARIZONA" line ─────────────────────
  // Right-align the county so it ends just before the printed "JUSTICE"
  // (word starts x≈348.65, baseline pdf-lib y≈560).
  const azCounty = ARIZONA_COUNTIES.find((c) => c.id === (d as CaseData).countyId);
  const courtName = azCounty ? `${azCounty.name.toUpperCase()} COUNTY` : "";
  if (courtName) {
    const cw = font.widthOfTextAtSize(courtName, 10);
    page.drawText(courtName, { x: 344 - cw, y: 564, size: 10, font, color: BLACK });
  }

  // ── Person Filing (top-left section) ─────────────────────────────────────────
  t(d.plaintiffName ?? "", 200, 710);
  t(d.plaintiffAddress ?? "", 200, 693);
  t(pltCSZ, 200, 676);
  t(d.plaintiffPhone ?? "", 145, 658);
  t(d.plaintiffEmail ?? "", 160, 641);

  // ── Plaintiff party box (left column) ────────────────────────────────────────
  // Name/address/CSZ are already in the "Person Filing" section at the top —
  // leave those lines blank here and only fill the phone row.
  // Phone: area code sits between pre-printed ( at x≈77–81 and ) at x≈111–115;
  // the rest of the number goes after the closing bracket at x≈118.
  const { areaCode: pltAC, rest: pltRest } = splitPhone(d.plaintiffPhone);
  t(pltAC, 84, 391);
  t(pltRest, 118, 391);

  // ── Defendant party box (right column, below form title) ─────────────────────
  t(d.defendantName ?? "", 365, 441);
  t(d.defendantAddress ?? "", 365, 426);
  t(defCSZ, 365, 412);
  // Phone: area code between pre-printed ( at x≈365–370 and ) at x≈399–403;
  // rest of number after the closing bracket at x≈406.
  const { areaCode: defAC, rest: defRest } = splitPhone(d.defendantPhone);
  t(defAC, 372, 391);
  t(defRest, 406, 391);

  // ── Issue date (CLERK-ISSUED form: no plaintiff signature) ───────────────────
  // The plaintiff never signs the AZ summons, so we intentionally ignore
  // opts.signatureBytes here. Only the issue date is drawn, above the bottom
  // "Date" line (label baseline pdf-lib y≈111; underline just above at y≈128).
  void opts;
  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });
  t(today, 80, 132);

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
