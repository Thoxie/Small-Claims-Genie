/**
 * FL CL-219 — Volusia County Statement of Claim — delegates to official PDF implementation.
 *
 * The formId "CL-219-VOLUSIA" is preserved for backwards compatibility with
 * existing routes. It delegates to the official Volusia County AcroForm PDF
 * (CL-219-VOLUSIA-PDF / cl219VolusiaPdfDefinition) so users receive the real
 * county form rather than a programmatically-generated replica.
 *
 * Filing: Volusia County Clerk of Courts, 101 N. Alabama Ave., DeLand, FL 32724
 * Phone: (386) 736-5915 | Website: https://www.clerk.org
 */

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { cl219VolusiaPdfDefinition } from "./fl-cl219-volusia-pdf-definition";

const cl219VolusiaDefinition: FormDefinition = {
  state: "FL",
  formId: "CL-219-VOLUSIA",
  renderingTechnique: cl219VolusiaPdfDefinition.renderingTechnique,

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return cl219VolusiaPdfDefinition.generate(d, body, opts);
  },
};

FormRegistry.register(cl219VolusiaDefinition);
export { cl219VolusiaDefinition };
