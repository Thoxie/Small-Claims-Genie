/**
 * FL CLK/CT. 423 — Miami-Dade County Summons/Notice to Appear for Pretrial Conference.
 *
 * Fills the official Miami-Dade County Clerk "CLK/CT. 423 Rev. 02/26" AcroForm PDF
 * using pdf-lib.
 *
 * Source PDF: assets/forms/fl-clkct423-summons.pdf
 *
 * AcroForm fields filled by plaintiff at filing:
 *   "Plaintiff"              — Plaintiff name
 *   "Defendant"              — Defendant name
 *   "Defendant to be served at" — Defendant address for service of process
 *   "Filed by"               — Plaintiff name (contact info section)
 *   "Telephone"              — Plaintiff phone
 *   "Address"                — Plaintiff street address
 *   "Address continued"      — Plaintiff city/state/zip
 *   "Civil"                  — Division checkbox (always true for small claims)
 *
 * Fields left blank for court clerk to complete at filing:
 *   Case No., Section, Date, Time, Courtroom, court-location checkboxes,
 *   service-method checkboxes, Deputy Clerk signature.
 *
 * IMPORTANT — NO plaintiff signature field: CLK/CT. 423 is a court-issued summons.
 * The only signature on the form is the Deputy Clerk's, applied at filing.
 * The /signed route is accepted but does not embed a plaintiff signature.
 *
 * Form:   CLK/CT. 423 Rev. 02/26
 * Filing: Miami-Dade County Court Clerk, 73 W. Flagler St., Suite 133, Miami, FL 33130
 * Web:    https://www.miamidadeclerk.gov
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(FORMS_DIR, "fl-clkct423-summons.pdf");

function safeSetText(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string,
): void {
  try {
    form.getTextField(name).setText(value || "");
  } catch {
    /* field absent */
  }
}

function safeCheck(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  checked: boolean,
): void {
  try {
    const btn = form.getCheckBox(name);
    if (checked) btn.check();
    else btn.uncheck();
  } catch {
    /* field absent or not a checkbox */
  }
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

const clkCt423Definition: FormDefinition = {
  state: "FL",
  formId: "CLK-CT-423",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdflib",

  async generate(
    d: CaseData,
    _body: FormBody,
    _opts?: GenerateOptions,
  ): Promise<Buffer> {
    const pdfBytes = fs.readFileSync(PDF_PATH);
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();

    // ── Parties ────────────────────────────────────────────────────────────────
    safeSetText(form, "Plaintiff", d.plaintiffName ?? "");
    safeSetText(form, "Defendant", d.defendantName ?? "");

    // ── Defendant service address — multi-line fields ──────────────────────────
    // "Defendant" field already holds the name; do not duplicate it here.
    // "Defendant to be served at"      → street address
    // "Defendant 2nd to be served at"  → city, state ZIP
    // "Defendant 3rd to be served at"  → left blank (reserved for apt/unit)
    const defCSZ = cityStateZip(
      d.defendantCity,
      d.defendantState ?? "FL",
      d.defendantZip,
    );
    safeSetText(form, "Defendant to be served at", d.defendantAddress ?? "");
    safeSetText(form, "Defendant 2nd to be served at", defCSZ);

    // ── Case number (if already assigned by court) ─────────────────────────────
    if (d.caseNumber) {
      safeSetText(form, "Case Number", d.caseNumber);
    }

    // ── Filed by (plaintiff contact info — not a signature field) ──────────────
    safeSetText(form, "Filed by", d.plaintiffName ?? "");
    safeSetText(form, "Telephone", d.plaintiffPhone ?? "");
    safeSetText(form, "Address", d.plaintiffAddress ?? "");
    safeSetText(
      form,
      "Address continued",
      cityStateZip(d.plaintiffCity, d.plaintiffState ?? "FL", d.plaintiffZip),
    );

    // ── Division — always Civil for small claims ────────────────────────────────
    safeCheck(form, "Civil", true);

    // ── "Plaintiff check box" — indicates the filer is the plaintiff (not attorney) ──
    safeCheck(form, "Plaintiff check box", true);

    // ── Hearing date and time ──────────────────────────────────────────────────
    // Plaintiff-filled fields: "Month" (full month name + day, e.g. "July 15"),
    // "Year", and "Time". hearingDate is expected in ISO format "YYYY-MM-DD".
    // "Date" is a clerk-controlled issuance field on page 2 — intentionally left blank.
    if (d.hearingDate) {
      const MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const [yr, mo, day] = d.hearingDate.split("-");
      if (mo) {
        const monthName = MONTH_NAMES[parseInt(mo, 10) - 1] ?? mo;
        const dayNum = day ? ` ${parseInt(day, 10)}` : "";
        safeSetText(form, "Month", `${monthName}${dayNum}`);
      }
      if (yr) safeSetText(form, "Year", yr);
    }
    const hearingTimeStr = d.hearingTimeFormatted ?? d.hearingTime ?? "";
    if (hearingTimeStr) safeSetText(form, "Time", hearingTimeStr);

    // ── Default venue — Dade County Courthouse Central Court ───────────────────
    // Pre-select the Dade County Courthouse Central Court venue checkbox so the
    // form arrives pre-populated. The clerk overrides this selection at filing if
    // the case is assigned to a different courthouse location.
    safeCheck(form, "Dade County Courthouse Central Court", true);

    // ── No plaintiff signature ────────────────────────────────────────────────
    // CLK/CT. 423 is a court-issued summons; the only signature is the Deputy
    // Clerk's, applied at filing. The /signed route is accepted but intentionally
    // does NOT embed a plaintiff signature (see file header).

    let saved: Uint8Array;
    try {
      saved = await doc.save({ updateFieldAppearances: true });
    } catch {
      saved = await doc.save({ updateFieldAppearances: false });
    }
    return Buffer.from(saved);
  },
};

FormRegistry.register(clkCt423Definition);
export { clkCt423Definition };
