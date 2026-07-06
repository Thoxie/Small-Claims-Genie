/**
 * FL Statement of Claim — Hillsborough County, Florida.
 *
 * Fills the Hillsborough County Clerk's "Statement of Claim" PDF
 * (https://www.hillsclerk.com) using pdf-lib AcroForm fill directly.
 *
 * Source PDF: assets/fl-forms/statement-of-claim-hillsborough.pdf
 *
 * Key fields:
 *   PlaintiffName1 / PlaintiffName2 — plaintiff name lines
 *   DefendantName1 / DefendantName2 — defendant name lines
 *   DefAddress / DefCity / DefState / DefZipCode / DefPhone — defendant contact
 *   Checkboxes: GoodsCheckBox, WorkCheckBox, MoneyCheckBox, PMCheckBox,
 *               ASCheckBox, OtherCheckBox, AutoCheckBox, AttachCheckBox
 *   Explanation1–4 — claim description (4 text fields, ~200 chars each)
 *   Principal / Costs / Interest / Total — amount breakdown
 *   Plaintiff Address 1–4 — plaintiff address lines in signature section
 *   PlaintiffName4 / TelephoneNumber / EmailAddresses — plaintiff signature block
 *
 * NOTE: Hillsborough checkboxes use "On"/"Off" export values, not "Yes"/"Off".
 * pdf-lib's check() uses the PDF's defined on-value, so this is handled correctly.
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "statement-of-claim-hillsborough.pdf");

const CLAIM_TYPE_CHECKBOX: Record<string, string> = {
  goods:          "GoodsCheckBox",
  services:       "WorkCheckBox",
  loan:           "MoneyCheckBox",
  contract:       "PMCheckBox",
  account_stated: "ASCheckBox",
  other:          "OtherCheckBox",
  auto:           "AutoCheckBox",
};

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function splitExplanation(desc: string): [string, string, string, string] {
  if (!desc) return ["", "", "", ""];
  const MAX = 200;
  const result: string[] = ["", "", "", ""];
  let remaining = desc.trim();
  for (let i = 0; i < 4; i++) {
    if (!remaining) break;
    if (remaining.length <= MAX) {
      result[i] = remaining;
      break;
    }
    const cut = remaining.lastIndexOf(" ", MAX);
    const splitAt = cut > 0 ? cut : MAX;
    result[i] = remaining.slice(0, splitAt).trim();
    remaining = remaining.slice(splitAt).trim();
  }
  return [result[0]!, result[1]!, result[2]!, result[3]!];
}

function safeSetText(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string): void {
  try { form.getTextField(name).setText(value || ""); } catch { /* field absent */ }
}

function safeCheck(form: ReturnType<PDFDocument["getForm"]>, name: string, checked: boolean): void {
  try {
    const cb = form.getCheckBox(name);
    if (checked) cb.check(); else cb.uncheck();
  } catch { /* field absent */ }
}

const socHillsboroughDefinition: FormDefinition = {
  state: "FL",
  formId: "SOC-HILLSBOROUGH",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdflib",

  async generate(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    const claimType = d.claimType ?? "";
    const description = d.claimDescription ?? "";
    const [exp1, exp2, exp3, exp4] = splitExplanation(description);
    const amountStr = formatAmount(d.claimAmount);
    const isBusiness = !!(d as any).defendantIsBusinessOrEntity && !!(d as any).defendantAgentName;
    const defAgentLine = isBusiness ? `c/o ${(d as any).defendantAgentName}` : "";
    const defAddressForPdf = isBusiness && (d as any).defendantAgentStreet
      ? (d as any).defendantAgentStreet
      : (d.defendantAddress ?? "");
    const defCityForPdf = isBusiness && (d as any).defendantAgentStreet ? (d as any).defendantAgentCity : d.defendantCity;
    const defStateForPdf = isBusiness && (d as any).defendantAgentStreet ? ((d as any).defendantAgentState ?? "FL") : d.defendantState;
    const defZipForPdf = isBusiness && (d as any).defendantAgentStreet ? (d as any).defendantAgentZip : d.defendantZip;

    const pdfBytes = fs.readFileSync(PDF_PATH);
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();

    // ── Plaintiff names ──────────────────────────────────────────────────────
    safeSetText(form, "PlaintiffName1", d.plaintiffName ?? "");
    safeSetText(form, "PlaintiffName2", d.plaintiffDbaName ?? "");

    // ── Defendant names & contact ────────────────────────────────────────────
    safeSetText(form, "DefendantName1", d.defendantName ?? "");
    safeSetText(form, "DefendantName2", defAgentLine);
    safeSetText(form, "DefAddress",  defAddressForPdf ?? "");
    safeSetText(form, "DefCity",     defCityForPdf ?? "");
    safeSetText(form, "DefState",    defStateForPdf ?? "");
    safeSetText(form, "DefZipCode",  defZipForPdf ?? "");
    safeSetText(form, "DefPhone",    d.defendantPhone ?? "");

    // ── Claim type specific ──────────────────────────────────────────────────
    safeSetText(form, "Other", claimType === "other" ? description.slice(0, 80) : "");

    // ── Claim explanation ────────────────────────────────────────────────────
    safeSetText(form, "Explanation1", exp1);
    safeSetText(form, "Explanation2", exp2);
    safeSetText(form, "Explanation3", exp3);
    safeSetText(form, "Explanation4", exp4);

    // ── Amount breakdown ─────────────────────────────────────────────────────
    safeSetText(form, "Principal", amountStr);
    safeSetText(form, "Costs",     "");
    safeSetText(form, "Interest",  "");
    safeSetText(form, "Total",     amountStr);

    // ── Plaintiff signature block ────────────────────────────────────────────
    safeSetText(form, "Plaintiff Address 1", d.plaintiffAddress ?? "");
    safeSetText(form, "Plaintiff Address 2", [d.plaintiffCity, d.plaintiffState].filter(Boolean).join(", "));
    safeSetText(form, "Plaintiff Address 3", d.plaintiffZip ?? "");
    safeSetText(form, "Plaintiff Address 4", "");
    safeSetText(form, "PlaintiffName4",   d.plaintiffName ?? "");
    safeSetText(form, "TelephoneNumber",  d.plaintiffPhone ?? "");
    safeSetText(form, "EmailAddresses",   d.plaintiffEmail ?? "");
    safeSetText(form, "PlaintiffTitle",   "");

    // ── Checkboxes ───────────────────────────────────────────────────────────
    const cbKey = CLAIM_TYPE_CHECKBOX[claimType];
    for (const name of Object.values(CLAIM_TYPE_CHECKBOX)) {
      safeCheck(form, name, name === cbKey);
    }
    safeCheck(form, "AttachCheckBox", !!description);

    // ── Date + optional signature overlay (page 2) ───────────────────────────
    const todayStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const pg = pages[1] ?? pages[0]!;
    pg.drawText(`Date: ${todayStr}`, { x: 54, y: 598, size: 9, font: helv });
    if (opts?.signatureBytes) {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      pg.drawImage(sigImg, { x: 346, y: 582, width: 180, height: 36, opacity: 1 });
    }

    form.flatten();
    return Buffer.from(await doc.save({ updateFieldAppearances: false }));
  },
};

FormRegistry.register(socHillsboroughDefinition);
export { socHillsboroughDefinition };
