/**
 * forms/definitions/index.ts
 *
 * Barrel that imports every form definition file.
 * Importing this file registers all forms with FormRegistry as a side-effect.
 *
 * To add a new form:
 *  1. Create `forms/definitions/<id>-definition.ts`
 *  2. Call FormRegistry.register(yourDef) at module load time
 *  3. Add an import line here
 *
 * See ADDING_A_FORM.md for the full step-by-step guide.
 */

// ─── AcroForm fills (pdf-lib) ─────────────────────────────────────────────────
export * from "./sc100-definition";
export * from "./sc104-definition";
export * from "./sc105-definition";
export * from "./sc112a-definition";
export * from "./fw001-definition";

// ─── AcroForm fills (pdftk FDF — XFA forms) ──────────────────────────────────
export * from "./sc103-definition";
export * from "./sc120-definition";
export * from "./sc150-definition";

// ─── Overlay forms (PNG background + pdf-lib) ─────────────────────────────────
export * from "./sc100a-definition";
export * from "./sc140-definition";
export * from "./mc030-definition";

// ─── Texas programmatic forms (pdf-lib, no template PDF) ─────────────────────
export * from "./tx-petition-definition";
export * from "./tx-citation-definition";
export * from "./tx-return-of-service-definition";
export * from "./tx-fee-waiver-definition";

// ─── Illinois forms ───────────────────────────────────────────────────────────
export * from "./il-smc-complaint-definition";
export * from "./il-summons-definition";
export * from "./il-proof-of-service-definition";
export * from "./il-fee-waiver-definition";
export * from "./il-letter-to-sheriff-definition";

// ─── Florida programmatic forms (pdf-lib, no template PDF) ────────────────────
// Statewide form must be exported first — county-specific forms import from it
export * from "./fl-statement-of-claim-definition";
export * from "./fl-clkct333-miami-dade-definition";
export * from "./fl-clkct423-miami-dade-summons-definition";
export * from "./fl-cl219-volusia-definition";
export * from "./fl-cl219-volusia-pdf-definition";
export * from "./fl-broward-definition";
export * from "./fl-orange-definition";
export * from "./fl-hillsborough-definition";
export * from "./fl-palm-beach-definition";
export * from "./fl-plain-soc-orange-definition";
export * from "./fl-soc-hillsborough-definition";
export * from "./fl-summons-definition";
export * from "./fl-proof-of-service-definition";
export * from "./fl-fee-waiver-definition";
export * from "./denton-citation-request-definition";

// ─── North Carolina programmatic forms (pdf-lib, no template PDF) ─────────────
export * from "./nc-aoc-cvm-200-definition";
export * from "./nc-aoc-cvm-100-definition";
export * from "./nc-aoc-g-106-definition";
