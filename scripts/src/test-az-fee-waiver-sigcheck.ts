/**
 * Signed-PDF signature-placement regression test for "az-fee-waiver".
 * Thin wrapper — all logic lives in signed-form-test-kit.ts + signed-form-configs.ts.
 * Run: pnpm --filter @workspace/scripts run test:az-fee-waiver-sigcheck
 *
 * ⚠️  This test requires the PDF asset to be present at:
 *   artifacts/api-server/assets/forms/az-aocdfgf1f-fee-waiver.pdf
 * and for the signature coordinates in signed-form-configs.ts to be calibrated
 * against the actual form (see header comments in az-fee-waiver-definition.ts).
 */
import { runSignedFormTest } from "./signed-form-test-kit";
import { CONFIGS } from "./signed-form-configs";

runSignedFormTest(CONFIGS["az-fee-waiver"]!).catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
