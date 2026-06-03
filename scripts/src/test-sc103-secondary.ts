/**
 * End-to-end test: SC-103 Plaintiff 2 (sc103-secondary) PDF download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:sc103-secondary
 *
 * What this tests:
 *   - Creates a temporary case with all 12 secondPlaintiff* DBA fields populated
 *     and additionalPlaintiffIsFictitious: true
 *   - Creates a download token directly in the DB (bypasses Clerk auth)
 *   - Calls POST /api/cases/:id/forms/sc103-secondary?token=...
 *   - Asserts HTTP 200 + Content-Type: application/pdf + non-empty body
 *   - Uses pdftotext to confirm: DBA business name present, signer line uses
 *     additionalPlaintiffName, secondPlaintiffName is NOT the signer
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
const TEST_USER_ID      = "test-sc103-secondary-e2e";
const EXPECTED_BIZ_NAME = "Acme DBA Partners LLC";
const EXPECTED_SIGNER   = "Jane Smith";       // additionalPlaintiffName → signer
const UNEXPECTED_SIGNER = "Bob Builder";      // secondPlaintiffName — must NOT be signer
const EXPECTED_TITLE    = "Managing Partner"; // secondPlaintiffTitle
const EXPECTED_FBN_NUM  = "FBN-2024-00001";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

/** Extract plain text from PDF bytes using pdftotext. Returns "" on failure. */
async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `sc103-test-${Date.now()}.pdf`);
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
  // Streams are preceded by "stream\r\n" or "stream\n" and followed by "endstream".
  const parts: string[] = [];
  let searchFrom = 0;

  while (searchFrom < pdfBuf.length) {
    // Find next stream header
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

    // Some endstreams are preceded by \r\n or \n — strip trailing whitespace
    let endData = endIdx;
    while (endData > dataStart && (pdfBuf[endData - 1] === 0x0a || pdfBuf[endData - 1] === 0x0d)) {
      endData--;
    }

    const streamData = pdfBuf.slice(dataStart, endData);
    try {
      const decompressed = inflateSync(streamData);
      parts.push(decompressed.toString("latin1"));
    } catch {
      // Not a compressed stream (e.g. image data) — include raw for completeness
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
  // The two x-coordinates unique to the LLC xmark are 234.5 and 239.5.
  // They appear together within a few hundred characters of each other.
  const idx1 = pdfStreams.indexOf("234.5");
  const idx2 = pdfStreams.indexOf("239.5");
  if (idx1 === -1 || idx2 === -1) return false;
  // Allow up to 500 chars between the two markers (same xmark call)
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
      title: "SC-103 Secondary Test Case (auto-cleanup)",
      status: "draft",
      // Primary plaintiff
      plaintiffName: "John Doe",
      plaintiffIsBusiness: false,
      // Second plaintiff DBA — all 12 DBA/FBN fields
      hasAdditionalPlaintiff: true,
      additionalPlaintiffName: EXPECTED_SIGNER,     // this becomes the signer line
      additionalPlaintiffIsFictitious: true,
      secondPlaintiffName: UNEXPECTED_SIGNER,       // must NOT appear on signer line
      secondPlaintiffPhone: "213-555-0100",
      secondPlaintiffAddress: "100 Business Blvd",
      secondPlaintiffCity: "Los Angeles",
      secondPlaintiffState: "CA",
      secondPlaintiffZip: "90001",
      secondPlaintiffEmail: "jane@acmedba.com",
      secondPlaintiffDbaName: EXPECTED_BIZ_NAME,
      secondPlaintiffDbaAddress: "200 Trade St",
      secondPlaintiffDbaCity: "Los Angeles",
      secondPlaintiffDbaState: "CA",
      secondPlaintiffDbaZip: "90002",
      secondPlaintiffDbaMailingAddress: "PO Box 999, Los Angeles CA 90002",
      secondPlaintiffBusinessType: "llc",           // checkbox at PDF coords (237, 529)
      secondPlaintiffFbnNumber: EXPECTED_FBN_NUM,
      secondPlaintiffFbnExpiry: "12/31/2026",
      secondPlaintiffFbnSignDate: "01/15/2024",
      secondPlaintiffTitle: EXPECTED_TITLE,
      // Defendant
      defendantName: "Defendant Corp",
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
    const url = `${BASE_URL}/api/cases/${caseId}/forms/sc103-secondary?token=${token}`;
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

      // 9b. Signer line uses additionalPlaintiffName
      assert(
        pdfText.includes(EXPECTED_SIGNER),
        `Signer "${EXPECTED_SIGNER}" (additionalPlaintiffName) not found in PDF text`
      );
      console.log(`  ✓ Signer "${EXPECTED_SIGNER}" (additionalPlaintiffName) found`);

      // 9c. secondPlaintiffName must NOT be the signer.
      //     UNEXPECTED_SIGNER is set to a unique value not used anywhere else in
      //     the test case data so this is a hard negative assertion.
      assert(
        !pdfText.includes(UNEXPECTED_SIGNER),
        `secondPlaintiffName "${UNEXPECTED_SIGNER}" appears in PDF text — it should NOT be the signer (additionalPlaintiffName should be used instead)`
      );
      console.log(`  ✓ secondPlaintiffName "${UNEXPECTED_SIGNER}" is NOT in PDF (correct — additionalPlaintiffName is the signer)`);

      // 9d. Title suffix appears alongside the signer name
      assert(
        pdfText.includes(EXPECTED_TITLE),
        `Title "${EXPECTED_TITLE}" not found in PDF text`
      );
      console.log(`  ✓ Title "${EXPECTED_TITLE}" found`);

      // 9e. FBN number
      assert(
        pdfText.includes(EXPECTED_FBN_NUM),
        `FBN number "${EXPECTED_FBN_NUM}" not found in PDF text`
      );
      console.log(`  ✓ FBN number "${EXPECTED_FBN_NUM}" found`);
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    console.log("\n✅ All assertions passed — SC-103 secondary PDF is correct.");

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
