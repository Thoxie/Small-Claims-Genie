/**
 * NC AOC-CVM-200 — Complaint for Money Owed (Small Claims)
 *
 * Programmatically generated with pdf-lib (no template PDF required).
 * Covers all 100 North Carolina counties.
 *
 * Legal basis:
 *   N.C. Gen. Stat. § 7A-210 et seq. — Small Claims Court (District Court Division)
 *   Heard by a magistrate; claim limit $10,000 (exclusive of interest and costs)
 *   Filing fee: $96 flat rate (G.S. 7A-311) + $30 sheriff service fee per defendant
 *
 * Official PDF status: The NC AOC form PDF (nccourts.gov) cannot be downloaded
 * via automated fetch — all URLs under /assets/documents/forms/ and /forms/documents/
 * are blocked by Cloudflare WAF (HTTP 403). This form remains programmatic until
 * direct PDF access is available (e.g., a bulk-download arrangement with NC AOC).
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

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^nc-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function claimTypeLabel(ct?: string | null): string {
  const MAP: Record<string, string> = {
    goods:            "Goods, wares, and merchandise sold",
    services:         "Work done and materials furnished",
    loan:             "Money lent",
    account_stated:   "Money due on account stated",
    contract:         "Written contract",
    rent:             "Rent for property",
    property_damage:  "Property damage",
    personal_injury:  "Personal injury",
    security_deposit: "Security deposit",
    other:            "Other",
  };
  return ct ? (MAP[ct] ?? ct) : "";
}

export async function buildNCAocCvm200(
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
  const hdr5 = "COMPLAINT FOR MONEY OWED";

  for (const [text, sz] of [[hdr1, 9], [hdr2, 10], [hdr3, 8], [hdr4, 10], [hdr5, 11]] as [string, number][]) {
    const w = (sz >= 10 ? bold : font).widthOfTextAtSize(text, sz);
    txt(page, sz >= 10 ? bold : font, text, (PW - w) / 2, y, sz);
    y -= sz + 5;
  }

  // Form number + courthouse
  const formNote = "AOC-CVM-200 | Rev. 10/23";
  const formNoteW = font.widthOfTextAtSize(formNote, 7);
  txt(page, font, formNote, (PW - formNoteW) / 2, y, 7, GRAY);
  y -= 10;

  if (d.courthouseAddress || d.courthouseName) {
    const cAddrLine = [
      d.courthouseName,
      d.courthouseAddress,
      d.courthouseCity ? `${d.courthouseCity}, NC` : null,
      d.courthouseZip,
    ].filter(Boolean).join(" — ");
    const caw = font.widthOfTextAtSize(cAddrLine, 7.5);
    txt(page, font, cAddrLine, (PW - caw) / 2, y, 7.5, GRAY);
    y -= 10;
  }

  drawLine(page, ML, y, MR, y, 1.2);
  y -= 12;

  // ── Case number row ──────────────────────────────────────────────────────────
  txt(page, bold, "CASE NO.:", ML, y, 9);
  txt(page, font, (d as any).caseNumber ?? "", ML + 58, y, 9);
  txt(page, bold, "FILING FEE: $96.00", MR - 110, y, 8);
  y -= 10;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Plaintiff / Defendant columns ────────────────────────────────────────────
  const COL_MID = ML + (MR - ML) / 2;
  drawRect(page, ML, y - 1, COL_MID - ML - 4, 14, LIGHT);
  drawRect(page, COL_MID, y - 1, MR - COL_MID, 14, LIGHT);
  txt(page, bold, "PLAINTIFF (You)", ML + 4, y + 2, 9);
  txt(page, bold, "DEFENDANT", COL_MID + 4, y + 2, 9);
  y -= 16;

  const PC = ML + 4;
  const DC = COL_MID + 4;
  const CW = COL_MID - ML - 12;

  const pNameFull = (d as any).plaintiffDbaName
    ? `${d.plaintiffName} d/b/a ${(d as any).plaintiffDbaName}`
    : (d.plaintiffName ?? "");
  const pAddr = [d.plaintiffAddress, d.plaintiffCity, `NC ${d.plaintiffZip ?? ""}`.trim()].filter(Boolean).join(", ");

  txt(page, bold, "Name:", PC, y, 8);
  txt(page, font, pNameFull, PC + 36, y, 8);
  txt(page, bold, "Name:", DC, y, 8);
  txt(page, font, d.defendantName ?? "", DC + 36, y, 8);
  y -= 12;

  txt(page, bold, "Addr:", PC, y, 8);
  wrapText(page, font, d.plaintiffAddress ?? "", PC + 36, y, CW - 36, 8, 3);
  txt(page, bold, "Addr:", DC, y, 8);
  wrapText(page, font, d.defendantAddress ?? "", DC + 36, y, CW - 36, 8, 3);
  y -= 12;

  txt(page, bold, "City:", PC, y, 8);
  txt(page, font, [d.plaintiffCity, "NC", d.plaintiffZip].filter(Boolean).join(", "), PC + 36, y, 8);
  txt(page, bold, "City:", DC, y, 8);
  txt(page, font, [d.defendantCity, d.defendantState ?? "NC", d.defendantZip].filter(Boolean).join(", "), DC + 36, y, 8);
  y -= 12;

  txt(page, bold, "Phone:", PC, y, 8);
  txt(page, font, d.plaintiffPhone ?? "", PC + 36, y, 8);
  txt(page, bold, "Phone:", DC, y, 8);
  txt(page, font, d.defendantPhone ?? "", DC + 36, y, 8);
  y -= 12;

  txt(page, bold, "Email:", PC, y, 8);
  txt(page, font, d.plaintiffEmail ?? "", PC + 36, y, 8);
  y -= 12;

  // Defendant business agent (if applicable)
  if ((d as any).defendantIsBusinessOrEntity && (d as any).defendantAgentName) {
    txt(page, bold, "Registered Agent:", DC, y, 8);
    txt(page, font, (d as any).defendantAgentName, DC + 88, y, 8);
    y -= 11;
    if ((d as any).defendantAgentStreet) {
      txt(page, bold, "Agent Address:", DC, y, 8);
      txt(page, font,
        [(d as any).defendantAgentStreet, (d as any).defendantAgentCity, ((d as any).defendantAgentState ?? "NC"), (d as any).defendantAgentZip].filter(Boolean).join(", "),
        DC + 76, y, 8);
      y -= 11;
    }
  }
  y -= 2;

  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Amount Claimed ────────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "AMOUNT CLAIMED", ML + 4, y + 2, 9);
  y -= 16;

  txt(page, bold, "Principal Amount:", ML, y, 9);
  txt(page, font, fmtAmount(d.claimAmount), ML + 105, y, 9);
  txt(page, bold, "Claim Limit: $10,000 (G.S. 7A-210)", MR - 185, y, 8);
  y -= 12;

  const claimLabel = claimTypeLabel((d as any).claimType);
  if (claimLabel) {
    txt(page, bold, "Basis of Claim:", ML, y, 9);
    txt(page, font, claimLabel, ML + 90, y, 9);
    y -= 12;
  }

  if (d.incidentDate) {
    txt(page, bold, "Date of Incident:", ML, y, 9);
    txt(page, font, fmtDate(d.incidentDate), ML + 100, y, 9);
    y -= 12;
  }

  if ((d as any).howAmountCalculated) {
    txt(page, bold, "How Amount Calculated:", ML, y, 9);
    y -= 11;
    y = wrapText(page, font, (d as any).howAmountCalculated, ML + 12, y, MR - ML - 14, 8.5, 3);
    y -= 4;
  }

  y -= 4;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── Statement of Claim ────────────────────────────────────────────────────────
  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "STATEMENT OF CLAIM", ML + 4, y + 2, 9);
  y -= 16;

  txt(page, font,
    "Plaintiff states that Defendant owes Plaintiff the amount stated above for the following reasons:",
    ML, y, 8.5);
  y -= 13;

  const desc = d.claimDescription ?? "";
  if (desc) {
    y = wrapText(page, font, desc, ML, y, MR - ML, 8.5, 3);
  } else {
    for (let i = 0; i < 5; i++) {
      drawLine(page, ML, y, MR, y, 0.3, GRAY);
      y -= 14;
    }
  }
  y -= 10;

  // ── Prior Demand ──────────────────────────────────────────────────────────────
  if ((d as any).priorDemandMade) {
    drawLine(page, ML, y, MR, y, 0.5);
    y -= 12;
    txt(page, bold, "PRIOR DEMAND:", ML, y, 9);
    y -= 11;
    const demandDesc = (d as any).priorDemandDescription ?? "A prior demand for payment was made to the Defendant.";
    y = wrapText(page, font, demandDesc, ML, y, MR - ML, 8.5, 3);
    y -= 8;
  }

  // ── Venue ─────────────────────────────────────────────────────────────────────
  const venueBasis = (d as any).venueBasis;
  if (venueBasis) {
    const venueMap: Record<string, string> = {
      defendant_lives: "Defendant resides in this county (G.S. 7A-211(1)).",
      contract_here:   "The contract was to be performed in this county (G.S. 7A-211(2)).",
      incident_here:   "The cause of action arose in this county (G.S. 7A-211(2)).",
      business_here:   "Defendant has a principal place of business in this county.",
    };
    drawLine(page, ML, y, MR, y, 0.5);
    y -= 12;
    txt(page, bold, "VENUE:", ML, y, 9);
    txt(page, font, venueMap[venueBasis] ?? venueBasis, ML + 44, y, 9);
    y -= 14;
  }

  // ── Verification / Signature ──────────────────────────────────────────────────
  drawLine(page, ML, y, MR, y, 0.8);
  y -= 14;

  drawRect(page, ML, y - 1, MR - ML, 14, LIGHT);
  txt(page, bold, "VERIFICATION AND SIGNATURE", ML + 4, y + 2, 9);
  y -= 16;

  const verText =
    "I, the undersigned Plaintiff (or authorized agent of Plaintiff), verify that I have read the foregoing Complaint " +
    "and that the facts stated therein are true, except as to those stated on information and belief, and as to those I " +
    "believe them to be true. I understand that false statements are subject to criminal penalty under G.S. 14-209.";
  y = wrapText(page, font, verText, ML, y, MR - ML, 8, 3);
  y -= 14;

  sigLineY = y;
  drawLine(page, ML, y, ML + 200, y, 0.5);
  txt(page, font, `Date: ${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}`, ML + 215, y + 2, 9);
  y -= 4;
  txt(page, font, "Plaintiff Signature", ML, y, 7.5, GRAY);
  y -= 14;

  txt(page, bold, "Print Name:", ML, y, 9);
  txt(page, font, d.plaintiffName ?? "", ML + 64, y, 9);
  y -= 12;
  txt(page, bold, "Address:", ML, y, 9);
  txt(page, font, pAddr, ML + 52, y, 9);
  y -= 12;
  txt(page, bold, "Phone:", ML, y, 9);
  txt(page, font, d.plaintiffPhone ?? "", ML + 40, y, 9);
  y -= 20;

  // ── Footer ────────────────────────────────────────────────────────────────────
  drawLine(page, ML, y, MR, y, 0.4);
  y -= 10;
  const footer = "AOC-CVM-200 — North Carolina Small Claims — Claim limit: $10,000 (G.S. 7A-210) — Filing fee: $96 (G.S. 7A-311)";
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

const ncAocCvm200Definition: FormDefinition = {
  state: "NC",
  formId: "NC-AOC-CVM-200",
  renderingTechnique: "png-overlay",
  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildNCAocCvm200(d, body, opts);
  },
};

FormRegistry.register(ncAocCvm200Definition);
export { ncAocCvm200Definition };
