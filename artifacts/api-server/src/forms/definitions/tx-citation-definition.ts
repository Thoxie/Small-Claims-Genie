/**
 * TX Citation — Texas Justice Court Small Claims Citation.
 *
 * After the plaintiff files the petition, the justice court clerk issues a
 * Citation (Texas's term for a summons) commanding the defendant to appear.
 * This form is generated programmatically using pdf-lib — no template PDF.
 *
 * Legal basis:
 *   Tex. R. Civ. P. 502.5 (Citation — Justice Court)
 *   OCA Small Claims Citation form (statewide)
 *   Service is by constable or sheriff — private process servers are NOT
 *   authorized for the initial citation. Tex. R. Civ. P. 502.6.
 */

import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { TEXAS_COUNTIES } from "../../routes/counties";

const PW = 612;
const PH = 792;
const BLACK = rgb(0, 0, 0);
const NAVY  = rgb(0.05, 0.15, 0.35);
const GRAY  = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.93, 0.93, 0.93);
const DKBLU = rgb(0.1, 0.25, 0.55);
const WHITE = rgb(1, 1, 1);

const ML = 54;
const MR = PW - 54;
const CW = MR - ML;

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, t = 0.5, color = BLACK) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color });
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, fill = LIGHT, border = BLACK, bw = 0.5) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: bw });
}

function txt(
  page: PDFPage, font: PDFFont, text: string | null | undefined,
  x: number, y: number, size = 9, color = BLACK,
) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function wrap(
  page: PDFPage, font: PDFFont, text: string,
  x: number, y: number, maxW: number, size = 9, gap = 4,
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

function dotLine(page: PDFPage, font: PDFFont, label: string, x: number, y: number, lineEnd: number, size = 8.5) {
  txt(page, font, label, x, y + 1, size);
  const lw = font.widthOfTextAtSize(label, size);
  line(page, x + lw + 4, y - 1, lineEnd, y - 1, 0.5, GRAY);
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

export async function buildTXCitation(
  d: CaseData,
  _body: FormBody,
  _opts?: GenerateOptions,
): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PW, PH]);
  const countyId: string = (d as any).countyId ?? "";
  const county = countyDisplay(countyId);
  const courthouseName: string = (d as any).courthouseName ?? "";
  const txCountyRecord = TEXAS_COUNTIES.find((c) => c.id === countyId);
  const courthouseAddress = txCountyRecord
    ? `${txCountyRecord.courthouseAddress}, ${txCountyRecord.courthouseCity}, TX ${txCountyRecord.courthouseZip}`
    : "";

  let y = PH - 36;

  // ── Navy header bar ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PH - 46, width: PW, height: 46, color: NAVY });
  const h1 = "CITATION — SMALL CLAIMS CASE";
  const h2 = "Texas Justice Court  •  Tex. R. Civ. P. 502.5";
  txt(page, bold, h1, (PW - bold.widthOfTextAtSize(h1, 13)) / 2, PH - 18, 13, WHITE);
  txt(page, font, h2, (PW - font.widthOfTextAtSize(h2, 8)) / 2, PH - 33, 8, rgb(0.75, 0.82, 0.95));

  y = PH - 56;

  // ── Court name ──────────────────────────────────────────────────────────────
  const courtLine1 = county
    ? `IN THE JUSTICE COURT, ${county.toUpperCase()} COUNTY, TEXAS`
    : "IN THE JUSTICE COURT, ____________ COUNTY, TEXAS";
  const courtLine2 = courthouseName || "Precinct _____, Place _____";
  txt(page, bold, courtLine1, (PW - bold.widthOfTextAtSize(courtLine1, 9.5)) / 2, y, 9.5, DKBLU);
  y -= 13;
  txt(page, font, courtLine2, (PW - font.widthOfTextAtSize(courtLine2, 8)) / 2, y, 8, GRAY);
  y -= 11;
  if (courthouseAddress) {
    txt(page, font, courthouseAddress, (PW - font.widthOfTextAtSize(courthouseAddress, 7.5)) / 2, y, 7.5, GRAY);
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
  const dateLbl = `Issue Date: ${dateStr}`;
  txt(page, font, dateLbl, MR - font.widthOfTextAtSize(dateLbl, 8), y, 8, GRAY);
  y -= 10;
  line(page, ML, y, MR, y, 0.5);
  y -= 14;

  // ── TO THE DEFENDANT command ─────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "THE STATE OF TEXAS — GREETINGS", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  const defName = d.defendantName ?? "________________________";
  const defAddr = [d.defendantAddress, d.defendantCity, (d.defendantState ?? "TX"), d.defendantZip]
    .filter(Boolean).join(", ");
  const cmdText =
    `TO THE DEFENDANT: ${defName}` +
    (defAddr ? `, whose address is ${defAddr}` : "");
  y = wrap(page, bold, cmdText, ML, y, CW, 9, 4);
  y -= 6;

  const bodyText =
    "You are COMMANDED to appear and answer the Plaintiff's claim described below " +
    "at the date, time, and place stated in this citation. If you fail to appear, " +
    "a default judgment may be entered against you for the amount claimed plus court costs.";
  y = wrap(page, font, bodyText, ML, y, CW, 9, 4);
  y -= 10;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Hearing details ─────────────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "HEARING INFORMATION", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  const hearingDate = (d as any).hearingDate ? fmtDate((d as any).hearingDate) : "";
  const hearingTime = (d as any).hearingTime ?? "";

  dotLine(page, font, "Date of Hearing:", ML, y, ML + 250);
  if (hearingDate) txt(page, bold, hearingDate, ML + font.widthOfTextAtSize("Date of Hearing:", 8.5) + ML + 8, y, 9, DKBLU);
  dotLine(page, font, "Time:", ML + 260, y, MR);
  if (hearingTime) txt(page, bold, hearingTime, ML + 260 + font.widthOfTextAtSize("Time:", 8.5) + 8, y, 9, DKBLU);
  y -= 14;

  dotLine(page, font, "Location:", ML, y, MR);
  if (courthouseName) txt(page, font, courthouseName, ML + font.widthOfTextAtSize("Location:", 8.5) + 8, y, 8.5);
  y -= 14;

  dotLine(page, font, "Address:", ML, y, MR);
  if (courthouseAddress) txt(page, font, courthouseAddress, ML + font.widthOfTextAtSize("Address:", 8.5) + 8, y, 8.5);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Party summary ───────────────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "PARTIES", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  const COL_W = CW / 2 - 6;
  const CMID = ML + CW / 2 + 6;

  txt(page, bold, "PLAINTIFF:", ML, y, 8.5);
  txt(page, bold, "DEFENDANT:", CMID, y, 8.5);
  y -= 12;
  txt(page, font, d.plaintiffName ?? "", ML, y, 9);
  txt(page, font, d.defendantName ?? "", CMID, y, 9);
  y -= 11;
  const pAddr = [d.plaintiffAddress, d.plaintiffCity, (d.plaintiffState ?? "TX")].filter(Boolean).join(", ");
  txt(page, font, pAddr, ML, y, 8, GRAY);
  txt(page, font, defAddr, CMID, y, 8, GRAY);
  y -= 11;
  if (d.plaintiffPhone) { txt(page, font, `Phone: ${d.plaintiffPhone}`, ML, y, 8, GRAY); }
  if (d.defendantPhone) { txt(page, font, `Phone: ${d.defendantPhone}`, CMID, y, 8, GRAY); }
  y -= 12;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Claim summary ───────────────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "NATURE AND AMOUNT OF CLAIM", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  if (d.claimAmount != null) {
    txt(page, bold, "Amount Claimed:", ML, y, 8.5);
    txt(page, bold,
      "$" + Number(d.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ML + 90, y, 9, DKBLU,
    );
    y -= 12;
  }

  if (d.claimDescription) {
    const cleaned = d.claimDescription.replace(/mock\s+.*?case\s+summary/gi, "").trim();
    if (cleaned) {
      txt(page, bold, "Claim Description:", ML, y, 8.5);
      y -= 12;
      y = wrap(page, font, cleaned, ML, y, COL_W * 2 + 12, 8.5, 4);
      y -= 4;
    }
  }

  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Service instructions ─────────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "SERVICE INSTRUCTIONS", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  const svcText =
    "THIS CITATION is to be served by the CONSTABLE or SHERIFF of the county in which the defendant resides " +
    "or may be found. Private process servers are NOT authorized to serve the initial citation in Texas " +
    "justice court (Tex. R. Civ. P. 502.6). The officer serving this citation shall make return thereof " +
    "and file the Return of Service with the court.";
  y = wrap(page, font, svcText, ML, y, CW, 8.5, 4);
  y -= 10;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Clerk certification ─────────────────────────────────────────────────────
  rect(page, ML, y - 2, CW, 14, LIGHT);
  txt(page, bold, "CLERK'S CERTIFICATION", ML + 4, y + 2, 9, DKBLU);
  y -= 18;

  txt(page, font, "ISSUED under my hand and the seal of said court on the date shown above.", ML, y, 8.5);
  y -= 20;

  dotLine(page, font, "Clerk of the Justice Court:", ML, y, ML + 280);
  y -= 14;
  dotLine(page, font, "By (Deputy Clerk):", ML, y, ML + 280);
  y -= 14;
  dotLine(page, font, "Court Seal / Stamp:", ML, y, ML + 280);
  y -= 14;

  // ── Footer ──────────────────────────────────────────────────────────────────
  line(page, ML, 38, MR, 38, 0.5, GRAY);
  txt(page, font, "Generated by Small Claims Genie  •  Texas Justice Court Citation  •  Tex. R. Civ. P. 502.5", ML, 25, 7.5, GRAY);

  return Buffer.from(await doc.save());
}

const txCitationDefinition: FormDefinition = {
  state: "TX",
  formId: "TX-CITATION",
  renderingTechnique: "png-overlay",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXCitation(d, b, opts);
  },
};

FormRegistry.register(txCitationDefinition);

export { txCitationDefinition };
