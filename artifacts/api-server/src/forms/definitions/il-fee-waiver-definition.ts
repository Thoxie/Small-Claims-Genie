/**
 * IL Application for Waiver of Court Fees — programmatic pdf-lib generation.
 *
 * Produces an Illinois Application for Waiver of Court Fees matching the
 * statewide format (FW-F 401.1 / 735 ILCS 5/5-105).
 * Pre-fills applicant (plaintiff) name and address; financial sections left
 * blank for the applicant to complete.
 *
 * Rendering technique: png-overlay (programmatic pdf-lib, no template PDF).
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFPage, PDFFont } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { ILLINOIS_COUNTIES } from "../../routes/counties";

const PW = 612;
const PH = 792;
const BLACK  = rgb(0, 0, 0);
const NAVY   = rgb(0.05, 0.15, 0.35);
const GRAY   = rgb(0.45, 0.45, 0.45);
const LIGHT  = rgb(0.93, 0.93, 0.93);
const DKBLU  = rgb(0.1, 0.25, 0.55);
const AMBER  = rgb(0.6, 0.4, 0.0);
const AMBERLT = rgb(1.0, 0.97, 0.88);

const ML = 54;
const MR = PW - 54;
const CW = MR - ML;

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, t = 0.5, color = BLACK) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color });
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, fill = LIGHT, borderColor = LIGHT, bw = 0) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor, borderWidth: bw });
}

function txt(page: PDFPage, font: PDFFont, text: string | null | undefined, x: number, y: number, size = 9, color = BLACK) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function wrap(page: PDFPage, font: PDFFont, text: string, x: number, y: number, maxW: number, size = 9, gap = 4): number {
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

function checkbox(page: PDFPage, font: PDFFont, x: number, y: number, label: string, size = 8.5) {
  page.drawRectangle({ x, y: y - 1, width: 9, height: 9, borderColor: BLACK, borderWidth: 0.8, color: rgb(1, 1, 1) });
  txt(page, font, label, x + 13, y + 1, size);
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId.replace(/^il-/, "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function buildILFeeWaiver(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PW, PH]);

  const county = countyDisplay((d as any).countyId);
  const countyRecord = ILLINOIS_COUNTIES.find((c: any) => c.id === (d as any).countyId);
  const courtName = (d as any).courthouseName ?? countyRecord?.courthouseName ?? `Circuit Court of ${county} County`;
  const genDate = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

  let y = PH - 36;

  // ── Navy header bar ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PH - 48, width: PW, height: 48, color: NAVY });
  const h1 = "APPLICATION FOR WAIVER OF COURT FEES";
  const h2 = "State of Illinois — Circuit Court  •  735 ILCS 5/5-105";
  const h1w = bold.widthOfTextAtSize(h1, 12);
  const h2w = font.widthOfTextAtSize(h2, 8);
  txt(page, bold, h1, (PW - h1w) / 2, PH - 18, 12, rgb(1, 1, 1));
  txt(page, font, h2, (PW - h2w) / 2, PH - 34, 8, rgb(0.75, 0.82, 0.95));

  y = PH - 64;

  // ── Court identifier ─────────────────────────────────────────────────────────
  const courtLine = county ? `IN THE CIRCUIT COURT OF ${county.toUpperCase()} COUNTY, ILLINOIS` : "IN THE CIRCUIT COURT, ____________ COUNTY, ILLINOIS";
  const clw = bold.widthOfTextAtSize(courtLine, 9.5);
  txt(page, bold, courtLine, (PW - clw) / 2, y, 9.5, DKBLU);
  y -= 11;
  const ctw = font.widthOfTextAtSize(courtName, 8.5);
  txt(page, font, courtName, (PW - ctw) / 2, y, 8.5, GRAY);
  y -= 10;
  line(page, ML, y, MR, y, 1, DKBLU);
  y -= 12;

  // ── Case info ────────────────────────────────────────────────────────────────
  txt(page, bold, "CASE NO.:", ML, y, 8.5);
  if ((d as any).caseNumber) {
    txt(page, font, (d as any).caseNumber, ML + 62, y, 8.5);
  } else {
    line(page, ML + 62, y - 2, ML + 220, y - 2, 0.5, GRAY);
  }
  const genLabelW = font.widthOfTextAtSize(`Prepared: ${genDate}`, 8);
  txt(page, font, `Prepared: ${genDate}`, MR - genLabelW, y, 8, GRAY);
  y -= 10;
  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Instruction box ──────────────────────────────────────────────────────────
  rect(page, ML, y - 28, CW, 32, AMBERLT, AMBER, 0.8);
  y -= 4;
  const instrText =
    "If you cannot afford to pay the court fees, you may ask the court to waive them. " +
    "Complete this form honestly and completely. Providing false information is a crime. " +
    "Attach proof of your income or public benefits if available.";
  y = wrap(page, font, instrText, ML + 6, y, CW - 12, 8, 3.5);
  y -= 14;

  // ── Applicant information ────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "APPLICANT INFORMATION", ML + 4, y + 1, 9);
  y -= 16;

  txt(page, bold, "Full Name (Applicant):", ML, y, 8.5);
  const plaintiffName = (d as any).plaintiffName ?? "";
  if (plaintiffName) {
    txt(page, font, plaintiffName, ML + 136, y, 8.5);
  } else {
    line(page, ML + 136, y - 2, MR, y - 2, 0.5);
  }
  y -= 13;

  txt(page, bold, "Street Address:", ML, y, 8.5);
  const pAddr = (d as any).plaintiffAddress ?? "";
  if (pAddr) {
    txt(page, font, pAddr, ML + 90, y, 8.5);
  } else {
    line(page, ML + 90, y - 2, MR, y - 2, 0.5);
  }
  y -= 13;

  txt(page, bold, "City, State, ZIP:", ML, y, 8.5);
  const cityStateZip = [(d as any).plaintiffCity, "IL", (d as any).plaintiffZip].filter(Boolean).join(", ");
  if (cityStateZip) {
    txt(page, font, cityStateZip, ML + 104, y, 8.5);
  } else {
    line(page, ML + 104, y - 2, MR, y - 2, 0.5);
  }
  y -= 13;

  txt(page, bold, "Phone:", ML, y, 8.5);
  const phone = (d as any).plaintiffPhone ?? "";
  if (phone) {
    txt(page, font, phone, ML + 44, y, 8.5);
  } else {
    line(page, ML + 44, y - 2, ML + 200, y - 2, 0.5);
  }

  txt(page, bold, "Email:", ML + 220, y, 8.5);
  const email = (d as any).plaintiffEmail ?? "";
  if (email) {
    txt(page, font, email, ML + 258, y, 8.5);
  } else {
    line(page, ML + 258, y - 2, MR, y - 2, 0.5);
  }
  y -= 14;

  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Basis for waiver ─────────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "BASIS FOR WAIVER (check all that apply)", ML + 4, y + 1, 9);
  y -= 16;

  const bases = [
    "I receive public benefits (SNAP, Medicaid, SSI, General Assistance, TANF, or similar).",
    "My annual gross income is at or below 125% of the Federal Poverty Level for my household size.",
    "I am a veteran receiving VA pension or compensation.",
    "Other: I am unable to pay court fees without being unable to provide for myself or my family.",
  ];

  for (const basis of bases) {
    checkbox(page, font, ML, y, basis, 8.5);
    y -= 14;
  }

  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Income information ───────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "INCOME AND HOUSEHOLD INFORMATION", ML + 4, y + 1, 9);
  y -= 16;

  txt(page, bold, "Number of people in household:", ML, y, 8.5);
  line(page, ML + 188, y - 2, ML + 230, y - 2, 0.5);
  txt(page, bold, "Annual gross income: $", ML + 250, y, 8.5);
  line(page, ML + 370, y - 2, MR, y - 2, 0.5);
  y -= 14;

  txt(page, bold, "Source(s) of income:", ML, y, 8.5);
  line(page, ML + 118, y - 2, MR, y - 2, 0.5);
  y -= 14;

  txt(page, bold, "Monthly take-home pay: $", ML, y, 8.5);
  line(page, ML + 148, y - 2, ML + 240, y - 2, 0.5);
  txt(page, bold, "Other monthly income: $", ML + 260, y, 8.5);
  line(page, ML + 400, y - 2, MR, y - 2, 0.5);
  y -= 14;

  txt(page, bold, "Monthly housing cost: $", ML, y, 8.5);
  line(page, ML + 140, y - 2, ML + 230, y - 2, 0.5);
  txt(page, bold, "Monthly utilities: $", ML + 250, y, 8.5);
  line(page, ML + 360, y - 2, MR, y - 2, 0.5);
  y -= 14;

  txt(page, bold, "Public benefits program(s) received:", ML, y, 8.5);
  line(page, ML + 220, y - 2, MR, y - 2, 0.5);
  y -= 14;

  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Certification and signature ───────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "CERTIFICATION", ML + 4, y + 1, 9);
  y -= 16;

  const certText =
    "Under penalty of perjury as provided by law pursuant to Section 1-109 of the Code of Civil Procedure, " +
    "I certify that the information I have provided in this application is true and correct, and that I am " +
    "unable to pay the court fees required to pursue my case.";
  y = wrap(page, font, certText, ML, y, CW, 8.5, 4.5);
  y -= 14;

  if (opts?.signatureBytes) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes).catch(() => null)
        ?? await doc.embedJpg(opts.signatureBytes).catch(() => null);
      if (sigImg) {
        page.drawImage(sigImg, { x: ML, y: y - 24, width: 180, height: 28 });
      }
    } catch { /* ignore */ }
  }

  line(page, ML, y - 2, ML + 220, y - 2, 0.5);
  txt(page, font, "Applicant Signature", ML, y - 12, 7.5, GRAY);
  if (plaintiffName) txt(page, font, plaintiffName, ML, y + 4, 8);

  txt(page, bold, "Date:", MR - 130, y - 2, 8.5);
  line(page, MR - 96, y - 2, MR, y - 2, 0.5);
  y -= 28;

  line(page, ML, y, MR, y, 0.7, GRAY);
  y -= 14;

  // ── Court order section ───────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "COURT ORDER — FOR COURT USE ONLY", ML + 4, y + 1, 9, GRAY);
  y -= 16;

  checkbox(page, font, ML, y, "Application GRANTED — Filing fees waived.", 8.5);
  y -= 13;
  checkbox(page, font, ML, y, "Application DENIED — Reason:", 8.5);
  line(page, ML + 165, y - 2, MR, y - 2, 0.5);
  y -= 18;

  line(page, ML, y - 2, ML + 200, y - 2, 0.5);
  txt(page, font, "Judge's Signature", ML, y - 12, 7.5, GRAY);
  txt(page, bold, "Date:", MR - 130, y - 2, 8.5);
  line(page, MR - 96, y - 2, MR, y - 2, 0.5);

  // ── Footer ───────────────────────────────────────────────────────────────────
  line(page, ML, 38, MR, 38, 0.5, GRAY);
  txt(page, font, "Generated by Small Claims Genie  •  IL Application for Waiver of Court Fees  •  735 ILCS 5/5-105", ML, 25, 7.5, GRAY);
  const noteW = font.widthOfTextAtSize("File with the circuit court clerk along with your Small Claims Complaint", 7.5);
  txt(page, font, "File with the circuit court clerk along with your Small Claims Complaint", MR - noteW, 25, 7.5, GRAY);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

const ilFeeWaiverDefinition: FormDefinition = {
  state: "IL",
  formId: "IL-FEE-WAIVER",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildILFeeWaiver(d, b, opts);
  },
};

FormRegistry.register(ilFeeWaiverDefinition);
export { ilFeeWaiverDefinition };
