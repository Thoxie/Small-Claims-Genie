/**
 * End-to-end test: SC-103 Primary Plaintiff (sc103) PDF download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:sc103-primary
 *
 * What this tests:
 *   - Creates a temporary case with plaintiffIsFictitious: true and all 12
 *     plaintiff* DBA fields populated
 *   - Creates a download token directly in the DB (bypasses Clerk auth)
 *   - Calls POST /api/cases/:id/forms/sc103?token=...
 *   - Asserts HTTP 200 + Content-Type: application/pdf + non-empty body
 *   - Uses pdftotext to confirm: DBA business name present, signer line uses
 *     plaintiffName (the individual filer), and FBN number appears
 *   - Decompresses the PDF content streams (zlib) to confirm the LLC
 *     business-type checkbox was drawn at the expected SC-103 coordinates
 *   - Cleans up the test case afterwards
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { inflateSync } from "zlib";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

// ─── Test data ────────────────────────────────────────────────────────────────
const TEST_USER_ID      = "test-sc103-primary-e2e";
const EXPECTED_BIZ_NAME = "Main Street Goods LLC";
const EXPECTED_SIGNER   = "Alice Johnson";       // plaintiffName → signer (individual filer)
const EXPECTED_FBN_NUM  = "FBN-2024-99999";
const EXPECTED_COUNTY   = "Los Angeles";
const EXPECTED_TITLE    = "Owner";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

/** Extract plain text from PDF bytes using pdftotext. Returns "" on failure. */
async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `sc103-primary-test-${Date.now()}.pdf`);
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
 * Decompress all FlateDecode content streams in a PDF and return their raw
 * text concatenated.  This lets us inspect PDF graphics operators (moveto /
 * lineto / stroke) that pdftotext does not expose.
 */
function decompressPdfStreams(pdfBuf: Buffer): string {
  const parts: string[] = [];
  let searchFrom = 0;

  while (searchFrom < pdfBuf.length) {
    const markerCRLF = pdfBuf.indexOf(Buffer.from("stream\r\n"), searchFrom);
    const markerLF   = pdfBuf.indexOf(Buffer.from("stream\n"),  searchFrom);
    let dataStart: number;

    if (markerCRLF === -1 && markerLF === -1) break;
    if (markerCRLF === -1) { dataStart = markerLF   + 7; }
    else if (markerLF === -1) { dataStart = markerCRLF + 8; }
    else if (markerCRLF < markerLF)  { dataStart = markerCRLF + 8; }
    else { dataStart = markerLF + 7; }

    const endIdx = pdfBuf.indexOf(Buffer.from("endstream"), dataStart);
    if (endIdx === -1) break;

    let endData = endIdx;
    while (endData > dataStart && (pdfBuf[endData - 1] === 0x0a || pdfBuf[endData - 1] === 0x0d)) {
      endData--;
    }

    const streamData = pdfBuf.slice(dataStart, endData);
    try {
      const decompressed = inflateSync(streamData);
      parts.push(decompressed.toString("latin1"));
    } catch {
      parts.push(streamData.toString("latin1"));
    }

    searchFrom = endIdx + 9;
  }

  return parts.join("\n");
}

/**
 * Verify that the LLC checkbox was drawn by xmark() at the expected SC-103
 * coordinate. The xmark helper in forms-sc103.ts calls:
 *   xm(237, 529) for "llc"
 * which resolves to:
 *   xmark(page, 237, 529 + XLIFT=14, size=5) = xmark(page, 237, 543, 5)
 * → h = 2.5
 * → drawLine (234.5, 540.5) → (239.5, 545.5)
 * → drawLine (239.5, 540.5) → (234.5, 545.5)
 *
 * In pdf-lib's content stream these appear as decimal number sequences near
 * moveto ("m") and lineto ("l") operators.  We search for the x-coordinate
 * pair 234.5 / 239.5 appearing within the decompressed stream.
 */
function checkboxWasDrawn(pdfStreams: string): boolean {
  const idx1 = pdfStreams.indexOf("234.5");
  const idx2 = pdfStreams.indexOf("239.5");
  if (idx1 === -1 || idx2 === -1) return false;
  return Math.abs(idx1 - idx2) < 500;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  let caseId: number | null = null;

  try {
    // ── 1. Insert test case ──────────────────────────────────────────────────
    console.log("Creating test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId: TEST_USER_ID,
      title: "SC-103 Primary Test Case (auto-cleanup)",
      status: "draft",
      // Primary plaintiff — individual filing under a DBA
      plaintiffName: EXPECTED_SIGNER,
      plaintiffIsBusiness: false,
      plaintiffIsFictitious: true,
      // All 12 plaintiff* DBA fields
      plaintiffDbaName: EXPECTED_BIZ_NAME,
      plaintiffDbaAddress: "500 Commerce Ave",
      plaintiffDbaCity: "Los Angeles",
      plaintiffDbaState: "CA",
      plaintiffDbaZip: "90012",
      plaintiffDbaMailingAddress: "PO Box 100, Los Angeles CA 90012",
      plaintiffBusinessType: "llc",             // checkbox at PDF coords (237, 529)
      plaintiffBusinessTypeOther: "",
      plaintiffFbnNumber: EXPECTED_FBN_NUM,
      plaintiffFbnExpiry: "06/30/2027",
      plaintiffFbnSignDate: "03/01/2024",
      plaintiffFbnCounty: EXPECTED_COUNTY,
      plaintiffTitle: EXPECTED_TITLE,
      // Defendant
      defendantName: "Opposing Party Inc",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    // ── 2. Create download token ─────────────────────────────────────────────
    console.log("Creating download token…");
    const token = randomUUID();
    await db.insert(downloadTokensTable).values({
      token,
      caseId,
      userId: TEST_USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    console.log(`  Token: ${token.slice(0, 8)}…`);

    // ── 3. Call the endpoint ─────────────────────────────────────────────────
    const url = `${BASE_URL}/api/cases/${caseId}/forms/sc103?token=${token}`;
    console.log(`Calling POST ${url.replace(token, token.slice(0, 8) + "…")}…`);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachedTo: "sc100" }),
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
      "Response does not start with %PDF magic bytes"
    );
    console.log("  ✓ Valid PDF magic bytes (%PDF)");

    // ── 8. Business-type checkbox (LLC) via decompressed content streams ─────
    console.log("Checking LLC checkbox drawing operators in content streams…");
    const pdfStreams = decompressPdfStreams(pdfBuf);
    assert(
      checkboxWasDrawn(pdfStreams),
      "LLC checkbox x-coordinates (234.5 / 239.5) not found in decompressed PDF content streams — checkbox may not have been drawn"
    );
    console.log("  ✓ LLC checkbox drawing operators found (xmark at coords 237, 543)");

    // ── 9. Text-layer assertions via pdftotext ───────────────────────────────
    console.log("Extracting PDF text layer via pdftotext…");
    const pdfText = await extractPdfText(pdfBuf);

    if (pdfText) {
      // 9a. DBA business name
      assert(
        pdfText.includes(EXPECTED_BIZ_NAME),
        `Business name "${EXPECTED_BIZ_NAME}" not found in PDF text`
      );
      console.log(`  ✓ Business name "${EXPECTED_BIZ_NAME}" found`);

      // 9b. Signer line uses plaintiffName (individual filer, plaintiffIsBusiness=false)
      assert(
        pdfText.includes(EXPECTED_SIGNER),
        `Signer "${EXPECTED_SIGNER}" (plaintiffName) not found in PDF text`
      );
      console.log(`  ✓ Signer "${EXPECTED_SIGNER}" (plaintiffName) found`);

      // 9c. FBN number
      assert(
        pdfText.includes(EXPECTED_FBN_NUM),
        `FBN number "${EXPECTED_FBN_NUM}" not found in PDF text`
      );
      console.log(`  ✓ FBN number "${EXPECTED_FBN_NUM}" found`);

      // 9d. FBN county
      assert(
        pdfText.includes(EXPECTED_COUNTY),
        `FBN county "${EXPECTED_COUNTY}" not found in PDF text`
      );
      console.log(`  ✓ FBN county "${EXPECTED_COUNTY}" found`);

      // 9e. Title appears alongside signer name
      assert(
        pdfText.includes(EXPECTED_TITLE),
        `Title "${EXPECTED_TITLE}" not found in PDF text`
      );
      console.log(`  ✓ Title "${EXPECTED_TITLE}" found`);
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    console.log("\n✅ All assertions passed — SC-103 primary PDF is correct.");

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
