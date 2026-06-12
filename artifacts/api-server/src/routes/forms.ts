/**
 * forms.ts
 *
 * Single barrel that mounts the unified form router.
 *
 * All court-form routes are now handled by forms-unified.ts, which dispatches
 * through the FormRegistry (forms/registry.ts).  Adding a new form requires
 * only a definition file and a registration call — no new route file needed.
 *
 * See ADDING_A_FORM.md for the developer guide.
 */

import formsUnifiedRouter from "./forms-unified";

// Re-export symbols that demand-letter.ts imports from this barrel.
export { stripMC030Wrappers, measureMC030BodyLines, MC030_MAX_LINES } from "../forms/definitions/mc030-definition";

export default formsUnifiedRouter;
