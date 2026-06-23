/**
 * FL Application for Determination of Civil Indigent Status — official Form 1.998
 *
 * Loads the official Florida Form 1.998 (Fla. Stat. § 57.082; Fla. R. Civ. P. Form 1.998)
 * as a background PDF and overlays the user's case data at the correct form coordinates.
 *
 * Template PDF: assets/fl-forms/fl-fee-waiver-1998.pdf
 * Source: https://flcourts-media.flcourts.gov/content/download/403010/file/indigent_application.pdf
 *
 * Rendering: png-overlay (pdf-lib text overlay on official single-page PDF)
 *
 * Overlay coordinate system: pdf-lib (bottom-left origin, y increases upward).
 * Coordinates derived from pdftotext -bbox analysis of the official 612×792 pt page.
 *
 * Legal basis: Fla. Stat. § 57.082; Fla. R. Civ. P. Form 1.998 (2024).
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { ASSET_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "fl-fee-waiver-1998.pdf");

const BLUE = rgb(0.1, 0.25, 0.55);

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^fl-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function buildFLFeeWaiver(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const templateBytes = fs.readFileSync(PDF_PATH);
  const doc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const page = doc.getPage(0);

  const countyName = countyDisplay((d as any).countyId);
  const plaintiffName = d.plaintiffName ?? "";
  const addr = d.plaintiffAddress ?? "";
  const cityStateZip = [d.plaintiffCity, d.plaintiffState ?? "FL", d.plaintiffZip]
    .filter(Boolean)
    .join(", ");
  const phone = d.plaintiffPhone ?? "";
  const email = d.plaintiffEmail ?? "";
  const caseNumber = d.caseNumber ?? "";

  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  function draw(text: string, x: number, y: number, size = 9) {
    if (!text) return;
    page.drawText(text, { x, y, size, font, color: BLUE });
  }

  // ── Court header: county name ───────────────────────────────────────────────
  // "IN AND FOR ______________ COUNTY, FLORIDA"
  // bbox: "COUNTY," at x=333, pdftotext y=68.8 → pdf-lib y ≈ 716
  if (countyName) {
    draw(countyName.toUpperCase(), 200, 716, 9);
  }

  // ── Plaintiff name ──────────────────────────────────────────────────────────
  // Blank line above "Plaintiff/Petitioner" label (yMin=92.8 → pdf-lib y=699)
  // Draw name ~12pt above that label
  if (plaintiffName) {
    draw(plaintiffName, 50, 705, 9);
  }

  // ── Case number ─────────────────────────────────────────────────────────────
  // "CASE NO.______" at far right, same row as plaintiff (~y=705)
  if (caseNumber) {
    draw(caseNumber, 463, 705, 9);
  }

  // ── Signature section ────────────────────────────────────────────────────────
  // "Signed on ________________________, 20____."
  // bbox: "Signed" yMin=545.6 → pdf-lib baseline ≈ 237
  draw(today, 95, 237, 9);

  // Signature image goes on the blank line just below "Signed on":
  // between Signed (y≈237) and Print Full Legal Name (yMin=567.62 → pdf-lib y≈215)
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: 130, y: 217, width: 160, height: 22, opacity: 1 });
      }
    } catch { /* ignore */ }
  }

  // Print Full Legal Name (right of the "Year of Birth" row)
  // "Print" bbox: xMin=302.75, yMin=567.62 → pdf-lib y ≈ 215
  if (plaintiffName) {
    draw(plaintiffName, 303, 217, 9);
  }

  // ── Email and Phone ─────────────────────────────────────────────────────────
  // "Email address:" bbox: yMin=578.62 → pdf-lib y ≈ 213
  if (email) {
    draw(email, 130, 213, 8.5);
  }
  // "Phone Number/s:" same row, right column
  if (phone) {
    draw(phone, 355, 213, 8.5);
  }

  // ── Address ─────────────────────────────────────────────────────────────────
  // "Address: Street, City, State, Zip Code"
  // bbox: "Address:" yMin=602.65 → pdf-lib y ≈ 189
  const fullAddr = [addr, cityStateZip].filter(Boolean).join(", ");
  if (fullAddr) {
    draw(fullAddr.slice(0, 90), 130, 189, 8.5);
  }

  return Buffer.from(await doc.save({ updateFieldAppearances: false }));
}

const flFeeWaiverDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-FEE-WAIVER",
  assetPath: PDF_PATH,
  renderingTechnique: "png-overlay",
  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFLFeeWaiver(d, body, opts);
  },
};

FormRegistry.register(flFeeWaiverDefinition);
export { flFeeWaiverDefinition };
