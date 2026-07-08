/**
 * FL Orange County Statement of Claim — delegates to official PDF implementation.
 *
 * The formId "FL-ORANGE-SOC" is preserved for backwards compatibility with
 * existing routes. It delegates to the official Orange County AcroForm PDF
 * (PLAIN-SOC-ORANGE / plainSocOrangeDefinition) so users receive the real
 * county form rather than a programmatically-generated replica.
 *
 * Filing: Orange County Clerk of Courts, 425 N. Orange Ave., Suite 100, Orlando, FL 32801
 * Phone: (407) 836-2000 | Website: https://www.myorangeclerk.com
 */

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { plainSocOrangeDefinition } from "./fl-plain-soc-orange-definition";

const flOrangeDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-ORANGE-SOC",
  renderingTechnique: plainSocOrangeDefinition.renderingTechnique,

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return plainSocOrangeDefinition.generate(d, body, opts);
  },
};

FormRegistry.register(flOrangeDefinition);
export { flOrangeDefinition };
