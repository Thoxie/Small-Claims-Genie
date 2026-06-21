/**
 * FL CLK/CT. 423 — Miami-Dade County Summons/Notice to Appear for Pretrial Conference.
 *
 * Fills the official Miami-Dade CLK/CT. 423 AcroForm PDF using pdftk FDF fill.
 * Pre-fills plaintiff, defendant, and service address fields from case data.
 * Court-assigned fields (case number, section, date, hearing time, courtroom,
 * deputy clerk) are intentionally left blank — the clerk completes those at filing.
 *
 * Source PDF: assets/fl-forms/clkct423-miami-dade-summons.pdf
 * Form: CLK/CT. 423 Rev. 02/26
 * Filing: Miami-Dade County Court Clerk, 73 W. Flagler St., Suite 133, Miami, FL 33130
 * Website: https://www.miamidadeclerk.gov
 *
 * Key fields (confirmed via pdf-lib field inspection):
 *   Plaintiff                   — plaintiff full name
 *   Defendant                   — defendant full name
 *   Defendant to be served at   — defendant address line 1
 *   Defendant 2nd to be served at — defendant address line 2
 *   Defendant 3rd to be served at — defendant city/state/zip
 *   Filed by                    — plaintiff name (bottom section)
 *   Address                     — plaintiff address
 *   Address continued           — plaintiff city/state/zip
 *   Telephone                   — plaintiff phone
 *   Civil                       — checkbox: Yes (always for small claims)
 */

import * as path from "path";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "clkct423-miami-dade-summons.pdf");

const clkCt423Definition: FormDefinition = {
  state: "FL",
  formId: "CLK-CT-423",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: CaseData, _body: FormBody, _opts?: GenerateOptions): Promise<Buffer> {
    const defStreet = d.defendantAddress ?? "";
    const defCityStateZip = [d.defendantCity, d.defendantState, d.defendantZip]
      .filter(Boolean)
      .join(", ");

    const pltStreet = d.plaintiffAddress ?? "";
    const pltCityStateZip = [d.plaintiffCity, d.plaintiffState, d.plaintiffZip]
      .filter(Boolean)
      .join(", ");

    const text: Record<string, string> = {
      // ── Parties (header) ─────────────────────────────────────────────────
      "Plaintiff": d.plaintiffName ?? "",
      "Defendant": d.defendantName ?? "",

      // ── Defendant service address ─────────────────────────────────────────
      "Defendant to be served at":     d.defendantName ?? "",
      "Defendant 2nd to be served at": defStreet,
      "Defendant 3rd to be served at": defCityStateZip,

      // ── Filed-by section (plaintiff info at bottom) ───────────────────────
      "Filed by":         d.plaintiffName ?? "",
      "Address":          pltStreet,
      "Address continued": pltCityStateZip,
      "Telephone":        d.plaintiffPhone ?? "",

      // ── Court-assigned fields — left blank for clerk ──────────────────────
      "CaseNumber":       "",
      "Section Number":   "",
      "Section":          "",
      "Month":            "",
      "Year":             "",
      "Time":             "",
      "Court Room number": "",
      "Date":             "",
      "Deputy Clerk":     "",
    };

    const checkboxes: Record<string, boolean> = {
      // Division: Civil is always checked for small claims
      "Civil":     true,
      "Districts": false,
      "Other":     false,

      // Court location — left unchecked (clerk selects appropriate location)
      "Dade County Courthouse Central Court": false,
      "Joseph Caleb Center Court":            false,
      "Coral Gables District Court":          false,
      "North Dade Justice Center":            false,
      "Miami Beach District":                 false,
      "Hialeah District Court":               false,

      // Service / delivery — left unchecked (clerk fills at filing)
      "Copy mailed to":    false,
      "Hand delivered to": false,
      "Plaintiff check box": false,
      "Attorney":          false,
      "Process Server":    false,
      "Sheriff":           false,
      "Served by Mail":    false,
    };

    const buf = await pdftk_fill_form(PDF_PATH, { text, checkboxes });
    // CLK/CT. 423 is a court-issued summons. The "FILED BY" section (pre-filled with plaintiff
    // name, address, phone) is not a signature field — the only signature line on the form is
    // the deputy clerk's, which the court completes. No plaintiff signature overlay is applied.
    return buf;
  },
};

FormRegistry.register(clkCt423Definition);
export { clkCt423Definition };
