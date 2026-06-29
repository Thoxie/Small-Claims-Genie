/**
 * FL CL-219 — Volusia County Statement of Claim (official county PDF).
 *
 * Fills the official Volusia County Clerk of Courts CL-219 PDF using
 * pdf-lib AcroForm fill directly (no pdftk required).
 * Use this for maximum court acceptance; the programmatic variant
 * (fl-cl219-volusia-definition.ts) remains available as a fallback.
 *
 * Source PDF: assets/fl-forms/cl-219-volusia.pdf
 * Downloaded from: https://www.clerk.org/pdf/CL-0219-Statement-of-Claim.pdf
 *
 * Key fields (22 AcroForm fields, all on page 1):
 *   STATEMENT OF CLAIM     — plaintiff name (caption, LEFT of "Sues")
 *   undefined              — defendant name (caption, RIGHT of "Sues")
 *   undefined_2 / undefined_3 — additional party name lines (blank)
 *   Plaintiffs             — plaintiff name (body)
 *   Defendants             — defendant name (body)
 *   Address / Address_2    — plaintiff / defendant full address
 *   Telephone / Telephone_2 — plaintiff / defendant phone
 *   Plaintiffs_2           — plaintiff name (claim body)
 *   sues                   — defendant name (claim body)
 *   2 Give a brief statement … — claim description (primary)
 *   any supporting documentation … 1-6 — overflow lines
 *   WHEREFORE Plaintiff requests judgment in the amount of — claim amount
 *   damages                — additional damages (blank)
 *   undefined_4            — page 1 "Plaintiff's Signature" blank (drawn via pdf-lib overlay)
 *
 * NOTE: Page 2's "Signature of Plaintiff(s)" is a non-fillable printed line —
 * drawn via pdf-lib overlay at x=295, y=640.
 *
 * Filing: Volusia County Clerk of Courts, 101 N. Alabama Ave., DeLand, FL 32724
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "cl-219-volusia.pdf");

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

function splitDescription(desc: string): [string, string[]] {
  if (!desc) return ["", []];
  const primaryMax = 200;
  if (desc.length <= primaryMax) return [desc, []];

  const primaryCut = desc.lastIndexOf(" ", primaryMax);
  const primaryEnd = primaryCut > 0 ? primaryCut : primaryMax;
  const primary = desc.slice(0, primaryEnd).trim();
  const rest = desc.slice(primaryEnd).trim();

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

function safeSetText(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string): void {
  try { form.getTextField(name).setText(value || ""); } catch { /* field absent */ }
}

const cl219VolusiaPdfDefinition: FormDefinition = {
  state: "FL",
  formId: "CL-219-VOLUSIA-PDF",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdflib",

  async generate(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    const pltAddress = fullAddress(d.plaintiffAddress, d.plaintiffCity, d.plaintiffState, d.plaintiffZip);
    const defAddress = fullAddress(d.defendantAddress, d.defendantCity, d.defendantState, d.defendantZip);
    const [primary, continuations] = splitDescription(d.claimDescription ?? "");

    const pdfBytes = fs.readFileSync(PDF_PATH);
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();

    // ── Header: parties ────────────────────────────────────────────────────────
    safeSetText(form, "Plaintiffs",  d.plaintiffName ?? "");
    safeSetText(form, "Defendants",  d.defendantName ?? "");

    // ── Addresses ──────────────────────────────────────────────────────────────
    safeSetText(form, "Address",   pltAddress);
    safeSetText(form, "Address_2", defAddress);

    // ── Phone numbers ──────────────────────────────────────────────────────────
    safeSetText(form, "Telephone",   d.plaintiffPhone ?? "");
    safeSetText(form, "Telephone_2", d.defendantPhone ?? "");

    // ── Body: "Plaintiffs [name] sues Defendants [name] for…" ─────────────────
    safeSetText(form, "Plaintiffs_2", d.plaintiffName ?? "");
    safeSetText(form, "sues",         d.defendantName ?? "");

    // ── Claim description ──────────────────────────────────────────────────────
    safeSetText(form, "2 Give a brief statement explaining reasons for filing this suit  what happened dates times place etc Attach", primary);
    safeSetText(form, "any supporting documentation and additional pages if needed 1", continuations[0] ?? "");
    safeSetText(form, "any supporting documentation and additional pages if needed 2", continuations[1] ?? "");
    safeSetText(form, "any supporting documentation and additional pages if needed 3", continuations[2] ?? "");
    safeSetText(form, "any supporting documentation and additional pages if needed 4", continuations[3] ?? "");
    safeSetText(form, "any supporting documentation and additional pages if needed 5", continuations[4] ?? "");
    safeSetText(form, "any supporting documentation and additional pages if needed 6", continuations[5] ?? "");

    // ── Claim amount ───────────────────────────────────────────────────────────
    safeSetText(form, "WHEREFORE Plaintiff requests judgment in the amount of", formatAmount(d.claimAmount));
    safeSetText(form, "damages", "");

    // ── Caption: party names on either side of "Sues" (top of page 1) ─────────
    // pdf-lib widget names are misleading: "STATEMENT OF CLAIM" = LEFT (plaintiff),
    // "undefined" = RIGHT (defendant). Confirmed via pdf-lib widget rect dump.
    safeSetText(form, "STATEMENT OF CLAIM", d.plaintiffName ?? "");
    safeSetText(form, "undefined",          d.defendantName ?? "");
    safeSetText(form, "undefined_2", "");
    safeSetText(form, "undefined_3", "");
    safeSetText(form, "undefined_4", "");

    // ── Date + optional signature overlay ─────────────────────────────────────
    const todayStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const [pg] = doc.getPages();
    pg.drawText(todayStr, { x: 342, y: 96, size: 9, font: helv });
    if (opts?.signatureBytes) {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      // Page 1: "Plaintiff's Signature" blank rule at x=342, y=120–140
      pg.drawImage(sigImg, { x: 342, y: 120, width: 180, height: 20, opacity: 1 });
      // Page 2: non-fillable sworn signature line at x=295, y=640
      const pg2 = doc.getPages()[1];
      if (pg2) {
        pg2.drawImage(sigImg, { x: 295, y: 640, width: 180, height: 25, opacity: 1 });
      }
    }

    form.flatten();
    return Buffer.from(await doc.save({ updateFieldAppearances: false }));
  },
};

FormRegistry.register(cl219VolusiaPdfDefinition);
export { cl219VolusiaPdfDefinition };
