/**
 * End-to-end test: IL Small Claims Summons form download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:il-summons
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const TEST_USER_ID       = "test-il-summons-e2e";
const EXPECTED_PLAINTIFF = "Jane Smith";
const EXPECTED_DEFENDANT = "ABC Hardware LLC";
const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

async function main() {
  console.log("Creating test case in database…");
  const [row] = await db.insert(casesTable).values({
    userId: TEST_USER_ID,
    title: "IL Summons E2E Test",
    jurisdictionState: "IL",
    countyId: "il-cook",
    plaintiffName: EXPECTED_PLAINTIFF,
    plaintiffAddress: "123 Main St",
    plaintiffCity: "Chicago",
    plaintiffState: "IL",
    plaintiffZip: "60601",
    plaintiffPhone: "(312) 555-1234",
    plaintiffEmail: "jane@example.com",
    defendantName: EXPECTED_DEFENDANT,
    defendantAddress: "456 Oak Ave",
    defendantCity: "Chicago",
    defendantState: "IL",
    defendantZip: "60602",
    claimAmount: 3500,
    claimType: "services",
    claimDescription: "Defendant failed to complete contracted home repair work.",
  }).returning({ id: casesTable.id });

  const caseId = row!.id;
  console.log(`  Case ID: ${caseId}`);

  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token,
    caseId,
    userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const url = `${BASE_URL}/api/cases/${caseId}/forms/il/summons`;
  console.log(`Calling POST ${url}`);

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const body = Buffer.from(await resp.arrayBuffer());

  let passed = true;

  if (resp.status !== 200) {
    console.log(`  ✗ HTTP ${resp.status} (expected 200)`);
    passed = false;
  } else {
    console.log(`  ✓ HTTP 200`);
  }

  if (resp.headers.get("content-type")?.includes("application/pdf")) {
    console.log(`  ✓ Content-Type: application/pdf`);
  } else {
    console.log(`  ✗ Content-Type: ${resp.headers.get("content-type")}`);
    passed = false;
  }

  if (body.length > 1000) {
    console.log(`  ✓ Body size: ${body.length.toLocaleString()} bytes`);
  } else {
    console.log(`  ✗ Body too small: ${body.length} bytes`);
    passed = false;
  }

  if (body.slice(0, 4).toString() === "%PDF") {
    console.log(`  ✓ Valid PDF magic bytes (%PDF)`);
  } else {
    console.log(`  ✗ Invalid PDF magic bytes`);
    passed = false;
  }

  console.log(`\nCleaning up: deleting test case ${caseId}…`);
  await db.delete(casesTable).where(eq(casesTable.id, caseId));
  console.log("  Done.");

  if (passed) {
    console.log("\n✅ All assertions passed — IL Small Claims Summons PDF is correct.");
  } else {
    console.error("\n❌ Test failed.");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
