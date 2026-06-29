/**
 * FL Plain Statement of Claim — Orange County, Florida.
 *
 * Fills the Orange County Clerk of Courts "Plain Statement of Claim" PDF
 * (https://www.myorangeclerk.com) using pdf-lib AcroForm fill directly.
 *
 * Source PDF: assets/fl-forms/plain-statement-of-claim-orange.pdf
 *
 * Fields:
 *   Name              — Plaintiff name (section 1)
 *   Street Address    — Plaintiff street address
 *   City State and Zip — Plaintiff city/state/zip
 *   Phone Number      — Plaintiff phone
 *   Name_2            — Defendant name (section 2)
 *   Street Address_2  — Defendant street address
 *   City State and Zip_2 — Defendant city/state/zip
 *   Phone Number_2    — Defendant phone
 *   Case Number       — Left blank (assigned by clerk at filing)
 *   of interest court costs and attorney fees — Claim amount (demand sum)
 *   Plaintiffs        — Plaintiff name in sworn-statement section
 *   Text1             — Claim description / basis of claim
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "plain-statement-of-claim-orange.pdf");

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function cityStateZip(
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  if (state && zip) parts.push(`${state} ${zip}`);
  else if (state) parts.push(state);
  return parts.join(", ");
}

function safeSetText(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string): void {
  try { form.getTextField(name).setText(value || ""); } catch { /* field absent */ }
}

const plainSocOrangeDefinition: FormDefinition = {
  state: "FL",
  formId: "PLAIN-SOC-ORANGE",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdflib",

  async generate(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    const pltCityStateZip = cityStateZip(d.plaintiffCity, d.plaintiffState, d.plaintiffZip);
    const defCityStateZip = cityStateZip(d.defendantCity, d.defendantState, d.defendantZip);

    const pdfBytes = fs.readFileSync(PDF_PATH);
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();

    // ── Plaintiff section ───────────────────────────────────────────────────
    safeSetText(form, "Name",               d.plaintiffName ?? "");
    safeSetText(form, "Street Address",     d.plaintiffAddress ?? "");
    safeSetText(form, "City State and Zip", pltCityStateZip);
    safeSetText(form, "Phone Number",       d.plaintiffPhone ?? "");

    // ── Defendant section ───────────────────────────────────────────────────
    safeSetText(form, "Name_2",               d.defendantName ?? "");
    safeSetText(form, "Street Address_2",     d.defendantAddress ?? "");
    safeSetText(form, "City State and Zip_2", defCityStateZip);
    safeSetText(form, "Phone Number_2",       d.defendantPhone ?? "");

    // ── Case number — left blank for clerk to assign ────────────────────────
    safeSetText(form, "Case Number", "");

    // ── Claim amount ─────────────────────────────────────────────────────────
    safeSetText(form, "of interest court costs and attorney fees", formatAmount(d.claimAmount));

    // ── Sworn statement — plaintiff name ────────────────────────────────────
    safeSetText(form, "Plaintiffs", d.plaintiffName ?? "");

    // ── Claim description / basis of claim ───────────────────────────────────
    safeSetText(form, "Text1", d.claimDescription ?? "");

    // ── Date + optional signature overlay ────────────────────────────────────
    const todayStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const [pg] = doc.getPages();
    pg.drawText(`Date: ${todayStr}`, { x: 54, y: 78, size: 9, font: helv });
    if (opts?.signatureBytes) {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      pg.drawImage(sigImg, { x: 378, y: 68, width: 150, height: 28, opacity: 1 });
    }

    form.flatten();
    return Buffer.from(await doc.save({ updateFieldAppearances: false }));
  },
};

FormRegistry.register(plainSocOrangeDefinition);
export { plainSocOrangeDefinition };
