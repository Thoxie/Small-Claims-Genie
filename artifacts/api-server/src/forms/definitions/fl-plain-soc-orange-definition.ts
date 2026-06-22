/**
 * FL Plain Statement of Claim — Orange County, Florida.
 *
 * Fills the Orange County Clerk of Courts "Plain Statement of Claim" PDF
 * (https://www.myorangeclerk.com) using pdftk FDF fill.
 *
 * Source PDF: assets/fl-forms/plain-statement-of-claim-orange.pdf
 * Field names confirmed via: pdftk dump_data_fields
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
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "plain-statement-of-claim-orange.pdf");

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Form definition ──────────────────────────────────────────────────────────

const plainSocOrangeDefinition: FormDefinition = {
  state: "FL",
  formId: "PLAIN-SOC-ORANGE",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    const pltCityStateZip = cityStateZip(d.plaintiffCity, d.plaintiffState, d.plaintiffZip);
    const defCityStateZip = cityStateZip(d.defendantCity, d.defendantState, d.defendantZip);

    const text: Record<string, string> = {
      // ── Plaintiff section ───────────────────────────────────────────────────
      "Name":                 d.plaintiffName ?? "",
      "Street Address":       d.plaintiffAddress ?? "",
      "City State and Zip":   pltCityStateZip,
      "Phone Number":         d.plaintiffPhone ?? "",

      // ── Defendant section ───────────────────────────────────────────────────
      "Name_2":                 d.defendantName ?? "",
      "Street Address_2":       d.defendantAddress ?? "",
      "City State and Zip_2":   defCityStateZip,
      "Phone Number_2":         d.defendantPhone ?? "",

      // ── Case number — left blank for clerk to assign ────────────────────────
      "Case Number": "",

      // ── Claim amount ─────────────────────────────────────────────────────────
      "of interest court costs and attorney fees": formatAmount(d.claimAmount),

      // ── Sworn statement — plaintiff name ────────────────────────────────────
      "Plaintiffs": d.plaintiffName ?? "",

      // ── Claim description / basis of claim ───────────────────────────────────
      "Text1": d.claimDescription ?? "",
    };

    const buf = await pdftk_fill_form(PDF_PATH, { text });
    try {
      const todayStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
      const doc = await PDFDocument.load(buf);
      const helv = await doc.embedFont(StandardFonts.Helvetica);
      const [pg] = doc.getPages();
      // Date goes in the left portion of the signature row (x=54, pdf-lib y=78), to the left of
      // the right-aligned signature blank at x=378. The Orange plain SOC has no printed date field.
      pg.drawText(`Date: ${todayStr}`, { x: 54, y: 78, size: 9, font: helv });
      if (opts?.signatureBytes) {
        // The signature area is right-aligned on this 1-page form.
        // "Plaintiff(s)" / "(Sign here)" labels: xMin=378, pdf-lib y=57–68 (bottom/top of label).
        // The blank line `___` is just above the "Plaintiff(s)" label at pdf-lib y≈68–82.
        // x=378, y=68, h=28 places the image from y=68 (label top) up to y=96, spanning the blank.
        // Visually confirmed correct (2026-06-21): sig lands on the right-side blank signature line,
        // above the "Plaintiff(s) / (Sign here)" labels.
        const sigImg = await doc.embedPng(opts.signatureBytes);
        pg.drawImage(sigImg, { x: 378, y: 68, width: 150, height: 28, opacity: 1 });
      }
      return Buffer.from(await doc.save({ updateFieldAppearances: false }));
    } catch { /* ignore — return plain fill */ }
    return buf;
  },
};

FormRegistry.register(plainSocOrangeDefinition);
export { plainSocOrangeDefinition };
