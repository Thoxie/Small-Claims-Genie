/**
 * FL CL-219 — Volusia County Statement of Claim.
 *
 * Generates a Volusia County-specific Statement of Claim programmatically
 * using pdf-lib (no template PDF required). The header and filing address
 * are customized for Volusia County Court.
 *
 * Filing: Volusia County Clerk of Courts, 101 N. Alabama Ave., DeLand, FL 32724
 * Phone: (386) 736-5915 | Website: https://www.clerk.org
 */

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { buildFLStatementOfClaim } from "./fl-statement-of-claim-definition";

const cl219VolusiaDefinition: FormDefinition = {
  state: "FL",
  formId: "CL-219-VOLUSIA",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFLStatementOfClaim(
      d,
      body,
      opts,
      "Volusia",
      "101 N. Alabama Ave., DeLand, FL 32724"
    );
  },
};

FormRegistry.register(cl219VolusiaDefinition);
export { cl219VolusiaDefinition };
