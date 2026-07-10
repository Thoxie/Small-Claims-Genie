/**
 * Auto-generated signed-PDF signature-placement regression test for "nc-aoc-cvm-200".
 * Thin wrapper — all logic lives in signed-form-test-kit.ts + signed-form-configs.ts.
 * Run: pnpm --filter @workspace/scripts run test:nc-aoc-cvm-200-sigcheck
 */
import { runSignedFormTest } from "./signed-form-test-kit";
import { CONFIGS } from "./signed-form-configs";

runSignedFormTest(CONFIGS["nc-aoc-cvm-200"]!).catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
