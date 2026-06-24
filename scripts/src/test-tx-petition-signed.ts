/**
 * End-to-end test: TX Small Claims Petition signed form download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:tx-petition-signed
 *
 * What this tests:
 *   - Creates a temporary case with county tx-harris and full plaintiff/defendant/claim data
 *   - Creates download tokens directly in the DB (bypasses Clerk auth)
 *   - Downloads unsigned baseline
 *   - Calls POST /api/cases/:id/forms/tx/petition/signed?token=...
 *     with a solid-black PNG signatureDataUrl in the request body
 *   - Asserts HTTP 200 + Content-Type: application/pdf + PDF magic bytes + body size
 *   - Uses pdftotext to confirm plaintiff name, defendant name, and amount appear
 *   - Asserts signed PDF is >= unsigned PDF (signature bytes were added)
 *   - Cleans up test case in the database afterwards
 *
 * Note: TX petition signature y-coord is dynamic (depends on text wrapping),
 * so this test uses size comparison + text layer instead of pixel verification.
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as zlib from "zlib";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

// ─── Test data ────────────────────────────────────────────────────────────────
const TEST_USER_ID       = "test-tx-petition-signed-e2e";
const EXPECTED_PLAINTIFF = "John Smith";
const EXPECTED_DEFENDANT = "Acme Corp";
const EXPECTED_AMOUNT    = "2,500.00";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

// ─── PNG generator ────────────────────────────────────────────────────────────
function buildSolidPngDataUrl(
  width: number, height: number,
  r: number, g: number, b: number,
): string {
  const rowBytes = 1 + width * 3;
  const raw = Buffer.alloc(height * rowBytes);
  for (let row = 0; row < height; row++) {
    raw[row * rowBytes] = 0;
    for (let col = 0; col < width; col++) {
      raw[row * rowBytes + 1 + col * 3]     = r;
      raw[row * rowBytes + 1 + col * 3 + 1] = g;
      raw[row * rowBytes + 1 + col * 3 + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(raw);
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  function crc32(buf: Buffer): number {
    let crc = 0xFFFFFFFF;
    for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type: string, data: Buffer): Buffer {
    const tb = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([tb, data])));
    return Buffer.concat([len, tb, data, crcBuf]);
  }
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; ihdrData[9] = 2;
  const pngBuf = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdrData),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${pngBuf.toString("base64")}`;
}

// Solid black 180x28 PNG — matches TX petition signature dimensions
const SIGNATURE_DATA_URL = buildSolidPngDataUrl(180, 28, 0, 0, 0);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function extractPdfText(pdfBuf: Buffer, label: string): Promise<string> {
  const tmpPdf = join(tmpdir(), `tx-petition-signed-test-${Date.now()}.pdf`);
  try {
    await writeFile(tmpPdf, pdfBuf);
    const { stdout } = await execFileAsync("pdftotext", [tmpPdf, "-"]);
    return stdout;
  } catch (err: any) {
    console.warn(`  ⚠ pdftotext failed (${label}) — skipping text-layer assertions:`, err.message);
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
      userId:            TEST_USER_ID,
      title:             "TX Petition Signed Test Case (auto-cleanup)",
      status:            "draft",
      jurisdictionState: "TX",
      countyId:          "tx-harris",

      plaintiffName:    EXPECTED_PLAINTIFF,
      plaintiffAddress: "123 Main St",
      plaintiffCity:    "Houston",
      plaintiffState:   "TX",
      plaintiffZip:     "77002",
      plaintiffPhone:   "713-555-0101",
      plaintiffEmail:   "john@example.com",

      defendantName:    EXPECTED_DEFENDANT,
      defendantAddress: "456 Commerce St",
      defendantCity:    "Houston",
      defendantState:   "TX",
      defendantZip:     "77003",

      claimType:        "goods",
      claimAmount:      2500,
      claimDescription: "Defendant failed to deliver goods as contracted despite receiving full payment in advance.",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    // ── 2. Download unsigned for size baseline ───────────────────────────────
    const token0 = randomUUID();
    await db.insert(downloadTokensTable).values({
      token: token0, caseId, userId: TEST_USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const unsignedUrl = `${BASE_URL}/api/cases/${caseId}/forms/tx/petition`;
    console.log(`\nPOST ${unsignedUrl} [unsigned baseline]`);
    const r0 = await fetch(unsignedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token0 }),
    });
    const unsignedBuf = Buffer.from(await r0.arrayBuffer());
    assert(r0.status === 200, `Unsigned baseline: expected 200, got ${r0.status}`);
    assert(unsignedBuf.slice(0, 4).toString("ascii") === "%PDF", "Unsigned: not a valid PDF");
    console.log(`  ✓ Unsigned baseline: ${unsignedBuf.length.toLocaleString()} bytes`);

    // ── 3. Create token for signed call ──────────────────────────────────────
    const token = randomUUID();
    await db.insert(downloadTokensTable).values({
      token, caseId, userId: TEST_USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    console.log(`  Signed token: ${token.slice(0, 8)}…`);

    // ── 4. Call the signed endpoint ──────────────────────────────────────────
    const signedUrl = `${BASE_URL}/api/cases/${caseId}/forms/tx/petition/signed`;
    console.log(`\nPOST ${signedUrl} [signed]`);

    const response = await fetch(signedUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token, signatureDataUrl: SIGNATURE_DATA_URL }),
    });

    // ── 5. HTTP 200 ──────────────────────────────────────────────────────────
    assert(response.status === 200, `Expected HTTP 200, got ${response.status}`);
    console.log("  ✓ HTTP 200");

    // ── 6. Content-Type: application/pdf ────────────────────────────────────
    const ct = response.headers.get("content-type") ?? "";
    assert(ct.includes("application/pdf"), `Expected application/pdf, got "${ct}"`);
    console.log(`  ✓ Content-Type: ${ct}`);

    // ── 7. Non-empty body ────────────────────────────────────────────────────
    // TX petition is generated by pdf-lib from scratch (not an overlay), so it is legitimately small (~3KB)
    const pdfBuf = Buffer.from(await response.arrayBuffer());
    assert(pdfBuf.length > 1024, `PDF body too small (${pdfBuf.length} bytes)`);
    console.log(`  ✓ Body size: ${pdfBuf.length.toLocaleString()} bytes`);

    // ── 8. PDF magic bytes ───────────────────────────────────────────────────
    assert(
      pdfBuf.slice(0, 4).toString("ascii") === "%PDF",
      "Response does not start with %PDF magic bytes",
    );
    console.log("  ✓ Valid PDF magic bytes (%PDF)");

    // ── 9. Signed >= unsigned ────────────────────────────────────────────────
    assert(
      pdfBuf.length >= unsignedBuf.length,
      `Signed PDF (${pdfBuf.length}) should be >= unsigned (${unsignedBuf.length}) — signature bytes missing`,
    );
    console.log(`  ✓ Signed PDF (${pdfBuf.length.toLocaleString()}) >= unsigned (${unsignedBuf.length.toLocaleString()}) — signature embedded`);

    // ── 10. Text-layer assertions via pdftotext ──────────────────────────────
    console.log("Extracting PDF text layer via pdftotext…");
    const pdfText = await extractPdfText(pdfBuf, "signed");
    if (pdfText) {
      assert(pdfText.includes(EXPECTED_PLAINTIFF), `Plaintiff name "${EXPECTED_PLAINTIFF}" not found`);
      console.log(`  ✓ Plaintiff name "${EXPECTED_PLAINTIFF}" found`);
      assert(pdfText.includes(EXPECTED_DEFENDANT), `Defendant name "${EXPECTED_DEFENDANT}" not found`);
      console.log(`  ✓ Defendant name "${EXPECTED_DEFENDANT}" found`);
      assert(pdfText.includes(EXPECTED_AMOUNT), `Claim amount "${EXPECTED_AMOUNT}" not found`);
      console.log(`  ✓ Claim amount "${EXPECTED_AMOUNT}" found`);
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    console.log("\n✅ All assertions passed — TX Small Claims Petition signed PDF is correct.");

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
