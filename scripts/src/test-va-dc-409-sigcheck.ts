/**
 * Auto-generated signed-PDF signature-placement regression test for "va-dc-409".
 * Thin wrapper — all logic lives in signed-form-test-kit.ts + signed-form-configs.ts.
 * Run: pnpm --filter @workspace/scripts run test:va-dc-409-sigcheck
 */
import { runSignedFormTest } from "./signed-form-test-kit";
import { CONFIGS } from "./signed-form-configs";

runSignedFormTest(CONFIGS["va-dc-409"]!).catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
