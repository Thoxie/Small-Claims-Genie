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

  async generate(d: CaseData, _body: FormBody, _opts?: GenerateOptions): Promise<Buffer> {
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

    return pdftk_fill_form(PDF_PATH, { text });
  },
};

FormRegistry.register(plainSocOrangeDefinition);
export { plainSocOrangeDefinition };
