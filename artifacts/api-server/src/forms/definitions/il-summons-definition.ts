/**
 * IL Small Claims Summons — programmatic pdf-lib generation.
 *
 * Produces an Illinois Small Claims Summons matching the statewide format
 * accepted at every Illinois Circuit Court (735 ILCS 5/2-202 et seq.).
 * Pre-filled with case party data; the circuit court clerk stamps the case
 * number and return date before it is served on the defendant.
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

const ML = 54;
const MR = PW - 54;
const CW = MR - ML;
const CMID = ML + CW / 2;

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

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return (m && d && y) ? `${m}/${d}/${y}` : iso;
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId.replace(/^il-/, "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function buildILSummons(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PW, PH]);

  const county = countyDisplay((d as any).countyId);
  const countyRecord = ILLINOIS_COUNTIES.find((c: any) => c.id === (d as any).countyId);
  const courtName = (d as any).courthouseName ?? countyRecord?.courthouseName ?? `Circuit Court of ${county} County`;
  const courtAddress = countyRecord?.courthouseAddress
    ? `${countyRecord.courthouseAddress}, ${countyRecord.courthouseCity ?? ""}, IL ${countyRecord.courthouseZip ?? ""}`.trim()
    : "";

  let y = PH - 36;

  // ── Navy header bar ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PH - 48, width: PW, height: 48, color: NAVY });
  const h1 = "SMALL CLAIMS SUMMONS";
  const h2 = "State of Illinois — Circuit Court";
  const h1w = bold.widthOfTextAtSize(h1, 13);
  const h2w = font.widthOfTextAtSize(h2, 8.5);
  txt(page, bold, h1, (PW - h1w) / 2, PH - 18, 13, rgb(1, 1, 1));
  txt(page, font, h2, (PW - h2w) / 2, PH - 34, 8.5, rgb(0.75, 0.82, 0.95));

  y = PH - 64;

  // ── Court identifier ─────────────────────────────────────────────────────────
  const courtLine = county ? `IN THE CIRCUIT COURT OF ${county.toUpperCase()} COUNTY, ILLINOIS` : "IN THE CIRCUIT COURT, ____________ COUNTY, ILLINOIS";
  const clw = bold.widthOfTextAtSize(courtLine, 9.5);
  txt(page, bold, courtLine, (PW - clw) / 2, y, 9.5, DKBLU);
  y -= 11;
  if (courtAddress) {
    const caw = font.widthOfTextAtSize(courtAddress, 7.5);
    txt(page, font, courtAddress, (PW - caw) / 2, y, 7.5, GRAY);
    y -= 10;
  }
  line(page, ML, y, MR, y, 1, DKBLU);
  y -= 12;

  // ── Case no. / form number row ───────────────────────────────────────────────
  const genDate = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  txt(page, bold, "CASE NO.:", ML, y, 8.5);
  if ((d as any).caseNumber) {
    txt(page, font, (d as any).caseNumber, ML + 62, y, 8.5);
  } else {
    line(page, ML + 62, y - 2, ML + 200, y - 2, 0.5, GRAY);
    txt(page, font, "(assigned by clerk)", ML + 62, y, 7.5, GRAY);
  }
  const dlabel = `Prepared: ${genDate}`;
  const dlw = font.widthOfTextAtSize(dlabel, 8);
  txt(page, font, dlabel, MR - dlw, y, 8, GRAY);
  y -= 10;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Party headers ────────────────────────────────────────────────────────────
  const COL_W = CMID - ML - 6;
  rect(page, ML, y - 2, COL_W, 14, LIGHT);
  rect(page, CMID, y - 2, MR - CMID, 14, LIGHT);
  txt(page, bold, "PLAINTIFF", ML + 4, y + 2, 8.5);
  txt(page, bold, "DEFENDANT", CMID + 4, y + 2, 8.5);
  y -= 16;

  const PC = ML + 4;
  const DC = CMID + 4;
  const PCOL_W = COL_W - 8;

  txt(page, bold, "Name:", PC, y, 8);
  txt(page, font, (d as any).plaintiffName ?? "", PC + 34, y, 8);
  txt(page, bold, "Name:", DC, y, 8);
  txt(page, font, (d as any).defendantName ?? "", DC + 34, y, 8);
  y -= 11;

  txt(page, bold, "Address:", PC, y, 8);
  wrap(page, font, (d as any).plaintiffAddress ?? "", PC + 46, y, PCOL_W - 46, 8, 3);
  txt(page, bold, "Address:", DC, y, 8);
  wrap(page, font, (d as any).defendantAddress ?? "", DC + 46, y, PCOL_W - 46, 8, 3);
  y -= 11;

  txt(page, bold, "City/State:", PC, y, 8);
  txt(page, font, [(d as any).plaintiffCity, "IL", (d as any).plaintiffZip].filter(Boolean).join(", "), PC + 52, y, 8);
  txt(page, bold, "City/State:", DC, y, 8);
  txt(page, font, [(d as any).defendantCity, (d as any).defendantState ?? "IL", (d as any).defendantZip].filter(Boolean).join(", "), DC + 52, y, 8);
  y -= 11;

  txt(page, bold, "Phone:", PC, y, 8);
  txt(page, font, (d as any).plaintiffPhone ?? "", PC + 34, y, 8);
  y -= 12;

  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Summons language ─────────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  const toDefendant = `TO: ${(d as any).defendantName ?? "EACH DEFENDANT"}`.toUpperCase();
  txt(page, bold, toDefendant, ML + 4, y + 1, 9);
  y -= 16;

  const summonsPara =
    "YOU ARE HEREBY SUMMONED and required to appear before the court on the return date shown below to answer " +
    "the complaint filed against you. If you fail to appear, a judgment by default may be taken against you for " +
    "the relief demanded in the complaint. You should bring all documents, receipts, and witnesses that support your position.";
  y = wrap(page, font, summonsPara, ML, y, CW, 8.5, 4.5);
  y -= 10;

  // Return date / court info box
  const rdY = y;
  page.drawRectangle({ x: ML, y: y - 66, width: CW, height: 70, color: rgb(0.97, 0.98, 1), borderColor: DKBLU, borderWidth: 0.8 });
  y -= 4;

  txt(page, bold, "RETURN DATE:", ML + 8, y, 9, DKBLU);
  const hearingDate = (d as any).hearingDate ? fmtDate((d as any).hearingDate) : "";
  const hearingTime = (d as any).hearingTime ?? "";
  if (hearingDate) {
    txt(page, bold, hearingDate + (hearingTime ? `  at  ${hearingTime}` : ""), ML + 100, y, 9, DKBLU);
  } else {
    line(page, ML + 100, y - 2, ML + 280, y - 2, 0.5, GRAY);
    txt(page, font, "(set by circuit court clerk)", ML + 100, y, 7.5, GRAY);
  }
  y -= 14;

  txt(page, bold, "COURT:", ML + 8, y, 8.5);
  txt(page, font, courtName, ML + 54, y, 8.5);
  y -= 11;

  if (courtAddress) {
    txt(page, bold, "ADDRESS:", ML + 8, y, 8.5);
    txt(page, font, courtAddress, ML + 62, y, 8.5);
    y -= 11;
  }

  if (countyRecord?.phone) {
    txt(page, bold, "PHONE:", ML + 8, y, 8.5);
    txt(page, font, countyRecord.phone, ML + 54, y, 8.5);
    y -= 11;
  }

  y = rdY - 74;
  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Claim summary ────────────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "CLAIM SUMMARY", ML + 4, y + 1, 9);
  y -= 15;

  txt(page, bold, "Amount Claimed:", ML, y, 8.5);
  const amt = (d as any).claimAmount;
  txt(page, bold, amt ? `$${Number(amt).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "(see complaint)", ML + 95, y, 9, DKBLU);
  y -= 11;

  if ((d as any).claimDescription) {
    txt(page, bold, "Nature of Claim:", ML, y, 8.5);
    y -= 11;
    y = wrap(page, font, (d as any).claimDescription.slice(0, 300), ML, y, CW, 8.5, 4);
    y -= 4;
  }

  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Clerk's certification area ───────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "CLERK OF CIRCUIT COURT — CERTIFICATION", ML + 4, y + 1, 9);
  y -= 16;

  txt(page, font, "WITNESS, the Honorable Clerk of the Circuit Court:", ML, y, 8.5);
  y -= 22;

  line(page, ML, y, ML + 200, y, 0.5);
  txt(page, font, "Clerk of the Circuit Court", ML, y - 10, 7.5, GRAY);

  txt(page, font, "Date:", MR - 130, y + 2, 8.5);
  line(page, MR - 90, y, MR, y, 0.5);

  txt(page, font, "[COURT SEAL]", MR - 80, y - 20, 7.5, GRAY);

  y -= 36;
  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Service instructions ─────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "INSTRUCTIONS FOR SERVICE", ML + 4, y + 1, 9);
  y -= 15;

  const instructions = [
    "1. This summons must be served on the defendant at least 3 days before the return date.",
    "2. Service may be made by a sheriff, licensed process server, or certified mail (if permitted by the court).",
    "3. After service, the server must complete and sign the Proof of Service and return it to the circuit court clerk.",
    "4. A copy of the Small Claims Complaint must be served with this summons.",
  ];

  for (const line_ of instructions) {
    y = wrap(page, font, line_, ML, y, CW, 8, 3.5);
    y -= 3;
  }

  // ── Plaintiff signature area ─────────────────────────────────────────────────
  line(page, ML, y, MR, y, 0.5);
  y -= 12;
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "PLAINTIFF'S SIGNATURE", ML + 4, y + 1, 9);
  y -= 16;
  const certTxt = "I certify that the information in this summons and complaint is true and correct to the best of my knowledge.";
  y = wrap(page, font, certTxt, ML, y, CW, 8, 4);
  y -= 12;

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
  txt(page, font, "Plaintiff's Signature", ML, y - 12, 7.5, GRAY);
  txt(page, bold, "Date:", MR - 120, y - 2, 8.5);
  line(page, MR - 90, y - 2, MR, y - 2, 0.5);

  // ── Footer ───────────────────────────────────────────────────────────────────
  line(page, ML, 38, MR, 38, 0.5, GRAY);
  txt(page, font, "Generated by Small Claims Genie  •  Illinois Small Claims Summons  •  735 ILCS 5/2-202", ML, 25, 7.5, GRAY);
  const claimLimitW = font.widthOfTextAtSize("Claim limit: $10,000 (735 ILCS 5/2-209)", 7.5);
  txt(page, font, "Claim limit: $10,000 (735 ILCS 5/2-209)", MR - claimLimitW, 25, 7.5, GRAY);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

const ilSummonsDefinition: FormDefinition = {
  state: "IL",
  formId: "IL-SUMMONS",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildILSummons(d, b, opts);
  },
};

FormRegistry.register(ilSummonsDefinition);
export { ilSummonsDefinition };
