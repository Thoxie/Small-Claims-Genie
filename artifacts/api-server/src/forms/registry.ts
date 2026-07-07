/**
 * registry.ts
 *
 * Canonical registry for all court form definitions.
 *
 * Every form the system can generate is registered here.
 * Adding a new form means implementing FormDefinition, calling
 * FormRegistry.register(), and dropping the asset file.
 * No new route files are needed.
 *
 * See forms/ADDING_A_FORM.md for the step-by-step developer guide.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

import type { CaseData, FormBody } from "./types";
export type { CaseData, FormBody };

export interface GenerateOptions {
  /** Raw PNG bytes of the signer's signature, if the signed variant is requested. */
  signatureBytes?: Buffer;
  /** True when the response should be an attachment (Content-Disposition: attachment). */
  download?: boolean;
}

/**
 * How a form fills its output PDF.
 *
 * - `acroform-pdflib`  Standard AcroForm fields filled by pdf-lib (SC-104, SC-105, SC-112A, FW-001)
 * - `acroform-pdftk`  AcroForm fields filled via pdftk FDF fill+flatten (NC AOC-CVM-200, NJ CN10532)
 * - `xfa-pdftk`        XFA fields filled via pdftk FDF (SC-103, SC-120, SC-150)
 * - `png-overlay`      Coordinate drawing over a PNG background or official PDF via pdf-lib
 *                      (SC-100, SC-100A, SC-140, MC-030, WA MISC 05.0100)
 *
 * The technique is determined by inspecting the official form PDF:
 *   - pdf-lib sees > 0 standard AcroForm fields → acroform-pdflib or acroform-pdftk
 *     (prefer acroform-pdftk for official government forms from non-CA jurisdictions)
 *   - pdf-lib sees 0, pdftk sees > 0 → xfa-pdftk
 *   - neither sees fields, OR dynamic content required → png-overlay
 *
 * SC-100A uses png-overlay because its XFA field names are positional IDs (T86/T96…)
 * with no semantic mapping, and dual-signature image embedding is required.
 * SC-140 uses png-overlay because neither pdf-lib nor pdftk detects any fillable fields.
 * MC-030 uses png-overlay because it requires AI-driven dynamic text, variable-length
 * continuation pages, and ordered exhibit assembly that cannot be expressed as static
 * AcroForm field values.
 */
export type RenderingTechnique = "acroform-pdflib" | "acroform-pdftk" | "xfa-pdftk" | "png-overlay";

/**
 * Canonical interface every court form must implement.
 *
 * Metadata fields:
 * - `state`             State code, e.g. "CA"
 * - `formId`            Official form identifier, e.g. "SC-100"
 * - `assetPath`         Absolute path to the source PDF or PNG template (optional for overlay forms
 *                       that construct the document programmatically)
 * - `renderingTechnique` Declares which pipeline fills the PDF (documentation + introspection)
 *
 * Generation:
 * - `generate`          Returns a filled, flattened PDF buffer ready to stream.
 *                       All field mapping, enrichment, and enrichment hooks are encapsulated here.
 *
 * The composite key `state/formId` (e.g. "CA/SC-100") is the primary
 * lookup key in the registry; `formId` alone is registered as an alias.
 */
export interface FormDefinition {
  readonly state: string;
  readonly formId: string;
  /** Absolute path to the PDF template or primary PNG background used by this form. */
  readonly assetPath?: string;
  /** Rendering pipeline used by this form. */
  readonly renderingTechnique?: RenderingTechnique;
  generate(
    data: CaseData,
    body: FormBody,
    options?: GenerateOptions
  ): Promise<Buffer>;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

class Registry {
  private readonly defs = new Map<string, FormDefinition>();

  /**
   * Registers a form definition under both `state/formId` and `formId`.
   * Call this at module load time from each form definition file.
   */
  register(def: FormDefinition): void {
    const composite = `${def.state}/${def.formId}`;
    this.defs.set(composite, def);
    this.defs.set(def.formId, def);
  }

  /**
   * Returns the FormDefinition for the given key, or undefined if not found.
   * Accepts either "CA/SC-100" or "SC-100".
   */
  get(key: string): FormDefinition | undefined {
    return this.defs.get(key);
  }

  has(key: string): boolean {
    return this.defs.has(key);
  }

  /** Returns all unique registered definitions (deduplicates aliases). */
  all(): FormDefinition[] {
    return [...new Set(this.defs.values())];
  }
}

export const FormRegistry = new Registry();
