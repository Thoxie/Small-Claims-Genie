/**
 * fl-statewide-summons-definition.ts
 *
 * Florida Summons / Notice to Appear — Form 7.322 (statewide, all 67 counties).
 * Uses the automation-ready AcroForm PDF from the FL forms package.
 *
 * Source PDF: assets/fl-forms/fl-7322-summons.pdf
 *
 * Field map (verified via pdftk dump_data_fields):
 *   judicial_circuit   — 1st–20th circuit (from county mapping)
 *   county             — county display name
 *   case_number        — left blank (assigned by clerk after filing)
 *   division           — left blank (assigned by clerk)
 *   plaintiff_name     — plaintiff's full name
 *   defendant_name     — defendant's full name (or business name)
 *   defendant_address  — defendant's address
 *   court_location     — left blank (clerk fills)
 *   courtroom          — left blank (clerk fills)
 *   pretrial_date      — left blank (clerk fills)
 *   pretrial_time      — left blank (clerk fills)
 *   clerk_name         — left blank (clerk fills)
 *   deputy_clerk       — left blank (clerk fills)
 *   issuance_date      — left blank (clerk fills)
 *
 * Legal basis: Fla. Sm. Cl. R. 7.050, 7.060; Form 7.322.
 * The summons is plaintiff-filed but clerk-signed and clerk-completed for dates.
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";
import {
  flJudicialCircuit,
  flCountyDisplay,
  flDefendantAddress,
  flDefendantName,
} from "./fl-acroform-util";

const PDF_PATH = path.join(ASSET_DIR, "fl-forms", "fl-7322-summons.pdf");

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

export async function buildFlStatewideummons(
  d: CaseData,
  _body: FormBody,
  _opts?: GenerateOptions,
): Promise<Buffer> {
  const pdfBytes = fs.readFileSync(PDF_PATH);
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();

  safeSet(form, "judicial_circuit", flJudicialCircuit((d as any).countyId));
  safeSet(form, "county", flCountyDisplay((d as any).countyId));
  safeSet(form, "case_number", "");
  safeSet(form, "division", "");
  safeSet(form, "plaintiff_name", d.plaintiffName ?? "");
  safeSet(form, "defendant_name", flDefendantName(d));
  safeSet(form, "defendant_address", flDefendantAddress(d));

  // Clerk-completed fields — leave blank
  safeSet(form, "court_location", "");
  safeSet(form, "courtroom", "");
  safeSet(form, "pretrial_date", "");
  safeSet(form, "pretrial_time", "");
  safeSet(form, "clerk_name", "");
  safeSet(form, "deputy_clerk", "");
  safeSet(form, "issuance_date", "");

  let saved: Uint8Array;
  try {
    saved = await doc.save({ updateFieldAppearances: true });
  } catch {
    saved = await doc.save({ updateFieldAppearances: false });
  }
  return Buffer.from(saved);
}

const flStatewideummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-7322-SUMMONS",
  renderingTechnique: "acroform-pdflib",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFlStatewideummons(d, body, opts);
  },
};

FormRegistry.register(flStatewideummonsDefinition);
export { flStatewideummonsDefinition };
