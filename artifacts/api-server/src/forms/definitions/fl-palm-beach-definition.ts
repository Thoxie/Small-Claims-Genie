/**
 * FL Palm Beach County Statement of Claim.
 *
 * Generates a Palm Beach County-specific Statement of Claim programmatically
 * using pdf-lib (no template PDF required). The header and filing address
 * are customized for Palm Beach County Court.
 *
 * Filing: Palm Beach County Clerk & Comptroller, 205 N. Dixie Hwy., West Palm Beach, FL 33401
 * Phone: (561) 355-2986 | Website: https://www.mypalmbeachclerk.com
 */

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { buildFLStatementOfClaim } from "./fl-statement-of-claim-definition";

const flPalmBeachDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-PALM-BEACH-SOC",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFLStatementOfClaim(
      d,
      body,
      opts,
      "Palm Beach",
      "205 N. Dixie Hwy., West Palm Beach, FL 33401"
    );
  },
};

FormRegistry.register(flPalmBeachDefinition);
export { flPalmBeachDefinition };
