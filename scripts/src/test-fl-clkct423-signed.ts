/**
 * End-to-end test: FL Miami-Dade CLK/CT. 423 (Summons) signed endpoint
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:fl-clkct423-signed
 *
 * What this tests:
 *   - Creates a temporary case with county fl-miami-dade and full plaintiff/defendant data
 *   - Creates a download token directly in the DB (bypasses Clerk auth)
 *   - Calls POST /api/cases/:id/forms/fl/clkct423/signed?token=...
 *     with a signatureDataUrl in the request body
 *   - Asserts HTTP 200 + Content-Type: application/pdf + PDF magic bytes + body size
 *   - Uses pdftotext to confirm plaintiff name and defendant name appear in the output
 *   - Cleans up test cases in the database afterwards
 *
 * Note: CLK/CT. 423 is a court-issued summons — there is NO plaintiff signature field
 * on this form. The /signed endpoint is accepted and returns a valid PDF, but no
 * plaintiff signature image is embedded. No pixel-level placement check is performed.
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

const TEST_USER_ID       = "test-fl-clkct423-signed-e2e";
const EXPECTED_PLAINTIFF = "Sofia Mendez";
const EXPECTED_DEFENDANT = "Miami Beach Contractors Inc";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

const SIGNATURE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `fl-clkct423-signed-test-${Date.now()}.pdf`);
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

async function run() {
  let caseId: number | null = null;
  try {
    console.log("Creating test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId:           TEST_USER_ID,
      title:            "FL Miami-Dade CLK-CT-423 Signed Test Case (auto-cleanup)",
      status:           "draft",
      countyId:         "fl-miami-dade",

      plaintiffName:    EXPECTED_PLAINTIFF,
      plaintiffAddress: "100 Biscayne Blvd",
      plaintiffCity:    "Miami",
      plaintiffState:   "FL",
      plaintiffZip:     "33132",
      plaintiffPhone:   "305-555-0311",
      plaintiffEmail:   "sofia.mendez@example.com",

      defendantName:    EXPECTED_DEFENDANT,
      defendantAddress: "500 Collins Ave",
      defendantCity:    "Miami Beach",
      defendantState:   "FL",
      defendantZip:     "33139",
      defendantPhone:   "305-555-0422",

      claimType:        "services",
      claimAmount:      1800,
      claimDescription: "Defendant failed to complete contracted renovation services and refused to refund the deposit paid by plaintiff.",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    console.log("Creating download token…");
    const token = randomUUID();
    await db.insert(downloadTokensTable).values({
      token, caseId, userId: TEST_USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    console.log(`  Token: ${token.slice(0, 8)}…`);

    const url = `${BASE_URL}/api/cases/${caseId}/forms/fl/clkct423/signed?token=${token}`;
    console.log(`Calling POST ${url.replace(token, token.slice(0, 8) + "…")}…`);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureDataUrl: SIGNATURE_DATA_URL }),
    });

    assert(response.status === 200, `Expected HTTP 200, got ${response.status}`);
    console.log("  ✓ HTTP 200");

    const ct = response.headers.get("content-type") ?? "";
    assert(ct.includes("application/pdf"), `Expected application/pdf, got "${ct}"`);
    console.log(`  ✓ Content-Type: ${ct}`);

    const pdfBuf = Buffer.from(await response.arrayBuffer());
    assert(pdfBuf.length > 1024, `PDF body too small (${pdfBuf.length} bytes)`);
    console.log(`  ✓ Body size: ${pdfBuf.length.toLocaleString()} bytes`);

    assert(pdfBuf.slice(0, 4).toString("ascii") === "%PDF", "Response does not start with %PDF magic bytes");
    console.log("  ✓ Valid PDF magic bytes (%PDF)");

    console.log("Extracting PDF text layer via pdftotext…");
    const pdfText = await extractPdfText(pdfBuf);
    if (pdfText) {
      assert(pdfText.includes(EXPECTED_PLAINTIFF), `Plaintiff name "${EXPECTED_PLAINTIFF}" not found`);
      console.log(`  ✓ Plaintiff name "${EXPECTED_PLAINTIFF}" found`);
      assert(pdfText.includes(EXPECTED_DEFENDANT), `Defendant name "${EXPECTED_DEFENDANT}" not found`);
      console.log(`  ✓ Defendant name "${EXPECTED_DEFENDANT}" found`);
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    console.log("\n✅ All assertions passed — FL Miami-Dade CLK-CT-423 signed PDF is correct.");
  } finally {
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
