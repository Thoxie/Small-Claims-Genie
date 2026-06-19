/**
 * End-to-end test: FL CL-219 Volusia County — official county PDF download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:fl-cl219-volusia-pdf
 *
 * What this tests:
 *   POST /api/cases/:id/forms/fl/cl219-volusia-pdf
 *     — Volusia County CL-219 Statement of Claim (official county PDF, pdftk FDF fill)
 *
 *   The endpoint must return:
 *     - HTTP 200
 *     - Content-Type: application/pdf
 *     - Body > 1 KB
 *     - Valid PDF magic bytes (%PDF)
 *     - Content-Disposition filename contains "Volusia"
 *
 *   Text-layer assertions (via pdftotext, soft-fail if unavailable):
 *     - Plaintiff name appears in the filled PDF
 *     - Defendant name appears in the filled PDF
 *     - Formatted claim amount (e.g. "$3,200.00") appears in the filled PDF
 *
 *   Auth is bypassed by inserting a short-lived download token directly into the
 *   database (identical pattern to test-fl-county-forms.ts and test-sc100.ts).
 *
 *   Cleanup: test case is deleted (cascade removes tokens) on exit.
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

const TEST_USER_ID   = "test-fl-cl219-volusia-pdf-e2e";
const BASE_URL       = process.env.API_BASE_URL ?? "http://localhost:80";

const PLAINTIFF_NAME  = "Sandra Kowalski";
const DEFENDANT_NAME  = "Daytona Realty Group LLC";
const CLAIM_AMOUNT    = 3200;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

/** Extract plain text from a PDF buffer using pdftotext. Returns "" on failure. */
async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `cl219-volusia-test-${Date.now()}.pdf`);
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
 * in 5 minutes and return the raw token string.
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
 * POST to one form endpoint with a fresh token and return { status, headers, pdfBuf }.
 */
async function callEndpoint(
  path: string,
  caseId: number,
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
 * Assert the common PDF response guarantees every variant must satisfy.
 */
function assertValidPdfResponse(
  label: string,
  status: number,
  headers: Headers,
  pdfBuf: Buffer,
): void {
  assert(
    status === 200,
    `[${label}] Expected HTTP 200, got ${status} — body: ${pdfBuf.slice(0, 200).toString()}`,
  );
  console.log(`  ✓ HTTP 200`);

  const ct = headers.get("content-type") ?? "";
  assert(ct.includes("application/pdf"), `[${label}] Expected application/pdf, got "${ct}"`);
  console.log(`  ✓ Content-Type: ${ct}`);

  assert(pdfBuf.length > 1024, `[${label}] PDF body too small (${pdfBuf.length} bytes)`);
  console.log(`  ✓ Body size: ${pdfBuf.length.toLocaleString()} bytes`);

  assert(
    pdfBuf.slice(0, 4).toString("ascii") === "%PDF",
    `[${label}] Response does not start with %PDF magic bytes`,
  );
  console.log(`  ✓ Valid PDF magic bytes (%PDF)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  let caseId: number | null = null;

  try {
    // ── 1. Insert Volusia test case ────────────────────────────────────────────
    console.log("Creating Volusia CL-219 test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId:           TEST_USER_ID,
      title:            "FL Volusia CL-219 PDF E2E Test Case (auto-cleanup)",
      status:           "draft",
      plaintiffName:    PLAINTIFF_NAME,
      plaintiffAddress: "421 Beach St",
      plaintiffCity:    "Daytona Beach",
      plaintiffState:   "FL",
      plaintiffZip:     "32114",
      plaintiffPhone:   "386-555-0131",
      plaintiffEmail:   "sandra.kowalski@example.com",
      defendantName:    DEFENDANT_NAME,
      defendantAddress: "101 N Atlantic Ave",
      defendantCity:    "Daytona Beach",
      defendantState:   "FL",
      defendantZip:     "32118",
      defendantIsBusinessOrEntity: true,
      claimAmount:      CLAIM_AMOUNT,
      claimType:        "security_deposit",
      claimDescription:
        "Plaintiff paid a $3,200 security deposit on March 1, 2024. " +
        "Defendant failed to return the deposit within 30 days of lease termination " +
        "on September 30, 2024 without providing an itemized statement as required by " +
        "Florida Statute § 83.49. Plaintiff sent a certified demand letter on November 5, 2024. " +
        "No response or refund has been received.",
      incidentDate:        "2024-09-30",
      howAmountCalculated: "Full security deposit of $3,200.00 paid March 1, 2024.",
      venueBasis:          "where_defendant_lives",
      priorDemandMade:     true,
      isAttyFeeDispute:    false,
      isSuingPublicEntity: false,
      filedMoreThan12Claims: false,
      countyId:            "fl-volusia",
      courthouseName:      "Volusia County Courthouse",
      courthouseAddress:   "101 N. Alabama Ave.",
      courthouseCity:      "DeLand",
      courthouseZip:       "32724",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    // ── 2. Call the CL-219 official PDF endpoint ───────────────────────────────
    console.log("\n── Test: Volusia County CL-219 Official PDF Download ───────────────────────");

    const { status, headers, pdfBuf } = await callEndpoint(
      `/api/cases/${caseId}/forms/fl/cl219-volusia-pdf`,
      caseId,
    );

    assertValidPdfResponse("cl219-volusia-pdf", status, headers, pdfBuf);

    // ── 3. Content-Disposition filename check ──────────────────────────────────
    const cd = headers.get("content-disposition") ?? "";
    assert(
      cd.includes("Volusia"),
      `[cl219-volusia-pdf] Expected filename to contain "Volusia", got "${cd}"`,
    );
    console.log(`  ✓ Content-Disposition: ${cd}`);

    // ── 4. Text-layer assertions via pdftotext ─────────────────────────────────
    console.log("Extracting PDF text layer via pdftotext…");
    const text = await extractPdfText(pdfBuf);

    if (text) {
      assert(
        text.includes(PLAINTIFF_NAME),
        `[cl219-volusia-pdf] Plaintiff name "${PLAINTIFF_NAME}" not found in PDF text layer`,
      );
      console.log(`  ✓ Plaintiff name "${PLAINTIFF_NAME}" found in text layer`);

      assert(
        text.includes(DEFENDANT_NAME),
        `[cl219-volusia-pdf] Defendant name "${DEFENDANT_NAME}" not found in PDF text layer`,
      );
      console.log(`  ✓ Defendant name "${DEFENDANT_NAME}" found in text layer`);

      const dollarMatch = text.match(/\$3[,.]?200/);
      assert(
        dollarMatch !== null,
        `[cl219-volusia-pdf] Claim amount "$3,200" not found in PDF text layer`,
      );
      console.log(`  ✓ Claim amount found in text layer: ${dollarMatch![0]}`);
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    console.log(
      "\n✅ All assertions passed — Volusia CL-219 official PDF generates a valid, filled PDF.",
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
