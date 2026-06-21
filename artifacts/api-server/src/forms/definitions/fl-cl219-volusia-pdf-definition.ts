/**
 * FL CL-219 — Volusia County Statement of Claim (official county PDF).
 *
 * Fills the official Volusia County Clerk of Courts CL-219 PDF using
 * pdftk FDF fill. Use this for maximum court acceptance; the programmatic
 * variant (fl-cl219-volusia-definition.ts) remains available as a fallback.
 *
 * Source PDF: assets/fl-forms/cl-219-volusia.pdf
 * Downloaded from: https://www.clerk.org/pdf/CL-0219-Statement-of-Claim.pdf
 * Field names confirmed via: pdftk dump_data_fields
 *
 * Key fields (as returned by pdftk dump_data_fields):
 *   Plaintiffs                                               — plaintiff name (header)
 *   Defendants                                               — defendant name (header)
 *   Address                                                  — plaintiff full address
 *   Address_2                                                — defendant full address
 *   Telephone                                                — plaintiff phone
 *   Telephone_2                                              — defendant phone
 *   Plaintiffs_2                                             — plaintiff name (claim body)
 *   sues                                                     — defendant name (claim body)
 *   2 Give a brief statement explaining reasons for filing…  — claim description (primary)
 *   any supporting documentation and additional pages…1-6    — claim description overflow lines
 *   WHEREFORE Plaintiff requests judgment in the amount of   — claim amount
 *   damages                                                  — additional damages (blank)
 *   undefined / undefined_2 / undefined_3 / undefined_4     — court-use fields (blank)
 *
 * Filing: Volusia County Clerk of Courts, 101 N. Alabama Ave., DeLand, FL 32724
 */

import * as path from "path";
import { PDFDocument } from "pdf-lib";
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

function fullAddress(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const line1 = street ?? "";
  const cityPart = city ?? "";
  const statePart = state ?? "";
  const zipPart = zip ?? "";
  const line2Parts: string[] = [];
  if (cityPart) line2Parts.push(cityPart);
  if (statePart && zipPart) line2Parts.push(`${statePart} ${zipPart}`);
  else if (statePart) line2Parts.push(statePart);
  else if (zipPart) line2Parts.push(zipPart);
  const line2 = line2Parts.join(", ");
  return [line1, line2].filter(Boolean).join("\n");
}

/**
 * Split a description string into a primary field (first line) and up to six
 * overflow continuation lines. The Volusia CL-219 has one primary description
 * field and six "additional pages if needed" continuation fields.
 */
function splitDescription(desc: string): [string, string[]] {
  if (!desc) return ["", []];
  const primaryMax = 200;
  if (desc.length <= primaryMax) return [desc, []];

  const primaryCut = desc.lastIndexOf(" ", primaryMax);
  const primaryEnd = primaryCut > 0 ? primaryCut : primaryMax;
  const primary = desc.slice(0, primaryEnd).trim();
  const rest = desc.slice(primaryEnd).trim();

  // Split rest into ~200-char continuation chunks (at word boundaries)
  const chunks: string[] = [];
  let remaining = rest;
  while (remaining.length > 0 && chunks.length < 6) {
    if (remaining.length <= 200) {
      chunks.push(remaining);
      break;
    }
    const cut = remaining.lastIndexOf(" ", 200);
    const end = cut > 0 ? cut : 200;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }

  return [primary, chunks];
}

// ─── Form definition ──────────────────────────────────────────────────────────

const cl219VolusiaPdfDefinition: FormDefinition = {
  state: "FL",
  formId: "CL-219-VOLUSIA-PDF",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    const pltAddress = fullAddress(d.plaintiffAddress, d.plaintiffCity, d.plaintiffState, d.plaintiffZip);
    const defAddress = fullAddress(d.defendantAddress, d.defendantCity, d.defendantState, d.defendantZip);
    const [primary, continuations] = splitDescription(d.claimDescription ?? "");

    const text: Record<string, string> = {
      // ── Header: parties ───────────────────────────────────────────────────
      "Plaintiffs":  d.plaintiffName ?? "",
      "Defendants":  d.defendantName ?? "",

      // ── Addresses ─────────────────────────────────────────────────────────
      "Address":   pltAddress,
      "Address_2": defAddress,

      // ── Phone numbers ─────────────────────────────────────────────────────
      "Telephone":   d.plaintiffPhone ?? "",
      "Telephone_2": d.defendantPhone ?? "",

      // ── Body: "Plaintiffs [name] sues Defendants [name] for…" ─────────────
      "Plaintiffs_2": d.plaintiffName ?? "",
      "sues":         d.defendantName ?? "",

      // ── Claim description ─────────────────────────────────────────────────
      "2 Give a brief statement explaining reasons for filing this suit  what happened dates times place etc Attach":
        primary,
      "any supporting documentation and additional pages if needed 1": continuations[0] ?? "",
      "any supporting documentation and additional pages if needed 2": continuations[1] ?? "",
      "any supporting documentation and additional pages if needed 3": continuations[2] ?? "",
      "any supporting documentation and additional pages if needed 4": continuations[3] ?? "",
      "any supporting documentation and additional pages if needed 5": continuations[4] ?? "",
      "any supporting documentation and additional pages if needed 6": continuations[5] ?? "",

      // ── Claim amount ──────────────────────────────────────────────────────
      "WHEREFORE Plaintiff requests judgment in the amount of": formatAmount(d.claimAmount),
      "damages": "",

      // ── Court-use / undefined fields — left blank ─────────────────────────
      "STATEMENT OF CLAIM": "",
      "undefined":   "",
      "undefined_2": "",
      "undefined_3": "",
      "undefined_4": "",
    };

    const buf = await pdftk_fill_form(PDF_PATH, { text });
    if (opts?.signatureBytes) {
      try {
        const filled = await PDFDocument.load(buf);
        const [pg] = filled.getPages();
        const sigImg = await filled.embedPng(opts.signatureBytes);
        // "Plaintiff's Signature" label is on page 1, right-aligned at x=342, pdf-lib y=104–120.
        // The blank rule sits just above the label at pdf-lib y≈120–132.
        // x=342, y=120, h=28 places the image from y=120 (label top) up to y=148, spanning the blank.
        pg.drawImage(sigImg, { x: 342, y: 120, width: 180, height: 28, opacity: 1 });
        return Buffer.from(await filled.save({ updateFieldAppearances: false }));
      } catch { /* ignore — return plain fill */ }
    }
    return buf;
  },
};

FormRegistry.register(cl219VolusiaPdfDefinition);
export { cl219VolusiaPdfDefinition };
