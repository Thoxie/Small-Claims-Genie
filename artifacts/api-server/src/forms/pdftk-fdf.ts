/**
 * pdftk-fdf.ts
 *
 * Fills an XFA-based or AcroForm-based PDF using pdftk's fill_form command.
 * Generates an FDF file from a field map and runs:
 *   pdftk <template.pdf> fill_form <data.fdf> output <result.pdf> flatten
 *
 * Use this for official Judicial Council PDFs that use XFA form technology,
 * which pdf-lib cannot enumerate or fill directly.
 */

import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import { promisify } from "util";
import { logger } from "../lib/logger";

const execFileAsync = promisify(execFile);

// ─── FDF generation ───────────────────────────────────────────────────────────

/**
 * Escapes a string for use in FDF text field values.
 * FDF uses PDF string syntax: special chars (, ), and \ must be escaped.
 */
function fdfEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export interface FdfFields {
  text?: Record<string, string>;
  /** Maps field names to true (checked) or false (unchecked). */
  checkboxes?: Record<string, boolean>;
}

/**
 * Generates an FDF file string from text and checkbox field maps.
 * The exported value name for checked checkboxes uses "Yes"; for unchecked: "Off".
 * These are the standard AcroForm export values recognized by Acrobat and pdftk.
 */
export function generateFdf(fields: FdfFields): string {
  const entries: string[] = [];

  for (const [name, value] of Object.entries(fields.text ?? {})) {
    if (value == null) continue;
    entries.push(
      `<<\n/T(${fdfEscape(name)})\n/V(${fdfEscape(String(value))})\n>>`
    );
  }

  for (const [name, checked] of Object.entries(fields.checkboxes ?? {})) {
    entries.push(
      `<<\n/T(${fdfEscape(name)})\n/V /${checked ? "Yes" : "Off"}\n>>`
    );
  }

  return [
    "%FDF-1.2",
    "1 0 obj",
    "<</FDF<</Fields[",
    entries.join("\n"),
    "]>>>>",
    "endobj",
    "trailer",
    "<</Root 1 0 R>>",
    "%%EOF",
  ].join("\n");
}

// ─── pdftk fill + flatten ─────────────────────────────────────────────────────

/**
 * Fills a PDF form using pdftk fill_form and then flattens it.
 *
 * @param pdfPath   Absolute path to the template PDF
 * @param fields    Text field values and checkbox states
 * @returns         Flattened PDF buffer
 */
export async function pdftk_fill_form(
  pdfPath: string,
  fields: FdfFields
): Promise<Buffer> {
  const id = crypto.randomBytes(8).toString("hex");
  const fdfPath = path.join(os.tmpdir(), `scg-${id}.fdf`);
  const outPath = path.join(os.tmpdir(), `scg-${id}-out.pdf`);

  try {
    const fdf = generateFdf(fields);
    fs.writeFileSync(fdfPath, fdf, "utf8");

    await execFileAsync(
      "pdftk",
      [pdfPath, "fill_form", fdfPath, "output", outPath, "flatten"],
      { timeout: 30_000 }
    );

    return fs.readFileSync(outPath);
  } catch (err: unknown) {
    logger.error({ err, pdfPath }, "pdftk fill_form failed");
    throw err;
  } finally {
    try { fs.unlinkSync(fdfPath); } catch { /* ignore */ }
    try { fs.unlinkSync(outPath); } catch { /* ignore */ }
  }
}
