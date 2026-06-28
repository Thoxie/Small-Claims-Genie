/**
 * NC AOC-CVM-100 — Magistrate's Summons (Small Claims)
 *
 * Programmatically generated with pdf-lib (no template PDF required).
 *
 * In North Carolina small claims, the plaintiff files a Complaint (AOC-CVM-200)
 * and the CLERK prepares and issues the Magistrate's Summons. The plaintiff brings
 * a pre-filled version to assist the clerk — the clerk signs, seals, and forwards
 * it to the sheriff for service.
 *
 * Legal basis:
 *   N.C. Gen. Stat. § 7A-216 — magistrate's summons issued by clerk
 *   Service by sheriff (G.S. 42-28); $30 sheriff service fee per defendant (G.S. 7A-311)
 */

import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";

const PW = 612;
const PH = 792;
const BLACK = rgb(0, 0, 0);
const GRAY  = rgb(0.5, 0.5, 0.5);
const LIGHT = rgb(0.93, 0.93, 0.93);
const AMBER = rgb(0.96, 0.7, 0.0);

const ML = 54;
const MR = PW - 54;

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 0.5, color = BLACK) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, fill = LIGHT) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: BLACK, borderWidth: 0.5 });
}

function txt(page: PDFPage, font: PDFFont, text: string | null | undefined, x: number, y: number, size = 9, color = BLACK) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^nc-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function buildNCAocCvm100(
  d: CaseData,
  _body: FormBody,
  _opts?: GenerateOptions,
): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ital = await doc.embedFont(StandardFonts.HelveticaOblique);

  const page = doc.addPage([PW, PH]);
  const countyName = countyDisplay((d as any).countyId);

  let y = PH - 36;

  // ── Header ──────────────────────────────────────────────────────────────────
  const hdr1 = "STATE OF NORTH CAROLINA";
  const hdr2 = `${countyName.toUpperCase()} COUNTY`;
  const hdr3 = "IN THE GENERAL COURT OF JUSTICE — DISTRICT COURT DIVISION";
  const hdr4 = "SMALL CLAIMS";
  const hdr5 = "MAGISTRATE'S SUMMONS";

  for (const [text, sz] of [[hdr1, 9], [hdr2, 10], [hdr3, 8], [hdr4, 10], [hdr5, 11]] as [string, number][]) {
    const w = (sz >= 10 ? bold : font).widthOfTextAtSize(text, sz);
    txt(page, sz >= 10 ? bold : font, text, (PW - w) / 2, y, sz);
    y -= sz + 5;
  }

  const formNote = "AOC-CVM-100 | Rev. 10/23";
  const fnw = font.widthOfTextAtSize(formNote, 7);
  txt(page, font, formNote, (PW - fnw) / 2, y, 7, GRAY);
  y -= 10;

  if (d.courthouseAddress || d.courthouseName) {
    const cLine = [d.courthouseName, d.courthouseAddress, d.courthouseCity ? `${d.courthouseCity}, NC` : null, d.courthouseZip].filter(Boolean).join(" — ");
    const clw = font.widthOfTextAtSize(cLine, 7.5);
    txt(page, font, cLine, (PW - clw) / 2, y, 7.5, GRAY);
    y -= 10;
  }

  drawLine(page, ML, y, MR, y, 1.2);
  y -= 14;

  // ── Clerk banner ─────────────────────────────────────────────────────────────
  page.drawRectangle({ x: ML, y: y - 2, width: MR - ML, height: 24, color: AMBER, borderColor: rgb(0.8, 0.5, 0), borderWidth: 0.5 });
  const bannerText = "[!] CLERK COMPLETES — Bring this pre-filled form to the clerk at the time of filing";
  const bw = bold.widthOfTextAtSize(bannerText, 8);
  txt(page, bold, bannerText, (PW - bw) / 2, y + 6, 8, rgb(0.3, 0.15, 0));
  y -= 32;

  // ── Case number row ──────────────────────────────────────────────────────────
  txt(page, bold, "CASE NO.:", ML, y, 9);
  txt(page, font, (d as any).caseNumber ?? "", ML + 58, y, 9);
  txt(page, bold, "SERVICE FEE: $30.00 per defendant (Sheriff)", MR - 210, y, 8);
  y -= 10;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Plaintiff / Defendant ────────────────────────────────────────────────────
  const COL_MID = ML + (MR - ML) / 2;
  drawRect(page, ML, y - 1, COL_MID - ML - 4, 14, LIGHT);
  drawRect(page, COL_MID, y - 1, MR - COL_MID, 14, LIGHT);
  txt(page, bold, "PLAINTIFF", ML + 4, y + 2, 9);
  txt(page, bold, "DEFENDANT (to be served)", COL_MID + 4, y + 2, 9);
  y -= 16;

  const PC = ML + 4;
  const DC = COL_MID + 4;

  const pNameFull = (d as any).plaintiffDbaName
    ? `${d.plaintiffName} d/b/a ${(d as any).plaintiffDbaName}`
    : (d.plaintiffName ?? "");

  txt(page, bold, "Name:", PC, y, 8); txt(page, font, pNameFull, PC + 36, y, 8);
  txt(page, bold, "Name:", DC, y, 8); txt(page, font, d.defendantName ?? "", DC + 36, y, 8);
  y -= 12;
  txt(page, bold, "Addr:", PC, y, 8); txt(page, font, d.plaintiffAddress ?? "", PC + 36, y, 8);
  txt(page, bold, "Addr:", DC, y, 8); txt(page, font, d.defendantAddress ?? "", DC + 36, y, 8);
  y -= 12;
  txt(page, bold, "City:", PC, y, 8);
  txt(page, font, [d.plaintiffCity, "NC", d.plaintiffZip].filter(Boolean).join(", "), PC + 36, y, 8);
  txt(page, bold, "City:", DC, y, 8);
  txt(page, font, [d.defendantCity, d.defendantState ?? "NC", d.defendantZip].filter(Boolean).join(", "), DC + 36, y, 8);
  y -= 12;
  txt(page, bold, "Phone:", PC, y, 8); txt(page, font, d.plaintiffPhone ?? "", PC + 36, y, 8);
  txt(page, bold, "Phone:", DC, y, 8); txt(page, font, d.defendantPhone ?? "", DC + 36, y, 8);
  y -= 16;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Amount claimed ────────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "AMOUNT CLAIMED", ML + 4, y + 2, 9);
  y -= 16;
  txt(page, bold, "Amount:", ML, y, 9);
  txt(page, font, fmtAmount(d.claimAmount) || "__________________", ML + 50, y, 9);
  y -= 14;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── To the defendant ─────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "SUMMONS — TO THE DEFENDANT", ML + 4, y + 2, 9);
  y -= 16;

  const summonsPara =
    `${d.defendantName ?? "DEFENDANT"}: ` +
    `You are hereby summoned to appear before a Magistrate of the above-named court at the time and place shown ` +
    `below to answer the Complaint of the Plaintiff, who claims you owe the amount stated above. ` +
    `If you fail to appear, judgment may be entered against you for the amount claimed, plus costs.`;

  const words = summonsPara.split(/\s+/);
  let line = "";
  const size = 8.5;
  const lgap = 3.5;
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(candidate, size) > MR - ML && line) {
      txt(page, font, line, ML, y, size);
      y -= size + lgap;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) { txt(page, font, line, ML, y, size); y -= size + lgap; }
  y -= 10;

  // ── Hearing date ─────────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "HEARING DATE & LOCATION", ML + 4, y + 2, 9);
  y -= 16;

  txt(page, bold, "Date/Time:", ML, y, 9);
  txt(page, ital, "Set by clerk", ML + 62, y, 9, GRAY);
  y -= 12;
  txt(page, bold, "Location:", ML, y, 9);
  const loc = [d.courthouseName, d.courthouseAddress, d.courthouseCity ? `${d.courthouseCity}, NC` : null].filter(Boolean).join(", ");
  txt(page, font, loc || "Set by clerk", ML + 58, y, 9);
  y -= 14;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Clerk signature block ─────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "CLERK'S CERTIFICATE (Completed by Clerk)", ML + 4, y + 2, 9);
  y -= 16;

  drawLine(page, ML, y, ML + 220, y, 0.5);
  txt(page, bold, "Date Issued:", ML + 235, y + 2, 9);
  drawLine(page, ML + 310, y, MR, y, 0.5);
  y -= 4;
  txt(page, font, "Deputy/Assistant Clerk of Superior Court", ML, y, 7.5, GRAY);
  y -= 20;

  // ── Sheriff return ────────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "SHERIFF'S RETURN OF SERVICE", ML + 4, y + 2, 9);
  y -= 16;

  const returnLines = [
    "I certify that this Summons was served on the Defendant as follows:",
    "",
    "[ ] Personally on:  ___/___/_____    [ ] Substituted service — Left with person of suitable age:",
    "   Address: _______________________________________________",
    "",
    "[ ] Unable to serve — reason: _______________________________________________",
    "",
    "Date returned: ___/___/_____     Sheriff / Deputy: ___________________________",
    "County: ___________________     Service fee: $30.00",
  ];
  for (const rl of returnLines) {
    if (rl === "") { y -= 4; continue; }
    txt(page, font, rl, ML, y, 8);
    y -= 11;
  }
  y -= 10;

  // ── Footer ────────────────────────────────────────────────────────────────────
  drawLine(page, ML, y, MR, y, 0.4);
  y -= 10;
  const footer = "AOC-CVM-100 — North Carolina Magistrate's Summons — Small Claims — Sheriff serves defendant ($30/defendant, G.S. 7A-311)";
  const fw = font.widthOfTextAtSize(footer, 6.5);
  txt(page, font, footer, (PW - fw) / 2, y, 6.5, GRAY);

  return Buffer.from(await doc.save());
}

const ncAocCvm100Definition: FormDefinition = {
  state: "NC",
  formId: "NC-AOC-CVM-100",
  renderingTechnique: "png-overlay",
  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildNCAocCvm100(d, body, opts);
  },
};

FormRegistry.register(ncAocCvm100Definition);
export { ncAocCvm100Definition };
