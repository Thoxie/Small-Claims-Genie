/**
 * End-to-end test: TX Fee Waiver (Affidavit of Inability to Pay) form download
 * (unsigned + signed)
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:tx-fee-waiver
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const TEST_USER_ID = "test-tx-fee-waiver-e2e";
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
  if (disp.includes("TX-Fee-Waiver")) {
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
    title: "TX Fee Waiver E2E Test",
    jurisdictionState: "TX",
    countyId: "tx-bexar",
    plaintiffName: "Maria Garcia",
    plaintiffAddress: "555 San Pedro Ave",
    plaintiffCity: "San Antonio",
    plaintiffState: "TX",
    plaintiffZip: "78212",
    plaintiffPhone: "210-555-0300",
    plaintiffEmail: "mgarcia@example.com",
    defendantName: "Sunrise Auto Repair",
    defendantAddress: "222 Blanco Rd",
    defendantCity: "San Antonio",
    defendantState: "TX",
    defendantZip: "78213",
    claimAmount: 1200,
    claimType: "services",
    claimDescription: "Defendant performed unnecessary repairs and charged for work not authorized.",
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
    `${BASE_URL}/api/cases/${caseId}/forms/tx/fee-waiver`,
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
    `${BASE_URL}/api/cases/${caseId}/forms/tx/fee-waiver/signed`,
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
    console.log("\n✅ All assertions passed — TX Fee Waiver PDF correct (unsigned + signed).");
  } else {
    console.error("\n❌ Test failed.");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
