/**
 * FL Proof of Service — Florida Small Claims Form 7.340.
 *
 * Generates the statewide Florida Form 7.340 programmatically using pdf-lib.
 * Pre-fills plaintiff, defendant, and court information from case data.
 * The person who served the papers completes the service date, time,
 * location, method, and signs before a notary.
 *
 * Legal basis: Fla. Sm. Cl. R. 7.080; Form 7.340 (eff. January 1, 2026).
 * Required after service of summons and statement of claim.
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

function dotLine(page: PDFPage, font: PDFFont, label: string, x: number, y: number, lineEnd: number, size = 8.5, color = GRAY) {
  txt(page, font, label, x, y + 1, size);
  const lw = font.widthOfTextAtSize(label, size);
  drawLine(page, x + lw + 4, y - 1, lineEnd, y - 1, 0.5, color);
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

export async function buildFLProofOfService(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions
): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PW, PH]);
  const countyName = countyDisplay((d as any).countyId);

  let y = PH - 34;
  let sigLineY = 0;

  // ── Green header bar ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PH - 52, width: PW, height: 52, color: DKGRN });
  const h1 = "PROOF OF SERVICE";
  const h2 = "Florida Small Claims — Form 7.340 — Fla. Sm. Cl. R. 7.080 (eff. January 1, 2026)";
  txt(page, bold, h1, (PW - bold.widthOfTextAtSize(h1, 14)) / 2, PH - 20, 14, rgb(1, 1, 1));
  txt(page, font, h2, (PW - font.widthOfTextAtSize(h2, 7)) / 2, PH - 36, 7, rgb(0.72, 0.90, 0.84));

  y = PH - 62;

  // ── Court header ─────────────────────────────────────────────────────────────
  const courtLine = countyName
    ? `IN THE COUNTY COURT, ${countyName.toUpperCase()} COUNTY, FLORIDA — SMALL CLAIMS DIVISION`
    : "IN THE COUNTY COURT, ____________ COUNTY, FLORIDA — SMALL CLAIMS DIVISION";
  txt(page, bold, courtLine, (PW - bold.widthOfTextAtSize(courtLine, 8)) / 2, y, 8, DKGRN);
  y -= 11;
  drawLine(page, ML, y, MR, y, 1.0, DKGRN);
  y -= 13;

  // ── Case number ───────────────────────────────────────────────────────────────
  txt(page, bold, "CASE NO.:", ML, y, 8.5);
  drawLine(page, ML + 56, y - 1, ML + 240, y - 1, 0.5, GRAY);
  y -= 14;
  drawLine(page, ML, y, MR, y, 0.5, rgb(0.8, 0.8, 0.8));
  y -= 11;

  // ── Party names ───────────────────────────────────────────────────────────────
  const COL_MID = ML + TW / 2 - 10;
  drawRect(page, ML, y - 2, COL_MID - ML - 4, 12, LIGHT, BLACK, 0.4);
  drawRect(page, COL_MID + 4, y - 2, MR - COL_MID - 4, 12, LIGHT, BLACK, 0.4);
  txt(page, bold, "Plaintiff(s):", ML + 4, y + 1, 7.5);
  txt(page, bold, "Defendant(s):", COL_MID + 8, y + 1, 7.5);
  y -= 12;

  const pltName = d.plaintiffName ?? "";
  const defName = d.defendantName ?? "";
  txt(page, bold, pltName.slice(0, 55), ML + 4, y, 9);
  txt(page, bold, defName.slice(0, 55), COL_MID + 8, y, 9);
  y -= 10;
  const pltAddr = [d.plaintiffAddress, d.plaintiffCity].filter(Boolean).join(", ");
  const defAddr = [d.defendantAddress, d.defendantCity].filter(Boolean).join(", ");
  txt(page, font, pltAddr.slice(0, 52), ML + 4, y, 7.5, GRAY);
  txt(page, font, defAddr.slice(0, 52), COL_MID + 8, y, 7.5, GRAY);
  y -= 12;
  drawLine(page, ML, y, MR, y, 0.5, rgb(0.8, 0.8, 0.8));
  y -= 12;

  // ── Instructions box ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: ML, y: y - 26, width: TW, height: 30, color: AMBERLT, borderColor: AMBER, borderWidth: 0.8 });
  const ins1 = "INSTRUCTIONS FOR USE";
  const ins2 = "Complete this form AFTER serving the defendant. Have it notarized and file with the court at least 5 days before the pretrial conference.";
  txt(page, bold, ins1, (PW - bold.widthOfTextAtSize(ins1, 8)) / 2, y + 1, 8, AMBER);
  y -= 11;
  txt(page, font, ins2, (PW - font.widthOfTextAtSize(ins2, 7)) / 2, y + 1, 7, BLACK);
  y -= 22;

  // ── Affidavit body ────────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, TW, 12, LIGHT, BLACK, 0.4);
  txt(page, bold, "AFFIDAVIT OF SERVICE", ML + 4, y + 2, 8.5, DKGRN);
  y -= 16;

  const affText = `I, the undersigned, being duly sworn, certify that on the date shown below I served a true and correct copy of the Summons and Statement of Claim in the above-styled case upon the Defendant named above in the following manner:`;
  y = wrapText(page, font, affText, ML, y, TW, 8.5, 3);
  y -= 8;

  // ── Service method checkboxes ─────────────────────────────────────────────────
  drawRect(page, ML, y - 2, TW, 12, LIGHT, BLACK, 0.4);
  txt(page, bold, "Method of Service (select one):", ML + 4, y + 2, 8, DKGRN);
  y -= 16;

  checkbox(page, font, ML, y, "Personal service — delivered directly to defendant", 8.5);
  y -= 14;
  checkbox(page, font, ML, y, "Service on registered agent of business entity (name of agent:                                                   )", 8.5);
  y -= 14;
  checkbox(page, font, ML, y, "Substitute service — left with person residing at defendant's usual place of abode, age 15 or older", 8.5);
  y -= 14;
  checkbox(page, font, ML, y, "Other (describe):                                                                                                    ", 8.5);
  y -= 14;

  drawLine(page, ML, y, MR, y, 0.5, rgb(0.8, 0.8, 0.8));
  y -= 12;

  // ── Service details ───────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, TW, 12, LIGHT, BLACK, 0.4);
  txt(page, bold, "Service Details", ML + 4, y + 2, 8.5, DKGRN);
  y -= 16;

  dotLine(page, font, "Date served:", ML, y, ML + 200);
  dotLine(page, font, "Time:", ML + 210, y, ML + 310);
  y -= 15;

  dotLine(page, font, "Address where service was made:", ML, y, MR);
  y -= 15;

  dotLine(page, font, "City, State, ZIP:", ML, y, MR);
  y -= 15;

  const defNamePrefill = defName || "________________________";
  txt(page, font, `Name of person served (if not defendant, state relationship):`, ML, y + 1, 8.5);
  y -= 12;
  drawLine(page, ML, y - 1, MR, y - 1, 0.5, GRAY);
  y -= 14;

  txt(page, font, `Documents served:`, ML, y + 1, 8.5);
  drawLine(page, ML + font.widthOfTextAtSize("Documents served:", 8.5) + 4, y - 1, MR, y - 1, 0.5, GRAY);
  y -= 14;

  drawLine(page, ML, y, MR, y, 0.5, rgb(0.8, 0.8, 0.8));
  y -= 12;

  // ── Server information ────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, TW, 12, LIGHT, BLACK, 0.4);
  txt(page, bold, "Server Information", ML + 4, y + 2, 8.5, DKGRN);
  y -= 16;

  dotLine(page, font, "Name of person who made service:", ML, y, MR);
  y -= 14;
  dotLine(page, font, "Address:", ML, y, MR);
  y -= 14;
  dotLine(page, font, "City, State, ZIP:", ML, y, MR);
  y -= 14;
  dotLine(page, font, "Phone:", ML, y, ML + 220);
  y -= 14;

  txt(page, font, "Check all that apply:", ML, y + 1, 8);
  y -= 13;
  checkbox(page, font, ML, y, "Process server (Fla. Stat. § 48.021)", 8);
  checkbox(page, font, ML + 235, y, "Sheriff / Marshal", 8);
  y -= 12;
  checkbox(page, font, ML, y, "Adult non-party (18+) — name:                                  ", 8);
  y -= 14;

  drawLine(page, ML, y, MR, y, 0.5, rgb(0.8, 0.8, 0.8));
  y -= 12;

  // ── Signature / notary ────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, TW, 12, LIGHT, BLACK, 0.4);
  txt(page, bold, "Signature Under Oath", ML + 4, y + 2, 8.5, DKGRN);
  y -= 16;

  const oathText =
    "Under penalty of perjury, I declare that the above statements are true and correct.";
  txt(page, font, oathText, ML, y, 8.5);
  y -= 17;

  const halfW = TW / 2 - 10;
  txt(page, font, "Signature of Server:", ML, y, 8.5);
  sigLineY = y - 1;
  drawLine(page, ML + 100, sigLineY, ML + halfW, sigLineY, 0.5);
  txt(page, font, "Date:", ML + halfW + 14, y, 8.5);
  drawLine(page, ML + halfW + 46, sigLineY, MR, sigLineY, 0.5);
  y -= 8;
  txt(page, font, "(Server's Signature)", ML + 100, y, 7, GRAY);
  y -= 18;

  // ── Notary block ─────────────────────────────────────────────────────────────
  page.drawRectangle({ x: ML, y: y - 62, width: TW, height: 66, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.6, color: rgb(0.98, 0.98, 0.98) });
  txt(page, bold, "SWORN TO and SUBSCRIBED before me this _______ day of _________________________, 20_____.", ML + 6, y - 3, 8);
  y -= 22;
  drawLine(page, ML + 6, y - 1, ML + halfW - 6, y - 1, 0.5);
  txt(page, font, "Notary Public, State of Florida", ML + 6, y - 12, 7.5, GRAY);
  txt(page, font, "My commission expires:", ML + halfW + 10, y - 1, 8);
  drawLine(page, ML + halfW + 10 + font.widthOfTextAtSize("My commission expires:", 8) + 4, y - 1, MR - 6, y - 1, 0.5, GRAY);
  y -= 48;

  // ── ADA notice ────────────────────────────────────────────────────────────────
  drawLine(page, ML, y, MR, y, 0.3, GRAY);
  y -= 9;
  const ada =
    "If you are a person with a disability who needs any accommodation in order to participate in this proceeding, you are entitled, at no cost to you, " +
    "to the provision of certain assistance. Please contact the ADA Coordinator at least 7 days before your scheduled court appearance.";
  wrapText(page, font, ada, ML, y, TW, 6.5, 2);

  // ── Signature image overlay ──────────────────────────────────────────────────
  if (opts?.signatureBytes && sigLineY > 0) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      page.drawImage(sigImg, { x: ML + 100, y: sigLineY, width: 140, height: 28, opacity: 1 });
    } catch { /* ignore invalid image data */ }
  }

  return Buffer.from(await doc.save());
}

// ─── Form Definitions ─────────────────────────────────────────────────────────

const flProofOfServiceDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-PROOF-OF-SERVICE",
  renderingTechnique: "png-overlay",
  async generate(d, body, opts) {
    return buildFLProofOfService(d, body, opts);
  },
};

FormRegistry.register(flProofOfServiceDefinition);

export { flProofOfServiceDefinition };
