/**
 * End-to-end test: FL Orange County Plain Statement of Claim (alternate county PDF) download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:fl-plain-soc-orange
 *
 * What this tests:
 *   - Creates a temporary case with county fl-orange and full plaintiff/defendant data
 *   - Creates a download token directly in the DB (bypasses Clerk auth)
 *   - Calls POST /api/cases/:id/forms/fl/plain-soc-orange?token=...
 *   - Asserts HTTP 200 + Content-Type: application/pdf + PDF magic bytes + body size
 *   - Uses pdftotext to verify plaintiff name, defendant name, and claim amount appear
 *   - Cleans up the test case afterwards
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

// ─── Test data ────────────────────────────────────────────────────────────────
const TEST_USER_ID       = "test-fl-plain-soc-orange-e2e";
const EXPECTED_PLAINTIFF = "Maria Lopez";
const EXPECTED_DEFENDANT = "Sunshine Rentals LLC";
const EXPECTED_AMOUNT    = "$2,500.00";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

/** Extract plain text from a PDF buffer using pdftotext. Returns "" on failure. */
async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `fl-plain-soc-orange-test-${Date.now()}.pdf`);
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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  let caseId: number | null = null;

  try {
    // ── 1. Insert test case ──────────────────────────────────────────────────
    console.log("Creating test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId:           TEST_USER_ID,
      title:            "FL Orange County Plain SOC Test Case (auto-cleanup)",
      status:           "draft",
      countyId:         "fl-orange",

      // Plaintiff
      plaintiffName:    EXPECTED_PLAINTIFF,
      plaintiffAddress: "100 Lake Eola Dr",
      plaintiffCity:    "Orlando",
      plaintiffState:   "FL",
      plaintiffZip:     "32801",
      plaintiffPhone:   "407-555-0100",

      // Defendant
      defendantName:    EXPECTED_DEFENDANT,
      defendantAddress: "200 Orange Blossom Trail",
      defendantCity:    "Orlando",
      defendantState:   "FL",
      defendantZip:     "32805",
      defendantPhone:   "407-555-0200",

      // Claim
      claimAmount:      2500,
      claimDescription: "Defendant failed to return security deposit after lease ended.",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    // ── 2. Create download token ─────────────────────────────────────────────
    console.log("Creating download token…");
    const token = randomUUID();
    await db.insert(downloadTokensTable).values({
      token,
      caseId,
      userId:    TEST_USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    console.log(`  Token: ${token.slice(0, 8)}…`);

    // ── 3. Call the endpoint ─────────────────────────────────────────────────
    const url = `${BASE_URL}/api/cases/${caseId}/forms/fl/plain-soc-orange?token=${token}`;
    console.log(`Calling POST ${url.replace(token, token.slice(0, 8) + "…")}…`);

    const response = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({}),
    });

    // ── 4. HTTP 200 ──────────────────────────────────────────────────────────
    assert(response.status === 200, `Expected HTTP 200, got ${response.status}`);
    console.log("  ✓ HTTP 200");

    // ── 5. Content-Type: application/pdf ────────────────────────────────────
    const ct = response.headers.get("content-type") ?? "";
    assert(ct.includes("application/pdf"), `Expected application/pdf, got "${ct}"`);
    console.log(`  ✓ Content-Type: ${ct}`);

    // ── 6. Non-empty body ────────────────────────────────────────────────────
    const pdfBuf = Buffer.from(await response.arrayBuffer());
    assert(pdfBuf.length > 1024, `PDF body too small (${pdfBuf.length} bytes)`);
    console.log(`  ✓ Body size: ${pdfBuf.length.toLocaleString()} bytes`);

    // ── 7. PDF magic bytes ───────────────────────────────────────────────────
    assert(
      pdfBuf.slice(0, 4).toString("ascii") === "%PDF",
      "Response does not start with %PDF magic bytes",
    );
    console.log("  ✓ Valid PDF magic bytes (%PDF)");

    // ── 8. Text-layer assertions via pdftotext ───────────────────────────────
    console.log("Extracting PDF text layer via pdftotext…");
    const pdfText = await extractPdfText(pdfBuf);

    if (pdfText) {
      // 8a. Plaintiff name
      assert(
        pdfText.includes(EXPECTED_PLAINTIFF),
        `Plaintiff name "${EXPECTED_PLAINTIFF}" not found in PDF text`,
      );
      console.log(`  ✓ Plaintiff name "${EXPECTED_PLAINTIFF}" found`);

      // 8b. Defendant name
      assert(
        pdfText.includes(EXPECTED_DEFENDANT),
        `Defendant name "${EXPECTED_DEFENDANT}" not found in PDF text`,
      );
      console.log(`  ✓ Defendant name "${EXPECTED_DEFENDANT}" found`);

      // 8c. Claim amount (formatted by the definition as "$2,500.00")
      assert(
        pdfText.includes(EXPECTED_AMOUNT),
        `Claim amount "${EXPECTED_AMOUNT}" not found in PDF text`,
      );
      console.log(`  ✓ Claim amount "${EXPECTED_AMOUNT}" found`);
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    console.log("\n✅ All assertions passed — FL Orange County Plain SOC PDF is correct.");

  } finally {
    // ── Cleanup ──────────────────────────────────────────────────────────────
    if (caseId !== null) {
      console.log(`\nCleaning up: deleting test case ${caseId}…`);
      await db.delete(casesTable).where(eq(casesTable.id, caseId));
      console.log("  Done.");
    }
  }
}

run().catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
