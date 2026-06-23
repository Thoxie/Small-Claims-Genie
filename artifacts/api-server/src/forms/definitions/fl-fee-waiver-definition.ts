/**
 * FL Application for Determination of Civil Indigent Status — programmatic pdf-lib.
 *
 * Generates the Florida Application for Determination of Civil Indigent Status
 * (the Florida fee waiver form) programmatically using pdf-lib.
 * Pre-fills the applicant (plaintiff) name, address, and case information.
 * Financial sections (income, expenses, assets) are left blank for the
 * applicant to complete by hand before filing.
 *
 * Legal basis: Fla. Stat. § 57.082; Fla. R. Civ. P. Form 1.998 (2024).
 * Required to request waiver or deferral of court filing fees.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";

// ─── Page constants ────────────────────────────────────────────────────────────
const PW = 612;
const PH = 792;
const BLACK = rgb(0, 0, 0);
const GRAY  = rgb(0.5, 0.5, 0.5);
const LIGHT = rgb(0.93, 0.93, 0.93);
const DKGRN = rgb(0.0, 0.32, 0.25);
const AMBER = rgb(0.65, 0.42, 0.0);
const AMBERLT = rgb(1.0, 0.97, 0.90);

const ML = 54;
const MR = PW - 54;
const TW = MR - ML;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, t = 0.5, color = BLACK) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color });
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, fill = LIGHT, borderColor = BLACK, bw = 0.5) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor, borderWidth: bw });
}

function txt(page: PDFPage, font: PDFFont, text: string | null | undefined, x: number, y: number, size = 9, color = BLACK) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function wrapText(page: PDFPage, font: PDFFont, text: string, x: number, y: number, maxWidth: number, size = 9, lineGap = 3): number {
  const words = text.replace(/\r/g, "").split(/\s+/).filter(Boolean);
  let line = "";
  let curY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      txt(page, font, line, x, curY, size);
      curY -= size + lineGap;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) { txt(page, font, line, x, curY, size); curY -= size + lineGap; }
  return curY;
}

function checkbox(page: PDFPage, font: PDFFont, x: number, y: number, label: string, size = 8.5) {
  page.drawRectangle({ x, y: y - 1, width: 9, height: 9, borderColor: BLACK, borderWidth: 0.8, color: rgb(1, 1, 1) });
  txt(page, font, label, x + 13, y + 1, size);
}

function fieldLine(page: PDFPage, font: PDFFont, label: string, x: number, y: number, lineEnd: number, prefill?: string | null, size = 8.5) {
  txt(page, font, label, x, y + 1, size);
  const lw = font.widthOfTextAtSize(label, size);
  drawLine(page, x + lw + 4, y - 1, lineEnd, y - 1, 0.5, GRAY);
  if (prefill) {
    txt(page, font, prefill, x + lw + 6, y + 1, size, DKGRN);
  }
}

function sectionHeader(page: PDFPage, bold: PDFFont, label: string, x: number, y: number, w: number, h = 12): number {
  drawRect(page, x, y - 2, w, h, LIGHT, BLACK, 0.4);
  txt(page, bold, label, x + 4, y + 2, 8.5, DKGRN);
  return y - (h + 4);
}

function incomeRow(page: PDFPage, font: PDFFont, label: string, x: number, y: number, colWidth: number) {
  txt(page, font, label, x, y, 8);
  drawLine(page, x + colWidth, y - 2, x + colWidth + 60, y - 2, 0.4, GRAY);
  txt(page, font, "$", x + colWidth + 1, y, 8, GRAY);
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^fl-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function buildFLFeeWaiver(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions
): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const countyName = countyDisplay((d as any).countyId);

  // ── Page 1 ──────────────────────────────────────────────────────────────────
  const page1 = doc.addPage([PW, PH]);
  let y = PH - 34;
  let sigLineY = 0;

  // ── Green header bar ──────────────────────────────────────────────────────────
  page1.drawRectangle({ x: 0, y: PH - 52, width: PW, height: 52, color: DKGRN });
  const h1 = "APPLICATION FOR DETERMINATION OF CIVIL INDIGENT STATUS";
  const h2 = "Florida Fee Waiver — Fla. Stat. § 57.082 — Fla. R. Civ. P. Form 1.998";
  txt(page1, bold, h1, (PW - bold.widthOfTextAtSize(h1, 10)) / 2, PH - 19, 10, rgb(1, 1, 1));
  txt(page1, font, h2, (PW - font.widthOfTextAtSize(h2, 7)) / 2, PH - 35, 7, rgb(0.72, 0.90, 0.84));

  y = PH - 62;

  // ── Court header ─────────────────────────────────────────────────────────────
  const courtLine = countyName
    ? `IN THE COUNTY COURT, ${countyName.toUpperCase()} COUNTY, FLORIDA — SMALL CLAIMS DIVISION`
    : "IN THE COUNTY COURT, ____________ COUNTY, FLORIDA — SMALL CLAIMS DIVISION";
  txt(page1, bold, courtLine, (PW - bold.widthOfTextAtSize(courtLine, 8)) / 2, y, 8, DKGRN);
  y -= 11;
  drawLine(page1, ML, y, MR, y, 1.0, DKGRN);
  y -= 12;

  // ── Case / party caption ──────────────────────────────────────────────────────
  const pltName = d.plaintiffName ?? "";
  const defName = d.defendantName ?? "";

  const COL_MID = ML + TW / 2 - 10;
  drawRect(page1, ML, y - 2, COL_MID - ML - 4, 12, LIGHT, BLACK, 0.4);
  drawRect(page1, COL_MID + 4, y - 2, MR - COL_MID - 4, 12, LIGHT, BLACK, 0.4);
  txt(page1, bold, "Plaintiff(s):", ML + 4, y + 1, 7.5);
  txt(page1, bold, "Defendant(s):", COL_MID + 8, y + 1, 7.5);
  y -= 12;
  txt(page1, bold, pltName.slice(0, 55), ML + 4, y, 9);
  txt(page1, bold, defName.slice(0, 55), COL_MID + 8, y, 9);
  y -= 12;

  txt(page1, bold, "CASE NO.:", ML, y, 8.5);
  drawLine(page1, ML + 56, y - 1, ML + 200, y - 1, 0.5, GRAY);
  y -= 14;
  drawLine(page1, ML, y, MR, y, 0.5, rgb(0.8, 0.8, 0.8));
  y -= 10;

  // ── Instructions box ─────────────────────────────────────────────────────────
  page1.drawRectangle({ x: ML, y: y - 30, width: TW, height: 34, color: AMBERLT, borderColor: AMBER, borderWidth: 0.8 });
  const ins1 = "IMPORTANT — READ BEFORE COMPLETING";
  txt(page1, bold, ins1, (PW - bold.widthOfTextAtSize(ins1, 8)) / 2, y + 1, 8, AMBER);
  y -= 10;
  const ins2 = "This application must be filed with the court clerk. A judge or clerk will review your financial information to determine whether you qualify for a waiver or deferral of court fees. All information is required under penalty of perjury.";
  y = wrapText(page1, font, ins2, ML + 6, y, TW - 12, 7.5, 2.5);
  y -= 10;

  // ── PART 1: Applicant information ─────────────────────────────────────────────
  y = sectionHeader(page1, bold, "PART 1 — APPLICANT INFORMATION (pre-filled from your case — verify before filing)", ML, y, TW);
  y -= 2;

  fieldLine(page1, font, "Full legal name:", ML, y, MR, pltName || null);
  y -= 14;

  const pltAddr = d.plaintiffAddress ?? "";
  fieldLine(page1, font, "Street address:", ML, y, MR, pltAddr || null);
  y -= 14;

  const cityStateZip = [d.plaintiffCity, (d.plaintiffState ?? "FL"), d.plaintiffZip].filter(Boolean).join(", ");
  fieldLine(page1, font, "City, State, ZIP:", ML, y, COL_MID + 50, cityStateZip || null);
  fieldLine(page1, font, "Phone:", COL_MID + 60, y, MR);
  y -= 14;

  fieldLine(page1, font, "Date of birth:", ML, y, ML + 200);
  fieldLine(page1, font, "Last 4 digits of SSN:", ML + 210, y, MR, "XXX-XX-");
  y -= 14;
  drawLine(page1, ML, y, MR, y, 0.4, rgb(0.85, 0.85, 0.85));
  y -= 11;

  // ── PART 2: Household ─────────────────────────────────────────────────────────
  y = sectionHeader(page1, bold, "PART 2 — HOUSEHOLD INFORMATION", ML, y, TW);
  y -= 2;

  fieldLine(page1, font, "Number of people living in your household (including yourself):", ML, y, ML + 380);
  y -= 14;
  txt(page1, font, "Spouse / domestic partner:  ", ML, y, 8.5);
  checkbox(page1, font, ML + 175, y, "Yes", 8.5);
  checkbox(page1, font, ML + 210, y, "No", 8.5);
  fieldLine(page1, font, "  Dependents (under 18):", ML + 245, y, MR);
  y -= 14;
  drawLine(page1, ML, y, MR, y, 0.4, rgb(0.85, 0.85, 0.85));
  y -= 11;

  // ── PART 3: Employment ────────────────────────────────────────────────────────
  y = sectionHeader(page1, bold, "PART 3 — EMPLOYMENT STATUS", ML, y, TW);
  y -= 4;

  checkbox(page1, font, ML, y, "Employed full-time", 8.5);
  checkbox(page1, font, ML + 160, y, "Employed part-time", 8.5);
  checkbox(page1, font, ML + 325, y, "Self-employed", 8.5);
  y -= 13;
  checkbox(page1, font, ML, y, "Unemployed", 8.5);
  checkbox(page1, font, ML + 160, y, "Retired", 8.5);
  checkbox(page1, font, ML + 325, y, "Student", 8.5);
  y -= 14;

  fieldLine(page1, font, "Employer name:", ML, y, MR);
  y -= 14;
  fieldLine(page1, font, "Employer address:", ML, y, MR);
  y -= 14;
  drawLine(page1, ML, y, MR, y, 0.4, rgb(0.85, 0.85, 0.85));
  y -= 11;

  // ── PART 4: Monthly Income ────────────────────────────────────────────────────
  y = sectionHeader(page1, bold, "PART 4 — MONTHLY INCOME (all sources, before taxes)", ML, y, TW);
  y -= 4;

  const col1x = ML;
  const col2x = ML + TW / 2 + 10;
  const labelW = 188;

  const incomeItems: [string, string][] = [
    ["Gross wages / salary (before deductions)", "Wages / salary"],
    ["Self-employment income (net)", "Self-employment"],
    ["Social Security / SSI / SSDI", "Social Security"],
    ["Pension / retirement income", "Pension / retirement"],
    ["Unemployment compensation", "Unemployment"],
    ["Workers' compensation", "Workers' comp"],
    ["Child support / alimony received", "Child support received"],
    ["Public assistance (TANF, food stamps)", "Public assistance"],
    ["Other income (describe):", "Other income"],
  ];

  for (let i = 0; i < incomeItems.length; i += 2) {
    const [label1] = incomeItems[i]!;
    const [label2] = incomeItems[i + 1] ?? ["", ""];
    incomeRow(page1, font, label1, col1x, y, labelW);
    if (label2) incomeRow(page1, font, label2, col2x, y, labelW);
    y -= 13;
  }

  txt(page1, bold, "TOTAL MONTHLY INCOME:", col2x, y + 1, 8.5);
  drawLine(page1, col2x + bold.widthOfTextAtSize("TOTAL MONTHLY INCOME:", 8.5) + 4, y - 1, MR, y - 1, 0.8);
  txt(page1, font, "$", col2x + bold.widthOfTextAtSize("TOTAL MONTHLY INCOME:", 8.5) + 5, y + 1, 8.5, GRAY);
  y -= 14;
  drawLine(page1, ML, y, MR, y, 0.4, rgb(0.85, 0.85, 0.85));
  y -= 11;

  // ── PART 5: Monthly Expenses ──────────────────────────────────────────────────
  y = sectionHeader(page1, bold, "PART 5 — MONTHLY EXPENSES", ML, y, TW);
  y -= 4;

  const expenseItems: string[] = [
    "Rent / mortgage", "Utilities (electric, gas, water)", "Food / groceries",
    "Transportation (car payment, gas, bus)", "Health insurance / medical",
    "Child care / child support paid", "Other (describe):",
  ];

  for (let i = 0; i < expenseItems.length; i += 2) {
    const e1 = expenseItems[i]!;
    const e2 = expenseItems[i + 1];
    incomeRow(page1, font, e1, col1x, y, labelW);
    if (e2) incomeRow(page1, font, e2, col2x, y, labelW);
    y -= 13;
  }

  txt(page1, bold, "TOTAL MONTHLY EXPENSES:", col2x, y + 1, 8.5);
  drawLine(page1, col2x + bold.widthOfTextAtSize("TOTAL MONTHLY EXPENSES:", 8.5) + 4, y - 1, MR, y - 1, 0.8);
  txt(page1, font, "$", col2x + bold.widthOfTextAtSize("TOTAL MONTHLY EXPENSES:", 8.5) + 5, y + 1, 8.5, GRAY);
  y -= 14;

  // ── PART 6: Assets ────────────────────────────────────────────────────────────
  y = sectionHeader(page1, bold, "PART 6 — ASSETS", ML, y, TW);
  y -= 4;

  const assetItems: string[] = [
    "Cash / checking account balance", "Savings account balance",
    "Value of real estate (equity)", "Value of vehicles (equity)",
    "Other assets (stocks, bonds, etc.)",
  ];

  for (let i = 0; i < assetItems.length; i += 2) {
    const a1 = assetItems[i]!;
    const a2 = assetItems[i + 1];
    incomeRow(page1, font, a1, col1x, y, labelW);
    if (a2) incomeRow(page1, font, a2, col2x, y, labelW);
    y -= 13;
  }

  txt(page1, bold, "TOTAL ASSETS:", col2x, y + 1, 8.5);
  drawLine(page1, col2x + bold.widthOfTextAtSize("TOTAL ASSETS:", 8.5) + 4, y - 1, MR, y - 1, 0.8);
  txt(page1, font, "$", col2x + bold.widthOfTextAtSize("TOTAL ASSETS:", 8.5) + 5, y + 1, 8.5, GRAY);
  y -= 16;

  // ── Signature section ─────────────────────────────────────────────────────────
  drawLine(page1, ML, y, MR, y, 0.5, rgb(0.8, 0.8, 0.8));
  y -= 10;

  const oathText =
    "Under penalty of perjury, I declare that the information provided in this application is true and correct. I understand that a false statement may result in dismissal of my application and prosecution for perjury.";
  y = wrapText(page1, font, oathText, ML, y, TW, 8, 2.5);
  y -= 8;

  txt(page1, font, "Signature of Applicant:", ML, y, 8.5);
  sigLineY = y - 1;
  drawLine(page1, ML + 130, sigLineY, ML + 350, sigLineY, 0.5);
  txt(page1, font, `Date: `, ML + 358, y, 8.5);
  drawLine(page1, ML + 380, sigLineY, MR, sigLineY, 0.5);
  y -= 8;
  txt(page1, font, "(Applicant's Signature)", ML + 130, y, 7, GRAY);
  y -= 18;

  // ── Clerk determination ────────────────────────────────────────────────────────
  page1.drawRectangle({ x: ML, y: y - 48, width: TW, height: 52, borderColor: DKGRN, borderWidth: 0.8, color: rgb(0.97, 1.0, 0.98) });
  txt(page1, bold, "FOR CLERK / JUDGE USE ONLY — DETERMINATION", ML + 6, y + 1, 8.5, DKGRN);
  y -= 14;
  checkbox(page1, font, ML + 6, y, "Application APPROVED — fees waived pursuant to Fla. Stat. § 57.082(2)", 8.5);
  y -= 13;
  checkbox(page1, font, ML + 6, y, "Application APPROVED — fees deferred (payment plan ordered)", 8.5);
  y -= 13;
  checkbox(page1, font, ML + 6, y, "Application DENIED — reason:                                                                ", 8.5);
  y -= 16;
  txt(page1, font, "Clerk / Judge signature:", ML + 6, y, 8);
  drawLine(page1, ML + 130, y - 1, ML + 370, y - 1, 0.5);
  txt(page1, font, "Date:", ML + 380, y, 8);
  drawLine(page1, ML + 404, y - 1, MR - 6, y - 1, 0.5, GRAY);
  y -= 22;

  // ── ADA notice ────────────────────────────────────────────────────────────────
  drawLine(page1, ML, y, MR, y, 0.3, GRAY);
  y -= 9;
  const ada =
    "If you are a person with a disability who needs any accommodation in order to participate in this proceeding, you are entitled, at no cost to you, " +
    "to the provision of certain assistance. Please contact the ADA Coordinator at least 7 days before your scheduled court appearance.";
  wrapText(page1, font, ada, ML, y, TW, 6.5, 2);

  // ── Signature image overlay ──────────────────────────────────────────────────
  if (opts?.signatureBytes && sigLineY > 0) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      page1.drawImage(sigImg, { x: ML + 130, y: sigLineY, width: 160, height: 28, opacity: 1 });
    } catch { /* ignore invalid image data */ }
  }

  return Buffer.from(await doc.save());
}

// ─── Form Definition ──────────────────────────────────────────────────────────

const flFeeWaiverDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-FEE-WAIVER",
  renderingTechnique: "png-overlay",
  async generate(d, body, opts) {
    return buildFLFeeWaiver(d, body, opts);
  },
};

FormRegistry.register(flFeeWaiverDefinition);

export { flFeeWaiverDefinition };
