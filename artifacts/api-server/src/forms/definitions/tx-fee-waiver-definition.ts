/**
 * TX Fee Waiver — Affidavit of Inability to Pay Court Costs.
 *
 * Texas Rule of Civil Procedure 145 allows a party who cannot afford court
 * costs to file a sworn statement of inability to pay. The clerk must accept
 * the filing without collecting fees unless the opposing party successfully
 * contests the affidavit within 10 days.
 *
 * Legal basis:
 *   Tex. R. Civ. P. 145 (Fee Waiver by Affidavit of Inability)
 *   Tex. Gov't Code § 132.001 (Unsworn Declaration)
 *   Amended effective September 1, 2021 (SB 2336)
 */

import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { TEXAS_COUNTIES } from "../../routes/counties";

const PW = 612;
const PH = 792;
const BLACK  = rgb(0, 0, 0);
const NAVY   = rgb(0.05, 0.15, 0.35);
const GRAY   = rgb(0.45, 0.45, 0.45);
const LIGHT  = rgb(0.93, 0.93, 0.93);
const DKBLU  = rgb(0.1, 0.25, 0.55);
const WHITE  = rgb(1, 1, 1);
const AMBERLT = rgb(1.0, 0.97, 0.90);
const AMBER  = rgb(0.65, 0.42, 0.0);

const ML = 54;
const MR = PW - 54;
const CW = MR - ML;

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, t = 0.5, color = BLACK) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color });
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, fill = LIGHT, border = BLACK, bw = 0.5) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: bw });
}

function txt(
  page: PDFPage, font: PDFFont, text: string | null | undefined,
  x: number, y: number, size = 9, color = BLACK,
) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function wrap(
  page: PDFPage, font: PDFFont, text: string,
  x: number, y: number, maxW: number, size = 9, gap = 4,
): number {
  const words = text.replace(/\r/g, "").split(/\s+/).filter(Boolean);
  let cur = "";
  let cy = y;
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxW && cur) {
      txt(page, font, cur, x, cy, size);
      cy -= size + gap;
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) { txt(page, font, cur, x, cy, size); cy -= size + gap; }
  return cy;
}

function dotLine(page: PDFPage, font: PDFFont, label: string, x: number, y: number, lineEnd: number, size = 8.5) {
  txt(page, font, label, x, y + 1, size);
  const lw = font.widthOfTextAtSize(label, size);
  line(page, x + lw + 4, y - 1, lineEnd, y - 1, 0.5, GRAY);
}

function checkbox(page: PDFPage, font: PDFFont, x: number, y: number, label: string, size = 8.5) {
  page.drawRectangle({ x, y: y - 1, width: 9, height: 9, borderColor: BLACK, borderWidth: 0.8, color: WHITE });
  txt(page, font, label, x + 13, y + 1, size);
}

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
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PW, PH]);
  const countyId: string = (d as any).countyId ?? "";
  const county = countyDisplay(countyId);
  const courthouseName: string = (d as any).courthouseName ?? "";
  const txCountyRecord = TEXAS_COUNTIES.find((c) => c.id === countyId);
  const courthouseAddress = txCountyRecord
    ? `${txCountyRecord.courthouseAddress}, ${txCountyRecord.courthouseCity}, TX ${txCountyRecord.courthouseZip}`
    : "";

  let sigLineY = 0;
  let y = PH - 36;

  // ── Navy header bar ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PH - 46, width: PW, height: 46, color: NAVY });
  const h1 = "AFFIDAVIT OF INABILITY TO PAY COURT COSTS";
  const h2 = "Texas Rule of Civil Procedure 145  •  Tex. Gov't Code § 132.001";
  txt(page, bold, h1, (PW - bold.widthOfTextAtSize(h1, 11)) / 2, PH - 18, 11, WHITE);
  txt(page, font, h2, (PW - font.widthOfTextAtSize(h2, 7.5)) / 2, PH - 33, 7.5, rgb(0.75, 0.82, 0.95));

  y = PH - 56;

  // ── Court name ──────────────────────────────────────────────────────────────
  const courtLine1 = county
    ? `IN THE JUSTICE COURT, ${county.toUpperCase()} COUNTY, TEXAS`
    : "IN THE JUSTICE COURT, ____________ COUNTY, TEXAS";
  const courtLine2 = courthouseName || "Precinct _____, Place _____";
  txt(page, bold, courtLine1, (PW - bold.widthOfTextAtSize(courtLine1, 9.5)) / 2, y, 9.5, DKBLU);
  y -= 13;
  txt(page, font, courtLine2, (PW - font.widthOfTextAtSize(courtLine2, 8)) / 2, y, 8, GRAY);
  y -= 11;
  if (courthouseAddress) {
    txt(page, font, courthouseAddress, (PW - font.widthOfTextAtSize(courthouseAddress, 7.5)) / 2, y, 7.5, GRAY);
    y -= 10;
  }
  line(page, ML, y, MR, y, 1, DKBLU);
  y -= 10;

  // ── Cause No. row ───────────────────────────────────────────────────────────
  txt(page, bold, "CAUSE NO.:", ML, y, 8.5);
  if (d.caseNumber) {
    txt(page, font, d.caseNumber, ML + 65, y, 8.5);
  } else {
    line(page, ML + 65, y - 2, ML + 200, y - 2, 0.5, GRAY);
    txt(page, font, "(assigned by court)", ML + 65, y, 7.5, GRAY);
  }
  const dateStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const dateLbl = `Date: ${dateStr}`;
  txt(page, font, dateLbl, MR - font.widthOfTextAtSize(dateLbl, 8), y, 8, GRAY);
  y -= 10;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Parties ─────────────────────────────────────────────────────────────────
  const CMID = ML + CW / 2 + 6;
  txt(page, bold, "Plaintiff:", ML, y, 8.5);
  txt(page, font, d.plaintiffName ?? "", ML + 55, y, 9);
  txt(page, bold, "Defendant:", CMID, y, 8.5);
  txt(page, font, d.defendantName ?? "", CMID + 60, y, 9);
  y -= 13;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Notice box ─────────────────────────────────────────────────────────────
  page.drawRectangle({ x: ML, y: y - 24, width: CW, height: 28, color: AMBERLT, borderColor: AMBER, borderWidth: 0.8 });
  const note1 = "IMPORTANT — Rule 145 Notice";
  const note2 = "File this form with the court clerk. The clerk MUST accept your filing without collecting fees unless the opposing party contests this affidavit within 10 days after service.";
  txt(page, bold, note1, (PW - bold.widthOfTextAtSize(note1, 8)) / 2, y + 1, 8, AMBER);
  y -= 11;
  txt(page, font, note2, (PW - font.widthOfTextAtSize(note2, 6.5)) / 2, y + 1, 6.5, BLACK);
  y -= 18;

  // ── Affiant info ─────────────────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "AFFIANT INFORMATION (Person Filing This Affidavit)", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  dotLine(page, font, "Full Legal Name:", ML, y, ML + 280);
  if (d.plaintiffName) {
    txt(page, bold, d.plaintiffName, ML + font.widthOfTextAtSize("Full Legal Name:", 8.5) + 8, y, 9, DKBLU);
  }
  const dateOfBirthLabel = "Date of Birth:";
  dotLine(page, font, dateOfBirthLabel, ML + 290, y, MR);
  y -= 14;

  dotLine(page, font, "Current Address:", ML, y, MR);
  const pAddr = [d.plaintiffAddress, d.plaintiffCity, (d.plaintiffState ?? "TX"), d.plaintiffZip].filter(Boolean).join(", ");
  if (pAddr) txt(page, font, pAddr, ML + font.widthOfTextAtSize("Current Address:", 8.5) + 8, y, 8.5);
  y -= 14;

  dotLine(page, font, "Phone:", ML, y, ML + 220);
  if (d.plaintiffPhone) txt(page, font, d.plaintiffPhone, ML + font.widthOfTextAtSize("Phone:", 8.5) + 8, y, 8.5);
  dotLine(page, font, "Email:", ML + 230, y, MR);
  if (d.plaintiffEmail) txt(page, font, d.plaintiffEmail, ML + 230 + font.widthOfTextAtSize("Email:", 8.5) + 8, y, 8.5);
  y -= 14;

  txt(page, bold, "Party type in this case:", ML, y + 1, 8.5);
  checkbox(page, font, ML + 150, y, "Plaintiff", 8.5);
  checkbox(page, font, ML + 220, y, "Defendant", 8.5);
  checkbox(page, font, ML + 300, y, "Other:", 8.5);
  dotLine(page, font, "", ML + 345, y, MR);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Sworn statement ─────────────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "SWORN STATEMENT OF INABILITY TO PAY", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  const swornText =
    "I, the undersigned, state under penalty of perjury that the following is true and correct: " +
    "I am unable to afford the payment of court costs in this case. I have considered my financial " +
    "situation, including my income, property, and debts, and I am unable to pay without substantial " +
    "hardship to myself or my family. I understand that if the court finds that I was not entitled " +
    "to waive costs, I may be required to pay them.";
  y = wrap(page, bold, swornText, ML, y, CW, 8.5, 4);
  y -= 8;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Financial information ────────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "FINANCIAL INFORMATION", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  // Income
  txt(page, bold, "Monthly Income (all sources):", ML, y, 8.5);
  y -= 13;

  checkbox(page, font, ML, y, "Employment wages:", 8.5);
  dotLine(page, font, "$", ML + 135, y, ML + 220);
  checkbox(page, font, ML + 235, y, "Self-employment:", 8.5);
  dotLine(page, font, "$", ML + 350, y, MR);
  y -= 12;
  checkbox(page, font, ML, y, "Social Security / SSI / SSDI:", 8.5);
  dotLine(page, font, "$", ML + 195, y, ML + 280);
  checkbox(page, font, ML + 295, y, "Unemployment:", 8.5);
  dotLine(page, font, "$", ML + 390, y, MR);
  y -= 12;
  checkbox(page, font, ML, y, "Public assistance (SNAP/TANF/Medicaid):", 8.5);
  dotLine(page, font, "$", ML + 253, y, ML + 338);
  checkbox(page, font, ML + 353, y, "Other:", 8.5);
  dotLine(page, font, "$", ML + 395, y, MR);
  y -= 12;

  txt(page, bold, "TOTAL Monthly Income:", ML, y, 8.5);
  dotLine(page, font, "$", ML + 130, y, ML + 220);
  txt(page, bold, "No. of dependents:", ML + 235, y + 1, 8.5);
  dotLine(page, font, "", ML + 340, y, MR);
  y -= 14;

  // Assets
  txt(page, bold, "Assets (leave blank if none):", ML, y, 8.5);
  y -= 13;
  dotLine(page, font, "Bank / checking / savings balance:", ML, y, ML + 290);
  dotLine(page, font, "$", ML + 295, y, MR);
  y -= 12;
  dotLine(page, font, "Real property (land/home) value:", ML, y, ML + 280);
  dotLine(page, font, "$", ML + 285, y, MR);
  y -= 12;
  dotLine(page, font, "Vehicle value:", ML, y, ML + 180);
  dotLine(page, font, "$", ML + 185, y, ML + 270);
  dotLine(page, font, "Other assets:", ML + 280, y, MR);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Government benefit qualification ────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "AUTOMATIC QUALIFICATION (Tex. R. Civ. P. 145(b))", ML + 4, y + 2, 8.5, DKBLU);
  y -= 16;

  const autoText =
    "I am currently receiving one or more of the following need-based government benefits " +
    "(check all that apply — automatic eligibility under Rule 145):";
  y = wrap(page, font, autoText, ML, y, CW, 8.5, 3);
  y -= 6;

  checkbox(page, font, ML, y, "Food stamps (SNAP)", 8.5);
  checkbox(page, font, ML + 155, y, "Medicaid", 8.5);
  checkbox(page, font, ML + 235, y, "CHIP", 8.5);
  checkbox(page, font, ML + 295, y, "SSI", 8.5);
  checkbox(page, font, ML + 345, y, "TANF", 8.5);
  y -= 13;
  checkbox(page, font, ML, y, "WIC", 8.5);
  checkbox(page, font, ML + 55, y, "LIHEAP", 8.5);
  checkbox(page, font, ML + 130, y, "AABD (Aid to Aged, Blind, Disabled)", 8.5);
  checkbox(page, font, ML + 360, y, "None of the above", 8.5);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Signature block ─────────────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "UNSWORN DECLARATION (Tex. Gov't Code § 132.001)", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  const declText =
    "\"My name is __________________________, my date of birth is ______________, " +
    "and my address is ___________________________________________, County of __________________, " +
    "State of Texas. I declare under penalty of perjury that the foregoing is true and correct. " +
    "Executed in __________________ County, State of Texas, on the ______ day of __________________, 20_____.\"";
  y = wrap(page, font, declText, ML, y, CW, 8.5, 4);
  y -= 10;

  const halfW = CW / 2 - 10;
  txt(page, font, "Signature of Affiant:", ML, y, 8.5);
  sigLineY = y - 2;
  line(page, ML + 110, sigLineY, ML + halfW, sigLineY, 0.5);
  txt(page, bold, "Date:", ML + halfW + 14, y, 8.5);
  line(page, ML + halfW + 46, sigLineY, MR, sigLineY, 0.5);
  y -= 10;
  txt(page, font, "(Affiant's Signature)", ML + 110, y, 7, GRAY);
  y -= 18;

  dotLine(page, font, "Printed Name:", ML, y, ML + 280);
  y -= 14;
  dotLine(page, font, "Address:", ML, y, MR);
  y -= 14;

  // ── Signature overlay ────────────────────────────────────────────────────────
  if (opts?.signatureBytes && sigLineY > 0) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes).catch(() => null)
        ?? await doc.embedJpg(opts.signatureBytes).catch(() => null);
      if (sigImg) {
        page.drawImage(sigImg, { x: ML + 110, y: sigLineY, width: 140, height: 24 });
      }
    } catch { /* ignore */ }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  line(page, ML, 38, MR, 38, 0.5, GRAY);
  txt(page, font,
    "Generated by Small Claims Genie  •  TX Affidavit of Inability to Pay  •  Tex. R. Civ. P. 145  •  Amended Sep 1, 2021",
    ML, 25, 7.5, GRAY,
  );

  return Buffer.from(await doc.save());
}

const txFeeWaiverDefinition: FormDefinition = {
  state: "TX",
  formId: "TX-FEE-WAIVER",
  renderingTechnique: "png-overlay",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXFeeWaiver(d, b, opts);
  },
};

FormRegistry.register(txFeeWaiverDefinition);

export { txFeeWaiverDefinition };
