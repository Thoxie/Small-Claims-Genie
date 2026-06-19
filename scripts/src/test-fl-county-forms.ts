/**
 * End-to-end test: FL County Form Downloads — Broward and Palm Beach
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:fl-county-forms
 *
 * What this tests:
 *   1. POST /api/cases/:id/forms/fl/broward    — Broward County Statement of Claim
 *   2. POST /api/cases/:id/forms/fl/palm-beach — Palm Beach County Statement of Claim
 *
 *   Both must return:
 *     - HTTP 200
 *     - Content-Type: application/pdf
 *     - Body > 1 KB
 *     - Valid PDF magic bytes (%PDF)
 *
 *   Additionally:
 *     - Broward:    Content-Disposition filename contains "Broward"
 *     - Palm Beach: Content-Disposition filename contains "Palm-Beach"
 *
 *   Auth is bypassed by inserting a short-lived download token directly into the
 *   database for each request (identical pattern to test-sc100.ts and test-mc030.ts).
 *
 *   Cleanup: test case is deleted (cascade removes documents + tokens) on exit.
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_USER_ID = "test-fl-county-forms-e2e";
const BASE_URL     = process.env.API_BASE_URL ?? "http://localhost:80";

const PLAINTIFF_NAME = "James Rivera";
const DEFENDANT_NAME = "Sunset Property Management Inc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

/**
 * Create a single-use download token for (caseId, TEST_USER_ID) that expires
 * in 5 minutes, then immediately returns the raw token string.
 */
async function makeToken(caseId: number): Promise<string> {
  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token,
    caseId,
    userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  return token;
}

/**
 * Call one FL county form endpoint and return { status, headers, pdfBuf }.
 * Uses a fresh single-use token each time (tokens are single-use).
 */
async function callEndpoint(
  path: string,
  caseId: number
): Promise<{ status: number; headers: Headers; pdfBuf: Buffer }> {
  const token = await makeToken(caseId);
  const url   = `${BASE_URL}${path}?token=${token}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const pdfBuf = Buffer.from(await response.arrayBuffer());
  return { status: response.status, headers: response.headers, pdfBuf };
}

/**
 * Assert the common PDF response guarantees that all variants must meet.
 */
function assertValidPdfResponse(
  label: string,
  status: number,
  headers: Headers,
  pdfBuf: Buffer
): void {
  assert(
    status === 200,
    `[${label}] Expected HTTP 200, got ${status} — body: ${pdfBuf.slice(0, 200).toString()}`
  );
  console.log(`  ✓ HTTP 200`);

  const ct = headers.get("content-type") ?? "";
  assert(ct.includes("application/pdf"), `[${label}] Expected application/pdf, got "${ct}"`);
  console.log(`  ✓ Content-Type: ${ct}`);

  assert(pdfBuf.length > 1024, `[${label}] PDF body too small (${pdfBuf.length} bytes)`);
  console.log(`  ✓ Body size: ${pdfBuf.length.toLocaleString()} bytes`);

  assert(
    pdfBuf.slice(0, 4).toString("ascii") === "%PDF",
    `[${label}] Response does not start with %PDF magic bytes`
  );
  console.log(`  ✓ Valid PDF magic bytes (%PDF)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  let browardCaseId: number | null   = null;
  let palmBeachCaseId: number | null = null;

  try {
    // ── 1. Insert Broward test case ────────────────────────────────────────────
    console.log("Creating Broward test case in database…");
    const [browardInserted] = await db.insert(casesTable).values({
      userId:           TEST_USER_ID,
      title:            "FL Broward E2E Test Case (auto-cleanup)",
      status:           "draft",
      plaintiffName:    PLAINTIFF_NAME,
      plaintiffAddress: "1234 NW 5th Ave",
      plaintiffCity:    "Fort Lauderdale",
      plaintiffState:   "FL",
      plaintiffZip:     "33311",
      plaintiffPhone:   "954-555-0101",
      plaintiffEmail:   "james.rivera@example.com",
      defendantName:    DEFENDANT_NAME,
      defendantAddress: "500 E Broward Blvd",
      defendantCity:    "Fort Lauderdale",
      defendantState:   "FL",
      defendantZip:     "33394",
      defendantIsBusinessOrEntity: true,
      claimAmount:      2400,
      claimType:        "security_deposit",
      claimDescription:
        "Plaintiff paid a $2,400 security deposit on January 15, 2024. " +
        "Defendant failed to return the deposit within 30 days of lease termination " +
        "without providing an itemized statement as required by Florida Statute § 83.49. " +
        "Plaintiff sent a written demand letter on November 1, 2024. No response received.",
      incidentDate:     "2024-10-31",
      howAmountCalculated: "Full security deposit of $2,400.00 paid January 15, 2024.",
      venueBasis:       "where_defendant_lives",
      priorDemandMade:  true,
      isAttyFeeDispute: false,
      isSuingPublicEntity: false,
      filedMoreThan12Claims: false,
      countyId:         "fl-broward",
      courthouseName:   "Broward County Courthouse",
      courthouseAddress: "201 SE 6th St",
      courthouseCity:   "Fort Lauderdale",
      courthouseZip:    "33301",
    }).returning({ id: casesTable.id });

    browardCaseId = browardInserted.id;
    console.log(`  Case ID: ${browardCaseId}`);

    // ── 2. Insert Palm Beach test case ─────────────────────────────────────────
    console.log("Creating Palm Beach test case in database…");
    const [palmBeachInserted] = await db.insert(casesTable).values({
      userId:           TEST_USER_ID,
      title:            "FL Palm Beach E2E Test Case (auto-cleanup)",
      status:           "draft",
      plaintiffName:    PLAINTIFF_NAME,
      plaintiffAddress: "789 Palm Beach Lakes Blvd",
      plaintiffCity:    "West Palm Beach",
      plaintiffState:   "FL",
      plaintiffZip:     "33401",
      plaintiffPhone:   "561-555-0202",
      plaintiffEmail:   "james.rivera@example.com",
      defendantName:    DEFENDANT_NAME,
      defendantAddress: "222 Okeechobee Blvd",
      defendantCity:    "West Palm Beach",
      defendantState:   "FL",
      defendantZip:     "33401",
      defendantIsBusinessOrEntity: true,
      claimAmount:      1950,
      claimType:        "security_deposit",
      claimDescription:
        "Plaintiff paid a $1,950 security deposit on February 1, 2024. " +
        "Defendant failed to return the deposit within 30 days of lease termination " +
        "without providing an itemized statement as required by Florida Statute § 83.49. " +
        "Plaintiff sent a written demand letter on December 1, 2024. No response received.",
      incidentDate:     "2024-11-30",
      howAmountCalculated: "Full security deposit of $1,950.00 paid February 1, 2024.",
      venueBasis:       "where_defendant_lives",
      priorDemandMade:  true,
      isAttyFeeDispute: false,
      isSuingPublicEntity: false,
      filedMoreThan12Claims: false,
      countyId:         "fl-palm-beach",
      courthouseName:   "Palm Beach County Courthouse",
      courthouseAddress: "205 N Dixie Hwy",
      courthouseCity:   "West Palm Beach",
      courthouseZip:    "33401",
    }).returning({ id: casesTable.id });

    palmBeachCaseId = palmBeachInserted.id;
    console.log(`  Case ID: ${palmBeachCaseId}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1 — Broward County
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Test 1: Broward County Statement of Claim ───────────────────────────────");

    const { status: s1, headers: h1, pdfBuf: pdf1 } = await callEndpoint(
      `/api/cases/${browardCaseId}/forms/fl/broward`,
      browardCaseId
    );
    assertValidPdfResponse("broward", s1, h1, pdf1);

    const cd1 = h1.get("content-disposition") ?? "";
    assert(
      cd1.includes("Broward"),
      `[broward] Expected filename to contain "Broward", got "${cd1}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd1}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2 — Palm Beach County
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Test 2: Palm Beach County Statement of Claim ────────────────────────────");

    const { status: s2, headers: h2, pdfBuf: pdf2 } = await callEndpoint(
      `/api/cases/${palmBeachCaseId}/forms/fl/palm-beach`,
      palmBeachCaseId
    );
    assertValidPdfResponse("palm-beach", s2, h2, pdf2);

    const cd2 = h2.get("content-disposition") ?? "";
    assert(
      cd2.includes("Palm-Beach"),
      `[palm-beach] Expected filename to contain "Palm-Beach", got "${cd2}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd2}`);

    console.log("\n✅ All assertions passed — Broward and Palm Beach FL county forms generate valid PDFs.");

  } finally {
    if (browardCaseId !== null) {
      console.log(`\nCleaning up: deleting Broward test case ${browardCaseId} (cascade removes tokens)…`);
      await db.delete(casesTable).where(eq(casesTable.id, browardCaseId));
      console.log("  Done.");
    }
    if (palmBeachCaseId !== null) {
      console.log(`Cleaning up: deleting Palm Beach test case ${palmBeachCaseId} (cascade removes tokens)…`);
      await db.delete(casesTable).where(eq(casesTable.id, palmBeachCaseId));
      console.log("  Done.");
    }
  }
}

run().catch((err) => {
  console.error("\n❌ Test failed:", err.message ?? err);
  process.exit(1);
});
