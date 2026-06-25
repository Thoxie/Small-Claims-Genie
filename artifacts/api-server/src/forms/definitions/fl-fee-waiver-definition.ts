/**
 * FL Application for Determination of Civil Indigent Status — official Form 1.998
 *
 * Loads the official Florida Form 1.998 (Fla. Stat. § 57.082; Fla. R. Civ. P. Form 1.998)
 * as a background PDF and creates live AcroForm text fields at the correct form coordinates.
 * Fields are editable in any standard PDF viewer (Chrome, Preview, Acrobat).
 *
 * Template PDF: assets/fl-forms/fl-fee-waiver-1998.pdf
 * Source: https://flcourts-media.flcourts.gov/content/download/403010/file/indigent_application.pdf
 *
 * Rendering: acroform-overlay (pdf-lib AcroForm fields on official single-page PDF)
 *
 * Coordinate system: pdf-lib (bottom-left origin, y increases upward).
 * Coordinates derived from pdftotext -bbox analysis of the official 612×792 pt page.
 *
 * Legal basis: Fla. Stat. § 57.082; Fla. R. Civ. P. Form 1.998 (2024).
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { ASSET_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "fl-fee-waiver-1998.pdf");

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

  const page = doc.getPage(0);
  const form = doc.getForm();

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

  const fullAddr = [addr, cityStateZip].filter(Boolean).join(", ");

  function addField(
    name: string,
    value: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const field = form.createTextField(name);
    field.setText(value || "");
    field.addToPage(page, {
      x,
      y,
      width,
      height,
      borderWidth: 0,
      backgroundColor: undefined,
    });
  }

  // ── Court header: county name ───────────────────────────────────────────────
  // "IN AND FOR ______________ COUNTY, FLORIDA"
  addField("county", countyName.toUpperCase(), 200, 716, 160, 14);

  // ── Plaintiff name ──────────────────────────────────────────────────────────
  addField("plaintiff_name", plaintiffName, 50, 705, 200, 14);

  // ── Case number ─────────────────────────────────────────────────────────────
  addField("case_number", caseNumber, 463, 705, 130, 14);

  // ── Date signed ─────────────────────────────────────────────────────────────
  // "Signed on ________________________, 20____."
  addField("date_signed", today, 95, 237, 120, 14);

  // ── Print Full Legal Name ────────────────────────────────────────────────────
  addField("print_name", plaintiffName, 303, 217, 150, 14);

  // ── Email and Phone ─────────────────────────────────────────────────────────
  addField("email", email, 130, 213, 180, 12);
  addField("phone", phone, 355, 213, 160, 12);

  // ── Address ─────────────────────────────────────────────────────────────────
  addField("address", fullAddr.slice(0, 90), 130, 189, 350, 12);

  // ── Signature image (drawn overlay — not a form field) ───────────────────────
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

  return Buffer.from(await doc.save({ updateFieldAppearances: true, useObjectStreams: false }));
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
