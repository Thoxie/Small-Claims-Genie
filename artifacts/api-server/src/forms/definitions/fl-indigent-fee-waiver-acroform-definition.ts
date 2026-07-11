/**
 * fl-indigent-fee-waiver-acroform-definition.ts
 *
 * Florida Application for Determination of Civil Indigent Status — statewide.
 * Uses the automation-ready AcroForm PDF from the FL forms package.
 *
 * Source PDF: assets/fl-forms/fl-indigent-fee-waiver.pdf
 *
 * Field map (verified via pdftk dump_data_fields):
 *   judicial_circuit, county, case_number, plaintiff_name, defendant_name
 *   applicant_address, applicant_phone, applicant_email
 *   applicant_signature, signature_date
 *
 * Financial fields (user fills by hand before submitting to clerk):
 *   dependents_count, married, spouse_works, spouse_annual_income,
 *   net_income, income_frequency, other_income, cash_on_hand,
 *   bank_accounts, vehicles, real_property, other_assets,
 *   monthly_expenses, debts
 *
 * Legal basis: Fla. Stat. § 57.082; Fla. R. Civ. P. Form 1.998.
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, PDFName, PDFNumber, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";
import {
  flJudicialCircuit,
  flCountyDisplay,
  flPlaintiffAddress,
  flDefendantName,
} from "./fl-acroform-util";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "fl-indigent-fee-waiver.pdf");

function safeSet(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string,
): void {
  try {
    form.getTextField(name).setText(value ?? "");
  } catch {
    /* field absent — skip */
  }
}

export async function buildFlIndigentFeeWaiver(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const pdfBytes = fs.readFileSync(PDF_PATH);
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();

  safeSet(form, "judicial_circuit", flJudicialCircuit((d as any).countyId));
  safeSet(form, "county", flCountyDisplay((d as any).countyId));
  safeSet(form, "case_number", d.caseNumber ?? "");
  safeSet(form, "plaintiff_name", d.plaintiffName ?? "");
  safeSet(form, "defendant_name", flDefendantName(d));

  safeSet(form, "applicant_address", flPlaintiffAddress(d));
  safeSet(form, "applicant_phone", d.plaintiffPhone ?? "");
  safeSet(form, "applicant_email", d.plaintiffEmail ?? "");

  // Financial fields — left blank for applicant to complete
  safeSet(form, "dependents_count", "");
  safeSet(form, "married", "");
  safeSet(form, "spouse_works", "");
  safeSet(form, "spouse_annual_income", "");
  safeSet(form, "net_income", "");
  safeSet(form, "income_frequency", "");
  safeSet(form, "other_income", "");
  safeSet(form, "cash_on_hand", "");
  safeSet(form, "bank_accounts", "");
  safeSet(form, "vehicles", "");
  safeSet(form, "real_property", "");
  safeSet(form, "other_assets", "");
  safeSet(form, "monthly_expenses", "");
  safeSet(form, "debts", "");

  // Signature
  safeSet(form, "applicant_signature", "");
  safeSet(form, "signature_date", "");

  // Hide the applicant_signature widget (it sits on page 2) and draw the image
  // on page 2 at the widget's exact position.  Using F=2 (Hidden) instead of
  // form.flatten() keeps every other field interactive.
  //
  // Widget position confirmed via pdf-lib introspection:
  //   applicant_signature: page 2, x=220 y=535 w=330 h=20  (pdf-lib coords, y from bottom)
  // pdftotext "Applicant Signature" label on page 2: pdftotext y=245–254 from top
  //   → pdf-lib y = 792-254 = 538 (bottom), 792-245 = 547 (top)  ✓ matches widget
  const SIG_PAGE = 1; // 0-indexed; applicant_signature is on page 2
  const SIG_X = 220;
  const SIG_Y = 535;
  const SIG_W = 330;
  const SIG_H = 20;

  try {
    const sigField = form.getTextField("applicant_signature");
    const widgets = sigField.acroField.getWidgets();
    if (widgets.length > 0) {
      // Hide the widget so it doesn't obscure the drawn image
      (widgets[0]! as any).dict.set(PDFName.of("F"), PDFNumber.of(2));
    }
  } catch {
    /* field absent — ignore */
  }

  if (opts?.signatureBytes) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      const sigPage = doc.getPage(SIG_PAGE);
      sigPage.drawImage(sigImg, {
        x: SIG_X,
        y: SIG_Y,
        width: SIG_W,
        height: SIG_H,
      });
      // Fill the date field — it's also on page 2 and will render via AcroForm
      const today = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      safeSet(form, "signature_date", today);
    } catch {
      /* if image embed fails, leave blank */
    }
  }

  let saved: Uint8Array;
  try {
    saved = await doc.save({ updateFieldAppearances: true });
  } catch {
    saved = await doc.save({ updateFieldAppearances: false });
  }
  return Buffer.from(saved);
}

const flIndigentFeeWaiverAcroformDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-INDIGENT-FEE-WAIVER",
  renderingTechnique: "acroform-pdflib",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFlIndigentFeeWaiver(d, body, opts);
  },
};

FormRegistry.register(flIndigentFeeWaiverAcroformDefinition);
export { flIndigentFeeWaiverAcroformDefinition };
