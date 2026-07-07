/**
 * WA MISC 05.0100 — Notice of Small Claim (District Court of Washington)
 *
 * Uses the official WA Courts form PDF obtained from:
 *   https://www.courts.wa.gov/forms/documents/MISC%2005%200100%20Notice%20of%20Small%20Claim%202025%2001.pdf
 *
 * Technique: coordinate overlay — the official PDF has no AcroForm fields
 *   (pdftk dump_data_fields returns Form: none). Data is drawn directly onto
 *   the official government form pages using pdf-lib drawText/drawImage.
 *
 * Legal basis:
 *   RCW 12.40.020, .050, .060, .070 — Small Claims Department, District Court
 *   Claim limit: $10,000 (RCW 12.40.010); assignees/collection agencies may not file
 *   Form MISC 05.0100 (01/2025)
 *
 * Coordinate derivation:
 *   All positions derived from `pdftotext -bbox-layout` output.
 *   pdftotext y is measured from the TOP of each page (y increases downward).
 *   pdf-lib y is measured from the BOTTOM of each page (y increases upward).
 *   Conversion: pdf_lib_y = page_height(792) − pdftotext_y_from_top
 *
 * Form structure:
 *   Page 1 (index 0): Court header + party information (plaintiff/defendant) + principal claim
 *   Page 2 (index 1): Court notice details (interest/total, hearing date/location) + Statement of Claim + signature block
 *   Page 3 (index 2): Military service declaration + certification + signature
 *
 * Fill responsibilities:
 *   Plaintiff fills: party info, claim amount, statement, claim type, description, certification
 *   Court fills: hearing date/time/location (pre-filled here if available from hearingDate/hearingTime)
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { ASSET_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(ASSET_DIR, "wa-forms", "wa-misc-05-0100.pdf");

const BLACK = rgb(0, 0, 0);

const PH = 792;
const FONT_SIZE = 9;

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    .replace(/^wa-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Parse a time string (e.g. "10:30 AM", "14:00") → { time, ampm } */
function parseTime(t?: string | null): { time: string; ampm: "a.m." | "p.m." | "" } {
  if (!t) return { time: "", ampm: "" };
  const upper = t.trim().toUpperCase();
  const isPm = upper.includes("PM");
  const isAm = upper.includes("AM");
  const digits = upper.replace(/[^0-9:]/g, "").trim();
  return {
    time: digits,
    ampm: isPm ? "p.m." : isAm ? "a.m." : "",
  };
}

/**
 * Maps claimType values to the WA form checkbox labels and their
 * overlay coordinates on page 2 (pdf-lib y from bottom).
 *
 * Checkbox positions derived from pdftotext bbox-layout page 2:
 *   "Faulty Workmanship" label at x=120.6, pdftotext y=468-483 → pdf_lib_y=309
 *   "Merchandise"        label at x=242.2, same y row
 *   "Auto Damage"        label at x=333.7, same y row
 *   "Wages"              label at x=120.6, pdftotext y=487-502 → pdf_lib_y=291
 *   "Loan"               label at x=183.6, same y row
 *   "Return of Deposit"  label at x=242.2, same y row
 *   "Rent"               label at x=354.6, same y row
 *   "Property Damage"    label at x=414.7, same y row
 *   "Other"              label at x=120.6, pdftotext y=505-521 → pdf_lib_y=272
 *
 * Checkbox X mark is drawn 11 pts to the left of the label start (box width ~8 pts).
 */
interface CheckboxCoord { x: number; y: number }

const CHECKBOX_COORDS: Record<string, CheckboxCoord> = {
  "Faulty Workmanship":  { x: 109, y: 309 },
  "Merchandise":         { x: 231, y: 309 },
  "Auto Damage":         { x: 322, y: 309 },
  "Wages":               { x: 109, y: 291 },
  "Loan":                { x: 172, y: 291 },
  "Return of Deposit":   { x: 231, y: 291 },
  "Rent":                { x: 343, y: 291 },
  "Property Damage":     { x: 403, y: 291 },
  "Other":               { x: 109, y: 272 },
};

function claimLabel(claimType?: string | null): string {
  const MAP: Record<string, string> = {
    // snake_case values (legacy / direct API calls)
    goods:                  "Merchandise",
    services:               "Faulty Workmanship",
    contract:               "Faulty Workmanship",
    loan:                   "Loan",
    money_owed:             "Loan",
    security_deposit:       "Return of Deposit",
    property_damage:        "Property Damage",
    vehicle_damage:         "Auto Damage",
    rent:                   "Rent",
    wages:                  "Wages",
    check:                  "Other",
    fraud:                  "Other",
    other:                  "Other",
    account_stated:         "Loan",
    personal_injury:        "Other",
    // Title-case values from intake UI (new.tsx / intake-step-2.tsx)
    "Money Owed":                          "Loan",
    "Unpaid Debt":                         "Loan",
    "Security Deposit":                    "Return of Deposit",
    "Property Damage":                     "Property Damage",
    "Vehicle Damage/Accident":             "Auto Damage",
    "Landlord/Tenant Dispute":             "Rent",
    "Online Purchase/Marketplace Dispute": "Merchandise",
    "Unpaid Wages/Employment":             "Wages",
    "Contract Dispute":                    "Faulty Workmanship",
    "Fraud":                               "Other",
    "Other":                               "Other",
  };
  return claimType ? (MAP[claimType] ?? "Other") : "Other";
}

export async function buildWANotice(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const pdfBytes = fs.readFileSync(PDF_PATH);
  const pdfDoc   = await PDFDocument.load(pdfBytes);
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const [pg1, pg2, pg3] = pages;

  const countyName = countyDisplay((d as any).countyId);
  const claimAmt   = Number(d.claimAmount ?? 0);
  const { time: hearingTime, ampm } = parseTime(d.hearingTime);
  const pName = (d as any).plaintiffDbaName
    ? `${d.plaintiffName ?? ""} d/b/a ${(d as any).plaintiffDbaName}`
    : (d.plaintiffName ?? "");
  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });

  // Helper: draw text at (x, y) in pdf-lib coords (y from bottom).
  function t(page: typeof pg1, text: string | null | undefined, x: number, y: number, size = FONT_SIZE) {
    if (!text) return;
    page.drawText(String(text), { x, y, size, font, color: BLACK });
  }

  // ── PAGE 1: Court header + party information + principal claim ──────────────
  // County name (after "County of ___" in header).
  // Header text bbox: [77.88, 220.61-237.79] → pdf_lib_y = 792-237 = 555
  t(pg1, countyName, 307, 555);

  // Small Claim No. (case number) — court fills but pre-fill if known.
  // "SMALL CLAIM NO." label bbox: [317.04, 263.98-279.79] → pdf_lib_y = 792-279 = 513
  t(pg1, (d as any).caseNumber, 415, 513);

  // ── Plaintiff information ──────────────────────────────────────────────────
  // Fill area for each field is the blank space BELOW its label text.
  // "PLAINTIFF'S NAME" label yMax=256 → fill to next label yMin=283 → midpoint y=270 from top → pdf_lib_y=522
  t(pg1, pName, 74, 522);

  // "ADDRESS" label yMax=298 → fill to next label yMin=331 → midpoint y=315 → pdf_lib_y=477
  t(pg1, d.plaintiffAddress, 74, 477);

  // "CITY ZIP STATE" label yMax=358 → fill to next label yMin=382 → midpoint y=370 → pdf_lib_y=422
  t(pg1, d.plaintiffCity, 74, 422);
  t(pg1, (d as any).plaintiffState ?? "WA", 243, 422);
  t(pg1, d.plaintiffZip, 307, 422);

  // "HOME PHONE NO." label yMax=409 → fill to VS. label yMin=437 → midpoint y=423 → pdf_lib_y=369
  t(pg1, d.plaintiffPhone, 74, 369);

  // ── Defendant information ─────────────────────────────────────────────────
  // "DEFENDANT'S NAME" label yMax=469 → fill to "ADDRESS" yMin=493 → midpoint y=481 → pdf_lib_y=311
  t(pg1, d.defendantName, 74, 311);

  // "ADDRESS" (def) label yMax=508 → fill to "CITY ZIP" yMin=544 → midpoint y=526 → pdf_lib_y=266
  t(pg1, d.defendantAddress, 74, 266);

  // "CITY ZIP STATE" (def) label yMax=572 → fill to "PHONE NO." yMin=595 → midpoint y=584 → pdf_lib_y=208
  t(pg1, d.defendantCity, 74, 208);
  t(pg1, d.defendantState ?? "WA", 249, 208);
  t(pg1, d.defendantZip, 307, 208);

  // "PHONE NO." (def) label yMax=610 → fill to notice text yMin=627 → midpoint y=619 → pdf_lib_y=173
  t(pg1, d.defendantPhone, 74, 173);

  // Principal claim amount.
  // "$" sign bbox: [108.0, 683.21-698.28] → pdf_lib_y = 792-698 = 94
  t(pg1, fmtAmount(claimAmt), 128, 94);

  // ── PAGE 2: Interest/total, court notice (hearing), Statement of Claim ──────

  // Interest amount (if any — leave blank if zero).
  // "$" bbox: [108.0, 70.84-85.91] → pdf_lib_y = 792-86 = 706
  // For now we report 0 interest; the court clerk adjusts.
  // t(pg2, "0.00", 128, 706);

  // Total amount equals principal (no pre-calculated interest).
  // "$" bbox: [108.0, 89.44-104.51] → pdf_lib_y = 792-104 = 688
  t(pg2, fmtAmount(claimAmt), 128, 688);

  // Hearing date and time — pre-filled only if available.
  // "on:" row bbox: [99.36, 126.58-142.39] → pdf_lib_y = 792-142 = 650
  if (d.hearingDate) {
    t(pg2, fmtDate(d.hearingDate), 125, 650);
  }
  if (hearingTime) {
    t(pg2, hearingTime, 406, 650);
  }
  if (ampm) {
    // Draw circle indicator next to the correct period (a.m./p.m.).
    // "a.m." bbox x=478, "p.m." bbox x=518 — draw asterisk to the left.
    const amX = ampm === "a.m." ? 472 : 512;
    t(pg2, "*", amX, 650, 8);
  }

  // Court address.
  // "at:" row bbox: [99.0, 158.74-174.55] → pdf_lib_y = 792-174 = 618
  if (d.courthouseAddress || d.courthouseName) {
    const addrParts = [d.courthouseName, d.courthouseAddress, d.courthouseCity].filter(Boolean);
    t(pg2, addrParts.join(", "), 125, 618, 8);
  }

  // Docket / judge's name.
  // "Docket/calendar" bbox: [121.56, 204.26-217.44] → pdf_lib_y = 792-217 = 575
  if ((d as any).docketNumber) {
    t(pg2, (d as any).docketNumber, 248, 575);
  }

  // ── Statement of Claim block ──────────────────────────────────────────────
  // The statement spans bbox [72, 405.52-445.91] — a 3-line block (≈13 pts/line).
  // Line 1 (y≈405-418 from top): "I, (Name) , declare that the defendant named above"
  //   Plaintiff name goes at x=105 (after the "(Name)" placeholder), pdf_lib_y=375
  // Line 2 (y≈418-432 from top): "owes me the sum of $ [amount] in principal and $ [interest]"
  //   Principal at x=220, pdf_lib_y=362; interest at x=459, pdf_lib_y=362
  // Line 3 (y≈432-445 from top): "which was due and owing on (Date)"
  //   Date at x=297, pdf_lib_y=349
  t(pg2, pName,                   105, 375);
  t(pg2, fmtAmount(claimAmt),     220, 362);
  // Interest amount on same line (leave blank — 0 by default)
  t(pg2, fmtDate(d.incidentDate), 297, 349);

  // ── Claim type checkbox ───────────────────────────────────────────────────
  const cbLabel = claimLabel((d as any).claimType);
  const cbCoord = CHECKBOX_COORDS[cbLabel] ?? CHECKBOX_COORDS["Other"];
  // Draw an "X" inside the form's printed checkbox rectangle.
  pg2.drawText("X", { x: cbCoord.x + 1, y: cbCoord.y, size: 8, font, color: BLACK });

  // ── Claim description (reason for claim) ─────────────────────────────────
  // "Explain reason for claim:" label bbox: [72, 524.08-539.15] → pdf_lib_y=253
  // First description line starts just below the label at pdf_lib_y=235.
  if (d.claimDescription) {
    const maxW = 468;
    const words = d.claimDescription.replace(/\r/g, "").split(/\s+/).filter(Boolean);
    let line = "";
    let ly = 235;
    const lineGap = FONT_SIZE + 4;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, FONT_SIZE) > maxW && line) {
        t(pg2, line, 72, ly);
        ly -= lineGap;
        line = word;
        if (ly < 180) break; // stop before running into form footer
      } else {
        line = candidate;
      }
    }
    if (line && ly >= 180) t(pg2, line, 72, ly);
  }

  // ── PAGE 3: Military service + certification + signature ───────────────────
  // Check "I do not know if any defendants are covered by the Servicemember Civil Relief Act."
  // That checkbox label bbox: [107.99, 245.32-260.39] → pdf_lib_y = 792-252 = 540
  // The checkbox square is ~8 pts, positioned 11 pts to the left of the label start (x=107.99).
  pg3.drawText("X", { x: 96, y: PH - 253, size: 8, font, color: BLACK });

  // Signed at (City, State).
  // "Signed at (City and State):" label bbox: [71.99, 301.23-316.30] → pdf_lib_y=476
  // Fill area starts right after the label ends at approx x=237.
  const sigCity = d.plaintiffCity
    ? `${d.plaintiffCity}, ${(d as any).plaintiffState ?? "WA"}`
    : "";
  t(pg3, sigCity, 237, 476);

  // Date signed.
  // "Date:" label bbox: [409.56, 301.24-316.31] → same row, pdf_lib_y=476
  t(pg3, today, 452, 476);

  // Print name.
  // "Print name" label bbox: [310.56, 343.94-358.55] → pdf_lib_y=434
  t(pg3, pName, 370, 434);

  // ── Signature image overlay ───────────────────────────────────────────────
  // "Sign here" label bbox: [72.0, 343.94-358.55] → pdf_lib_y = 792-358 = 434
  // Draw signature image above the "Sign here" line (at the same y, extending up).
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await pdfDoc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await pdfDoc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        pg3.drawImage(sigImg, { x: 72, y: 434, width: 210, height: 30 });
      }
    } catch { /* ignore invalid image data */ }
  }

  return Buffer.from(await pdfDoc.save());
}

const waNoticeDefinition: FormDefinition = {
  state: "WA",
  formId: "WA-MISC05-0100",
  assetPath: PDF_PATH,
  renderingTechnique: "png-overlay",
  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildWANotice(d, body, opts);
  },
};

FormRegistry.register(waNoticeDefinition);
export { waNoticeDefinition };
