/**
 * NC AOC-G-106 — Petition to Sue/Appeal as Indigent (Fee Waiver)
 *
 * Programmatically generated with pdf-lib (no template PDF required).
 * Covers all 100 North Carolina counties.
 *
 * Legal basis:
 *   N.C. Gen. Stat. § 1-110 — Petition to Sue as Indigent
 *   If granted, plaintiff is exempt from the $96 filing fee and $30 service fee.
 *   The court clerk or judge must approve the petition before filing is accepted.
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

function wrapText(page: PDFPage, font: PDFFont, text: string, x: number, y: number, maxWidth: number, size = 9, lineGap = 4): number {
  const words = text.replace(/\r/g, "").split(/\s+/);
  let line = "";
  let curY = y;
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
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

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^nc-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function buildNCAocG106(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PW, PH]);
  const countyName = countyDisplay((d as any).countyId);

  let y = PH - 36;
  let sigLineY = 0;

  // ── Header ──────────────────────────────────────────────────────────────────
  const hdr1 = "STATE OF NORTH CAROLINA";
  const hdr2 = `${countyName.toUpperCase()} COUNTY`;
  const hdr3 = "IN THE GENERAL COURT OF JUSTICE — DISTRICT COURT DIVISION";
  const hdr4 = "SMALL CLAIMS";
  const hdr5 = "PETITION TO SUE AS INDIGENT";

  for (const [text, sz] of [[hdr1, 9], [hdr2, 10], [hdr3, 8], [hdr4, 10], [hdr5, 11]] as [string, number][]) {
    const w = (sz >= 10 ? bold : font).widthOfTextAtSize(text, sz);
    txt(page, sz >= 10 ? bold : font, text, (PW - w) / 2, y, sz);
    y -= sz + 5;
  }

  const sub = "AOC-G-106 | G.S. 1-110";
  const subw = font.widthOfTextAtSize(sub, 7);
  txt(page, font, sub, (PW - subw) / 2, y, 7, GRAY);
  y -= 10;

  if (d.courthouseAddress || d.courthouseName) {
    const cLine = [d.courthouseName, d.courthouseAddress, d.courthouseCity ? `${d.courthouseCity}, NC` : null, d.courthouseZip].filter(Boolean).join(" — ");
    const clw = font.widthOfTextAtSize(cLine, 7.5);
    txt(page, font, cLine, (PW - clw) / 2, y, 7.5, GRAY);
    y -= 10;
  }

  drawLine(page, ML, y, MR, y, 1.2);
  y -= 14;

  // ── Case caption ──────────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "CASE CAPTION", ML + 4, y + 2, 9);
  y -= 16;

  txt(page, bold, "Plaintiff:", ML, y, 9);
  txt(page, font, d.plaintiffName ?? "", ML + 56, y, 9);
  txt(page, bold, "Case No.:", MR - 160, y, 9);
  txt(page, font, (d as any).caseNumber ?? "", MR - 100, y, 9);
  y -= 12;
  txt(page, bold, "Defendant:", ML, y, 9);
  txt(page, font, d.defendantName ?? "", ML + 56, y, 9);
  y -= 14;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Petitioner info ────────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "PETITIONER INFORMATION", ML + 4, y + 2, 9);
  y -= 16;

  const pAddr = [d.plaintiffAddress, d.plaintiffCity, `NC ${d.plaintiffZip ?? ""}`.trim()].filter(Boolean).join(", ");

  txt(page, bold, "Name:", ML, y, 9);
  txt(page, font, d.plaintiffName ?? "", ML + 40, y, 9);
  y -= 12;
  txt(page, bold, "Address:", ML, y, 9);
  txt(page, font, pAddr, ML + 54, y, 9);
  y -= 12;
  txt(page, bold, "Phone:", ML, y, 9);
  txt(page, font, d.plaintiffPhone ?? "", ML + 42, y, 9);
  txt(page, bold, "Email:", ML + 170, y, 9);
  txt(page, font, d.plaintiffEmail ?? "", ML + 210, y, 9);
  y -= 16;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Petition body ──────────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "PETITION", ML + 4, y + 2, 9);
  y -= 16;

  const petitionText =
    `I, ${d.plaintiffName ?? "the undersigned"}, being first duly sworn, state the following:`;
  y = wrapText(page, font, petitionText, ML, y, MR - ML, 9, 3);
  y -= 6;

  const statements = [
    "1. I desire to commence a small claims action in the above-entitled court.",
    "2. I am unable to pay the filing fees or service fees in this action.",
    "3. I have not, within the preceding 12 months, filed a frivolous case as plaintiff in this court or made a frivolous appeal.",
    "4. I am not currently ordered to pay fines or costs from a previous case and failing to do so.",
  ];

  for (const st of statements) {
    y = wrapText(page, font, st, ML, y, MR - ML, 8.5, 3);
    y -= 4;
  }
  y -= 8;

  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Financial eligibility ─────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "FINANCIAL ELIGIBILITY — Complete ONE section below", ML + 4, y + 2, 9);
  y -= 16;

  const eligGroups = [
    {
      label: "A. Government Assistance",
      items: [
        "[ ] I receive Medicaid, Food Stamps (SNAP), SSI, TANF, or FPH",
        "[ ] I am an active-duty service member with dependents",
        "[ ] Other qualifying government assistance (describe): ________________",
      ],
    },
    {
      label: "B. Income-Based Eligibility",
      items: [
        "[ ] My gross monthly income is at or below 125% of the Federal Poverty Level",
        "   Monthly income: $______________    Household size: ______",
        "[ ] I have no income (explain): ________________",
      ],
    },
    {
      label: "C. Discretionary Eligibility (Judge/Clerk review)",
      items: [
        "[ ] I am unable to pay costs due to extraordinary circumstances:",
        "   Circumstances: _______________________________________________",
      ],
    },
  ];

  for (const grp of eligGroups) {
    txt(page, bold, grp.label, ML, y, 8.5);
    y -= 12;
    for (const item of grp.items) {
      txt(page, font, item, ML + 8, y, 8);
      y -= 11;
    }
    y -= 4;
  }

  y -= 4;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Warning ───────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: ML, y: y - 2, width: MR - ML, height: 30, color: rgb(1, 0.95, 0.85), borderColor: rgb(0.8, 0.4, 0), borderWidth: 0.5 });
  txt(page, bold, "IMPORTANT:", ML + 6, y + 14, 8, rgb(0.6, 0.2, 0));
  txt(page, font, "False statements made under oath on this petition are subject to criminal penalty under G.S. 14-209.", ML + 64, y + 14, 8, rgb(0.4, 0.15, 0));
  txt(page, font, "If the petition is granted and you win your case, the court may tax costs against the defendant.", ML + 6, y + 3, 7.5, rgb(0.4, 0.15, 0));
  y -= 40;

  // ── Signature ─────────────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "SIGNATURE AND OATH", ML + 4, y + 2, 9);
  y -= 16;

  const oath =
    "The undersigned, being first duly sworn, deposes and says the facts stated in this petition are true to the best of their knowledge and belief.";
  y = wrapText(page, font, oath, ML, y, MR - ML, 8, 3);
  y -= 12;

  sigLineY = y;
  drawLine(page, ML, y, ML + 200, y, 0.5);
  txt(page, font, "Date:", ML + 220, y + 2, 9);
  drawLine(page, ML + 248, y, ML + 320, y, 0.5);
  y -= 4;
  txt(page, font, "Signature of Petitioner", ML, y, 7.5, GRAY);
  y -= 14;

  txt(page, bold, "Print Name:", ML, y, 9);
  txt(page, font, d.plaintiffName ?? "", ML + 64, y, 9);
  y -= 24;

  // ── Court action ─────────────────────────────────────────────────────────────
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "COURT ACTION (Clerk / Judge completes)", ML + 4, y + 2, 9);
  y -= 16;

  txt(page, font, "[ ] GRANTED — Petitioner may file and prosecute as indigent. Court costs to be waived.", ML, y, 8);
  y -= 12;
  txt(page, font, "[ ] DENIED — Reason: _______________________________________________________", ML, y, 8);
  y -= 14;
  drawLine(page, ML, y, ML + 220, y, 0.5);
  txt(page, bold, "Date:", ML + 235, y + 2, 9);
  drawLine(page, ML + 264, y, MR, y, 0.5);
  y -= 4;
  txt(page, font, "Clerk of Superior Court / Magistrate", ML, y, 7.5, GRAY);
  y -= 20;

  // ── Footer ────────────────────────────────────────────────────────────────────
  drawLine(page, ML, y, MR, y, 0.4);
  y -= 10;
  const footer = "AOC-G-106 — North Carolina Petition to Sue as Indigent — G.S. 1-110 — File with Complaint (AOC-CVM-200) at the clerk's window";
  const fw = font.widthOfTextAtSize(footer, 6.5);
  txt(page, font, footer, (PW - fw) / 2, y, 6.5, GRAY);

  // ── Signature image overlay ───────────────────────────────────────────────────
  if (opts?.signatureBytes && sigLineY > 0) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      page.drawImage(sigImg, { x: ML, y: sigLineY, width: 180, height: 36, opacity: 1 });
    } catch { /* ignore invalid image data */ }
  }

  return Buffer.from(await doc.save());
}

const ncAocG106Definition: FormDefinition = {
  state: "NC",
  formId: "NC-AOC-G-106",
  renderingTechnique: "png-overlay",
  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildNCAocG106(d, body, opts);
  },
};

FormRegistry.register(ncAocG106Definition);
export { ncAocG106Definition };
