/**
 * FL Orange County Statement of Claim.
 *
 * Generates an Orange County-specific Statement of Claim programmatically
 * using pdf-lib (no template PDF required). The header and filing address
 * are customized for Orange County Court.
 *
 * Filing: Orange County Clerk of Courts, 425 N. Orange Ave., Suite 100, Orlando, FL 32801
 * Phone: (407) 836-2000 | Website: https://www.myorangeclerk.com
 */

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { buildFLStatementOfClaim } from "./fl-statement-of-claim-definition";

const flOrangeDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-ORANGE-SOC",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFLStatementOfClaim(
      d,
      body,
      opts,
      "Orange",
      "425 N. Orange Ave., Suite 100, Orlando, FL 32801"
    );
  },
};

FormRegistry.register(flOrangeDefinition);
export { flOrangeDefinition };
