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

/**
 * Escapes a string for use as a PDF name object — the `/Name` written after
 * `/V /` for checkbox and radio-button export values.
 *
 * PDF name syntax (ISO 32000-1 §7.3.5) only permits "regular" characters
 * (0x21–0x7E, excluding the delimiters ( ) < > [ ] { } / % and the '#' escape
 * introducer) to appear literally. Any other byte — spaces, delimiters, '#',
 * and non-ASCII — must be written as '#' followed by its two hex digits.
 * Radio export values such as IL's "I have no written agreement with
 * Defendants." contain spaces, which pdftk rejects ("Failed to open form data
 * file") unless they are '#20'-escaped. Values with no special characters
 * (e.g. "Yes", "Off", "1") are returned unchanged.
 */
function fdfNameEscape(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0x21 && code <= 0x7e && !"#()<>[]{}/%".includes(ch)) {
      out += ch;
    } else {
      for (const b of Buffer.from(ch, "utf8")) {
        out += "#" + b.toString(16).padStart(2, "0").toUpperCase();
      }
    }
  }
  return out;
}

export interface FdfFields {
  text?: Record<string, string>;
  /**
   * Maps field names to:
   *  - true   → checked using the standard "Yes" export value (AcroForm forms)
   *  - false  → unchecked ("Off")
   *  - string → exact custom export value string (required for XFA forms whose
   *             FieldStateOption is not "Yes" — e.g. "1", "2", "3", etc.)
   *             Pass false (not a string) for the unchecked state; "Off" is always correct.
   */
  checkboxes?: Record<string, boolean | string>;
}

/**
 * Generates an FDF file string from text and checkbox field maps.
 *
 * AcroForm standard checkboxes use "Yes" / "Off".
 * XFA forms (Judicial Council PDFs) use custom numeric export values
 * ("1", "2", "3", …) for their on-states — pass those as strings here.
 */
export function generateFdf(fields: FdfFields): string {
  const entries: string[] = [];

  for (const [name, value] of Object.entries(fields.text ?? {})) {
    if (value == null) continue;
    entries.push(
      `<<\n/T(${fdfEscape(name)})\n/V(${fdfEscape(String(value))})\n>>`
    );
  }

  for (const [name, value] of Object.entries(fields.checkboxes ?? {})) {
    let exportVal: string;
    if (typeof value === "string") {
      exportVal = value;           // custom XFA export value (e.g. "1", "2")
    } else {
      exportVal = value ? "Yes" : "Off";   // standard AcroForm
    }
    entries.push(
      `<<\n/T(${fdfEscape(name)})\n/V /${fdfNameEscape(exportVal)}\n>>`
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

// ─── pdftk fill ───────────────────────────────────────────────────────────────

/**
 * Fills a PDF form using pdftk fill_form.
 *
 * @param pdfPath   Absolute path to the template PDF
 * @param fields    Text field values and checkbox states
 * @param options   flatten (default true) — set false to keep fields interactive
 * @returns         Filled PDF buffer
 */
export async function pdftk_fill_form(
  pdfPath: string,
  fields: FdfFields,
  options?: { flatten?: boolean }
): Promise<Buffer> {
  const id = crypto.randomBytes(8).toString("hex");
  const fdfPath = path.join(os.tmpdir(), `scg-${id}.fdf`);
  const outPath = path.join(os.tmpdir(), `scg-${id}-out.pdf`);

  const shouldFlatten = options?.flatten ?? true;

  try {
    const fdf = generateFdf(fields);
    fs.writeFileSync(fdfPath, fdf, "utf8");

    await execFileAsync(
      "pdftk",
      shouldFlatten
        ? [pdfPath, "fill_form", fdfPath, "output", outPath, "flatten"]
        : [pdfPath, "fill_form", fdfPath, "output", outPath],
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
