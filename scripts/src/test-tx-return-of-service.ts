/**
 * End-to-end test: TX Return of Service form download (unsigned + signed)
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:tx-return-of-service
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const TEST_USER_ID = "test-tx-return-of-service-e2e";
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
  if (disp.includes("TX-Return-of-Service")) {
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
    title: "TX Return of Service E2E Test",
    jurisdictionState: "TX",
    countyId: "tx-dallas",
    plaintiffName: "Robert Johnson",
    plaintiffAddress: "789 Elm St",
    plaintiffCity: "Dallas",
    plaintiffState: "TX",
    plaintiffZip: "75201",
    plaintiffPhone: "214-555-0200",
    defendantName: "XYZ Property Management Inc",
    defendantAddress: "321 Commerce St",
    defendantCity: "Dallas",
    defendantState: "TX",
    defendantZip: "75202",
    claimAmount: 2800,
    claimType: "security_deposit",
    claimDescription: "Defendant failed to return security deposit within 30 days of lease end as required by Texas law.",
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
    `${BASE_URL}/api/cases/${caseId}/forms/tx/return-of-service`,
    token1, {}, 1000,
  );
  if (!r1.passed) passed = false;

  // ── Signed download ────────────────────────────────────────────────────────
  const token2 = randomUUID();
  await db.insert(downloadTokensTable).values({
    token: token2, caseId, userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const minimalSigDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const r2 = await assertPdf(
    "signed",
    `${BASE_URL}/api/cases/${caseId}/forms/tx/return-of-service/signed`,
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
    console.log("\n✅ All assertions passed — TX Return of Service PDF correct (unsigned + signed).");
  } else {
    console.error("\n❌ Test failed.");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
