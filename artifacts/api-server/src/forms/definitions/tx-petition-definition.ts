/**
 * TX Small Claims Petition — statewide programmatic form.
 *
 * Generates a professional, pre-filled Texas justice court small claims petition
 * entirely with pdf-lib (no template PDF required). Covers all 254 Texas counties.
 * The county and precinct header is derived from the case record, so the same
 * definition serves every TX county.
 *
 * Legal basis:
 *   Texas Rules of Civil Procedure, Part V — Rules of Practice in Justice Courts
 *   Tex. Gov't Code § 27.031 et seq.; OCA Form "Petition: Small Claims Case"
 *   Claim limit: $20,000 (exclusive of attorneys' fees, interest, and court costs)
 *   Filing fees (Tex. Gov't Code § 118.121): ≤$200: $46 | $201–$500: $71 |
 *     $501–$1,000: $121 | $1,001–$5,000: $221 | $5,001–$10,000: $271 |
 *     $10,001–$20,000: $321
 *
 * Official PDF status: The TX OCA small claims forms (txcourts.gov) could not be
 * downloaded — all tried media URLs under /media/<id>/sc1.pdf returned HTTP 404.
 * The OCA form media IDs change when forms are revised; this form remains programmatic
 * until the current media ID is confirmed and automated download is verified.
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

const ML = 54;
const MR = PW - 54;
const CW = MR - ML;
const CMID = ML + CW / 2;

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, t = 0.5, color = BLACK) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color });
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, fill = LIGHT, border = BLACK, bw = 0.5) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: bw });
}

function txt(
  page: PDFPage,
  font: PDFFont,
  text: string | null | undefined,
  x: number,
  y: number,
  size = 9,
  color = BLACK,
) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function wrap(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxW: number,
  size = 9,
  gap = 4,
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

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtAmt(v: number | null | undefined): string {
  if (!v) return "";
  return "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return (m && d && y) ? `${m}/${d}/${y}` : iso;
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^tx-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function claimLabel(ct?: string | null): string {
  const MAP: Record<string, string> = {
    goods:            "Goods, wares, or merchandise sold",
    services:         "Work done or materials furnished",
    loan:             "Money lent",
    account_stated:   "Money due on account stated",
    contract:         "Written or oral contract",
    rent:             "Rent for premises",
    property_damage:  "Property damage",
    personal_injury:  "Personal injury",
    security_deposit: "Security deposit",
    other:            "Other",
  };
  return ct ? (MAP[ct] ?? ct) : "";
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function buildTXPetition(
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
  const courthouseAddress: string = txCountyRecord
    ? `${txCountyRecord.courthouseAddress}, ${txCountyRecord.courthouseCity}, TX ${txCountyRecord.courthouseZip}`
    : "";

  let y = PH - 36;

  // ── Navy header bar ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PH - 42, width: PW, height: 42, color: NAVY });
  const h1 = "PETITION — SMALL CLAIMS CASE";
  const h2 = "Texas Justice Court";
  const h1w = bold.widthOfTextAtSize(h1, 12);
  const h2w = font.widthOfTextAtSize(h2, 8.5);
  txt(page, bold, h1, (PW - h1w) / 2, PH - 17, 12, rgb(1, 1, 1));
  txt(page, font, h2, (PW - h2w) / 2, PH - 31, 8.5, rgb(0.75, 0.82, 0.95));

  y = PH - 58;

  // ── Court name ──────────────────────────────────────────────────────────────
  const courtLine1 = county
    ? `IN THE JUSTICE COURT, ${county.toUpperCase()} COUNTY, TEXAS`
    : "IN THE JUSTICE COURT, ____________ COUNTY, TEXAS";
  const courtLine2 = courthouseName
    ? courthouseName
    : "Precinct _____, Place _____";

  const cl1w = bold.widthOfTextAtSize(courtLine1, 9.5);
  const cl2w = font.widthOfTextAtSize(courtLine2, 8.5);
  txt(page, bold, courtLine1, (PW - cl1w) / 2, y, 9.5, DKBLU);
  y -= 13;
  txt(page, font, courtLine2, (PW - cl2w) / 2, y, 8.5, GRAY);
  y -= 11;
  if (courthouseAddress) {
    const cl3w = font.widthOfTextAtSize(courthouseAddress, 7.5);
    txt(page, font, courthouseAddress, (PW - cl3w) / 2, y, 7.5, GRAY);
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
  const dateLabel = `Date Filed: ${dateStr}`;
  const dlw = font.widthOfTextAtSize(dateLabel, 8);
  txt(page, font, dateLabel, MR - dlw, y, 8, GRAY);
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

  // Name
  txt(page, bold, "Name:", PC, y, 8);
  const pName = d.plaintiffDbaName ? `${d.plaintiffName ?? ""} d/b/a ${d.plaintiffDbaName}` : (d.plaintiffName ?? "");
  txt(page, font, pName, PC + 34, y, 8);
  txt(page, bold, "Name:", DC, y, 8);
  txt(page, font, d.defendantName ?? "", DC + 34, y, 8);
  y -= 11;

  // Address
  txt(page, bold, "Address:", PC, y, 8);
  wrap(page, font, d.plaintiffAddress ?? "", PC + 46, y, PCOL_W - 46, 8, 3);
  txt(page, bold, "Address:", DC, y, 8);
  wrap(page, font, d.defendantAddress ?? "", DC + 46, y, PCOL_W - 46, 8, 3);
  y -= 11;

  // City/State/Zip
  txt(page, bold, "City/State:", PC, y, 8);
  txt(page, font, [d.plaintiffCity, (d.plaintiffState ?? "TX"), d.plaintiffZip].filter(Boolean).join(", "), PC + 52, y, 8);
  txt(page, bold, "City/State:", DC, y, 8);
  txt(page, font, [d.defendantCity, (d.defendantState ?? "TX"), d.defendantZip].filter(Boolean).join(", "), DC + 52, y, 8);
  y -= 11;

  // Phone
  txt(page, bold, "Phone:", PC, y, 8);
  txt(page, font, d.plaintiffPhone ?? "", PC + 34, y, 8);
  txt(page, bold, "Phone:", DC, y, 8);
  txt(page, font, d.defendantPhone ?? "", DC + 34, y, 8);
  y -= 11;

  // Email (plaintiff only — common on TX filings)
  txt(page, bold, "Email:", PC, y, 8);
  txt(page, font, d.plaintiffEmail ?? "", PC + 34, y, 8);
  y -= 12;

  // Defendant business agent (if applicable)
  if (d.defendantIsBusinessOrEntity && d.defendantAgentName) {
    txt(page, bold, "Registered Agent:", DC, y, 8);
    txt(page, font, d.defendantAgentName, DC + 88, y, 8);
    y -= 11;
    if (d.defendantAgentStreet) {
      txt(page, bold, "Agent Address:", DC, y, 8);
      txt(page, font,
        [d.defendantAgentStreet, d.defendantAgentCity, (d.defendantAgentState ?? "TX"), d.defendantAgentZip].filter(Boolean).join(", "),
        DC + 76, y, 8);
      y -= 11;
    }
  }

  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Statement of Claim ──────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "STATEMENT OF CLAIM", ML + 4, y + 1, 9);
  y -= 15;

  // Claim type + amount row
  const ctLabel = claimLabel((d as any).claimType);
  txt(page, bold, "Nature of Claim:", ML, y, 8.5);
  txt(page, font, ctLabel, ML + 90, y, 8.5);
  txt(page, bold, "Amount Claimed:", CMID - 10, y, 8.5);
  txt(page, bold, fmtAmt(d.claimAmount as number | null), CMID + 80, y, 9, DKBLU);
  y -= 11;

  if (d.incidentDate) {
    txt(page, bold, "Date of Incident:", ML, y, 8.5);
    txt(page, font, fmtDate(d.incidentDate), ML + 90, y, 8.5);
    y -= 11;
  }

  line(page, ML, y, MR, y, 0.3, GRAY);
  y -= 10;

  // Claim description
  txt(page, bold, "Factual Basis of Claim:", ML, y, 8.5);
  y -= 12;

  if (d.claimDescription) {
    const cleaned = d.claimDescription
      .replace(/mock\s+small\s+claims\s+case\s+summary/gi, "")
      .replace(/mock\s+case\s+summary/gi, "")
      .replace(/sample\s+case/gi, "")
      .replace(/^\s*[-–—:]+\s*/gm, "")
      .trim();
    if (cleaned) {
      y = wrap(page, font, cleaned, ML, y, CW, 8.5, 4.5);
      y -= 4;
    }
  } else {
    rect(page, ML, y - 48, CW, 56, rgb(0.98, 0.98, 0.98), GRAY, 0.3);
    y -= 56;
  }

  // How amount calculated
  if (d.howAmountCalculated) {
    txt(page, bold, "How Amount Calculated:", ML, y, 8.5);
    y -= 12;
    y = wrap(page, font, d.howAmountCalculated, ML, y, CW, 8.5, 4);
    y -= 4;
  }

  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Prior demand ────────────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "PRE-SUIT DEMAND", ML + 4, y + 1, 9);
  y -= 15;

  const hasDemand = d.priorDemandMade === true;
  txt(page, bold, "Written demand sent to defendant before filing?", ML, y, 8.5);
  txt(page, bold, hasDemand ? "[X] Yes" : "No", ML + 258, y, 8.5, hasDemand ? rgb(0.1, 0.5, 0.2) : GRAY);
  y -= 11;

  if (hasDemand && d.priorDemandDescription) {
    txt(page, bold, "Demand details:", ML, y, 8.5);
    y -= 11;
    y = wrap(page, font, d.priorDemandDescription, ML, y, CW, 8, 3.5);
    y -= 4;
  }

  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Venue basis ─────────────────────────────────────────────────────────────
  txt(page, bold, "Basis for filing in this precinct:", ML, y, 8.5);
  const venueText = (d as any).venueBasis
    ? String((d as any).venueBasis)
    : "The defendant resides in, or the transaction occurred in, this justice court precinct.";
  y -= 11;
  y = wrap(page, font, venueText, ML, y, CW, 8.5, 4);
  y -= 8;

  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Signature block ─────────────────────────────────────────────────────────
  rect(page, ML, y - 2, MR - ML, 13, LIGHT);
  txt(page, bold, "PLAINTIFF CERTIFICATION", ML + 4, y + 1, 9);
  y -= 15;

  const certText =
    "I certify that the information in this petition is true and correct. I am the plaintiff (or authorized representative) " +
    "and I am requesting the court to issue a citation and set this case for trial.";
  y = wrap(page, font, certText, ML, y, CW, 8.5, 4);
  y -= 14;

  // Signature line
  if (opts?.signatureBytes) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes).catch(() => null)
        ?? await doc.embedJpg(opts.signatureBytes).catch(() => null);
      if (sigImg) {
        page.drawImage(sigImg, { x: ML, y: y - 4, width: 180, height: 28 });
      }
    } catch { /* ignore */ }
  }

  line(page, ML, y - 2, ML + 200, y - 2, 0.5);
  txt(page, font, "Plaintiff Signature", ML, y - 13, 7.5, GRAY);
  txt(page, bold, "Date:", MR - 120, y - 2, 8.5);
  line(page, MR - 90, y - 2, MR, y - 2, 0.5);
  txt(page, font, d.plaintiffName ?? "", ML, y + 4, 8);
  y -= 28;

  // ── Footer ──────────────────────────────────────────────────────────────────
  line(page, ML, 38, MR, 38, 0.5, GRAY);
  txt(page, font, "Generated by Small Claims Genie  •  Texas Justice Court Small Claims Petition", ML, 25, 7.5, GRAY);
  const noteW = font.widthOfTextAtSize("Claim limit: $20,000 (excl. fees, interest, costs)", 7.5);
  txt(page, font, "Claim limit: $20,000 (excl. fees, interest, costs)", MR - noteW, 25, 7.5, GRAY);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ─── Form definition registration ────────────────────────────────────────────

const txPetitionDefinition: FormDefinition = {
  state: "TX",
  formId: "TX-PETITION",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXPetition(d, b, opts);
  },
};

FormRegistry.register(txPetitionDefinition);

export { txPetitionDefinition };
