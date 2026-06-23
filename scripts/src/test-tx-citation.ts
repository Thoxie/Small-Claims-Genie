/**
 * End-to-end test: TX Citation form download (unsigned + signed)
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:tx-citation
 *
 * Notes:
 * - The Texas OCA forms site is a JS-rendered application inaccessible from
 *   this sandbox. This form is generated programmatically via pdf-lib.
 * - pdf-lib compresses content streams with deflate, so text strings are NOT
 *   present as plain ASCII in the raw bytes. Content validation is done visually.
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const TEST_USER_ID = "test-tx-citation-e2e";
const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

async function assertPdf(
  label: string,
  url: string,
  token: string,
  extraBody: Record<string, unknown>,
  expectedMinSize: number,
): Promise<{ passed: boolean; size: number }> {
  console.log(`\nPOST ${url} [${label}]`);

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...extraBody }),
  });
  const buf = Buffer.from(await resp.arrayBuffer());

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

  if (buf.length > 1000) {
    console.log(`  ✓ Body size: ${buf.length.toLocaleString()} bytes`);
  } else {
    console.log(`  ✗ Body too small: ${buf.length} bytes`);
    passed = false;
  }

  if (buf.slice(0, 4).toString() === "%PDF") {
    console.log(`  ✓ Valid PDF magic bytes (%PDF)`);
  } else {
    console.log(`  ✗ Invalid PDF magic bytes`);
    passed = false;
  }

  const disp = resp.headers.get("content-disposition") ?? "";
  if (disp.includes("TX-Citation")) {
    console.log(`  ✓ Content-Disposition filename correct`);
  } else {
    console.log(`  ✗ Content-Disposition: ${disp}`);
    passed = false;
  }

  if (buf.length >= expectedMinSize) {
    console.log(`  ✓ Size ≥ ${expectedMinSize.toLocaleString()} bytes (≥ expected minimum)`);
  } else {
    console.log(`  ✗ Size ${buf.length} < expected minimum ${expectedMinSize}`);
    passed = false;
  }

  return { passed, size: buf.length };
}

async function main() {
  console.log("Creating test case in database…");
  const [row] = await db.insert(casesTable).values({
    userId: TEST_USER_ID,
    title: "TX Citation E2E Test",
    jurisdictionState: "TX",
    countyId: "tx-harris",
    plaintiffName: "Jane Smith",
    plaintiffAddress: "123 Main St",
    plaintiffCity: "Houston",
    plaintiffState: "TX",
    plaintiffZip: "77001",
    plaintiffPhone: "713-555-0100",
    defendantName: "ABC Contractors LLC",
    defendantAddress: "456 Oak Ave",
    defendantCity: "Houston",
    defendantState: "TX",
    defendantZip: "77002",
    claimAmount: 4500,
    claimType: "services",
    claimDescription: "Defendant failed to complete contracted renovation work and refused to refund the deposit.",
  }).returning({ id: casesTable.id });

  const caseId = row!.id;
  console.log(`  Case ID: ${caseId}`);

  let passed = true;

  // ── Unsigned download ─────────────────────────────────────────────────────
  const token1 = randomUUID();
  await db.insert(downloadTokensTable).values({
    token: token1, caseId, userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const r1 = await assertPdf(
    "unsigned",
    `${BASE_URL}/api/cases/${caseId}/forms/tx/citation`,
    token1, {}, 1000,
  );
  if (!r1.passed) passed = false;

  // ── Signed download — should be larger due to embedded signature image ────
  const token2 = randomUUID();
  await db.insert(downloadTokensTable).values({
    token: token2, caseId, userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const minimalSigDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const r2 = await assertPdf(
    "signed",
    `${BASE_URL}/api/cases/${caseId}/forms/tx/citation/signed`,
    token2,
    { signatureDataUrl: minimalSigDataUrl },
    r1.size + 1,
  );
  if (!r2.passed) passed = false;

  if (r2.size > r1.size) {
    console.log(`  ✓ Signed PDF (${r2.size} bytes) is larger than unsigned (${r1.size} bytes) — signature embedded`);
  } else {
    console.log(`  ✗ Signed PDF not larger than unsigned — signature may not be embedded`);
    passed = false;
  }

  console.log(`\nCleaning up: deleting test case ${caseId}…`);
  await db.delete(casesTable).where(eq(casesTable.id, caseId));
  console.log("  Done.");

  if (passed) {
    console.log("\n✅ All assertions passed — TX Citation PDF correct (unsigned + signed).");
  } else {
    console.error("\n❌ Test failed.");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
