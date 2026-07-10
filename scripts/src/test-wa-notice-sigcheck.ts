/**
 * Auto-generated signed-PDF signature-placement regression test for "wa-notice".
 * Thin wrapper — all logic lives in signed-form-test-kit.ts + signed-form-configs.ts.
 * Run: pnpm --filter @workspace/scripts run test:wa-notice-sigcheck
 */
import { runSignedFormTest } from "./signed-form-test-kit";
import { CONFIGS } from "./signed-form-configs";

runSignedFormTest(CONFIGS["wa-notice"]!).catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
