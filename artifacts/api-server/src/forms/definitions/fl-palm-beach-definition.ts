/**
 * FL Palm Beach County Statement of Claim.
 *
 * Delegates to buildFLStatementOfClaim which overlays case data on the official
 * FL SOC PDF (fl-soc-7340.pdf, Forms 7.330–7.336) — same backing implementation
 * as FL-ORANGE-SOC and FL-STATEMENT-OF-CLAIM. The Palm Beach County name and clerk
 * address are passed as overrides so the legal caption is county-specific.
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
  renderingTechnique: "pdf-overlay",

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
