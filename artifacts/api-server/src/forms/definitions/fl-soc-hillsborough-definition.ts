/**
 * FL Statement of Claim — Hillsborough County, Florida.
 *
 * Fills the Hillsborough County Clerk's "Statement of Claim" PDF
 * (https://www.hillsclerk.com) using pdftk FDF fill.
 *
 * Source PDF: assets/fl-forms/statement-of-claim-hillsborough.pdf
 * Field names confirmed via: pdftk dump_data_fields
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
 */

import * as path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "statement-of-claim-hillsborough.pdf");

// ─── Claim type → checkbox field name ─────────────────────────────────────────
const CLAIM_TYPE_CHECKBOX: Record<string, string> = {
  goods:          "GoodsCheckBox",   // Goods sold by Plaintiff
  services:       "WorkCheckBox",    // Work done and materials furnished
  loan:           "MoneyCheckBox",   // Money lent to Defendant
  contract:       "PMCheckBox",      // Promissory Note / written instrument
  account_stated: "ASCheckBox",      // Account Stated
  other:          "OtherCheckBox",   // Other claim
  auto:           "AutoCheckBox",    // Auto accident
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Split description into up to 4 explanation fields (~200 chars each),
 * breaking at word boundaries.
 */
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

// ─── Form definition ──────────────────────────────────────────────────────────

const socHillsboroughDefinition: FormDefinition = {
  state: "FL",
  formId: "SOC-HILLSBOROUGH",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    const claimType = d.claimType ?? "";
    const description = d.claimDescription ?? "";
    const [exp1, exp2, exp3, exp4] = splitExplanation(description);
    const amountStr = formatAmount(d.claimAmount);

    // ── Checkboxes (Hillsborough uses "On"/"Off" export values, not "Yes"/"Off") ─
    const checkboxes: Record<string, boolean | string> = {};
    const cbKey = CLAIM_TYPE_CHECKBOX[claimType];
    if (cbKey) checkboxes[cbKey] = "On";

    // Check "attach documents" box when we have a description (likely have docs)
    if (description) checkboxes["AttachCheckBox"] = "On";

    // ── Text fields ──────────────────────────────────────────────────────────
    const text: Record<string, string> = {
      // ── Plaintiff names ──────────────────────────────────────────────────
      "PlaintiffName1": d.plaintiffName ?? "",
      "PlaintiffName2": d.plaintiffDbaName ?? "",

      // ── Defendant names & contact ───────────────────────────────────────
      "DefendantName1": d.defendantName ?? "",
      "DefendantName2": "",

      "DefAddress":   d.defendantAddress ?? "",
      "DefCity":      d.defendantCity ?? "",
      "DefState":     d.defendantState ?? "",
      "DefZipCode":   d.defendantZip ?? "",
      "DefPhone":     d.defendantPhone ?? "",

      // ── Claim type specific fields — populated only when relevant ────────
      "Other": claimType === "other" ? (description.slice(0, 80)) : "",

      // ── Claim explanation (4 fields × ~200 chars = ~800 chars total) ─────
      "Explanation1": exp1,
      "Explanation2": exp2,
      "Explanation3": exp3,
      "Explanation4": exp4,

      // ── Amount breakdown ────────────────────────────────────────────────
      "Principal": amountStr,
      "Costs":     "",
      "Interest":  "",
      "Total":     amountStr,

      // ── Plaintiff signature block ───────────────────────────────────────
      "Plaintiff Address 1": d.plaintiffAddress ?? "",
      "Plaintiff Address 2": [d.plaintiffCity, d.plaintiffState].filter(Boolean).join(", "),
      "Plaintiff Address 3": d.plaintiffZip ?? "",
      "Plaintiff Address 4": "",

      "PlaintiffName4":    d.plaintiffName ?? "",
      "TelephoneNumber":   d.plaintiffPhone ?? "",
      "EmailAddresses":    d.plaintiffEmail ?? "",
      "PlaintiffTitle":    "",
    };

    const buf = await pdftk_fill_form(PDF_PATH, { text, checkboxes });
    try {
      const todayStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
      const doc = await PDFDocument.load(buf);
      const helv = await doc.embedFont(StandardFonts.Helvetica);
      // The Hillsborough SOC is a 2-page PDF. The signature section is on PAGE 2 (index 1).
      const pages = doc.getPages();
      const pg = pages[1] ?? pages[0]!;
      // Date goes in the left portion of the signature row on page 2 (x=54, pdf-lib y=598),
      // to the left of the "Signature of Plaintiff(s)" blank at x=346.
      // The Hillsborough SOC has no printed date field in the signature section.
      pg.drawText(`Date: ${todayStr}`, { x: 54, y: 598, size: 9, font: helv });
      if (opts?.signatureBytes) {
        // "Signature of Plaintiff(s)" label on page 2: x=346, pdf-lib y=582–598.
        // The blank signature rule is at the same row as "Plaintiff Address:" (pdf-lib y≈596–612).
        // x=346, y=582, h=36 places the image from y=582 (label bottom) up to y=618 (spanning the blank).
        // Visually confirmed correct (2026-06-21): sig lands above "Signature of Plaintiff(s)" label
        // on page 2; page-2 routing via pages[1] confirmed working.
        const sigImg = await doc.embedPng(opts.signatureBytes);
        pg.drawImage(sigImg, { x: 346, y: 582, width: 180, height: 36, opacity: 1 });
      }
      return Buffer.from(await doc.save({ updateFieldAppearances: false }));
    } catch { /* ignore — return plain fill */ }
    return buf;
  },
};

FormRegistry.register(socHillsboroughDefinition);
export { socHillsboroughDefinition };
