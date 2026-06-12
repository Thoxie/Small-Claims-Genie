/**
 * field-validator.ts
 *
 * Runtime startup validator for XFA/AcroForm PDF field names.
 *
 * Runs `pdftk dump_data_fields_utf8` on each registered form and compares the
 * actual PDF field names against the typed constants defined in
 * `forms/field-names/`.  Any mismatch is logged as an error so developers
 * discover bad field names immediately on startup rather than silently
 * producing blank PDFs.
 *
 * Covers both XFA forms (SC-103, SC-120, SC-150) and AcroForm/pdf-lib forms
 * (SC-104, SC-105, SC-112A, FW-001) — pdftk's dump_data_fields_utf8 works on
 * both PDF types.
 *
 * Call `validateAllForms()` once from `index.ts` after the server starts
 * listening.  All checks are async and non-blocking — they do not delay
 * request handling.
 *
 * @deprecated alias `validateAllXfaForms` kept for backward compatibility;
 * prefer `validateAllForms` in new call sites.
 */

import { execFile } from "child_process";
import * as path from "path";
import { promisify } from "util";
import { logger } from "../lib/logger";
import { ASSET_DIR } from "../routes/forms-common";
import { SC103_FIELDS } from "./field-names/sc103-fields";
import { SC120_FIELDS } from "./field-names/sc120-fields";
import { SC150_FIELDS } from "./field-names/sc150-fields";
import { SC104_FIELDS } from "./field-names/sc104-fields";
import { SC105_FIELDS } from "./field-names/sc105-fields";
import { SC112A_FIELDS } from "./field-names/sc112a-fields";
import { FW001_FIELDS } from "./field-names/fw001-fields";

const execFileAsync = promisify(execFile);

// ─── Core validator ───────────────────────────────────────────────────────────

/**
 * Dumps the field names from a PDF via `pdftk dump_data_fields_utf8` and
 * returns the set of all `FieldName` values found.
 */
async function dumpPdfFieldNames(pdfPath: string): Promise<Set<string>> {
  const { stdout } = await execFileAsync(
    "pdftk",
    [pdfPath, "dump_data_fields_utf8"],
    { timeout: 30_000 }
  );
  const fields = new Set<string>();
  for (const line of stdout.split("\n")) {
    if (line.startsWith("FieldName: ")) {
      fields.add(line.slice("FieldName: ".length).trim());
    }
  }
  return fields;
}

/**
 * Validates that every field name in `expectedNames` exists in the PDF at
 * `pdfPath`.  Logs an error for each unrecognised name (which would silently
 * produce a blank field in the generated PDF).
 *
 * @param formId        Human-readable form identifier for log messages
 * @param pdfPath       Absolute path to the PDF template
 * @param expectedNames All field name strings used by the form definition
 */
export async function validateXfaFieldNames(
  formId: string,
  pdfPath: string,
  expectedNames: readonly string[]
): Promise<void> {
  try {
    const knownFields = await dumpPdfFieldNames(pdfPath);
    const unknown = expectedNames.filter((f) => !knownFields.has(f));
    if (unknown.length > 0) {
      logger.error(
        { formId, unknown },
        `[field-validator] ${formId}: ${unknown.length} field name(s) not found in PDF — these will silently produce blank fields`
      );
    } else {
      logger.info(
        { formId, fieldCount: expectedNames.length },
        `[field-validator] ${formId}: all ${expectedNames.length} field name(s) verified OK`
      );
    }
  } catch (err) {
    logger.warn(
      { err, formId },
      `[field-validator] ${formId}: could not validate field names (pdftk unavailable or PDF missing)`
    );
  }
}

// ─── Per-form field name lists ────────────────────────────────────────────────

/** Flattens the text + checkbox sub-objects of a field-names const into one array. */
function collectFieldNames(fields: {
  text?: Record<string, string>;
  checkboxes?: Record<string, string>;
}): string[] {
  return [
    ...Object.values(fields.text ?? {}),
    ...Object.values(fields.checkboxes ?? {}),
  ];
}

// ─── Public entry points ──────────────────────────────────────────────────────

/**
 * Validates all form field name constants (XFA and AcroForm) against their
 * source PDFs.  Call once at server startup.  All checks run in parallel and
 * do not block request handling.
 */
export function validateAllForms(): void {
  const forms: Array<{ formId: string; pdf: string; fields: ReturnType<typeof collectFieldNames> }> = [
    // XFA forms (pdftk fill_form)
    {
      formId: "SC-103",
      pdf: path.join(ASSET_DIR, "forms", "sc103_acroform.pdf"),
      fields: collectFieldNames(SC103_FIELDS),
    },
    {
      formId: "SC-120",
      pdf: path.join(ASSET_DIR, "forms", "sc120_acroform.pdf"),
      fields: collectFieldNames(SC120_FIELDS),
    },
    {
      formId: "SC-150",
      pdf: path.join(ASSET_DIR, "forms", "sc150_acroform.pdf"),
      fields: collectFieldNames(SC150_FIELDS),
    },
    // AcroForm forms (pdf-lib)
    {
      formId: "SC-104",
      pdf: path.join(ASSET_DIR, "forms", "sc104_acroform.pdf"),
      fields: collectFieldNames(SC104_FIELDS),
    },
    {
      formId: "SC-105",
      pdf: path.join(ASSET_DIR, "forms", "sc105_acroform.pdf"),
      fields: collectFieldNames(SC105_FIELDS),
    },
    {
      formId: "SC-112A",
      pdf: path.join(ASSET_DIR, "forms", "sc112a_acroform.pdf"),
      fields: collectFieldNames(SC112A_FIELDS),
    },
    {
      formId: "FW-001",
      pdf: path.join(ASSET_DIR, "forms", "fw001_acroform.pdf"),
      fields: collectFieldNames(FW001_FIELDS),
    },
  ];

  for (const { formId, pdf, fields } of forms) {
    validateXfaFieldNames(formId, pdf, fields).catch((err) => {
      logger.error({ err, formId }, "[field-validator] Unexpected error during field validation");
    });
  }
}

/** @deprecated Use {@link validateAllForms} instead. */
export const validateAllXfaForms = validateAllForms;
