/**
 * IL Proof of Service — programmatic pdf-lib generation.
 *
 * Produces an Illinois small claims Proof of Service (Return of Service).
 * Case party info is pre-filled; the server completes the date, method,
 * and signature fields after serving the defendant.
 *
 * Legal basis: Illinois Supreme Court Rules 102, 104; 735 ILCS 5/2-202 et seq.
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

const ML = 54;
const MR = PW - 54;
const CW = MR - ML;

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, t = 0.5, color = BLACK) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color });
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, fill = LIGHT) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill });
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

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId.replace(/^il-/, "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function checkbox(page: PDFPage, font: PDFFont, x: number, y: number, label: string, size = 8.5) {
  page.drawRectangle({ x, y: y - 1, width: 9, height: 9, borderColor: BLACK, borderWidth: 0.8, color: rgb(1, 1, 1) });
  txt(page, font, label, x + 13, y + 1, size);
}

export async function buildILProofOfService(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PW, PH]);

  const county = countyDisplay((d as any).countyId);
  const countyRecord = ILLINOIS_COUNTIES.find((c: any) => c.id === (d as any).countyId);
  const courtName = (d as any).courthouseName ?? countyRecord?.courthouseName ?? `Circuit Court of ${county} County`;
  const courtAddress = countyRecord?.courthouseAddress
    ? `${countyRecord.courthouseAddress}, ${countyRecord.courthouseCity ?? ""}, IL ${countyRecord.courthouseZip ?? ""}`.trim()
    : ((d as any).courthouseAddress
      ? `${(d as any).courthouseAddress}, ${(d as any).courthouseCity ?? ""}, IL`.trim()
      : "");

  let y = PH - 36;

  // ── Navy header bar ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PH - 48, width: PW, height: 48, color: NAVY });
  const h1 = "PROOF OF SERVICE";
  const h2 = "State of Illinois — Circuit Court — Small Claims";
  const h1w = bold.widthOfTextAtSize(h1, 13);
  const h2w = font.widthOfTextAtSize(h2, 8.5);
  txt(page, bold, h1, (PW - h1w) / 2, PH - 18, 13, rgb(1, 1, 1));
  txt(page, font, h2, (PW - h2w) / 2, PH - 34, 8.5, rgb(0.75, 0.82, 0.95));

  y = PH - 64;

  // ── Court identifier ─────────────────────────────────────────────────────────
  const courtLine = county ? `IN THE CIRCUIT COURT OF ${county.toUpperCase()} COUNTY, ILLINOIS` : "IN THE CIRCUIT COURT, ____________ COUNTY, ILLINOIS";
  const clw = bold.widthOfTextAtSize(courtLine, 9.5);
  txt(page, bold, courtLine, (PW - clw) / 2, y, 9.5, DKBLU);
  y -= 12;
  line(page, ML, y, MR, y, 1, DKBLU);
  y -= 12;

  // ── Case info row ────────────────────────────────────────────────────────────
  txt(page, bold, "CASE NO.:", ML, y, 8.5);
  if ((d as any).caseNumber) {
    txt(page, font, (d as any).caseNumber, ML + 62, y, 8.5);
  } else {
    line(page, ML + 62, y - 2, ML + 220, y - 2, 0.5, GRAY);
  }
  y -= 11;

  txt(page, bold, "Court:", ML, y, 8.5);
  txt(page, font, courtName, ML + 40, y, 8.5);
  y -= 10;
  if (courtAddress) {
    txt(page, bold, "Address:", ML, y, 8.5);
    txt(page, font, courtAddress, ML + 56, y, 8.5);
    y -= 10;
  }
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Parties ──────────────────────────────────────────────────────────────────
  const CMID = ML + CW / 2;
  const COL_W = CMID - ML - 6;
  rect(page, ML, y - 2, COL_W, 14, LIGHT);
  rect(page, CMID, y - 2, MR - CMID, 14, LIGHT);
  txt(page, bold, "PLAINTIFF", ML + 4, y + 2, 8.5);
  txt(page, bold, "DEFENDANT (PARTY SERVED)", CMID + 4, y + 2, 8.5);
  y -= 16;

  txt(page, font, (d as any).plaintiffName ?? "", ML + 4, y, 8.5);
  txt(page, font, (d as any).defendantName ?? "", CMID + 4, y, 8.5);
  y -= 11;

  const pAddr = [(d as any).plaintiffAddress, (d as any).plaintiffCity, "IL", (d as any).plaintiffZip].filter(Boolean).join(", ");
  const dAddr = [(d as any).defendantAddress, (d as any).defendantCity, (d as any).defendantState ?? "IL", (d as any).defendantZip].filter(Boolean).join(", ");
  if (pAddr) txt(page, font, pAddr, ML + 4, y, 7.5, GRAY);
  if (dAddr) txt(page, font, dAddr, CMID + 4, y, 7.5, GRAY);
  y -= 12;

  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Server's certificate ─────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "SERVER'S CERTIFICATE OF SERVICE", ML + 4, y + 1, 9);
  y -= 16;

  const certPara =
    `I, the undersigned, certify that I served the Summons and Small Claims Complaint in this case on the Defendant, ` +
    `${(d as any).defendantName ?? "___________________________"}, in the manner described below:`;
  y = wrap(page, font, certPara, ML, y, CW, 8.5, 4.5);
  y -= 10;

  // Service method checkboxes
  txt(page, bold, "METHOD OF SERVICE (check one):", ML, y, 8.5);
  y -= 13;

  const methods = [
    "Personal service — Delivered a copy of the summons and complaint directly to the defendant.",
    "Substituted service — Left copies at the defendant's usual place of abode with a person of the family (age 13+), and mailed a copy to defendant at the same address.",
    "Service on registered agent — Delivered copies to the registered agent of the defendant business entity.",
    "Certified mail service — Mailed summons and complaint via certified mail, return receipt requested (if authorized by court).",
    "Sheriff service — Delivered to the county sheriff for service (attach sheriff's return).",
  ];

  for (const method of methods) {
    checkbox(page, font, ML, y, "", 8.5);
    y = wrap(page, font, method, ML + 13, y + 1, CW - 13, 8, 3.5);
    y -= 5;
  }

  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Service details ──────────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "SERVICE DETAILS", ML + 4, y + 1, 9);
  y -= 16;

  const HALF = CW / 2 - 6;

  txt(page, bold, "Date of Service:", ML, y, 8.5);
  line(page, ML + 96, y - 2, ML + HALF, y - 2, 0.5);

  txt(page, bold, "Time:", ML + HALF + 10, y, 8.5);
  line(page, ML + HALF + 45, y - 2, MR, y - 2, 0.5);
  y -= 14;

  txt(page, bold, "Address where served:", ML, y, 8.5);
  y -= 11;
  // Pre-fill defendant address
  const defAddr = [(d as any).defendantAddress, (d as any).defendantCity, (d as any).defendantState ?? "IL", (d as any).defendantZip].filter(Boolean).join(", ");
  if (defAddr) {
    txt(page, font, defAddr, ML, y, 8.5, GRAY);
    txt(page, font, "(verify or correct before filing)", ML + font.widthOfTextAtSize(defAddr, 8.5) + 8, y, 7, GRAY);
  } else {
    line(page, ML, y - 2, MR, y - 2, 0.5);
  }
  y -= 14;

  txt(page, bold, "If substitute service — name and relationship of person served:", ML, y, 8.5);
  y -= 11;
  line(page, ML, y - 2, MR, y - 2, 0.5);
  y -= 14;

  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Server info ──────────────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "SERVER INFORMATION", ML + 4, y + 1, 9);
  y -= 16;

  txt(page, bold, "Server's Full Name:", ML, y, 8.5);
  line(page, ML + 114, y - 2, MR, y - 2, 0.5);
  y -= 14;

  txt(page, bold, "Server's Address:", ML, y, 8.5);
  line(page, ML + 106, y - 2, MR, y - 2, 0.5);
  y -= 14;

  txt(page, bold, "Server's Title / County (if sheriff):", ML, y, 8.5);
  line(page, ML + 210, y - 2, MR, y - 2, 0.5);
  y -= 18;

  // ── Certification text ───────────────────────────────────────────────────────
  const certText =
    "Under penalty of perjury as provided by law pursuant to Section 1-109 of the Code of Civil Procedure, " +
    "I certify that the statements set forth in this instrument are true and correct.";
  y = wrap(page, font, certText, ML, y, CW, 8, 4);
  y -= 16;

  // Signature line
  if (opts?.signatureBytes) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes).catch(() => null)
        ?? await doc.embedJpg(opts.signatureBytes).catch(() => null);
      if (sigImg) {
        page.drawImage(sigImg, { x: ML, y: y - 24, width: 180, height: 28 });
      }
    } catch { /* ignore */ }
  }

  line(page, ML, y - 2, ML + 200, y - 2, 0.5);
  txt(page, font, "Server's Signature", ML, y - 12, 7.5, GRAY);

  txt(page, bold, "Date Signed:", MR - 150, y - 2, 8.5);
  line(page, MR - 76, y - 2, MR, y - 2, 0.5);
  y -= 26;

  // ── Footer ───────────────────────────────────────────────────────────────────
  line(page, ML, 38, MR, 38, 0.5, GRAY);
  txt(page, font, "Generated by Small Claims Genie  •  Illinois Proof of Service  •  735 ILCS 5/2-202", ML, 25, 7.5, GRAY);
  const noteW = font.widthOfTextAtSize("File with the Circuit Court Clerk after service is completed", 7.5);
  txt(page, font, "File with the Circuit Court Clerk after service is completed", MR - noteW, 25, 7.5, GRAY);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

const ilProofOfServiceDefinition: FormDefinition = {
  state: "IL",
  formId: "IL-PROOF-OF-SERVICE",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildILProofOfService(d, b, opts);
  },
};

FormRegistry.register(ilProofOfServiceDefinition);
export { ilProofOfServiceDefinition };
