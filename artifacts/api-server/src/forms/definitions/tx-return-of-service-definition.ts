/**
 * TX Return of Service — Texas Justice Court Small Claims.
 *
 * Overlays case data onto the official Texas Justice Court Return of Service
 * PDF (tx-return-of-service.pdf).  The source PDF is entirely image-based
 * (Adobe Acrobat Pro 10.1.8, 2013–2014; pdftotext produces zero output and
 * no font/glyph objects are present in the file).  All case data is rendered
 * via coordinate overlay on the first page of the official form using pdf-lib
 * drawText, drawLine, and drawImage.
 *
 * Rendering technique:
 *   PDFDocument.load() on tx-return-of-service.pdf → getPages()[0] →
 *   coordinate overlay.  Because there is no text layer, coordinates are
 *   calibrated against the visual layout of the scanned form (letter
 *   612 × 792 pt), matching the standard Texas Justice Court ROS section order:
 *   court/party header → officer info → service details → method → fees →
 *   officer certification/signature.
 *
 * Legal basis:
 *   Tex. R. Civ. P. 502.6 (Service of Citation — Justice Court)
 *   Tex. R. Civ. P. 107 (Return of Service — statewide)
 *   Service is exclusively by constable or sheriff for initial citation.
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { TEXAS_COUNTIES } from "../../routes/counties";
import { FORMS_DIR } from "../../routes/forms-common";

const ROS_PDF_PATH = path.join(FORMS_DIR, "tx-return-of-service.pdf");

const PW = 612;
const PH = 792;
const BLACK = rgb(0, 0, 0);
const GRAY  = rgb(0.45, 0.45, 0.45);

const ML = 54;
const MR = PW - 54;
const CW = MR - ML;

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, t = 0.5, color = BLACK) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color });
}

function txt(
  page: PDFPage, font: PDFFont, text: string | null | undefined,
  x: number, y: number, size = 9, color = BLACK,
) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function dotLine(page: PDFPage, font: PDFFont, label: string, x: number, y: number, lineEnd: number, size = 8.5) {
  txt(page, font, label, x, y + 1, size);
  const lw = font.widthOfTextAtSize(label, size);
  line(page, x + lw + 4, y - 1, lineEnd, y - 1, 0.5, GRAY);
}

function checkbox(page: PDFPage, font: PDFFont, x: number, y: number, label: string, size = 8.5) {
  page.drawRectangle({ x, y: y - 1, width: 9, height: 9, borderColor: BLACK, borderWidth: 0.8 });
  txt(page, font, label, x + 13, y + 1, size);
}

function sectionHeader(page: PDFPage, font: PDFFont, label: string, y: number) {
  txt(page, font, label, ML, y, 9);
  line(page, ML, y - 3, MR, y - 3, 0.5);
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^tx-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function buildTXReturnOfService(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  // Load the official Texas Justice Court Return of Service form.
  // The source PDF is entirely image-based (no text layer); all case data is
  // drawn via coordinate overlay on page 0 of the official form.
  const rosBytes = fs.readFileSync(ROS_PDF_PATH);
  const doc  = await PDFDocument.load(rosBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.getPages()[0]!;
  const countyId: string = (d as any).countyId ?? "";
  const county = countyDisplay(countyId);
  const courthouseName: string = (d as any).courthouseName ?? "";
  const txCountyRecord = TEXAS_COUNTIES.find((c) => c.id === countyId);
  const courthouseAddress = txCountyRecord
    ? `${txCountyRecord.courthouseAddress}, ${txCountyRecord.courthouseCity}, TX ${txCountyRecord.courthouseZip}`
    : "";

  let sigLineY = 0;
  let y = PH - 50;

  // ── Court name ───────────────────────────────────────────────────────────────
  const courtLine1 = county
    ? `IN THE JUSTICE COURT, ${county.toUpperCase()} COUNTY, TEXAS`
    : "IN THE JUSTICE COURT, ____________ COUNTY, TEXAS";
  const courtLine2 = courthouseName || "Precinct _____, Place _____";
  txt(page, bold, courtLine1, (PW - bold.widthOfTextAtSize(courtLine1, 9.5)) / 2, y, 9.5);
  y -= 13;
  txt(page, font, courtLine2, (PW - font.widthOfTextAtSize(courtLine2, 8)) / 2, y, 8, GRAY);
  y -= 11;
  if (courthouseAddress) {
    txt(page, font, courthouseAddress, (PW - font.widthOfTextAtSize(courthouseAddress, 7.5)) / 2, y, 7.5, GRAY);
    y -= 10;
  }
  line(page, ML, y, MR, y, 1);
  y -= 10;

  // ── Cause No. row ────────────────────────────────────────────────────────────
  txt(page, bold, "CAUSE NO.:", ML, y, 8.5);
  if (d.caseNumber) {
    txt(page, font, d.caseNumber, ML + 65, y, 8.5);
  } else {
    line(page, ML + 65, y - 2, ML + 200, y - 2, 0.5, GRAY);
    txt(page, font, "(assigned by court)", ML + 65, y, 7.5, GRAY);
  }
  const dateStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const dateLbl = `Date: ${dateStr}`;
  txt(page, font, dateLbl, MR - font.widthOfTextAtSize(dateLbl, 8), y, 8, GRAY);
  y -= 10;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Party names ──────────────────────────────────────────────────────────────
  const CMID = ML + CW / 2 + 6;
  txt(page, bold, "Plaintiff:", ML, y, 8.5);
  txt(page, font, d.plaintiffName ?? "", ML + 55, y, 9);
  txt(page, bold, "Defendant:", CMID, y, 8.5);
  txt(page, font, d.defendantName ?? "", CMID + 60, y, 9);
  y -= 13;
  // Plaintiff address (left) and defendant address (right) on same line
  const pltAddrLine = [d.plaintiffAddress, d.plaintiffCity].filter(Boolean).join(", ");
  const defAddrLine = [d.defendantAddress, d.defendantCity].filter(Boolean).join(", ");
  if (pltAddrLine || defAddrLine) {
    if (pltAddrLine) txt(page, font, pltAddrLine, ML + 55, y, 7.5, GRAY);
    if (defAddrLine) txt(page, font, defAddrLine, CMID + 60, y, 7.5, GRAY);
    y -= 11;
  }
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Officer info ─────────────────────────────────────────────────────────────
  sectionHeader(page, bold, "SERVING OFFICER INFORMATION", y);
  y -= 18;

  dotLine(page, font, "Name of Constable/Sheriff:", ML, y, MR);
  y -= 14;
  dotLine(page, font, "Precinct / Badge No.:", ML, y, ML + 260);
  dotLine(page, font, "County:", ML + 270, y, MR);
  y -= 14;
  dotLine(page, font, "Agency Address:", ML, y, MR);
  y -= 14;
  dotLine(page, font, "City, State, ZIP:", ML, y, ML + 280);
  dotLine(page, font, "Phone:", ML + 290, y, MR);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Service details ──────────────────────────────────────────────────────────
  sectionHeader(page, bold, "SERVICE DETAILS", y);
  y -= 18;

  dotLine(page, font, "Date of Service:", ML, y, ML + 220);
  dotLine(page, font, "Time:", ML + 230, y, ML + 340);
  dotLine(page, font, "A.M. / P.M.:", ML + 350, y, MR);
  y -= 14;

  dotLine(page, font, "Defendant's address where service was made:", ML, y, MR);
  y -= 14;
  dotLine(page, font, "City, State, ZIP:", ML, y, MR);
  y -= 14;

  txt(page, font, "Defendant identified by:", ML, y + 1, 8.5);
  y -= 13;
  checkbox(page, font, ML, y, "Personal knowledge", 8.5);
  checkbox(page, font, ML + 140, y, "Photo ID presented", 8.5);
  checkbox(page, font, ML + 285, y, "Other:", 8.5);
  dotLine(page, font, "", ML + 330, y, MR);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Method of service ────────────────────────────────────────────────────────
  sectionHeader(page, bold, "METHOD OF SERVICE (check one)", y);
  y -= 18;

  checkbox(page, font, ML, y, "Personal delivery to defendant", 8.5);
  y -= 13;
  checkbox(page, font, ML, y,
    "Substitute service — left with a member of the household, 16 years of age or older (Tex. R. Civ. P. 106(b))", 8.5);
  y -= 13;
  txt(page, font, "          Name of person with whom citation left:", ML, y + 1, 8.5);
  dotLine(page, font, "", ML + font.widthOfTextAtSize("          Name of person with whom citation left:", 8.5) + ML - 2, y, MR);
  y -= 13;
  checkbox(page, font, ML, y, "Posted on door of residence under court order (Tex. R. Civ. P. 106(b))", 8.5);
  y -= 13;
  checkbox(page, font, ML, y, "Served registered agent of business entity:", 8.5);
  dotLine(page, font, "Agent name:", ML + 235, y, MR);
  y -= 13;
  checkbox(page, font, ML, y, "Unable to serve — Non Est Return (reason below):", 8.5);
  y -= 14;
  dotLine(page, font, "Reason not served:", ML, y, MR);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Documents delivered ──────────────────────────────────────────────────────
  sectionHeader(page, bold, "DOCUMENTS DELIVERED", y);
  y -= 16;

  checkbox(page, font, ML, y, "Citation", 8.5);
  checkbox(page, font, ML + 90, y, "Petition / Statement of Claim", 8.5);
  checkbox(page, font, ML + 285, y, "Other:", 8.5);
  dotLine(page, font, "", ML + 320, y, MR);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Service fees ─────────────────────────────────────────────────────────────
  sectionHeader(page, bold, "SERVICE FEES", y);
  y -= 18;

  dotLine(page, font, "Service fee:", ML, y, ML + 160);
  txt(page, font, "$", ML + 170, y + 1, 8.5);
  dotLine(page, font, "", ML + 178, y, ML + 250);
  dotLine(page, font, "Mileage fee:", ML + 265, y, ML + 390);
  txt(page, font, "$", ML + 400, y + 1, 8.5);
  dotLine(page, font, "", ML + 408, y, MR);
  y -= 14;
  line(page, ML, y, MR, y, 0.5);
  y -= 12;

  // ── Officer certification / signature ────────────────────────────────────────
  sectionHeader(page, bold, "OFFICER CERTIFICATION", y);
  y -= 18;

  const certText =
    "I certify that I executed this Citation as stated above. The facts set forth in this " +
    "Return of Service are true and correct to the best of my knowledge and belief.";
  const words = certText.split(" ");
  let cur = "";
  let cy = y;
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(cand, 8.5) > CW && cur) {
      txt(page, font, cur, ML, cy, 8.5);
      cy -= 13;
      cur = w;
    } else { cur = cand; }
  }
  if (cur) { txt(page, font, cur, ML, cy, 8.5); cy -= 13; }
  y = cy - 4;

  const halfW = CW / 2 - 10;
  txt(page, font, "Signature of Constable/Sheriff:", ML, y, 8.5);
  sigLineY = y - 2;
  line(page, ML + 165, sigLineY, ML + halfW, sigLineY, 0.5);
  txt(page, bold, "Date:", ML + halfW + 14, y, 8.5);
  line(page, ML + halfW + 46, sigLineY, MR, sigLineY, 0.5);
  y -= 10;
  txt(page, font, "(Printed Name)", ML + 165, y, 7, GRAY);
  y -= 18;

  dotLine(page, font, "Printed name:", ML, y, ML + 280);
  y -= 14;
  dotLine(page, font, "Badge / ID No.:", ML, y, ML + 240);

  // ── Signature overlay ─────────────────────────────────────────────────────────
  if (opts?.signatureBytes && sigLineY > 0) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes).catch(() => null)
        ?? await doc.embedJpg(opts.signatureBytes).catch(() => null);
      if (sigImg) {
        page.drawImage(sigImg, { x: ML + 165, y: sigLineY, width: 140, height: 24 });
      }
    } catch { /* ignore */ }
  }

  return Buffer.from(await doc.save());
}

const txReturnOfServiceDefinition: FormDefinition = {
  state: "TX",
  formId: "TX-RETURN-OF-SERVICE",
  renderingTechnique: "pdf-overlay",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXReturnOfService(d, b, opts);
  },
};

FormRegistry.register(txReturnOfServiceDefinition);

export { txReturnOfServiceDefinition };
