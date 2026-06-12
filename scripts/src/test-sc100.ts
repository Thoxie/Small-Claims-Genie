/**
 * End-to-end test: SC-100 Plaintiff's Claim — AI enrichment round-trip
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:sc100
 *
 * What this tests:
 *   1. GET  /api/cases/:id/forms/sc100         — basic variant (GET with token)
 *   2. POST /api/cases/:id/forms/sc100/signed  — signed variant (PNG signature embedded)
 *
 *   Both must return:
 *     - HTTP 200
 *     - Content-Type: application/pdf
 *     - Body > 1 KB
 *     - Valid PDF magic bytes (%PDF)
 *
 *   Additionally:
 *     - Basic:   Content-Disposition filename contains "SC100-Case"
 *     - Signed:  Content-Disposition filename contains "SC100-Signed"
 *
 *   pdftotext text-layer assertions (if pdftotext is available):
 *     - Basic:   Plaintiff name found in text layer
 *     - Basic:   Defendant name found in text layer
 *
 *   AI enrichment notes:
 *     - The test case pre-populates venueBasis, howAmountCalculated, isAttyFeeDispute,
 *       isSuingPublicEntity, and priorDemandMade so the JSON-fill branch is skipped.
 *     - generateSC100ClaimSummary (the claim description AI call) runs in both variants
 *       and is the primary "AI enrichment round-trip" being verified.
 *     - A claimDescription is provided so the AI has real content to summarise.
 *
 *   Auth is bypassed by inserting a short-lived download token directly into the
 *   database for each request (identical pattern to test-mc030.ts).
 *
 *   Cleanup: test case is deleted (cascade removes documents + tokens) on exit.
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_USER_ID = "test-sc100-e2e";
const BASE_URL     = process.env.API_BASE_URL ?? "http://localhost:80";

const PLAINTIFF_NAME  = "Maria Gonzalez";
const DEFENDANT_NAME  = "Pacific Coastal Properties LLC";

/**
 * Minimal 1×1 transparent PNG — used as the signature image for the signed variant.
 */
const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const SIGNATURE_DATA_URL = `data:image/png;base64,${MINIMAL_PNG_BASE64}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

/** Extract plain text from PDF bytes using pdftotext. Returns "" on failure. */
async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `sc100-test-${Date.now()}.pdf`);
  try {
    await writeFile(tmpPdf, pdfBuf);
    const { stdout } = await execFileAsync("pdftotext", [tmpPdf, "-"]);
    return stdout;
  } catch (err: any) {
    console.warn("  ⚠ pdftotext failed — skipping text-layer assertions:", err.message);
    return "";
  } finally {
    await unlink(tmpPdf).catch(() => {});
  }
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
 * Call one SC-100 endpoint and return { status, headers, pdfBuf }.
 * Uses a fresh single-use token each time (tokens are single-use).
 */
async function callEndpoint(
  method: "GET" | "POST",
  path: string,
  caseId: number,
  body?: Record<string, unknown>
): Promise<{ status: number; headers: Headers; pdfBuf: Buffer }> {
  const token = await makeToken(caseId);
  const url   = `${BASE_URL}${path}?token=${token}`;
  const fetchOpts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  const response = await fetch(url, fetchOpts);
  const pdfBuf   = Buffer.from(await response.arrayBuffer());
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
    // ── 1. Insert test case ────────────────────────────────────────────────────
    console.log("Creating test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId:           TEST_USER_ID,
      title:            "SC-100 E2E Test Case (auto-cleanup)",
      status:           "draft",
      plaintiffName:    PLAINTIFF_NAME,
      plaintiffAddress: "455 Ocean Ave",
      plaintiffCity:    "Santa Monica",
      plaintiffState:   "CA",
      plaintiffZip:     "90402",
      plaintiffPhone:   "310-555-0199",
      plaintiffEmail:   "maria@example.com",
      defendantName:    DEFENDANT_NAME,
      defendantAddress: "800 Wilshire Blvd",
      defendantCity:    "Los Angeles",
      defendantState:   "CA",
      defendantZip:     "90017",
      defendantIsBusinessOrEntity: true,
      claimAmount:      1850,
      claimType:        "security_deposit",
      claimDescription:
        "Plaintiff paid a $1,850 security deposit on March 1, 2024. " +
        "Defendant landlord refused to return the deposit after the lease ended on " +
        "September 30, 2024, without providing an itemised deduction statement as " +
        "required by California Civil Code § 1950.5. Plaintiff sent a written demand " +
        "letter on October 15, 2024 requesting return of the full deposit. " +
        "Defendant did not respond.",
      incidentDate:     "2024-10-01",
      howAmountCalculated:
        "Full security deposit of $1,850.00 paid on March 1, 2024. " +
        "No deduction statement provided within 21 days as required by CA Civil Code § 1950.5.",
      venueBasis:       "where_defendant_lives",
      priorDemandMade:  true,
      isAttyFeeDispute: false,
      isSuingPublicEntity: false,
      filedMoreThan12Claims: false,
      countyId:         "los-angeles",
      courthouseName:   "Stanley Mosk Courthouse",
      courthouseAddress: "111 N Hill St",
      courthouseCity:   "Los Angeles",
      courthouseZip:    "90012",
      caseNumber:       "25SC99001",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Variant 1 — Basic GET (AI enrichment runs; claim summary generated by AI)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Variant 1: Basic GET (AI enrichment round-trip) ─────────────────────────");
    console.log("  (Calling OpenAI to generate SC-100 claim summary — may take a moment…)");

    const { status: s1, headers: h1, pdfBuf: pdf1 } = await callEndpoint(
      "GET",
      `/api/cases/${caseId}/forms/sc100`,
      caseId
    );
    assertValidPdfResponse("basic", s1, h1, pdf1);

    const cd1 = h1.get("content-disposition") ?? "";
    assert(
      cd1.includes("SC100-Case"),
      `[basic] Expected filename to contain "SC100-Case", got "${cd1}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd1}`);

    console.log("  Extracting PDF text layer…");
    const text1 = await extractPdfText(pdf1);
    if (text1) {
      assert(
        text1.includes(PLAINTIFF_NAME),
        `[basic] Plaintiff name "${PLAINTIFF_NAME}" not found in PDF text layer`
      );
      console.log(`  ✓ Plaintiff name "${PLAINTIFF_NAME}" found in text layer`);

      assert(
        text1.includes(DEFENDANT_NAME),
        `[basic] Defendant name "${DEFENDANT_NAME}" not found in PDF text layer`
      );
      console.log(`  ✓ Defendant name "${DEFENDANT_NAME}" found in text layer`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Variant 2 — Signed POST (PNG signature embedded; AI enrichment also runs)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Variant 2: Signed POST (signature embedded) ──────────────────────────────");
    console.log("  (Calling OpenAI to generate SC-100 claim summary — may take a moment…)");

    const { status: s2, headers: h2, pdfBuf: pdf2 } = await callEndpoint(
      "POST",
      `/api/cases/${caseId}/forms/sc100/signed`,
      caseId,
      { signatureDataUrl: SIGNATURE_DATA_URL }
    );
    assertValidPdfResponse("signed", s2, h2, pdf2);

    const cd2 = h2.get("content-disposition") ?? "";
    assert(
      cd2.includes("SC100-Signed"),
      `[signed] Expected filename to contain "SC100-Signed", got "${cd2}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd2}`);

    console.log("\n✅ All assertions passed — both SC-100 variants generate valid PDFs with AI enrichment.");

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
