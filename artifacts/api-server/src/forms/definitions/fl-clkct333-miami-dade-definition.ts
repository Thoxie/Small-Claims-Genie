/**
 * FL CLK/CT. 333 — Miami-Dade County Statement of Claim.
 *
 * Generates a Miami-Dade-specific Statement of Claim programmatically
 * using pdf-lib (no template PDF required). The header and filing address
 * are customized for Miami-Dade County Court.
 *
 * Filing: Miami-Dade County Court Clerk, 73 W. Flagler St., Suite 133, Miami, FL 33130
 * Phone: (305) 275-1155 | Website: https://www.miamidadeclerk.gov
 */

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { buildFLStatementOfClaim } from "./fl-statement-of-claim-definition";

const clkCt333Definition: FormDefinition = {
  state: "FL",
  formId: "CLK-CT-333",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFLStatementOfClaim(
      d,
      body,
      opts,
      "Miami-Dade",
      "73 W. Flagler St., Suite 133, Miami, FL 33130"
    );
  },
};

FormRegistry.register(clkCt333Definition);
export { clkCt333Definition };
