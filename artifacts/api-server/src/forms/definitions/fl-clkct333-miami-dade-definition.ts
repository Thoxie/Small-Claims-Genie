/**
 * FL CLK/CT. 333 — Miami-Dade County Statement of Claim (official county PDF).
 *
 * Fills the official Miami-Dade CLK/CT. 333 AcroForm PDF using pdf-lib directly.
 * pdf-lib sees all form fields in this PDF (including hidden named fields that
 * pdftk could not enumerate).
 *
 * Source PDF: assets/fl-forms/clkct333-miami-dade.pdf
 * Form: CLK/CT. 333 Rev. 06/23
 * Filing: Miami-Dade County Court Clerk, 73 W. Flagler St., Suite 133, Miami, FL 33130
 * Phone: (305) 275-1155 | Website: https://www.miamidadeclerk.gov
 *
 * Field map (verified via pdftk FDF field-name render, 2026-07-08):
 *   Plaintiff     — plaintiff name (multiline, header)
 *   Defendant     — defendant name (multiline, header)
 *   Address       — defendant address
 *   Phone         — defendant phone
 *   Text1         — Case Number (left blank, assigned by clerk)
 *   Text2         — Section No. (left blank)
 *   Text7         — Claim description line 1  (large blank area below checkboxes)
 *   Text8         — Claim description line 2
 *   Text9         — Claim description line 3
 *   Text10        — Judgment amount ("Where Plaintiff demands judgment in the sum of $")
 *   Text11        — Plaintiff name in oath ("The Plaintiff, ___ says the foregoing...")
 *   Text12        — Attorney/Plaintiff name (plaintiff fills pro se)
 *   Text13        — Attorney's Bar No. (left blank, plaintiff filing pro se)
 *   Text14        — Address of Attorney/Plaintiff
 *   Text15        — Telephone No. (plaintiff phone)
 *   Text16        — Email Address (plaintiff email)
 *   Text17-Text27 — Notary / acknowledgment fields (left blank)
 *   Check Box1-6,11 — claim type checkboxes
 *
 * Note: Signature and notary fields are left blank — user must sign before filing.
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
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
 * Split description across 3 single-line text fields (Text7, Text8, Text9).
 * Each field is one line — break at word boundaries.
 */
function splitDescriptionLines(desc: string): [string, string, string] {
  if (!desc) return ["", "", ""];
  const MAX = 120;
  const lines: string[] = ["", "", ""];
  let remaining = desc.trim();
  for (let i = 0; i < 3; i++) {
    if (!remaining) break;
    if (remaining.length <= MAX) {
      lines[i] = remaining;
      break;
    }
    const cut = remaining.lastIndexOf(" ", MAX);
    const splitAt = cut > 0 ? cut : MAX;
    lines[i] = remaining.slice(0, splitAt).trim();
    remaining = remaining.slice(splitAt).trim();
  }
  return [lines[0]!, lines[1]!, lines[2]!];
}

function claimTypeCheckbox(d: CaseData): string {
  const desc = (d.claimDescription ?? "").toLowerCase();
  const type = (d.claimType ?? "").toLowerCase();
  if (type.includes("goods") || desc.includes("merchandise") || desc.includes("goods")) return "Check Box1";
  if (type.includes("work") || desc.includes("labor") || desc.includes("work done") || desc.includes("materials")) return "Check Box2";
  if (type.includes("loan") || desc.includes("money lent") || desc.includes("loan")) return "Check Box3";
  if (type.includes("account") || desc.includes("account stated")) return "Check Box4";
  if (type.includes("contract") || type.includes("written") || desc.includes("written instrument") || desc.includes("contract")) return "Check Box11";
  if (type.includes("rent") || desc.includes("rent") || desc.includes("lease")) return "Check Box5";
  return "Check Box6";
}

function safeSetText(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string): void {
  try { form.getTextField(name).setText(value || ""); } catch { /* field absent */ }
}

function safeSetSingleLine(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string): void {
  try {
    const f = form.getTextField(name);
    f.disableMultiline();
    f.setText(value || "");
  } catch { /* field absent */ }
}

function safeCheck(form: ReturnType<PDFDocument["getForm"]>, name: string, checked: boolean): void {
  try {
    const cb = form.getCheckBox(name);
    if (checked) cb.check(); else cb.uncheck();
  } catch { /* field absent */ }
}

const clkCt333Definition: FormDefinition = {
  state: "FL",
  formId: "CLK-CT-333",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdflib",

  async generate(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    const isBusiness = !!(d as any).defendantIsBusinessOrEntity && !!(d as any).defendantAgentName;
    const defNameForPdf = isBusiness
      ? `${d.defendantName ?? ""} (c/o ${(d as any).defendantAgentName})`
      : (d.defendantName ?? "");
    const defAddress = isBusiness && (d as any).defendantAgentStreet
      ? fullAddress(
          (d as any).defendantAgentStreet,
          (d as any).defendantAgentCity,
          (d as any).defendantAgentState ?? "FL",
          (d as any).defendantAgentZip,
        )
      : fullAddress(d.defendantAddress, d.defendantCity, d.defendantState, d.defendantZip);
    const checkedBox = claimTypeCheckbox(d);
    const [desc1, desc2, desc3] = splitDescriptionLines(d.claimDescription ?? "");

    const pdfBytes = fs.readFileSync(PDF_PATH);
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();

    // ── Parties (header caption) ──────────────────────────────────────────────
    safeSetSingleLine(form, "Plaintiff", d.plaintiffName ?? "");
    safeSetSingleLine(form, "Defendant", defNameForPdf);

    // ── Defendant address + phone ─────────────────────────────────────────────
    safeSetText(form, "Address", defAddress);
    safeSetSingleLine(form, "Phone", d.defendantPhone ?? "");

    // ── Claim description — 3 lines below the checkboxes ─────────────────────
    safeSetSingleLine(form, "Text7", desc1);
    safeSetSingleLine(form, "Text8", desc2);
    safeSetSingleLine(form, "Text9", desc3);

    // ── Judgment amount ───────────────────────────────────────────────────────
    safeSetSingleLine(form, "Text10", formatAmount(d.claimAmount));

    // ── Plaintiff name in oath line ───────────────────────────────────────────
    safeSetSingleLine(form, "Text11", d.plaintiffName ?? "");

    // ── Attorney/Plaintiff section (plaintiff filing pro se) ──────────────────
    safeSetSingleLine(form, "Text12", d.plaintiffName ?? "");
    safeSetText(form, "Text14", d.plaintiffAddress ?? "");
    safeSetSingleLine(form, "Text15", d.plaintiffPhone ?? "");
    safeSetText(form, "Text16", d.plaintiffEmail ?? "");

    // ── Court-use / notary fields — leave blank ───────────────────────────────
    for (const f of ["Text1","Text2","Text13","Text17","Text18","Text19","Text20","Text21",
                     "Text22","Text23","Text24","Text25","Text26","Text27"]) {
      safeSetText(form, f, "");
    }

    // ── Claim type checkboxes ─────────────────────────────────────────────────
    for (const f of ["Check Box1","Check Box2","Check Box3","Check Box4","Check Box5",
                     "Check Box6","Check Box7","Check Box8","Check Box9","Check Box10",
                     "Check Box11","Check Box12","Check Box13","Check Box14","Check Box15",
                     "Check Box16"]) {
      safeCheck(form, f, f === checkedBox);
    }

    // ── Date + optional signature overlay ─────────────────────────────────────
    // Date is drawn in the left Attorney/Plaintiff cell, above the printed label.
    // y=252 places it in the blank area of the cell, 10 pts above the "Attorney/Plaintiff"
    // label text (which sits at approximately y=242), avoiding visual overlap.
    const todayStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const [pg] = doc.getPages();
    pg.drawText(`Date: ${todayStr}`, { x: 54, y: 252, size: 9, font: helv });
    if (opts?.signatureBytes) {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      pg.drawImage(sigImg, { x: 323, y: 235, width: 130, height: 36, opacity: 1 });
    }

    // form.flatten() is intentionally omitted: it throws on these county PDFs
    // because their widgets reference /Helv shorthand fonts that pdf-lib cannot
    // resolve when building appearance streams.  Instead we attempt to update
    // appearances (so every PDF viewer renders the filled values), with a
    // graceful fallback to saving without appearance updates if that also fails
    // (field /V values are still stored and most modern viewers honour them).
    let saved: Uint8Array;
    try {
      saved = await doc.save({ updateFieldAppearances: true });
    } catch {
      saved = await doc.save({ updateFieldAppearances: false });
    }
    return Buffer.from(saved);
  },
};

FormRegistry.register(clkCt333Definition);
export { clkCt333Definition };
