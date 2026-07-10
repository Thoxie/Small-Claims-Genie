/**
 * Auto-generated signed-PDF signature-placement regression test for "fl-orange-summons".
 * Thin wrapper — all logic lives in signed-form-test-kit.ts + signed-form-configs.ts.
 * Run: pnpm --filter @workspace/scripts run test:fl-orange-summons-sigcheck
 */
import { runSignedFormTest } from "./signed-form-test-kit";
import { CONFIGS } from "./signed-form-configs";

runSignedFormTest(CONFIGS["fl-orange-summons"]!).catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
