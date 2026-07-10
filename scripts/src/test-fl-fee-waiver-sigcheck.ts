/**
 * Auto-generated signed-PDF signature-placement regression test for "fl-fee-waiver".
 * Thin wrapper — all logic lives in signed-form-test-kit.ts + signed-form-configs.ts.
 * Run: pnpm --filter @workspace/scripts run test:fl-fee-waiver-sigcheck
 */
import { runSignedFormTest } from "./signed-form-test-kit";
import { CONFIGS } from "./signed-form-configs";

runSignedFormTest(CONFIGS["fl-fee-waiver"]!).catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
