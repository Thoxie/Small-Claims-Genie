/**
 * MC-030 Declaration — overlay definition.
 *
 * Overlay technique is intentional — MC-030 cannot use AcroForm field filling
 * because it requires AI-driven dynamic text with word wrapping, variable-length
 * continuation pages, ordered exhibit assembly, and signature image embedding.
 * None of these can be expressed as static AcroForm field values.
 *
 * All three variants (basic, signed, with-exhibits) are routed through this
 * definition's generate() method, which inspects opts/body to pick the right one:
 *   - opts.signatureBytes present → signed variant (includes optional exhibits)
 *   - body.exhibitDocIds non-empty, no sig → with-exhibits variant
 *   - otherwise → basic
 *
 * The shared symbols (stripMC030Wrappers, measureMC030BodyLines, MC030_MAX_LINES)
 * are re-exported from here for consumption by demand-letter.ts and other callers.
 */

export {
  stripMC030Wrappers,
  measureMC030BodyLines,
  MC030_MAX_LINES,
  MC030_BODY_SIZE,
  MC030_BODY_MAX_W,
} from "../../routes/forms-mc030";

import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import {
  generateMC030BasicPdf,
  generateMC030SignedPdf,
  generateMC030WithExhibitsPdf,
} from "../../routes/forms-mc030";

const mc030Definition: FormDefinition = {
  state: "CA",
  formId: "MC-030",
  renderingTechnique: "png-overlay",
  async generate(d, b, opts) {
    const id = Number(d.id) || 0;
    const hasSig = !!(opts?.signatureBytes);
    const hasExhibits = Array.isArray(b.exhibitDocIds) && (b.exhibitDocIds as unknown[]).length > 0;

    if (hasSig) {
      return generateMC030SignedPdf(id, d, b, opts?.signatureBytes);
    }
    if (hasExhibits) {
      return generateMC030WithExhibitsPdf(id, d, b);
    }
    return generateMC030BasicPdf(id, d, b);
  },
};

FormRegistry.register(mc030Definition);

export { mc030Definition };
