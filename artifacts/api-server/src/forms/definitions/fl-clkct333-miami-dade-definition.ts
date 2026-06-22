/**
 * FL CLK/CT. 333 — Miami-Dade County Statement of Claim (official county PDF).
 *
 * Fills the official Miami-Dade CLK/CT. 333 AcroForm PDF using pdftk FDF fill.
 *
 * Source PDF: assets/fl-forms/clkct333-miami-dade.pdf
 * Form: CLK/CT. 333 Rev. 06/23
 * Filing: Miami-Dade County Court Clerk, 73 W. Flagler St., Suite 133, Miami, FL 33130
 * Phone: (305) 275-1155 | Website: https://www.miamidadeclerk.gov
 *
 * Key fields confirmed via pdftk dump_data_fields + filled sample:
 *   Plaintiff     — plaintiff name (multiline, header)
 *   Defendant     — defendant name (multiline, header)
 *   Address       — defendant address
 *   Phone         — defendant phone
 *   Text14        — additional facts / claim description (large text area)
 *   Text16        — judgment amount
 *   Check Box6    — "Other (Explain)" claim type checkbox
 *   Check Box1-5,11 — specific claim type checkboxes
 *
 * Note: Signature and notary fields are left blank — user must sign before filing.
 */

import * as path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "clkct333-miami-dade.pdf");

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fullAddress(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const parts: string[] = [];
  if (street) parts.push(street);
  const cityLine: string[] = [];
  if (city) cityLine.push(city);
  if (state && zip) cityLine.push(`${state} ${zip}`);
  else if (state) cityLine.push(state);
  else if (zip) cityLine.push(zip);
  if (cityLine.length) parts.push(cityLine.join(", "));
  return parts.join("\n");
}

/**
 * Map a claim description to the appropriate checkbox on the CLK/CT. 333.
 * Returns the field name of the matching checkbox, defaulting to Check Box6 (Other).
 */
function claimTypeCheckbox(d: CaseData): string {
  const desc = (d.claimDescription ?? "").toLowerCase();
  const type = (d.claimType ?? "").toLowerCase();
  if (type.includes("goods") || desc.includes("merchandise") || desc.includes("goods")) return "Check Box1";
  if (type.includes("work") || desc.includes("labor") || desc.includes("work done") || desc.includes("materials")) return "Check Box2";
  if (type.includes("loan") || desc.includes("money lent") || desc.includes("loan")) return "Check Box3";
  if (type.includes("account") || desc.includes("account stated")) return "Check Box4";
  if (type.includes("contract") || type.includes("written") || desc.includes("written instrument") || desc.includes("contract")) return "Check Box11";
  if (type.includes("rent") || desc.includes("rent") || desc.includes("lease")) return "Check Box5";
  return "Check Box6"; // Other (Explain)
}

const clkCt333Definition: FormDefinition = {
  state: "FL",
  formId: "CLK-CT-333",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    const defAddress = fullAddress(d.defendantAddress, d.defendantCity, d.defendantState, d.defendantZip);

    const checkedBox = claimTypeCheckbox(d);

    const text: Record<string, string> = {
      // ── Parties ───────────────────────────────────────────────────────────
      "Plaintiff": d.plaintiffName ?? "",
      "Defendant": d.defendantName ?? "",

      // ── Defendant address + phone ─────────────────────────────────────────
      "Address": defAddress,
      "Phone":   d.defendantPhone ?? "",

      // ── Claim description (large text area) ───────────────────────────────
      "Text14": d.claimDescription ?? "",

      // ── Judgment amount ───────────────────────────────────────────────────
      "Text16": formatAmount(d.claimAmount),

      // ── Plaintiff name in oath line ───────────────────────────────────────
      "Text8": d.plaintiffName ?? "",

      // ── Leave court-use / signature / notary fields blank ─────────────────
      "Text1":  "",
      "Text2":  "",
      "Text7":  "",
      "Text9":  "",
      "Text10": "",
      "Text11": "",
      "Text12": "",
      "Text13": "",
      "Text15": "",
      "Text17": "",
      "Text18": "",
      "Text19": "",
      "Text20": "",
      "Text21": "",
      "Text22": "",
      "Text23": "",
      "Text24": "",
      "Text25": "",
      "Text26": "",
      "Text27": "",
    };

    const checkboxes: Record<string, boolean> = {
      "Check Box1":  checkedBox === "Check Box1",
      "Check Box2":  checkedBox === "Check Box2",
      "Check Box3":  checkedBox === "Check Box3",
      "Check Box4":  checkedBox === "Check Box4",
      "Check Box11": checkedBox === "Check Box11",
      "Check Box5":  checkedBox === "Check Box5",
      "Check Box6":  checkedBox === "Check Box6",
      // Remaining checkboxes (service type, oath options) left unchecked
      "Check Box7":  false,
      "Check Box8":  false,
      "Check Box9":  false,
      "Check Box10": false,
      "Check Box12": false,
      "Check Box13": false,
      "Check Box14": false,
      "Check Box15": false,
      "Check Box16": false,
    };

    const buf = await pdftk_fill_form(PDF_PATH, { text, checkboxes });
    try {
      const todayStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
      const doc = await PDFDocument.load(buf);
      const helv = await doc.embedFont(StandardFonts.Helvetica);
      const [pg] = doc.getPages();
      // Date goes in the left column of the three-column verification row (x=54), at the same
      // vertical midpoint as the Signature column (pdf-lib y=244).
      pg.drawText(`Date: ${todayStr}`, { x: 54, y: 244, size: 9, font: helv });
      if (opts?.signatureBytes) {
        // "Signature" label (vs. "Attorney/Plaintiff" printed name) is at x=323, pdf-lib y=235–248.
        // The blank line above the label sits at pdf-lib y≈252–268.
        // x=323, y=235, h=36 places the image from y=235 (label bottom) up to y=271 (spanning the blank).
        // Visually confirmed correct (2026-06-21): sig lands cleanly on the signature blank line
        // in the middle (Signature) column of the three-column row.
        const sigImg = await doc.embedPng(opts.signatureBytes);
        pg.drawImage(sigImg, { x: 323, y: 235, width: 130, height: 36, opacity: 1 });
      }
      return Buffer.from(await doc.save({ updateFieldAppearances: false }));
    } catch { /* ignore — return plain fill */ }
    return buf;
  },
};

FormRegistry.register(clkCt333Definition);
export { clkCt333Definition };
