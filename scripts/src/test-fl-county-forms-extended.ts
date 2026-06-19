/**
 * End-to-end test: FL County Form Downloads — Miami-Dade, Volusia, Orange, Hillsborough,
 * and the statewide FL Statement of Claim.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:fl-county-forms-extended
 *
 * What this tests:
 *   1. POST /api/cases/:id/forms/fl/statement-of-claim — Statewide FL Statement of Claim
 *   2. POST /api/cases/:id/forms/fl/clkct333           — Miami-Dade CLK/CT. 333
 *   3. POST /api/cases/:id/forms/fl/cl219-volusia       — Volusia CL-219
 *   4. POST /api/cases/:id/forms/fl/orange              — Orange County
 *   5. POST /api/cases/:id/forms/fl/hillsborough        — Hillsborough County
 *
 *   Each must return:
 *     - HTTP 200
 *     - Content-Type: application/pdf
 *     - Body > 1 KB
 *     - Valid PDF magic bytes (%PDF)
 *
 *   Additionally, each endpoint's Content-Disposition filename is verified to
 *   contain the expected county/form identifier string.
 *
 *   Auth is bypassed by inserting a short-lived download token directly into the
 *   database for each request (identical pattern to test-fl-county-forms.ts).
 *
 *   All five tests share a single test case row. Cleanup deletes the case on exit
 *   (cascade removes documents + tokens).
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_USER_ID = "test-fl-county-forms-extended-e2e";
const BASE_URL     = process.env.API_BASE_URL ?? "http://localhost:80";

const PLAINTIFF_NAME = "Maria Gonzalez";
const DEFENDANT_NAME = "Sunrise Property Group LLC";

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
  let caseId: number | null = null;

  try {
    // ── Insert shared test case ────────────────────────────────────────────────
    console.log("Creating shared FL test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId:           TEST_USER_ID,
      title:            "FL Extended County Forms E2E Test Case (auto-cleanup)",
      status:           "draft",
      plaintiffName:    PLAINTIFF_NAME,
      plaintiffAddress: "456 Biscayne Blvd",
      plaintiffCity:    "Miami",
      plaintiffState:   "FL",
      plaintiffZip:     "33132",
      plaintiffPhone:   "305-555-0303",
      plaintiffEmail:   "maria.gonzalez@example.com",
      defendantName:    DEFENDANT_NAME,
      defendantAddress: "100 SE 2nd St",
      defendantCity:    "Miami",
      defendantState:   "FL",
      defendantZip:     "33131",
      defendantIsBusinessOrEntity: true,
      claimAmount:      3200,
      claimType:        "security_deposit",
      claimDescription:
        "Plaintiff paid a $3,200 security deposit on March 1, 2024. " +
        "Defendant failed to return the deposit within 30 days of lease termination " +
        "without providing an itemized statement as required by Florida Statute § 83.49. " +
        "Plaintiff sent a written demand letter on January 5, 2025. No response received.",
      incidentDate:     "2024-12-31",
      howAmountCalculated: "Full security deposit of $3,200.00 paid March 1, 2024.",
      venueBasis:       "where_defendant_lives",
      priorDemandMade:  true,
      isAttyFeeDispute: false,
      isSuingPublicEntity: false,
      filedMoreThan12Claims: false,
      countyId:         "fl-miami-dade",
      courthouseName:   "Miami-Dade County Courthouse",
      courthouseAddress: "73 W Flagler St",
      courthouseCity:   "Miami",
      courthouseZip:    "33130",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1 — Statewide FL Statement of Claim
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Test 1: Statewide FL Statement of Claim ─────────────────────────────────");

    const { status: s1, headers: h1, pdfBuf: pdf1 } = await callEndpoint(
      `/api/cases/${caseId}/forms/fl/statement-of-claim`,
      caseId
    );
    assertValidPdfResponse("fl-statement-of-claim", s1, h1, pdf1);

    const cd1 = h1.get("content-disposition") ?? "";
    assert(
      cd1.includes("Florida-Statement-of-Claim"),
      `[fl-statement-of-claim] Expected filename to contain "Florida-Statement-of-Claim", got "${cd1}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd1}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2 — Miami-Dade County (CLK/CT. 333)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Test 2: Miami-Dade County (CLK/CT. 333) ─────────────────────────────────");

    const { status: s2, headers: h2, pdfBuf: pdf2 } = await callEndpoint(
      `/api/cases/${caseId}/forms/fl/clkct333`,
      caseId
    );
    assertValidPdfResponse("clkct333", s2, h2, pdf2);

    const cd2 = h2.get("content-disposition") ?? "";
    assert(
      cd2.includes("Miami-Dade"),
      `[clkct333] Expected filename to contain "Miami-Dade", got "${cd2}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd2}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3 — Volusia County (CL-219)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Test 3: Volusia County (CL-219) ─────────────────────────────────────────");

    const { status: s3, headers: h3, pdfBuf: pdf3 } = await callEndpoint(
      `/api/cases/${caseId}/forms/fl/cl219-volusia`,
      caseId
    );
    assertValidPdfResponse("cl219-volusia", s3, h3, pdf3);

    const cd3 = h3.get("content-disposition") ?? "";
    assert(
      cd3.includes("Volusia"),
      `[cl219-volusia] Expected filename to contain "Volusia", got "${cd3}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd3}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4 — Orange County
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Test 4: Orange County ────────────────────────────────────────────────────");

    const { status: s4, headers: h4, pdfBuf: pdf4 } = await callEndpoint(
      `/api/cases/${caseId}/forms/fl/orange`,
      caseId
    );
    assertValidPdfResponse("fl-orange", s4, h4, pdf4);

    const cd4 = h4.get("content-disposition") ?? "";
    assert(
      cd4.includes("Orange"),
      `[fl-orange] Expected filename to contain "Orange", got "${cd4}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd4}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Test 5 — Hillsborough County
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Test 5: Hillsborough County ──────────────────────────────────────────────");

    const { status: s5, headers: h5, pdfBuf: pdf5 } = await callEndpoint(
      `/api/cases/${caseId}/forms/fl/hillsborough`,
      caseId
    );
    assertValidPdfResponse("fl-hillsborough", s5, h5, pdf5);

    const cd5 = h5.get("content-disposition") ?? "";
    assert(
      cd5.includes("Hillsborough"),
      `[fl-hillsborough] Expected filename to contain "Hillsborough", got "${cd5}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd5}`);

    console.log(
      "\n✅ All assertions passed — FL Statement of Claim, Miami-Dade (CLK/CT.333), " +
      "Volusia (CL-219), Orange, and Hillsborough forms all generate valid PDFs."
    );

  } finally {
    if (caseId !== null) {
      console.log(`\nCleaning up: deleting test case ${caseId} (cascade removes tokens)…`);
      await db.delete(casesTable).where(eq(casesTable.id, caseId));
      console.log("  Done.");
    }
  }
}

run().catch((err) => {
  console.error("\n❌ Test failed:", err.message ?? err);
  process.exit(1);
});
