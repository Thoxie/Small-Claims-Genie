/**
 * FL Hillsborough County Statement of Claim.
 *
 * Generates a Hillsborough County-specific Statement of Claim programmatically
 * using pdf-lib (no template PDF required). The header and filing address
 * are customized for Hillsborough County Court.
 *
 * Filing: Hillsborough County Clerk of Courts, 800 E. Twiggs St., Tampa, FL 33602
 * Phone: (813) 276-8100 | Website: https://www.hillsclerk.com
 */

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { buildFLStatementOfClaim } from "./fl-statement-of-claim-definition";

const flHillsboroughDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-HILLSBOROUGH-SOC",
  renderingTechnique: "png-overlay",

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildFLStatementOfClaim(
      d,
      body,
      opts,
      "Hillsborough",
      "800 E. Twiggs St., Tampa, FL 33602"
    );
  },
};

FormRegistry.register(flHillsboroughDefinition);
export { flHillsboroughDefinition };
