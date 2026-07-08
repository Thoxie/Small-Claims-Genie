/**
 * FL Broward County Statement of Claim.
 *
 * Delegates to buildFLStatementOfClaim which overlays case data on the official
 * FL SOC PDF (fl-soc-7340.pdf, Forms 7.330–7.336) — same backing implementation
 * as FL-ORANGE-SOC and FL-STATEMENT-OF-CLAIM. The Broward County name and clerk
 * address are passed as overrides so the legal caption is county-specific.
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
  renderingTechnique: "pdf-overlay",

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
