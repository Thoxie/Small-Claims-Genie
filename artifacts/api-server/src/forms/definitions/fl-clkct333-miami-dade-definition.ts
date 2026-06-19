/**
 * FL CLK/CT. 333 — Miami-Dade County Statement of Claim.
 *
 * Fills the official Miami-Dade County Court AcroForm PDF using pdftk FDF fill.
 *
 * Source PDF: assets/fl-forms/clk-ct-333.pdf
 * Field names confirmed via: pdftk + pdf-lib inspection
 *
 * Key named fields (pdf-lib): Plaintiff, Defendant, Address, Phone
 * Text fields (positional): Text1 (email), Text7-9 (description), Text10 (amount),
 *   Text11 (plaintiff sworn name), Text12 (attorney/plaintiff name),
 *   Text14 (attorney/plaintiff address), Text15 (phone), Text16 (email footer)
 * Checkboxes: Check Box1 (CIVIL), Check Box4-11 (claim types)
 */

import * as path from "path";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "clk-ct-333.pdf");

// ─── Claim type → checkbox name ───────────────────────────────────────────────
// Checkboxes at y=257-350 in the form body; mapped by visual order.
const CLAIM_TYPE_CHECKBOX: Record<string, string> = {
  goods:          "Check Box4",   // Goods, wares, and merchandise sold
  services:       "Check Box5",   // Work done and materials furnished
  loan:           "Check Box6",   // Money lent
  account_stated: "Check Box7",   // Money due on account
  contract:       "Check Box8",   // Written instrument attached
  rent:           "Check Box9",   // Rent for premises
  other:          "Check Box10",  // Other (Explain)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wraps a description string into up to 3 lines of ~90 chars each,
 * splitting at word boundaries to match the Text7/Text8/Text9 fields
 * (each 545pt wide at 10pt font ≈ 90 characters per line).
 */
function splitDescription(desc: string): [string, string, string] {
  if (!desc) return ["", "", ""];
  const words = desc.split(/\s+/);
  const lines: string[] = ["", "", ""];
  let lineIdx = 0;
  for (const word of words) {
    if (lineIdx >= 3) break;
    const candidate = lines[lineIdx] ? lines[lineIdx] + " " + word : word;
    if (candidate.length <= 90) {
      lines[lineIdx] = candidate;
    } else {
      lineIdx++;
      if (lineIdx < 3) lines[lineIdx] = word;
    }
  }
  return [lines[0]!, lines[1]!, lines[2]!];
}

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function joinAddress(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const parts: string[] = [];
  if (street) parts.push(street);
  const cityStateZip = [city, state && zip ? `${state} ${zip}` : state]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) parts.push(cityStateZip);
  return parts.join(", ");
}

// ─── Form definition ──────────────────────────────────────────────────────────

const clkCt333Definition: FormDefinition = {
  state: "FL",
  formId: "CLK-CT-333",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: CaseData, _body: FormBody, _opts?: GenerateOptions): Promise<Buffer> {
    const claimType  = d.claimType ?? "";
    const description = d.claimDescription ?? "";
    const [line1, line2, line3] = splitDescription(description);

    const defAddress  = joinAddress(d.defendantAddress, d.defendantCity, d.defendantState, d.defendantZip);
    const pltAddress  = joinAddress(d.plaintiffAddress, d.plaintiffCity, d.plaintiffState, d.plaintiffZip);

    // ── Checkboxes ──────────────────────────────────────────────────────────
    const checkboxes: Record<string, boolean | string> = {
      "Check Box1": true,  // CIVIL division — always checked
    };

    const cbKey = CLAIM_TYPE_CHECKBOX[claimType];
    if (cbKey) checkboxes[cbKey] = true;

    // "Additional facts" checkbox — check when we have a description
    if (description) checkboxes["Check Box11"] = true;

    // ── Text fields ─────────────────────────────────────────────────────────
    const text: Record<string, string> = {
      // Named header fields
      "Plaintiff": d.plaintiffName ?? "",
      "Defendant": d.defendantName ?? "",
      "Address":   defAddress,
      "Phone":     d.defendantPhone ?? "",

      // Top-right email (plaintiff's email for court communications)
      "Text1": d.plaintiffEmail ?? "",

      // Description lines (up to 270 chars total across 3 lines)
      "Text7": line1,
      "Text8": line2,
      "Text9": line3,

      // Claim amount ($X,XXX.00)
      "Text10": formatAmount(d.claimAmount),

      // Sworn statement: "The Plaintiff, ___ says the foregoing..."
      "Text11": d.plaintiffName ?? "",

      // Attorney / Plaintiff contact block at bottom of form
      "Text12": d.plaintiffName ?? "",
      "Text14": pltAddress,
      "Text15": d.plaintiffPhone ?? "",
      "Text16": d.plaintiffEmail ?? "",
    };

    return pdftk_fill_form(PDF_PATH, { text, checkboxes });
  },
};

FormRegistry.register(clkCt333Definition);
export { clkCt333Definition };
