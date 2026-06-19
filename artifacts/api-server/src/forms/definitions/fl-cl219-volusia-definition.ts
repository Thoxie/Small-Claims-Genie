/**
 * FL CL-219 — Volusia County Statement of Claim.
 *
 * Fills the official Volusia County Court interactive AcroForm PDF using
 * pdftk FDF fill. All field names are human-readable and map directly to
 * case intake data.
 *
 * Source PDF: assets/fl-forms/cl-219-volusia.pdf
 * Field names confirmed via: pdftk dump_data_fields
 *
 * Primary fields:
 *   Plaintiff 1 / Plaintiff 2 — plaintiff name (second line for DBA)
 *   Defendant 1 / Defendant 2 — defendant name (second for multi-defendant)
 *   Plaintiffs Address 1 / 2  — street / city-state-zip
 *   Defendants Address 1 / 2  — street / city-state-zip
 *   Brief Statement…          — claim description (500 char max, first section)
 *   Continuation of…          — overflow description (next 500 chars)
 *   Requested Judgment Amount — formatted dollar amount
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

/** Split an address into (street line, city-state-zip line). */
function splitAddress(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): [string, string] {
  const line1 = street ?? "";
  const cityPart = city ?? "";
  const statePart = state ?? "";
  const zipPart  = zip  ?? "";
  const line2 = [cityPart, statePart && zipPart ? `${statePart} ${zipPart}` : statePart]
    .filter(Boolean)
    .join(", ");
  return [line1, line2];
}

/** Full single-line address for signature / verification sections. */
function joinAddress(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const [l1, l2] = splitAddress(street, city, state, zip);
  return [l1, l2].filter(Boolean).join(", ");
}

/**
 * Split description into primary (≤500 chars) and continuation (next 500 chars),
 * breaking at a word boundary to avoid mid-word cuts.
 */
function splitDescription(desc: string): [string, string] {
  if (desc.length <= 500) return [desc, ""];
  const cutPoint = desc.lastIndexOf(" ", 500);
  const split    = cutPoint > 0 ? cutPoint : 500;
  return [desc.slice(0, split).trim(), desc.slice(split, 1000).trim()];
}

// ─── Form definition ──────────────────────────────────────────────────────────

const cl219VolusiaDefinition: FormDefinition = {
  state: "FL",
  formId: "CL-219-VOLUSIA",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: CaseData, _body: FormBody, _opts?: GenerateOptions): Promise<Buffer> {
    const [pltAddr1, pltAddr2] = splitAddress(
      d.plaintiffAddress,
      d.plaintiffCity,
      d.plaintiffState,
      d.plaintiffZip,
    );
    const [defAddr1, defAddr2] = splitAddress(
      d.defendantAddress,
      d.defendantCity,
      d.defendantState,
      d.defendantZip,
    );
    const pltFullAddr = joinAddress(
      d.plaintiffAddress,
      d.plaintiffCity,
      d.plaintiffState,
      d.plaintiffZip,
    );

    const [primary, continuation] = splitDescription(d.claimDescription ?? "");

    const text: Record<string, string> = {
      // ── Plaintiff / Defendant header ───────────────────────────────────────
      "Plaintiff 1": d.plaintiffName ?? "",
      "Plaintiff 2": d.plaintiffDbaName ?? "",
      "Defendant 1": d.defendantName ?? "",
      "Defendant 2": "",

      // ── Addresses & phones ─────────────────────────────────────────────────
      "Plaintiffs Address 1":        pltAddr1,
      "Plaintiffs Address 2":        pltAddr2,
      "Plaintiffs Telephone Number": d.plaintiffPhone ?? "",

      "Defendants Address 1":        defAddr1,
      "Defendants Address 2":        defAddr2,
      "Defendants Telephone Number": d.defendantPhone ?? "",

      // ── Claim description ──────────────────────────────────────────────────
      "Brief Statement Explaining Reasons For Filing Case": primary,
      "Continuation of Explanation for Filing Case":        continuation,

      // ── Amount ────────────────────────────────────────────────────────────
      "Requested Judgment Amount":        formatAmount(d.claimAmount),
      "Interest, Attorneys Fees and Costs": "",

      // ── Signature / verification section ──────────────────────────────────
      "Plaintiff or Plaintiffs Address 2":        pltFullAddr,
      "Plaintiff or Plaintiffs Telephone Number": d.plaintiffPhone ?? "",

      // ── Identification section ─────────────────────────────────────────────
      "Plaintiff Address": pltFullAddr,
    };

    return pdftk_fill_form(PDF_PATH, { text });
  },
};

FormRegistry.register(cl219VolusiaDefinition);
export { cl219VolusiaDefinition };
