/**
 * FL Statement of Claim — statewide programmatic form.
 *
 * Generates a professional, pre-filled Florida small claims Statement of Claim
 * entirely with pdf-lib (no template PDF required). The county court name in
 * the header is derived from the case record so the same definition serves all
 * 67 Florida counties.
 *
 * Used for all FL counties that do not have a county-specific definition.
 * Also used as the base renderer for Miami-Dade and Volusia county-specific
 * forms (county name and filing address are overridden per county).
 *
 * Legal basis:
 *   Fla. Sm. Cl. R. 7.010 et seq.; statewide small claims procedure.
 *   Claim limit: $8,000 (exclusive of costs, interest, and attorney's fees).
 */

import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";

// ─── Page constants ────────────────────────────────────────────────────────────
const PW = 612;  // 8.5"
const PH = 792;  // 11"
const BLACK = rgb(0, 0, 0);
const GRAY  = rgb(0.5, 0.5, 0.5);
const LIGHT = rgb(0.92, 0.92, 0.92);

const MARGIN_L = 54;
const MARGIN_R = PW - 54;
const COL_MID  = MARGIN_L + (MARGIN_R - MARGIN_L) / 2;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawLine(
  page: PDFPage,
  x1: number, y1: number,
  x2: number, y2: number,
  thickness = 0.5,
  color = BLACK
) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, fill = LIGHT, borderColor = BLACK) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor, borderWidth: 0.5 });
}

function txt(
  page: PDFPage,
  font: PDFFont,
  text: string | null | undefined,
  x: number,
  y: number,
  size = 9,
  color = BLACK
) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

/** Draw wrapped text and return the y coordinate BELOW the last line drawn. */
function wrapText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size = 9,
  lineGap = 4
): number {
  const words = text.replace(/\r/g, "").split(/\s+/);
  let line = "";
  let curY  = y;
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    const w = font.widthOfTextAtSize(candidate, size);
    if (w > maxWidth && line) {
      txt(page, font, line, x, curY, size);
      curY -= size + lineGap;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    txt(page, font, line, x, curY, size);
    curY -= size + lineGap;
  }
  return curY;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtAddr(street?: string | null, city?: string | null, state?: string | null, zip?: string | null): string {
  const parts: string[] = [];
  if (street) parts.push(street);
  const csz = [city, state && zip ? `${state} ${zip}` : (state ?? zip)].filter(Boolean).join(", ");
  if (csz) parts.push(csz);
  return parts.join(", ");
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
    .replace(/^fl-/, "")
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
    rent:             "Rent for premises",
    property_damage:  "Property damage",
    personal_injury:  "Personal injury",
    security_deposit: "Security deposit",
    other:            "Other",
  };
  return ct ? (MAP[ct] ?? ct) : "";
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function buildFLStatementOfClaim(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
  countyOverride?: string,
  clerkAddressOverride?: string
): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let sigLineY = 0;

  const page  = doc.addPage([PW, PH]);
  const countyName = countyOverride ?? countyDisplay((d as any).countyId);
  const clerkAddr  = clerkAddressOverride ?? "";

  let y = PH - 36;

  // ── Header ──────────────────────────────────────────────────────────────────
  const title1 = `IN THE COUNTY COURT, ${countyName.toUpperCase()} COUNTY, FLORIDA`;
  const title2 = "SMALL CLAIMS DIVISION";
  const title3 = "STATEMENT OF CLAIM";

  const t1w = bold.widthOfTextAtSize(title1, 10);
  const t2w = bold.widthOfTextAtSize(title2, 10);
  const t3w = bold.widthOfTextAtSize(title3, 11);
  txt(page, bold, title1, (PW - t1w) / 2, y, 10);
  y -= 15;
  txt(page, bold, title2, (PW - t2w) / 2, y, 10);
  y -= 15;
  txt(page, bold, title3, (PW - t3w) / 2, y, 11);
  y -= 13;

  // Courthouse address (centered, gray)
  const courthouseAddrLine = [
    d.courthouseAddress,
    d.courthouseCity ? `${d.courthouseCity}, FL` : null,
    d.courthouseZip,
  ].filter(Boolean).join(" ");
  if (courthouseAddrLine) {
    const caw = font.widthOfTextAtSize(courthouseAddrLine, 8);
    txt(page, font, courthouseAddrLine, (PW - caw) / 2, y, 8, GRAY);
    y -= 11;
  } else {
    y -= 5;
  }

  // horizontal rule
  drawLine(page, MARGIN_L, y, MARGIN_R, y, 1.2);
  y -= 12;

  // ── Case / filing info row ───────────────────────────────────────────────────
  txt(page, bold, "CASE NO.:", MARGIN_L, y, 9);
  txt(page, font, d.caseNumber ?? "", MARGIN_L + 60, y, 9);
  if (clerkAddr) {
    const ca = "FILE WITH: " + clerkAddr;
    const caw = font.widthOfTextAtSize(ca, 7.5);
    txt(page, font, ca, MARGIN_R - caw, y, 7.5, GRAY);
  }
  y -= 10;
  drawLine(page, MARGIN_L, y, MARGIN_R, y, 0.5);
  y -= 14;

  // ── Plaintiff | Defendant headers ────────────────────────────────────────────
  drawRect(page, MARGIN_L, y - 1, COL_MID - MARGIN_L - 4, 14, LIGHT);
  drawRect(page, COL_MID, y - 1, MARGIN_R - COL_MID, 14, LIGHT);
  txt(page, bold, "PLAINTIFF", MARGIN_L + 4, y + 2, 9);
  txt(page, bold, "DEFENDANT", COL_MID + 4, y + 2, 9);
  y -= 16;

  // Party info block
  const PCOL = MARGIN_L + 4;
  const DCOL = COL_MID + 4;
  const COL_W = COL_MID - MARGIN_L - 12;

  const pAddr = fmtAddr(d.plaintiffAddress, d.plaintiffCity, d.plaintiffState ?? "FL", d.plaintiffZip);

  // Name row
  const pNameFull = d.plaintiffDbaName ? `${d.plaintiffName} d/b/a ${d.plaintiffDbaName}` : (d.plaintiffName ?? "");
  txt(page, bold, "Name:", PCOL, y, 8);
  txt(page, font, pNameFull, PCOL + 36, y, 8);
  txt(page, bold, "Name:", DCOL, y, 8);
  txt(page, font, d.defendantName ?? "", DCOL + 36, y, 8);
  y -= 12;

  // Address (may wrap)
  txt(page, bold, "Addr:", PCOL, y, 8);
  wrapText(page, font, d.plaintiffAddress ?? "", PCOL + 36, y, COL_W - 36, 8, 3);
  txt(page, bold, "Addr:", DCOL, y, 8);
  wrapText(page, font, d.defendantAddress ?? "", DCOL + 36, y, COL_W - 36, 8, 3);
  y -= 12;

  // City, State, Zip
  txt(page, bold, "City:", PCOL, y, 8);
  txt(page, font, [d.plaintiffCity, d.plaintiffState ?? "FL", d.plaintiffZip].filter(Boolean).join(", "), PCOL + 36, y, 8);
  txt(page, bold, "City:", DCOL, y, 8);
  txt(page, font, [d.defendantCity, d.defendantState ?? "FL", d.defendantZip].filter(Boolean).join(", "), DCOL + 36, y, 8);
  y -= 12;

  // Phone / Email
  txt(page, bold, "Phone:", PCOL, y, 8);
  txt(page, font, d.plaintiffPhone ?? "", PCOL + 36, y, 8);
  txt(page, bold, "Phone:", DCOL, y, 8);
  txt(page, font, d.defendantPhone ?? "", DCOL + 36, y, 8);
  y -= 12;

  txt(page, bold, "Email:", PCOL, y, 8);
  txt(page, font, d.plaintiffEmail ?? "", PCOL + 36, y, 8);
  y -= 14;

  // divider
  drawLine(page, MARGIN_L, y, MARGIN_R, y, 0.5);
  y -= 14;

  // ── Claim Summary ────────────────────────────────────────────────────────────
  drawRect(page, MARGIN_L, y - 1, MARGIN_R - MARGIN_L, 14, LIGHT);
  txt(page, bold, "NATURE OF CLAIM", MARGIN_L + 4, y + 2, 9);
  y -= 16;

  const claimLabel = claimTypeLabel((d as any).claimType);
  txt(page, bold, "Amount Claimed:", MARGIN_L, y, 9);
  txt(page, font, fmtAmount(d.claimAmount), MARGIN_L + 90, y, 9);
  if (d.incidentDate) {
    txt(page, bold, "Date of Incident:", MARGIN_L + 200, y, 9);
    txt(page, font, fmtDate(d.incidentDate), MARGIN_L + 295, y, 9);
  }
  y -= 12;

  if (claimLabel) {
    txt(page, bold, "Basis of Claim:", MARGIN_L, y, 9);
    txt(page, font, claimLabel, MARGIN_L + 85, y, 9);
    y -= 12;
  }

  if ((d as any).howAmountCalculated) {
    txt(page, bold, "How Amount Calculated:", MARGIN_L, y, 9);
    y -= 11;
    y = wrapText(page, font, (d as any).howAmountCalculated, MARGIN_L + 12, y, MARGIN_R - MARGIN_L - 14, 8.5, 3);
    y -= 4;
  }

  y -= 4;
  drawLine(page, MARGIN_L, y, MARGIN_R, y, 0.5);
  y -= 14;

  // ── Statement of Facts ──────────────────────────────────────────────────────
  drawRect(page, MARGIN_L, y - 1, MARGIN_R - MARGIN_L, 14, LIGHT);
  txt(page, bold, "STATEMENT OF FACTS", MARGIN_L + 4, y + 2, 9);
  y -= 16;

  txt(page, font,
    "Plaintiff states that Defendant is justly indebted to Plaintiff in the sum stated above for the following reasons:",
    MARGIN_L, y, 8.5);
  y -= 13;

  const desc = d.claimDescription ?? "";
  if (desc) {
    y = wrapText(page, font, desc, MARGIN_L, y, MARGIN_R - MARGIN_L, 8.5, 3);
  } else {
    // Draw blank lines for manual completion
    for (let i = 0; i < 6; i++) {
      drawLine(page, MARGIN_L, y, MARGIN_R, y, 0.3, GRAY);
      y -= 14;
    }
  }

  y -= 10;

  // ── Prior Demand ─────────────────────────────────────────────────────────────
  if ((d as any).priorDemandMade) {
    drawLine(page, MARGIN_L, y, MARGIN_R, y, 0.5);
    y -= 12;
    txt(page, bold, "PRIOR DEMAND:", MARGIN_L, y, 9);
    y -= 11;
    const demandDesc = (d as any).priorDemandDescription ?? "A prior demand for payment was made to the Defendant.";
    y = wrapText(page, font, demandDesc, MARGIN_L, y, MARGIN_R - MARGIN_L, 8.5, 3);
    y -= 8;
  }

  // ── Venue ────────────────────────────────────────────────────────────────────
  const venueBasis = (d as any).venueBasis;
  if (venueBasis) {
    const venueMap: Record<string, string> = {
      defendant_lives: "Defendant resides in this county.",
      contract_here:   "The contract was entered into in this county.",
      incident_here:   "The cause of action accrued in this county.",
      business_here:   "Defendant has an office or agency in this county.",
    };
    drawLine(page, MARGIN_L, y, MARGIN_R, y, 0.5);
    y -= 12;
    txt(page, bold, "VENUE:", MARGIN_L, y, 9);
    txt(page, font, venueMap[venueBasis] ?? venueBasis, MARGIN_L + 44, y, 9);
    y -= 14;
  }

  // ── Verification / Signature ─────────────────────────────────────────────────
  drawLine(page, MARGIN_L, y, MARGIN_R, y, 0.8);
  y -= 14;

  drawRect(page, MARGIN_L, y - 1, MARGIN_R - MARGIN_L, 14, LIGHT);
  txt(page, bold, "VERIFICATION", MARGIN_L + 4, y + 2, 9);
  y -= 16;

  const verificationText =
    "Under penalty of perjury, I declare that I have read the foregoing, and the facts alleged are true and correct to " +
    "the best of my knowledge and belief. I understand that pursuant to section 92.525, Florida Statutes, the making of " +
    "a false statement of material fact in this document constitutes a felony of the third degree.";
  y = wrapText(page, font, verificationText, MARGIN_L, y, MARGIN_R - MARGIN_L, 8, 3);
  y -= 14;

  // Signature line — capture Y for signature image overlay
  sigLineY = y;
  drawLine(page, MARGIN_L, y, MARGIN_L + 200, y, 0.5);
  txt(page, font, `Date: ${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}`, MARGIN_L + 220, y + 2, 9);
  y -= 4;
  txt(page, font, "Plaintiff Signature", MARGIN_L, y, 7.5, GRAY);
  y -= 14;

  txt(page, bold, "Print Name:", MARGIN_L, y, 9);
  txt(page, font, d.plaintiffName ?? "", MARGIN_L + 64, y, 9);
  y -= 12;
  txt(page, bold, "Address:", MARGIN_L, y, 9);
  txt(page, font, pAddr, MARGIN_L + 52, y, 9);
  y -= 12;
  txt(page, bold, "Phone:", MARGIN_L, y, 9);
  txt(page, font, d.plaintiffPhone ?? "", MARGIN_L + 40, y, 9);
  y -= 20;

  // ── Footer note ─────────────────────────────────────────────────────────────
  drawLine(page, MARGIN_L, y, MARGIN_R, y, 0.4);
  y -= 10;
  const flNote =
    "Florida Small Claims — Claim limit: $8,000 (exclusive of costs, interest, and attorney's fees) — Fla. Stat. §34.011";
  const flNoteW = font.widthOfTextAtSize(flNote, 7);
  txt(page, font, flNote, (PW - flNoteW) / 2, y, 7, GRAY);

  // ── Signature image overlay ──────────────────────────────────────────────────
  if (opts?.signatureBytes && sigLineY > 0) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      page.drawImage(sigImg, { x: MARGIN_L, y: sigLineY, width: 180, height: 36, opacity: 1 });
    } catch { /* ignore invalid image data */ }
  }

  return Buffer.from(await doc.save());
}

// ─── Form Definition ──────────────────────────────────────────────────────────

const flStatementOfClaimDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-STATEMENT-OF-CLAIM",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFLStatementOfClaim(d, body, opts);
  },
};

FormRegistry.register(flStatementOfClaimDefinition);
export { flStatementOfClaimDefinition };
