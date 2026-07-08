/**
 * WA MISC 05.0200 — Certificate of Service (District Court of Washington)
 *
 * Fills the official Washington State Administrative Office of the Courts
 * "MISC 05.0200 (01/2025)" Certificate of Service PDF using coordinate overlay
 * via pdf-lib (the form has no usable AcroForm fields).
 *
 * Source PDF: assets/forms/wa-misc-05-0200.pdf
 *
 * Data overlaid on the official form:
 *   • County name  (in "District Court of Washington, County of ___" header)
 *   • Case number  (in "No. ___" blank)
 *   • Plaintiff name  (case caption left column)
 *   • Defendant name  (case caption left column)
 *   • Defendant name / address / date of service  (table row)
 *   • Business-entity flag and agent name  (if applicable)
 *
 * Fields left blank for the process server to complete by hand:
 *   Server's name, service method checkbox (Personal / Substitute / Mail),
 *   county where served, person-at-abode name, and server's signature.
 *
 * Legal basis: RCW 12.40.040 — filed with the court after service is completed.
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(FORMS_DIR, "wa-misc-05-0200.pdf");

const BLACK = rgb(0, 0, 0);

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

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^wa-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const waServiceDefinition: FormDefinition = {
  state: "WA",
  formId: "WA-MISC05-0200",
  assetPath: PDF_PATH,
  renderingTechnique: "pdf-overlay",

  async generate(
    d: CaseData,
    _body: FormBody,
    _opts?: GenerateOptions,
  ): Promise<Buffer> {
    const pdfBytes = fs.readFileSync(PDF_PATH);
    const doc = await PDFDocument.load(pdfBytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    // Work on page 1 only — page 2 is a blank continuation/instructions page
    const pages = doc.getPages();
    const page = pages[0];

    // Conversion: pdftotext uses top-down (yMin=top, yMax=bottom) on a 792-pt page.
    // pdf-lib uses bottom-up. Baseline y ≈ 792 − pdftotext_yMax.

    const sz = 9;
    const bsz = 9;

    function t(
      text: string | null | undefined,
      x: number,
      y: number,
      size = sz,
      isBold = false,
    ) {
      if (!text) return;
      page.drawText(String(text), {
        x,
        y,
        size,
        font: isBold ? bold : font,
        color: BLACK,
      });
    }

    const countyName = countyDisplay((d as any).countyId);

    // ── County name (after "County of" which ends at x≈298, pdf-lib y≈554) ────
    if (countyName) {
      t(countyName, 302, 554);
    }

    // ── Case number (after "No." at x≈371, pdf-lib y≈536) ────────────────────
    if (d.caseNumber) {
      t(d.caseNumber, 375, 536, sz);
    }

    // ── Plaintiff name (above "Plaintiff," label; "Plaintiff," baseline at ≈518)
    // Draw at y=533 so name sits just above the "Plaintiff," pre-printed text.
    t(d.plaintiffName ?? "", 77, 533, bsz, true);

    // ── Defendant name (above "Defendant." label; "Defendant." baseline at ≈468)
    // "vs." baseline at ≈499. Draw defendant name in the gap.
    t(d.defendantName ?? "", 77, 483, bsz, true);

    // ── Table: Name of Defendant / Address Where Served / Date of Service ──────
    // Column headers are pre-printed at pdf-lib y≈404. Data row at y≈389.
    const defCSZ = cityStateZip(
      d.defendantCity,
      d.defendantState ?? "WA",
      d.defendantZip,
    );
    const defAddrFull = [d.defendantAddress, defCSZ].filter(Boolean).join(", ");

    t(d.defendantName ?? "", 72, 389, 8.5);
    t(defAddrFull, 256, 389, 8.5);
    // Date of service cell is left blank (server fills after service is completed)

    // ── Business-entity flag (at pdf-lib y≈362) ────────────────────────────────
    if (d.defendantIsBusinessOrEntity) {
      // Draw a filled checkbox square to the left of the pre-printed entity text
      page.drawRectangle({
        x: 74,
        y: 361,
        width: 8,
        height: 8,
        borderColor: BLACK,
        borderWidth: 0.7,
      });
      t("X", 75.5, 362, 7.5, true);

      // Agent name line (pre-printed "Title and Name of Person Served" at y≈343)
      if ((d as any).defendantAgentName) {
        t((d as any).defendantAgentName as string, 230, 343, 8.5);
      }
    }

    const saved = await doc.save();
    return Buffer.from(saved);
  },
};

FormRegistry.register(waServiceDefinition);
export { waServiceDefinition };
