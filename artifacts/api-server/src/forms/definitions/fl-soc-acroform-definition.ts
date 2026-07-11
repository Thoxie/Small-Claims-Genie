/**
 * fl-soc-acroform-definition.ts
 *
 * Florida statewide Statement of Claim forms — Forms 7.330 through 7.337.
 * All 8 forms use the automation-ready AcroForm PDFs from the FL forms package.
 * Filling technique: pdf-lib field setValue for all text fields.
 * Signature: overlaid as a PNG image at the plaintiff_signature widget rect.
 *
 * Routing: a single "FL-SOC" registry entry dispatches to the correct AcroForm
 * based on d.claimType. All 67 FL counties use the same statewide forms.
 *
 * Form → Claim Type mapping (Florida Small Claims Rules 7.330–7.337):
 *   7.330 Auto Negligence
 *   7.331 Goods Sold
 *   7.332 Work Done / Materials Furnished
 *   7.333 Money Lent
 *   7.334 Promissory Note
 *   7.335 Stolen Property from Pawnbroker
 *   7.336 Return of Property from Government (Replevin)
 *   7.337 Account Stated
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";
import {
  flJudicialCircuit,
  flCountyDisplay,
  fmtAmountNumeric,
  fmtDate,
  flPlaintiffAddress,
  flDefendantAddress,
  flDefendantName,
  FL_SOC_FORM_META,
} from "./fl-acroform-util";

const FL_FORMS_DIR = path.join(ASSET_DIR, "fl-forms");

// ─── Field setters ─────────────────────────────────────────────────────────────

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

// ─── Signature overlay ─────────────────────────────────────────────────────────

async function overlaySignature(
  doc: PDFDocument,
  form: ReturnType<PDFDocument["getForm"]>,
  sigBytes: Buffer,
  fieldName: string,
  todayStr: string,
): Promise<void> {
  try {
    const sigField = form.getTextField(fieldName);
    const widgets = sigField.acroField.getWidgets();
    if (widgets.length === 0) return;
    const rect = widgets[0]!.getRectangle();
    const sigImg = await doc.embedPng(sigBytes);
    const page = doc.getPage(0);
    page.drawImage(sigImg, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
    sigField.setText("");
    // Draw typed date below the signature area if space allows
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText(todayStr, { x: rect.x, y: rect.y - 10, size: 7, font: helv });
  } catch {
    /* if image embed fails, leave blank */
  }
}

// ─── Common caption fields (all SOC forms share these) ────────────────────────

function fillCaption(
  form: ReturnType<PDFDocument["getForm"]>,
  d: CaseData,
): void {
  safeSet(form, "judicial_circuit", flJudicialCircuit((d as any).countyId));
  safeSet(form, "county", flCountyDisplay((d as any).countyId));
  safeSet(form, "case_number", ""); // assigned by clerk after filing
  safeSet(form, "plaintiff_name", d.plaintiffName ?? "");
  safeSet(form, "plaintiff_address", flPlaintiffAddress(d));
  safeSet(form, "defendant_name", flDefendantName(d));
  safeSet(form, "defendant_address", flDefendantAddress(d));
}

// ─── Per-form field fill functions ────────────────────────────────────────────

async function fill7330(d: CaseData, doc: PDFDocument, opts?: GenerateOptions): Promise<void> {
  const form = doc.getForm();
  fillCaption(form, d);
  safeSet(form, "collision_date", fmtDate(d.incidentDate));
  safeSet(form, "collision_location", d.claimDescription?.slice(0, 120) ?? "");
  safeSet(form, "highway_name", "");
  safeSet(form, "collision_county", flCountyDisplay((d as any).countyId));
  safeSet(form, "plaintiff_driver", d.plaintiffName ?? "");
  safeSet(form, "defendant_driver", flDefendantName(d));
  safeSet(form, "claim_amount", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "plaintiff_signature", "");
  if (opts?.signatureBytes) {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    await overlaySignature(doc, form, opts.signatureBytes, "plaintiff_signature", today);
  }
}

async function fill7331(d: CaseData, doc: PDFDocument, opts?: GenerateOptions): Promise<void> {
  const form = doc.getForm();
  fillCaption(form, d);
  safeSet(form, "principal_amount", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "interest_start_date", fmtDate(d.incidentDate));
  safeSet(form, "first_sale_date", fmtDate(d.incidentDate));
  safeSet(form, "last_sale_date", fmtDate(d.incidentDate));
  safeSet(form, "goods_and_prices", d.claimDescription ?? "");
  safeSet(form, "plaintiff_signature", "");
  if (opts?.signatureBytes) {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    await overlaySignature(doc, form, opts.signatureBytes, "plaintiff_signature", today);
  }
}

async function fill7332(d: CaseData, doc: PDFDocument, opts?: GenerateOptions): Promise<void> {
  const form = doc.getForm();
  fillCaption(form, d);
  safeSet(form, "principal_amount", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "interest_start_date", fmtDate(d.incidentDate));
  safeSet(form, "work_start_date", fmtDate(d.incidentDate));
  safeSet(form, "work_end_date", fmtDate(d.incidentDate));
  safeSet(form, "labor_materials_credits", d.claimDescription ?? "");
  safeSet(form, "plaintiff_signature", "");
  if (opts?.signatureBytes) {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    await overlaySignature(doc, form, opts.signatureBytes, "plaintiff_signature", today);
  }
}

async function fill7333(d: CaseData, doc: PDFDocument, opts?: GenerateOptions): Promise<void> {
  const form = doc.getForm();
  fillCaption(form, d);
  safeSet(form, "principal_amount", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "loan_date", fmtDate(d.incidentDate));
  safeSet(form, "interest_start_date", fmtDate(d.incidentDate));
  safeSet(form, "loan_description", d.claimDescription ?? "");
  safeSet(form, "plaintiff_signature", "");
  if (opts?.signatureBytes) {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    await overlaySignature(doc, form, opts.signatureBytes, "plaintiff_signature", today);
  }
}

async function fill7334(d: CaseData, doc: PDFDocument, opts?: GenerateOptions): Promise<void> {
  const form = doc.getForm();
  fillCaption(form, d);
  safeSet(form, "note_date", fmtDate(d.incidentDate));
  safeSet(form, "note_county", flCountyDisplay((d as any).countyId));
  safeSet(form, "default_date", fmtDate(d.incidentDate));
  safeSet(form, "acceleration_election", "");
  safeSet(form, "principal_due", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "interest_due", "");
  safeSet(form, "interest_rate", "");
  safeSet(form, "attorney_fees", "");
  safeSet(form, "plaintiff_signature", "");
  if (opts?.signatureBytes) {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    await overlaySignature(doc, form, opts.signatureBytes, "plaintiff_signature", today);
  }
}

async function fill7335(d: CaseData, doc: PDFDocument, opts?: GenerateOptions): Promise<void> {
  const form = doc.getForm();
  fillCaption(form, d);
  safeSet(form, "pawnbroker_name", flDefendantName(d));
  safeSet(form, "pawnbroker_address", flDefendantAddress(d));
  safeSet(form, "property_description", d.claimDescription ?? "");
  safeSet(form, "theft_date", fmtDate(d.incidentDate));
  safeSet(form, "law_enforcement_agency", "");
  safeSet(form, "report_number", "");
  safeSet(form, "written_demand_date", "");
  safeSet(form, "property_value", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "plaintiff_signature", "");
  safeSet(form, "notary_name", "");
  safeSet(form, "notary_date", "");
  if (opts?.signatureBytes) {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    await overlaySignature(doc, form, opts.signatureBytes, "plaintiff_signature", today);
  }
}

async function fill7336(d: CaseData, doc: PDFDocument, opts?: GenerateOptions): Promise<void> {
  const form = doc.getForm();
  fillCaption(form, d);
  safeSet(form, "government_entity", flDefendantName(d));
  safeSet(form, "government_address", flDefendantAddress(d));
  safeSet(form, "property_description", d.claimDescription ?? "");
  safeSet(form, "property_value", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "seizure_date", fmtDate(d.incidentDate));
  safeSet(form, "seizure_reason", "");
  safeSet(form, "demand_date", "");
  safeSet(form, "wrongful_detention_facts", d.claimDescription ?? "");
  safeSet(form, "plaintiff_signature", "");
  safeSet(form, "notary_name", "");
  safeSet(form, "notary_date", "");
  if (opts?.signatureBytes) {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    await overlaySignature(doc, form, opts.signatureBytes, "plaintiff_signature", today);
  }
}

async function fill7337(d: CaseData, doc: PDFDocument, opts?: GenerateOptions): Promise<void> {
  const form = doc.getForm();
  fillCaption(form, d);
  safeSet(form, "account_statement_date", fmtDate(d.incidentDate));
  safeSet(form, "principal_amount", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "interest_start_date", fmtDate(d.incidentDate));
  safeSet(form, "account_details", d.claimDescription ?? "");
  safeSet(form, "plaintiff_signature", "");
  if (opts?.signatureBytes) {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    await overlaySignature(doc, form, opts.signatureBytes, "plaintiff_signature", today);
  }
}

// ─── Filler dispatch map ──────────────────────────────────────────────────────

type FormFiller = (d: CaseData, doc: PDFDocument, opts?: GenerateOptions) => Promise<void>;

const FILLERS: Record<string, FormFiller> = {
  "fl-7330-auto-negligence.pdf": fill7330,
  "fl-7331-goods-sold.pdf": fill7331,
  "fl-7332-work-materials.pdf": fill7332,
  "fl-7333-money-lent.pdf": fill7333,
  "fl-7334-promissory-note.pdf": fill7334,
  "fl-7335-pawnbroker.pdf": fill7335,
  "fl-7336-replevin-govt.pdf": fill7336,
  "fl-7337-account-stated.pdf": fill7337,
};

// ─── Core generator ───────────────────────────────────────────────────────────

export async function buildFlSocForm(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const meta = FL_SOC_FORM_META[d.claimType ?? ""];
  if (!meta) {
    throw new Error(
      `No statewide FL SOC form for claim type: "${d.claimType ?? "(none)"}". ` +
      `Use one of: ${Object.keys(FL_SOC_FORM_META).join(", ")}`,
    );
  }

  const pdfPath = path.join(FL_FORMS_DIR, meta.assetFile);
  const pdfBytes = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(pdfBytes);

  const filler = FILLERS[meta.assetFile];
  if (!filler) throw new Error(`No filler registered for ${meta.assetFile}`);
  await filler(d, doc, opts);

  let saved: Uint8Array;
  try {
    saved = await doc.save({ updateFieldAppearances: true });
  } catch {
    saved = await doc.save({ updateFieldAppearances: false });
  }
  return Buffer.from(saved);
}

// ─── Form Definition ──────────────────────────────────────────────────────────

const flSocAcroformDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-SOC",
  renderingTechnique: "acroform-pdflib",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFlSocForm(d, body, opts);
  },
};

FormRegistry.register(flSocAcroformDefinition);
export { flSocAcroformDefinition };
