/**
 * FL Broward County Statement of Claim.
 *
 * Generates a Broward County-specific Statement of Claim programmatically
 * using pdf-lib (no template PDF required). The header and filing address
 * are customized for Broward County Court.
 *
 * Filing: Broward County Clerk of Courts, 201 SE 6th St., Room 01250, Fort Lauderdale, FL 33301
 * Phone: (954) 831-5602 | Website: https://www.browardclerk.org
 */

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { buildFLStatementOfClaim } from "./fl-statement-of-claim-definition";

const flBrowardDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-BROWARD-SOC",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFLStatementOfClaim(
      d,
      body,
      opts,
      "Broward",
      "201 SE 6th St., Room 01250, Fort Lauderdale, FL 33301"
    );
  },
};

FormRegistry.register(flBrowardDefinition);
export { flBrowardDefinition };
