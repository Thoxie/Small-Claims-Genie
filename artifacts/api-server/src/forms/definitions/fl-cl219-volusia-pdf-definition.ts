/**
 * FL CL-219 — Volusia County Statement of Claim (official county PDF).
 *
 * Fills the official Volusia County Clerk of Courts CL-219 PDF using
 * pdftk FDF fill. Use this for maximum court acceptance; the programmatic
 * variant (fl-cl219-volusia-definition.ts) remains available as a fallback.
 *
 * Source PDF: assets/fl-forms/cl-219-volusia.pdf
 * Field names confirmed via: python regex /T\s*\(([^)]+)\)/ scan
 *
 * Key fields:
 *   Plaintiff 1 / Plaintiff 2          — plaintiff name lines
 *   Defendant 1 / Defendant 2          — defendant name lines
 *   Plaintiffs Address 1               — plaintiff street address
 *   Plaintiffs Address 2               — plaintiff city, state zip
 *   Plaintiffs Telephone Number        — plaintiff phone
 *   Defendants Address 1               — defendant street address
 *   Defendants Address 2               — defendant city, state zip
 *   Defendants Telephone Number        — defendant phone
 *   Brief Statement Explaining Reasons For Filing Case  — claim description (first chunk)
 *   Continuation of Explanation for Filing Case         — claim description overflow
 *   Requested Judgment Amount          — dollar amount claimed
 *   Interest, Attorneys Fees and Costs — additional amounts (left blank)
 *   Case Number                        — blank (clerk assigns)
 *   Assigned Judge                     — blank
 *   Plaintiff or Plaintiffs Address    — plaintiff address (signature section)
 *   Plaintiff Address                  — plaintiff address (sworn section)
 *   Plaintiff or Plaintiffs Address 2  — city, state zip (signature section)
 *   Plaintiff or Plaintiffs Telephone Number — plaintiff phone (signature section)
 *   Plaintiff or Plaintiffs Attorney   — blank (self-represented)
 *   BY                                 — plaintiff name (signature line)
 *   Month / Day / Last 2 year numbers  — date of signing
 *
 * Filing: Volusia County Clerk of Courts, 101 N. Alabama Ave., DeLand, FL 32724
 */

import * as path from "path";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "cl-219-volusia.pdf");

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
  else if (zip) parts.push(zip);
  return parts.join(", ");
}

/**
 * Split a description string into two chunks at a word boundary.
 * The Volusia CL-219 has a primary field and a "Continuation" field.
 */
function splitDescription(desc: string, primaryMax = 400): [string, string] {
  if (!desc) return ["", ""];
  if (desc.length <= primaryMax) return [desc, ""];
  const cut = desc.lastIndexOf(" ", primaryMax);
  const splitAt = cut > 0 ? cut : primaryMax;
  return [desc.slice(0, splitAt).trim(), desc.slice(splitAt).trim()];
}

function signingDate(): { month: string; day: string; year2: string } {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  const day = String(now.getDate());
  const year2 = String(now.getFullYear()).slice(-2);
  return { month, day, year2 };
}

// ─── Form definition ──────────────────────────────────────────────────────────

const cl219VolusiaPdfDefinition: FormDefinition = {
  state: "FL",
  formId: "CL-219-VOLUSIA-PDF",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: CaseData, _body: FormBody, _opts?: GenerateOptions): Promise<Buffer> {
    const pltCityStateZip = cityStateZip(d.plaintiffCity, d.plaintiffState, d.plaintiffZip);
    const defCityStateZip = cityStateZip(d.defendantCity, d.defendantState, d.defendantZip);
    const [primary, continuation] = splitDescription(d.claimDescription ?? "");
    const { month, day, year2 } = signingDate();

    const text: Record<string, string> = {
      // ── Plaintiff ─────────────────────────────────────────────────────────
      "Plaintiff 1":                 d.plaintiffName ?? "",
      "Plaintiff 2":                 d.plaintiffDbaName ?? "",
      "Plaintiffs Address 1":        d.plaintiffAddress ?? "",
      "Plaintiffs Address 2":        pltCityStateZip,
      "Plaintiffs Telephone Number": d.plaintiffPhone ?? "",

      // ── Defendant ─────────────────────────────────────────────────────────
      "Defendant 1":                 d.defendantName ?? "",
      "Defendant 2":                 "",
      "Defendants Address 1":        d.defendantAddress ?? "",
      "Defendants Address 2":        defCityStateZip,
      "Defendants Telephone Number": d.defendantPhone ?? "",

      // ── Claim ─────────────────────────────────────────────────────────────
      "Brief Statement Explaining Reasons For Filing Case": primary,
      "Continuation of Explanation for Filing Case":        continuation,
      "Requested Judgment Amount":                          formatAmount(d.claimAmount),
      "Interest, Attorneys Fees and Costs":                 "",

      // ── Court use ─────────────────────────────────────────────────────────
      "Case Number":    "",
      "Assigned Judge": "",

      // ── Signature / sworn section ─────────────────────────────────────────
      "Plaintiff or Plaintiffs Address":           d.plaintiffAddress ?? "",
      "Plaintiff Address":                         d.plaintiffAddress ?? "",
      "Plaintiff or Plaintiffs Address 2":         pltCityStateZip,
      "Plaintiff or Plaintiffs Telephone Number":  d.plaintiffPhone ?? "",
      "Plaintiff or Plaintiffs Attorney":          "",
      "BY":                                        d.plaintiffName ?? "",

      // ── Date ──────────────────────────────────────────────────────────────
      "Month":              month,
      "Day":                day,
      "Last 2 year numbers": year2,
    };

    return pdftk_fill_form(PDF_PATH, { text });
  },
};

FormRegistry.register(cl219VolusiaPdfDefinition);
export { cl219VolusiaPdfDefinition };
