/**
 * FL Summons/Notice to Appear for Pretrial Conference — Form 7.322.
 *
 * Outputs the official Florida Form 7.322 (fl-summons-7322.pdf, 4 pages) with a
 * filled-in case-data cover page inserted at position 0.  The cover page carries
 * all plaintiff/defendant information, courtroom-assignment blanks, and the full
 * Form 7.322 notice text.  The official form pages that follow are the
 * court-required judicial-council template.
 *
 * Rendering technique:
 *   PDFDocument.load() on fl-summons-7322.pdf → insertPage(0) cover page →
 *   coordinate overlay of case data.  Court-assigned fields (case number, date,
 *   time, courtroom, location) are left blank on the cover page for the clerk.
 *
 * One definition file covers all FL counties. County-specific definitions
 * simply override the county name and clerk filing address.
 *
 * Legal basis: Fla. Sm. Cl. R. 7.060; Form 7.322 (eff. January 1, 2026).
 * Required for all FL small claims filings.
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { FORMS_DIR } from "../../routes/forms-common";

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";

const FL_SUMMONS_PDF_PATH = path.join(FORMS_DIR, "fl-summons-7322.pdf");

// ─── Page constants ────────────────────────────────────────────────────────────
const PW = 612;
const PH = 792;
const BLACK = rgb(0, 0, 0);
const GRAY  = rgb(0.5, 0.5, 0.5);
const AMBER = rgb(0.75, 0.45, 0.0);

const ML = 54;
const MR = PW - 54;
const TW = MR - ML;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawLine(
  page: PDFPage, x1: number, y1: number, x2: number, y2: number,
  thickness = 0.5, color = BLACK
) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, fillR = 0.92, fillG = 0.92, fillB = 0.92) {
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(fillR, fillG, fillB), borderColor: BLACK, borderWidth: 0.5 });
}

function txt(
  page: PDFPage, font: PDFFont,
  text: string | null | undefined,
  x: number, y: number, size = 9, color = BLACK
) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function wrapText(
  page: PDFPage, font: PDFFont,
  text: string,
  x: number, y: number,
  maxWidth: number, size = 8, lineGap = 2.5
): number {
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
  if (line) {
    txt(page, font, line, x, curY, size);
    curY -= size + lineGap;
  }
  return curY;
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

export async function buildFLSummons(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
  countyOverride?: string,
  clerkAddressOverride?: string
): Promise<Buffer> {
  // Load the official FL Summons PDF (Forms 7.316 + 7.322, 4 pages).
  // Insert a filled-in cover page at position 0 so the output begins with all
  // case data pre-populated; the official form pages follow as the
  // court-required judicial-council template.
  const summonsPdfBytes = fs.readFileSync(FL_SUMMONS_PDF_PATH);
  const doc  = await PDFDocument.load(summonsPdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let sigLineY = 0;

  const page = doc.insertPage(0, [PW, PH]);
  const countyName = countyOverride ?? countyDisplay((d as any).countyId);
  const clerkAddr  = clerkAddressOverride ?? "";

  let y = PH - 34;

  // ── Header ──────────────────────────────────────────────────────────────────
  const h1 = `IN THE COUNTY COURT, ${countyName.toUpperCase()} COUNTY, FLORIDA`;
  const h2 = "SMALL CLAIMS DIVISION";
  const h3 = "SUMMONS / NOTICE TO APPEAR FOR PRETRIAL CONFERENCE";

  txt(page, bold, h1, (PW - bold.widthOfTextAtSize(h1, 9)) / 2, y, 9);
  y -= 12;
  txt(page, bold, h2, (PW - bold.widthOfTextAtSize(h2, 9)) / 2, y, 9);
  y -= 12;
  txt(page, bold, h3, (PW - bold.widthOfTextAtSize(h3, 9)) / 2, y, 9);
  y -= 10;

  // Courthouse address (centered, gray)
  const courthouseAddrLine = [
    d.courthouseAddress,
    d.courthouseCity ? `${d.courthouseCity}, FL` : null,
    d.courthouseZip,
  ].filter(Boolean).join(" ");
  if (courthouseAddrLine) {
    txt(page, font, courthouseAddrLine, (PW - font.widthOfTextAtSize(courthouseAddrLine, 8)) / 2, y, 8, GRAY);
    y -= 9;
  }

  const formRef = "Form 7.322 — Fla. Sm. Cl. R. 7.060 (eff. January 1, 2026)";
  txt(page, font, formRef, (PW - font.widthOfTextAtSize(formRef, 6.5)) / 2, y, 6.5, GRAY);
  y -= 9;

  drawLine(page, ML, y, MR, y, 1.2);
  y -= 11;

  // ── Case number / filing address row ─────────────────────────────────────────
  txt(page, bold, "CASE NO.:", ML, y, 8.5);
  drawLine(page, ML + 54, y - 1, ML + 200, y - 1, 0.5, GRAY);
  if (clerkAddr) {
    const fileWith = "FILE WITH: " + clerkAddr;
    const fw = font.widthOfTextAtSize(fileWith, 7);
    txt(page, font, fileWith, MR - fw, y, 7, GRAY);
  }
  y -= 10;
  drawLine(page, ML, y, MR, y, 0.5);
  y -= 11;

  // ── STATE OF FLORIDA header ──────────────────────────────────────────────────
  drawRect(page, ML, y - 1, TW, 12);
  const sofTitle = "STATE OF FLORIDA — NOTICE TO PLAINTIFF(S) AND DEFENDANT(S)";
  txt(page, bold, sofTitle, (PW - bold.widthOfTextAtSize(sofTitle, 8)) / 2, y + 1, 8);
  y -= 14;

  // ── Two-column: Plaintiff | Defendant info ───────────────────────────────────
  const COL_MID = ML + TW / 2;

  drawRect(page, ML, y - 1, COL_MID - ML - 2, 11);
  drawRect(page, COL_MID + 2, y - 1, MR - COL_MID - 2, 11);
  txt(page, bold, "PLAINTIFF(S) — Name and Address:", ML + 3, y + 1, 7.5);
  txt(page, bold, "DEFENDANT(S) — Name and Address:", COL_MID + 5, y + 1, 7.5);
  y -= 12;

  const PCOL = ML + 3;
  const DCOL = COL_MID + 5;

  const pltName  = d.plaintiffName ?? "";
  const pltLine2 = d.plaintiffAddress ?? "";
  const pltLine3 = [d.plaintiffCity, d.plaintiffState ?? "FL", d.plaintiffZip].filter(Boolean).join(", ");
  const pltPhone = d.plaintiffPhone ?? "";

  const defName  = d.defendantName ?? "";
  const defLine2 = d.defendantAddress ?? "";
  const defLine3 = [d.defendantCity, d.defendantState ?? "FL", d.defendantZip].filter(Boolean).join(", ");

  txt(page, bold, pltName, PCOL, y, 8.5);
  txt(page, bold, defName, DCOL, y, 8.5);
  y -= 10;
  txt(page, font, pltLine2.slice(0, 52), PCOL, y, 8);
  txt(page, font, defLine2.slice(0, 52), DCOL, y, 8);
  y -= 9;
  txt(page, font, pltLine3.slice(0, 52), PCOL, y, 8);
  txt(page, font, defLine3.slice(0, 52), DCOL, y, 8);
  y -= 9;
  if (pltPhone) {
    txt(page, font, `Phone: ${pltPhone}`, PCOL, y, 7.5, GRAY);
  }
  y -= 9;

  drawLine(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Main notification paragraph ──────────────────────────────────────────────
  const notifyText =
    "YOU ARE HEREBY NOTIFIED that you are required to appear in person or by attorney at " +
    "the ................... in Courtroom #......., located at ..............................., " +
    "on ......(date)......, at ......(time)......, for a PRETRIAL CONFERENCE before this court.";
  y = wrapText(page, bold, notifyText, ML, y, TW, 8.5, 3);
  y -= 7;

  // ── IMPORTANT box ────────────────────────────────────────────────────────────
  page.drawRectangle({ x: ML, y: y - 26, width: TW, height: 30, color: rgb(1.0, 0.97, 0.90), borderColor: AMBER, borderWidth: 1.0 });
  const imp1 = "IMPORTANT — READ CAREFULLY";
  const imp2 = "THE CASE WILL NOT BE TRIED AT THAT TIME.  DO NOT BRING WITNESSES — APPEAR IN PERSON OR BY ATTORNEY.";
  txt(page, bold, imp1, (PW - bold.widthOfTextAtSize(imp1, 8)) / 2, y + 1, 8, AMBER);
  y -= 11;
  txt(page, bold, imp2, (PW - bold.widthOfTextAtSize(imp2, 7.5)) / 2, y + 1, 7.5, BLACK);
  y -= 23;

  // ── Body paragraphs ──────────────────────────────────────────────────────────
  const para1 =
    "The defendant(s) must appear in court on the date specified in order to avoid a default judgment. " +
    "The plaintiff(s) must appear to avoid having the case dismissed for lack of prosecution. A written " +
    "MOTION or ANSWER to the court by the plaintiff(s) or the defendant(s) shall not excuse the personal " +
    "appearance of a party or its attorney in the PRETRIAL CONFERENCE. The date and time of the pretrial " +
    "conference CANNOT be rescheduled without good cause and prior court approval.";
  y = wrapText(page, font, para1, ML, y, TW, 7.5, 2.5);
  y -= 4;

  const para2 =
    "Any business entity recognized under Florida law may be represented at any stage of the trial court " +
    "proceedings by any principal of the business entity who has legal authority to bind the business " +
    "entity or any employee authorized in writing by a principal of the business entity. " +
    "Written authorization must be brought to the Pretrial Conference.";
  y = wrapText(page, font, para2, ML, y, TW, 7.5, 2.5);
  y -= 4;

  const para3 =
    "The purpose of the pretrial conference is to record your appearance, to determine if you admit all " +
    "or part of the claim, to enable the court to determine the nature of the case, and to set the case " +
    "for trial if the case cannot be resolved at the pretrial conference. Mediation may take place at " +
    "the pretrial conference. Whoever appears for a party must have full authority to settle. " +
    "Failure to have full authority to settle at this pretrial conference may result in the imposition " +
    "of costs and attorney fees incurred by the opposing party.";
  y = wrapText(page, font, para3, ML, y, TW, 7.5, 2.5);
  y -= 4;

  const para4 =
    "If you admit the claim, but desire additional time to pay, you must come and state the circumstances " +
    "to the court. The court may or may not approve a payment plan and withhold judgment or execution or levy.";
  y = wrapText(page, font, para4, ML, y, TW, 7.5, 2.5);
  y -= 8;

  // ── RIGHT TO VENUE (required in bold per Fla. Sm. Cl. R. 7.060) ─────────────
  drawRect(page, ML, y - 1, TW, 11);
  txt(page, bold, "RIGHT TO VENUE", ML + 3, y + 1, 8);
  y -= 14;

  const venueText =
    "The law gives the person or company who has sued you the right to file in any one of several places " +
    "as listed below. However, if you have been sued in any place other than one of these places, you, as " +
    "the defendant(s), have the right to request that the case be moved to a proper location or venue. " +
    "A proper location or venue may be one of the following: (1) where the contract was entered into; " +
    "(2) if the suit is on an unsecured promissory note, where the note is signed or where the maker resides; " +
    "(3) if the suit is to recover property or to foreclose a lien, where the property is located; " +
    "(4) where the event giving rise to the suit occurred; (5) where any one or more of the defendants sued " +
    "reside; (6) any location agreed to in a contract; (7) in an action for money due, if there is no agreement " +
    "as to where suit may be filed, where payment is to be made. If you, as the defendant(s), believe the " +
    "plaintiff(s) has/have not sued in one of these correct places, you must appear on your court date and " +
    "orally request a transfer, or you must file a WRITTEN request for transfer in affidavit form (sworn to " +
    "under oath) with the court 7 days prior to your first court date and send a copy to the plaintiff(s) or " +
    "plaintiff's(s') attorney, if any.";
  y = wrapText(page, font, venueText, ML, y, TW, 7.5, 2.5);
  y -= 7;

  // ── Copy of claim notice ─────────────────────────────────────────────────────
  txt(page, bold, "A copy of the statement of claim shall be served with this summons/notice to appear.", ML, y, 8);
  y -= 12;

  drawLine(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Issued on / Clerk signature ──────────────────────────────────────────────
  txt(page, bold, "Issued on:", ML, y, 8.5);
  drawLine(page, ML + 56, y - 1, ML + 200, y - 1, 0.5, GRAY);

  const rightX = ML + TW * 0.52;
  txt(page, font, "As Clerk of the County Court", rightX, y, 8.5);
  y -= 14;

  txt(page, font, "By:", rightX, y, 8.5);
  drawLine(page, rightX + 18, y - 1, MR, y - 1, 0.5);
  y -= 9;
  const dpLabel = "Deputy Clerk";
  txt(page, font, dpLabel, MR - font.widthOfTextAtSize(dpLabel, 7.5), y, 7.5, GRAY);
  y -= 14;

  // ── Plaintiff prepared-by / signature line ───────────────────────────────────
  y -= 6;
  txt(page, bold, "Prepared and filed by (Plaintiff):", ML, y, 8);
  sigLineY = y - 1;
  drawLine(page, ML + 178, sigLineY, ML + 360, sigLineY, 0.5);
  txt(page, font, `Date: ${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}`, ML + 368, y, 7.5);
  y -= 7;
  txt(page, font, "Plaintiff Signature", ML + 178, y, 7, GRAY);
  y -= 12;

  // ── ADA notice ───────────────────────────────────────────────────────────────
  drawLine(page, ML, y, MR, y, 0.3, GRAY);
  y -= 9;
  const ada =
    "If you are a person with a disability who needs any accommodation in order to participate in this proceeding, " +
    "you are entitled, at no cost to you, to the provision of certain assistance. Please contact the ADA Coordinator " +
    "at your local courthouse at least 7 days before your scheduled court appearance, or immediately upon receiving " +
    "this notice if the time before the scheduled appearance is less than 7 days.";
  y = wrapText(page, font, ada, ML, y, TW, 6.5, 2);
  void y;

  // ── Signature image overlay ──────────────────────────────────────────────────
  if (opts?.signatureBytes && sigLineY > 0) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      page.drawImage(sigImg, { x: ML + 178, y: sigLineY, width: 160, height: 32, opacity: 1 });
    } catch { /* ignore invalid image data */ }
  }

  return Buffer.from(await doc.save());
}

// ─── Form Definitions ─────────────────────────────────────────────────────────

const flSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-SUMMONS",
  renderingTechnique: "pdf-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(d, body, opts);
  },
};

const flVolusiaSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-VOLUSIA-SUMMONS",
  renderingTechnique: "png-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(d, body, opts, "Volusia", "101 N. Alabama Ave., DeLand");
  },
};

const flBrowardSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-BROWARD-SUMMONS",
  renderingTechnique: "png-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(d, body, opts, "Broward", "201 SE 6th St., Rm. 01250, Fort Lauderdale");
  },
};

const flOrangeSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-ORANGE-SUMMONS",
  renderingTechnique: "png-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(d, body, opts, "Orange", "425 N. Orange Ave., Ste. 100, Orlando");
  },
};

const flHillsboroughSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-HILLSBOROUGH-SUMMONS",
  renderingTechnique: "png-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(d, body, opts, "Hillsborough", "800 E. Twiggs St., Tampa");
  },
};

const flPalmBeachSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-PALM-BEACH-SUMMONS",
  renderingTechnique: "png-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(d, body, opts, "Palm Beach", "205 N. Dixie Hwy., West Palm Beach");
  },
};

FormRegistry.register(flSummonsDefinition);
FormRegistry.register(flVolusiaSummonsDefinition);
FormRegistry.register(flBrowardSummonsDefinition);
FormRegistry.register(flOrangeSummonsDefinition);
FormRegistry.register(flHillsboroughSummonsDefinition);
FormRegistry.register(flPalmBeachSummonsDefinition);

export {
  flSummonsDefinition,
  flVolusiaSummonsDefinition,
  flBrowardSummonsDefinition,
  flOrangeSummonsDefinition,
  flHillsboroughSummonsDefinition,
  flPalmBeachSummonsDefinition,
};
