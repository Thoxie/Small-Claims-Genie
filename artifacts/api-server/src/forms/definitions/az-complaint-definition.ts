/**
 * AZ Small Claims Complaint — LJSC00001F
 *
 * Fills the official Arizona Justice Court "Complaint in Small Claims Court"
 * (LJSC00001F) AcroForm PDF using pdf-lib.
 *
 * Source PDF: assets/forms/az-ljsc00001f-complaint.pdf
 *
 * AcroForm fields filled:
 *   "Name of person filing" / "Address of person filing" / "Address City/State/Zip"
 *   "Person filing phone number" / "Person filing email address"
 *   "Plaintiff Name" / "Plaintiff Mailing Address" / "Plaintiff Address City/State/Zip"
 *   "Plaintiff Phone Number" / "Plaintiff Email Address"
 *   "Defendant Name" / "Defendant Mailing Address" / "Defendant Address City/State/Zip"
 *   "Defendant Phone number" / "Defendant Email address"
 *   "Claim Amount" / "is the total amount owed to me by the defendant because 1"
 *   "Case Number" / "Date17_af_date"
 *
 * Fields left blank for filer/court to complete:
 *   "Dropdown1" (court selection — filer selects from drop-down)
 *   "1_4" (overflow description, page 2)
 *   "Check Box18" / "Language Needed"
 *
 * Legal basis:
 *   A.R.S. § 22-501 through § 22-524 — Small Claims Division, Justice Court
 *   Claim limit: $5,000 (A.R.S. § 22-503)
 *   Attorneys prohibited unless all parties stipulate (A.R.S. § 22-512)
 *   No appeal from a small claims judgment (A.R.S. § 22-519)
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(FORMS_DIR, "az-ljsc00001f-complaint.pdf");

function safeSetText(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string,
): void {
  try {
    form.getTextField(name).setText(value || "");
  } catch {
    /* field absent or mistyped */
  }
}

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return (
    "$" +
    Number(amount).toLocaleString("en-US", {
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

const azComplaintDefinition: FormDefinition = {
  state: "AZ",
  formId: "AZ-COMPLAINT",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdflib",

  async generate(
    d: CaseData,
    _body: FormBody,
    opts?: GenerateOptions,
  ): Promise<Buffer> {
    const pdfBytes = fs.readFileSync(PDF_PATH);
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();

    const pltCSZ = cityStateZip(
      d.plaintiffCity,
      d.plaintiffState ?? "AZ",
      d.plaintiffZip,
    );
    const defCSZ = cityStateZip(
      d.defendantCity,
      d.defendantState ?? "AZ",
      d.defendantZip,
    );
    const claimAmt = formatAmount(d.claimAmount);
    const todayStr = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    // ── Person filing (same as plaintiff) ──────────────────────────────────────
    safeSetText(form, "Name of person filing", d.plaintiffName ?? "");
    safeSetText(form, "Address of person filing", d.plaintiffAddress ?? "");
    safeSetText(form, "Address City/State/Zip", pltCSZ);
    safeSetText(form, "Person filing phone number", d.plaintiffPhone ?? "");
    safeSetText(form, "Person filing email address", d.plaintiffEmail ?? "");

    // ── Plaintiff block ────────────────────────────────────────────────────────
    safeSetText(form, "Plaintiff Name", d.plaintiffName ?? "");
    safeSetText(form, "Plaintiff Mailing Address", d.plaintiffAddress ?? "");
    safeSetText(form, "Plaintiff Address City/State/Zip", pltCSZ);
    safeSetText(form, "Plaintiff Phone Number", d.plaintiffPhone ?? "");
    safeSetText(form, "Plaintiff Email Address", d.plaintiffEmail ?? "");

    // ── Defendant block ────────────────────────────────────────────────────────
    safeSetText(form, "Defendant Name", d.defendantName ?? "");
    safeSetText(form, "Defendant Mailing Address", d.defendantAddress ?? "");
    safeSetText(form, "Defendant Address City/State/Zip", defCSZ);
    safeSetText(form, "Defendant Phone number", d.defendantPhone ?? "");
    // "Defendant Email address" — not collected in intake; left blank

    // ── Claim details ──────────────────────────────────────────────────────────
    safeSetText(form, "Claim Amount", claimAmt);
    safeSetText(form, "Case Number", d.caseNumber ?? "");
    safeSetText(form, "Date17_af_date", todayStr);

    // ── Claim description (enable multiline to allow wrapping) ─────────────────
    try {
      const tf = form.getTextField(
        "is the total amount owed to me by the defendant because 1",
      );
      tf.enableMultiline();
      tf.setFontSize(9);
      tf.setText(d.claimDescription ?? "");
    } catch {
      /* field absent */
    }

    // ── Page 2 overflow description field ──────────────────────────────────────
    // Field "1_4" on page 2 accepts continuation text when description overflows.
    // Populate it with the same description so both pages carry the claim narrative.
    safeSetText(form, "1_4", d.claimDescription ?? "");

    // ── Signature overlay (plaintiff signs Page 2 of the form) ────────────────
    if (opts?.signatureBytes) {
      try {
        const pages = doc.getPages();
        const sigPage = pages[1] ?? pages[0];
        const sigImg =
          (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
          (await doc.embedJpg(opts.signatureBytes).catch(() => null));
        if (sigImg) {
          sigPage.drawImage(sigImg, {
            x: 54,
            y: 130,
            width: 200,
            height: 34,
            opacity: 1,
          });
        }
      } catch {
        /* ignore invalid signature data */
      }
    }

    let saved: Uint8Array;
    try {
      saved = await doc.save({ updateFieldAppearances: true });
    } catch {
      saved = await doc.save({ updateFieldAppearances: false });
    }
    return Buffer.from(saved);
  },
};

FormRegistry.register(azComplaintDefinition);
export { azComplaintDefinition };
