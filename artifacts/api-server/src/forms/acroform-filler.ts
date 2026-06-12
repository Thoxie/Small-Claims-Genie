/**
 * acroform-filler.ts
 *
 * Thin wrapper around pdftk for post-processing PDFs.
 * pdftkFlatten() stamps every AcroForm widget's appearance stream permanently
 * onto the page content, removing the interactive form layer entirely.
 * The result looks identical in Acrobat, Chrome, Preview, and mobile viewers.
 */

import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Flatten a PDF using pdftk.
 *
 * Writes the input to a temp file, runs `pdftk … output … flatten`,
 * reads back the result, and cleans up.  If pdftk is unavailable or fails
 * (e.g. XFA-only form, permission error) the original bytes are returned
 * unchanged so callers always get a usable PDF.
 */
export async function pdftkFlatten(pdfBytes: Buffer): Promise<Buffer> {
  const id = crypto.randomBytes(8).toString("hex");
  const inPath  = path.join(os.tmpdir(), `scg-${id}.pdf`);
  const outPath = path.join(os.tmpdir(), `scg-${id}-out.pdf`);

  try {
    fs.writeFileSync(inPath, pdfBytes);
    await execFileAsync("pdftk", [inPath, "output", outPath, "flatten"], {
      timeout: 30_000,
    });
    return fs.readFileSync(outPath);
  } catch {
    // pdftk not installed, XFA form issue, or other error —
    // return the original bytes so the caller always gets a usable PDF.
    return pdfBytes;
  } finally {
    try { fs.unlinkSync(inPath);  } catch { /* ignore */ }
    try { fs.unlinkSync(outPath); } catch { /* ignore */ }
  }
}
