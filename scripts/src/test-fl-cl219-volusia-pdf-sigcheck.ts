/**
 * Auto-generated signed-PDF signature-placement regression test for "fl-cl219-volusia-pdf".
 * Thin wrapper — all logic lives in signed-form-test-kit.ts + signed-form-configs.ts.
 * Run: pnpm --filter @workspace/scripts run test:fl-cl219-volusia-pdf-sigcheck
 */
import { runSignedFormTest } from "./signed-form-test-kit";
import { CONFIGS } from "./signed-form-configs";

runSignedFormTest(CONFIGS["fl-cl219-volusia-pdf"]!).catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
