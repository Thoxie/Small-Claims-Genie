/**
 * Auto-generated signed-PDF signature-placement regression test for "fl-proof-of-service".
 * Thin wrapper — all logic lives in signed-form-test-kit.ts + signed-form-configs.ts.
 * Run: pnpm --filter @workspace/scripts run test:fl-proof-of-service-sigcheck
 */
import { runSignedFormTest } from "./signed-form-test-kit";
import { CONFIGS } from "./signed-form-configs";

runSignedFormTest(CONFIGS["fl-proof-of-service"]!).catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
