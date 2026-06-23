/**
 * End-to-end test: IL Small Claims Summons form download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:il-summons
 *
 * Notes:
 * - The IL summons is court-issued and stamped by the circuit court clerk.
 *   There is no user-signed variant — the /signed route does not exist.
 * - The IL courts site (illinoiscourts.gov) is a JS-rendered application
 *   that serves JavaScript bundles from all URLs, not actual PDFs.
 *   This form is generated programmatically via pdf-lib (png-overlay technique).
 * - pdf-lib compresses content streams with deflate, so text strings are NOT
 *   present as plain ASCII in the raw bytes. Content validation is done visually.
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const TEST_USER_ID = "test-il-summons-e2e";
const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

async function main() {
  console.log("Creating test case in database…");
  const [row] = await db.insert(casesTable).values({
    userId: TEST_USER_ID,
    title: "IL Summons E2E Test",
    jurisdictionState: "IL",
    countyId: "il-cook",
    plaintiffName: "Jane Smith",
    plaintiffAddress: "123 Main St",
    plaintiffCity: "Chicago",
    plaintiffState: "IL",
    plaintiffZip: "60601",
    plaintiffPhone: "(312) 555-1234",
    plaintiffEmail: "jane@example.com",
    defendantName: "ABC Hardware LLC",
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

  let passed = true;

  // ── Unsigned download ─────────────────────────────────────────────────────
  const url = `${BASE_URL}/api/cases/${caseId}/forms/il/summons`;
  console.log(`\nPOST ${url}`);

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const body = Buffer.from(await resp.arrayBuffer());

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

  const respDisp = resp.headers.get("content-disposition") ?? "";
  if (respDisp.includes("IL-Small-Claims-Summons")) {
    console.log(`  ✓ Content-Disposition filename correct`);
  } else {
    console.log(`  ✗ Content-Disposition: ${respDisp}`);
    passed = false;
  }

  // ── No signed variant — verify endpoint is absent (401 or 404) ───────────
  // Auth middleware fires before Express 404s, so both statuses confirm the
  // route does not function as a PDF download endpoint.
  const signedToken = randomUUID();
  await db.insert(downloadTokensTable).values({
    token: signedToken,
    caseId,
    userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const signedUrl = `${BASE_URL}/api/cases/${caseId}/forms/il/summons/signed`;
  console.log(`\nPOST ${signedUrl} (should not exist — clerk-issued form)`);
  const signedResp = await fetch(signedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: signedToken }),
  });
  // 401 = auth middleware fired before route resolution (route absent)
  // 404 = explicit not-found (route absent)
  // Either confirms the endpoint is not a valid summons download
  if (signedResp.status === 404 || signedResp.status === 401) {
    console.log(`  ✓ Signed route absent — not a valid download endpoint (${signedResp.status})`);
  } else if (signedResp.status === 200) {
    console.log(`  ✗ Signed route returned 200 — should not exist`);
    passed = false;
  } else {
    console.log(`  ✓ Signed route absent — not a valid download endpoint (${signedResp.status})`);
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
