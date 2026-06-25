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
 * Page size: 612 × 792 pt.
 * Coordinates derived from pdftotext -bbox analysis: pdf_lib_y = 792 - bbox_yMax.
 *
 * Note: The official FL Form 1.998 is a flat PDF with no AcroForm fields.
 * Data is pre-filled via drawText overlay. The form is not user-editable after download.
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
  // blank at bbox x=268.23, screen yMax=76.206 → pdf-lib y = 792 - 76.206 = 715.8
  if (countyName) {
    draw(countyName.toUpperCase(), 268, 716, 9);
  }

  // ── Plaintiff name ──────────────────────────────────────────────────────────
  // blank line before "Plaintiff/Petitioner": bbox xMin=50.55, screen yMax=91.206
  // pdf-lib y = 792 - 91.206 = 700.8
  if (plaintiffName) {
    draw(plaintiffName, 51, 701, 9);
  }

  // ── Case number ─────────────────────────────────────────────────────────────
  // "CASE NO.______": same y as plaintiff line, value after "NO." at x≈466
  // pdf-lib y = 700.8
  if (caseNumber) {
    draw(caseNumber, 466, 701, 9);
  }

  // ── Signature section ────────────────────────────────────────────────────────
  // "Signed on ________________________, 20____."
  // "Signed on" text at screen yMax=554.600 → pdf-lib y = 792 - 554.600 = 237.4
  draw(today, 95, 237, 9);

  // Signature blank line for image and print name:
  // `___________________________________` at screen yMax=565.620 → pdf-lib y = 792 - 565.620 = 226.4
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: 130, y: 226, width: 155, height: 18, opacity: 1 });
      }
    } catch { /* ignore */ }
  }

  // ── Print Full Legal Name ────────────────────────────────────────────────────
  // Goes on the same blank line as the signature, right side (after "Last 4 digits..." area)
  // "Print Full Legal Name" label is at x=302, same blank line → pdf-lib y = 226
  if (plaintiffName) {
    draw(plaintiffName, 303, 226, 9);
  }

  // ── Email ────────────────────────────────────────────────────────────────────
  // "Email address:" label: screen yMax=587.620 → pdf-lib y = 792 - 587.620 = 204.4
  // Value goes on the same line, right after the label (label ends at x≈103)
  if (email) {
    draw(email, 130, 204, 8.5);
  }

  // ── Phone ────────────────────────────────────────────────────────────────────
  // "Phone Number/s:" label: x=302 to x=367, same y as email → pdf-lib y = 204
  // Value goes after the label at x≈370
  if (phone) {
    draw(phone, 370, 204, 8.5);
  }

  // ── Address ─────────────────────────────────────────────────────────────────
  // "Address: Street, City, State, Zip Code": screen yMax=611.650 → pdf-lib y = 792 - 611.650 = 180.35
  // "Address:" label ends at x≈82; value starts immediately after at x=84
  const fullAddr = [addr, cityStateZip].filter(Boolean).join(", ");
  if (fullAddr) {
    draw(fullAddr.slice(0, 90), 84, 180, 8.5);
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
