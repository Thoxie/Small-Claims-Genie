/**
 * fl-soc-acroform-definition.ts
 *
 * Florida statewide Statement of Claim forms — Forms 7.330 through 7.337.
 * All 8 forms use the automation-ready AcroForm PDFs from the FL forms package.
 * Filling technique: pdf-lib field setValue for all text fields, then form.flatten(),
 * then signature PNG overlay drawn directly on flattened page content.
 *
 * Signature strategy: capture plaintiff_signature widget rect BEFORE flatten, call
 * form.flatten() to remove interactive widgets, then drawImage at saved rect so the
 * signature is never covered by a field widget appearance stream.
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
  fmtAmountNumeric,
  fmtDate,
  flPlaintiffAddress,
  flDefendantAddress,
  flDefendantName,
  FL_SOC_FORM_META,
} from "./fl-acroform-util";

const FL_FORMS_DIR = path.join(ASSET_DIR, "fl-forms");

// ─── Field setter ──────────────────────────────────────────────────────────────

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

// ─── Common caption fields (all SOC forms share these) ────────────────────────

function fillCaption(
  form: ReturnType<PDFDocument["getForm"]>,
  d: CaseData,
): void {
  safeSet(form, "judicial_circuit", flJudicialCircuit((d as any).countyId));
  safeSet(form, "county", flCountyDisplay((d as any).countyId));
  safeSet(form, "case_number", "");
  safeSet(form, "plaintiff_name", d.plaintiffName ?? "");
  safeSet(form, "plaintiff_address", flPlaintiffAddress(d));
  safeSet(form, "defendant_name", flDefendantName(d));
  safeSet(form, "defendant_address", flDefendantAddress(d));
}

// ─── Per-form field fill functions (no signature overlay — handled centrally) ──

function fill7330(d: CaseData, form: ReturnType<PDFDocument["getForm"]>): void {
  fillCaption(form, d);
  safeSet(form, "collision_date", fmtDate(d.incidentDate));
  // collision_location: dedicated intake field, NOT a slice of claimDescription
  safeSet(form, "collision_location", d.autoCollisionLocation ?? "");
  safeSet(form, "highway_name", d.autoHighwayName ?? "");
  // collision_county: where the accident happened — never default to the court county
  safeSet(form, "collision_county", d.autoCollisionCounty ?? "");
  safeSet(form, "plaintiff_driver", d.plaintiffName ?? "");
  safeSet(form, "defendant_driver", flDefendantName(d));
  safeSet(form, "claim_amount", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "plaintiff_signature", "");
}

function fill7331(d: CaseData, form: ReturnType<PDFDocument["getForm"]>): void {
  fillCaption(form, d);
  safeSet(form, "principal_amount", fmtAmountNumeric(d.claimAmount));
  // interest_start_date: from intake if provided; blank if not — user hand-fills when claiming prejudgment interest
  safeSet(form, "interest_start_date", d.goodsSoldInterestStartDate ? fmtDate(d.goodsSoldInterestStartDate) ?? "" : "");
  safeSet(form, "first_sale_date", d.goodsSoldFirstSaleDate ? fmtDate(d.goodsSoldFirstSaleDate) ?? "" : "");
  safeSet(form, "last_sale_date", d.goodsSoldLastSaleDate ? fmtDate(d.goodsSoldLastSaleDate) ?? "" : "");
  // goods_and_prices: dedicated itemized field — NOT the general claim description
  // NOTE: PDF template has a stray "4" after the field label — this is a visual artifact
  // baked into the page content layer and cannot be removed without rebuilding the template.
  safeSet(form, "goods_and_prices", d.goodsSoldGoodsAndPrices ?? "");
  safeSet(form, "plaintiff_signature", "");
}

function fill7332(d: CaseData, form: ReturnType<PDFDocument["getForm"]>): void {
  fillCaption(form, d);
  safeSet(form, "principal_amount", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "interest_start_date", ""); // intentionally blank — user hand-fills if claiming prejudgment interest
  safeSet(form, "work_start_date", fmtDate(d.workDoneStartDate) ?? "");
  safeSet(form, "work_end_date", fmtDate(d.workDoneEndDate) ?? "");
  safeSet(form, "labor_materials_credits", d.workDoneLaborMaterials ?? "");
  safeSet(form, "plaintiff_signature", "");
}

function fill7333(d: CaseData, form: ReturnType<PDFDocument["getForm"]>): void {
  fillCaption(form, d);
  safeSet(form, "principal_amount", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "loan_date", fmtDate(d.incidentDate));
  safeSet(form, "interest_start_date", ""); // intentionally blank — user hand-fills if claiming prejudgment interest
  safeSet(form, "loan_description", d.claimDescription ?? "");
  safeSet(form, "plaintiff_signature", "");
}

function fill7334(d: CaseData, form: ReturnType<PDFDocument["getForm"]>): void {
  fillCaption(form, d);
  safeSet(form, "note_date", fmtDate(d.incidentDate));
  safeSet(form, "note_county", flCountyDisplay((d as any).countyId));
  safeSet(form, "default_date", ""); // intentionally blank — default date differs from note date; user hand-fills
  safeSet(form, "acceleration_election", "");
  safeSet(form, "principal_due", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "interest_due", "");
  safeSet(form, "interest_rate", "");
  safeSet(form, "attorney_fees", "");
  safeSet(form, "plaintiff_signature", "");
}

function fill7335(d: CaseData, form: ReturnType<PDFDocument["getForm"]>): void {
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
}

function fill7336(d: CaseData, form: ReturnType<PDFDocument["getForm"]>): void {
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
}

function fill7337(d: CaseData, form: ReturnType<PDFDocument["getForm"]>): void {
  fillCaption(form, d);
  safeSet(form, "account_statement_date", fmtDate(d.incidentDate));
  safeSet(form, "principal_amount", fmtAmountNumeric(d.claimAmount));
  safeSet(form, "interest_start_date", ""); // intentionally blank — user hand-fills if claiming prejudgment interest
  safeSet(form, "account_details", d.claimDescription ?? "");
  safeSet(form, "plaintiff_signature", "");
}

// ─── Filler dispatch map ──────────────────────────────────────────────────────

type FormFiller = (d: CaseData, form: ReturnType<PDFDocument["getForm"]>) => void;

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
  const form = doc.getForm();

  // 1. Fill all text fields
  const filler = FILLERS[meta.assetFile];
  if (!filler) throw new Error(`No filler registered for ${meta.assetFile}`);
  filler(d, form);

  // 2. Locate the plaintiff_signature widget, hide it (F=2 Hidden), and record its rect.
  //    Hiding only this one widget leaves all other fields interactive while ensuring
  //    the signature image drawn on the page content layer is never covered by the widget.
  let sigRect: { x: number; y: number; width: number; height: number } | null = null;
  try {
    const sigField = form.getTextField("plaintiff_signature");
    const widgets = sigField.acroField.getWidgets();
    if (widgets.length > 0) {
      const widget = widgets[0]!;
      sigRect = widget.getRectangle();
      // PDF annotation flag F=2 → Hidden: viewer skips rendering this widget entirely.
      // The image drawn on the content stream below is what the user sees instead.
      (widget as any).dict.set(PDFName.of("F"), PDFNumber.of(2));
    }
  } catch {
    /* field absent — proceed without signature */
  }

  // 3. Draw signature image at the original widget position
  if (opts?.signatureBytes && sigRect) {
    try {
      const sigImg = await doc.embedPng(opts.signatureBytes);
      const page = doc.getPage(0);
      page.drawImage(sigImg, {
        x: sigRect.x,
        y: sigRect.y,
        width: sigRect.width,
        height: sigRect.height,
      });
      // Draw today's date just below the signature block
      const helv = await doc.embedFont(StandardFonts.Helvetica);
      const today = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      page.drawText(today, {
        x: sigRect.x,
        y: sigRect.y - 11,
        size: 7,
        font: helv,
      });
    } catch {
      /* if image embed fails, leave blank */
    }
  }

  // 4. Save — updateFieldAppearances keeps all other interactive fields rendering correctly
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
