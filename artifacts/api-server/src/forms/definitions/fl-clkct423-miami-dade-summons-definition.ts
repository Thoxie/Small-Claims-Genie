/**
 * FL CLK/CT. 423 — Miami-Dade County Summons/Notice to Appear for Pretrial Conference.
 *
 * Programmatic pdf-lib renderer that faithfully reproduces the CLK/CT. 423 layout,
 * including Miami-Dade-specific sections not present in the statewide Form 7.322:
 *   • Division checkboxes (Civil / Districts / Other) — Civil always checked
 *   • "DEFENDANT TO BE SERVED AT" block (name, street, city/state/zip)
 *   • Court-location checkboxes (six Miami-Dade venues — clerk selects at filing)
 *   • Service-method checkboxes (Copy mailed / Hand delivered / etc. — clerk fills)
 *   • "FILED BY" section (plaintiff name, address, phone — contact info only)
 *
 * IMPORTANT — NO plaintiff signature field: CLK/CT. 423 is a court-issued summons.
 * The "FILED BY" section is contact info, not a signature. The ONLY signature on the
 * form is the Deputy Clerk's, which the court applies at filing. The /signed route
 * is accepted but does not embed a plaintiff signature — no such field exists on this form.
 *
 * Court-assigned fields left blank for the clerk: Case Number, Section, Date, Time,
 * Courtroom, and the court-location and service-method checkboxes.
 *
 * Form:   CLK/CT. 423 Rev. 02/26
 * Filing: Miami-Dade County Court Clerk, 73 W. Flagler St., Suite 133, Miami, FL 33130
 * Web:    https://www.miamidadeclerk.gov
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";

// ─── Page constants ────────────────────────────────────────────────────────────
const PW = 612;
const PH = 792;
const BLACK = rgb(0, 0, 0);
const GRAY  = rgb(0.55, 0.55, 0.55);
const LGRAY = rgb(0.92, 0.92, 0.92);
const ML = 50;
const MR = PW - 50;
const TW = MR - ML;

// ─── Drawing helpers ───────────────────────────────────────────────────────────

function line(
  page: PDFPage, x1: number, y1: number, x2: number, y2: number,
  thickness = 0.5, color = BLACK
) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function rect(
  page: PDFPage, x: number, y: number, w: number, h: number,
  fill = LGRAY, border = BLACK
) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: 0.5 });
}

function t(
  page: PDFPage, font: PDFFont,
  text: string | null | undefined,
  x: number, y: number, size = 9, color = BLACK
) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function checkbox(page: PDFPage, font: PDFFont, x: number, y: number, checked: boolean, label: string, size = 7.5) {
  page.drawRectangle({ x, y: y - 1, width: 7, height: 7, borderColor: BLACK, borderWidth: 0.5 });
  if (checked) {
    t(page, font, "X", x + 1, y, 7, BLACK);
  }
  t(page, font, label, x + 10, y, size, BLACK);
}

function dottedLine(page: PDFPage, x1: number, y: number, x2: number) {
  line(page, x1, y, x2, y, 0.4, GRAY);
}

function labeledField(
  page: PDFPage, boldFont: PDFFont, regFont: PDFFont,
  label: string, value: string | null | undefined,
  x: number, y: number, fieldWidth: number, labelSize = 7, valueSize = 8
) {
  t(page, boldFont, label, x, y, labelSize, GRAY);
  const labelW = boldFont.widthOfTextAtSize(label, labelSize);
  const valX = x + labelW + 3;
  const lineX2 = x + fieldWidth;
  if (value) {
    t(page, regFont, value, valX, y, valueSize, BLACK);
  }
  dottedLine(page, valX, y - 2, lineX2);
}

// ─── Main generator ────────────────────────────────────────────────────────────

export async function buildCLKCT423(
  d: CaseData,
  _body: FormBody,
  _opts?: GenerateOptions,
): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PW, PH]);

  let y = PH - 30;

  // ── Header ──────────────────────────────────────────────────────────────────
  const h1 = "IN THE COUNTY COURT, 11TH JUDICIAL CIRCUIT IN AND FOR";
  const h2 = "MIAMI-DADE COUNTY, FLORIDA — SMALL CLAIMS DIVISION";
  const h3 = "SUMMONS / NOTICE TO APPEAR FOR PRETRIAL CONFERENCE";
  const h4 = "CLK/CT. 423 Rev. 02/26";

  t(page, bold, h1, (PW - bold.widthOfTextAtSize(h1, 8.5)) / 2, y, 8.5);
  y -= 11;
  t(page, bold, h2, (PW - bold.widthOfTextAtSize(h2, 8.5)) / 2, y, 8.5);
  y -= 11;
  t(page, bold, h3, (PW - bold.widthOfTextAtSize(h3, 9)) / 2, y, 9);
  y -= 9;
  t(page, font, h4, (PW - font.widthOfTextAtSize(h4, 6.5)) / 2, y, 6.5, GRAY);
  y -= 8;
  line(page, ML, y, MR, y, 1.2);
  y -= 12;

  // ── Plaintiff / Defendant row + Division checkboxes ─────────────────────────
  const COL_MID = ML + TW * 0.52;

  rect(page, ML, y - 1, COL_MID - ML - 4, 11);
  rect(page, COL_MID, y - 1, MR - COL_MID, 11);
  t(page, bold, "PLAINTIFF:", ML + 3, y + 1, 7.5, GRAY);
  t(page, bold, "DEFENDANT:", COL_MID + 3, y + 1, 7.5, GRAY);
  y -= 12;

  t(page, bold, d.plaintiffName ?? "", ML + 3, y, 8.5);
  t(page, bold, d.defendantName ?? "", COL_MID + 3, y, 8.5);
  y -= 12;

  // ── Filing address row ───────────────────────────────────────────────────────
  const fileWith = "FILE WITH: Miami-Dade County Court Clerk, 73 W. Flagler St., Suite 133, Miami, FL 33130";
  t(page, font, fileWith, ML, y, 6.5, GRAY);
  y -= 10;
  line(page, ML, y, MR, y, 0.5);
  y -= 11;

  // ── DIVISION checkboxes ──────────────────────────────────────────────────────
  rect(page, ML, y - 1, TW, 12);
  t(page, bold, "DIVISION:", ML + 3, y + 1, 7.5, GRAY);
  let cbX = ML + 58;
  checkbox(page, font, cbX, y, true,  "Civil",     7.5); cbX += 55;
  checkbox(page, font, cbX, y, false, "Districts", 7.5); cbX += 65;
  checkbox(page, font, cbX, y, false, "Other",     7.5);
  y -= 15;

  // ── Court-assigned case details (all blank — clerk fills) ───────────────────
  rect(page, ML, y - 1, TW, 12);
  const detY = y + 1;
  t(page, bold, "CLERK USE ONLY:", ML + 3, detY, 6.5, GRAY);
  let detX = ML + 88;
  const detFields: [string, number][] = [
    ["Case No.:", 100],
    ["Section:", 70],
    ["Date:", 80],
    ["Time:", 70],
    ["Courtroom:", 75],
  ];
  for (const [lbl, w] of detFields) {
    t(page, bold, lbl, detX, detY, 6.5, GRAY);
    dottedLine(page, detX + bold.widthOfTextAtSize(lbl, 6.5) + 2, detY - 2, detX + w);
    detX += w + 6;
  }
  y -= 15;

  // ── DEFENDANT TO BE SERVED AT ────────────────────────────────────────────────
  rect(page, ML, y, TW, 11);
  t(page, bold, "DEFENDANT TO BE SERVED AT:", ML + 3, y + 2, 8, BLACK);
  y -= 12;

  const defName       = d.defendantName ?? "";
  const defStreet     = d.defendantAddress ?? "";
  const defCityStZip  = [d.defendantCity, d.defendantState ?? "FL", d.defendantZip]
    .filter(Boolean).join(", ");

  labeledField(page, bold, font, "Name:",          defName,      ML, y, TW * 0.6, 7, 8.5);
  y -= 11;
  labeledField(page, bold, font, "Address:",       defStreet,    ML, y, TW * 0.6, 7, 8.5);
  y -= 11;
  labeledField(page, bold, font, "City/State/Zip:", defCityStZip, ML, y, TW * 0.6, 7, 8.5);
  y -= 13;
  line(page, ML, y, MR, y, 0.5);
  y -= 11;

  // ── COURT LOCATION checkboxes ────────────────────────────────────────────────
  rect(page, ML, y, TW, 11);
  t(page, bold, "COURT LOCATION (Clerk selects):", ML + 3, y + 2, 7.5, GRAY);
  y -= 13;

  const venues = [
    "Dade County Courthouse Central Court",
    "Joseph Caleb Center Court",
    "Coral Gables District Court",
    "North Dade Justice Center",
    "Miami Beach District Court",
    "Hialeah District Court",
  ];
  let venCol = 0;
  const venColX = [ML, ML + TW / 2];
  for (let i = 0; i < venues.length; i++) {
    venCol = i % 2;
    checkbox(page, font, venColX[venCol], y, false, venues[i], 7.5);
    if (venCol === 1) y -= 11;
  }
  if (venues.length % 2 !== 0) y -= 11;
  y -= 4;
  line(page, ML, y, MR, y, 0.5);
  y -= 11;

  // ── SERVICE METHOD checkboxes ────────────────────────────────────────────────
  rect(page, ML, y, TW, 11);
  t(page, bold, "SERVICE METHOD (Clerk completes at filing):", ML + 3, y + 2, 7.5, GRAY);
  y -= 13;

  const col1X = ML;
  const col2X = ML + TW * 0.35;
  const col3X = ML + TW * 0.65;
  checkbox(page, font, col1X, y, false, "Copy mailed to",    7.5);
  checkbox(page, font, col2X, y, false, "Hand delivered to", 7.5);
  y -= 11;
  checkbox(page, font, col1X, y, false, "Plaintiff",     7.5);
  checkbox(page, font, col2X, y, false, "Attorney",      7.5);
  checkbox(page, font, col3X, y, false, "Process Server", 7.5);
  y -= 11;
  checkbox(page, font, col1X, y, false, "Sheriff",        7.5);
  checkbox(page, font, col2X, y, false, "Served by Mail", 7.5);
  y -= 13;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── NOTICE TEXT ──────────────────────────────────────────────────────────────
  const noticeText =
    "YOU ARE HEREBY NOTIFIED that you are required to appear in person or by attorney " +
    "at the court location checked above, on the date and time filled in above, for a " +
    "PRETRIAL CONFERENCE. THE CASE WILL NOT BE TRIED AT THAT TIME — DO NOT BRING WITNESSES. " +
    "The defendant(s) must appear to avoid a default judgment. The plaintiff(s) must appear " +
    "to avoid dismissal for lack of prosecution. Whoever appears for a party must have full " +
    "authority to settle. A copy of the statement of claim shall be served with this summons.";
  const words = noticeText.split(/\s+/);
  let lineText = "";
  for (const w of words) {
    const candidate = lineText ? lineText + " " + w : w;
    if (font.widthOfTextAtSize(candidate, 7.5) > TW && lineText) {
      t(page, font, lineText, ML, y, 7.5);
      y -= 10;
      lineText = w;
    } else {
      lineText = candidate;
    }
  }
  if (lineText) { t(page, font, lineText, ML, y, 7.5); y -= 10; }
  y -= 6;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── FILED BY (plaintiff contact info — NOT a signature field) ────────────────
  rect(page, ML, y, TW, 11);
  t(page, bold, "FILED BY (Plaintiff contact information — no signature required here):", ML + 3, y + 2, 7.5, GRAY);
  y -= 12;

  const pltStreet    = d.plaintiffAddress ?? "";
  const pltCitySZ    = [d.plaintiffCity, d.plaintiffState ?? "FL", d.plaintiffZip]
    .filter(Boolean).join(", ");

  labeledField(page, bold, font, "Name:",    d.plaintiffName ?? "",    ML,            y, TW * 0.55, 7, 8.5);
  labeledField(page, bold, font, "Phone:",   d.plaintiffPhone ?? "",   ML + TW * 0.6, y, TW * 0.4, 7, 8.5);
  y -= 11;
  labeledField(page, bold, font, "Address:", pltStreet,                ML,            y, TW * 0.55, 7, 8.5);
  y -= 11;
  labeledField(page, bold, font, "City/State/Zip:", pltCitySZ,         ML,            y, TW * 0.65, 7, 8.5);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── DEPUTY CLERK SIGNATURE (the only signature on this form) ────────────────
  t(page, bold, "ISSUED ON:", ML, y, 8);
  dottedLine(page, ML + 62, y - 2, ML + 200);

  const clkX = ML + TW * 0.52;
  t(page, font, "As Clerk of the County Court", clkX, y, 8);
  y -= 13;

  t(page, font, "By:", clkX, y, 8);
  line(page, clkX + 18, y - 1, MR, y - 1, 0.5);
  y -= 8;
  const dpLabel = "Deputy Clerk";
  t(page, font, dpLabel, MR - font.widthOfTextAtSize(dpLabel, 7.5), y, 7.5, GRAY);
  y -= 16;

  // ── ADA notice ───────────────────────────────────────────────────────────────
  line(page, ML, y, MR, y, 0.3, GRAY);
  y -= 8;
  const ada =
    "If you are a person with a disability who needs any accommodation in order to participate in this " +
    "proceeding, you are entitled, at no cost to you, to the provision of certain assistance. Please " +
    "contact the ADA Coordinator at your local courthouse at least 7 days before your scheduled court " +
    "appearance, or immediately upon receiving this notice if the time before the scheduled appearance " +
    "is less than 7 days.";
  const adaWords = ada.split(/\s+/);
  let adaLine = "";
  for (const w of adaWords) {
    const candidate = adaLine ? adaLine + " " + w : w;
    if (font.widthOfTextAtSize(candidate, 6.5) > TW && adaLine) {
      t(page, font, adaLine, ML, y, 6.5, GRAY);
      y -= 8.5;
      adaLine = w;
    } else {
      adaLine = candidate;
    }
  }
  if (adaLine) t(page, font, adaLine, ML, y, 6.5, GRAY);

  return Buffer.from(await doc.save());
}

// ─── Form Definition ──────────────────────────────────────────────────────────

const clkCt423Definition: FormDefinition = {
  state: "FL",
  formId: "CLK-CT-423",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildCLKCT423(d, body, opts);
  },
};

FormRegistry.register(clkCt423Definition);
export { clkCt423Definition };
