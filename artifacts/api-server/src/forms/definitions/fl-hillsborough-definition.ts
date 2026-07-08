/**
 * FL Hillsborough County Statement of Claim — delegates to official PDF implementation.
 *
 * The formId "FL-HILLSBOROUGH-SOC" is preserved for backwards compatibility with
 * existing routes. It delegates to the official Hillsborough County AcroForm PDF
 * (SOC-HILLSBOROUGH / socHillsboroughDefinition) so users receive the real
 * county form rather than a programmatically-generated replica.
 *
 * Filing: Hillsborough County Clerk of Courts, 800 E. Twiggs St., Tampa, FL 33602
 * Phone: (813) 276-8100 | Website: https://www.hillsclerk.com
 */

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { socHillsboroughDefinition } from "./fl-soc-hillsborough-definition";

const flHillsboroughDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-HILLSBOROUGH-SOC",
  renderingTechnique: socHillsboroughDefinition.renderingTechnique,

  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return socHillsboroughDefinition.generate(d, body, opts);
  },
};

FormRegistry.register(flHillsboroughDefinition);
export { flHillsboroughDefinition };
