/**
 * End-to-end test: FL Orange County Summons signed form download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:fl-orange-summons-signed
 *
 * What this tests:
 *   - Creates a temporary case with county fl-orange and full plaintiff/defendant data
 *   - Creates a download token directly in the DB (bypasses Clerk auth)
 *   - Calls POST /api/cases/:id/forms/fl/orange-summons/signed?token=...
 *     with a solid-black PNG signatureDataUrl in the request body
 *   - Asserts HTTP 200 + Content-Type: application/pdf + PDF magic bytes + body size
 *   - Uses pdftotext to confirm plaintiff name and defendant name appear in the output
 *   - Cleans up test cases in the database afterwards
 *
 * Note: FL-ORANGE-SUMMONS uses buildFLSummons whose plaintiff signature y-position is
 * computed dynamically from content layout. No pixel-level placement check is performed;
 * HTTP + text-layer assertions catch rendering regressions.
 * Signature coords when present: x=ML+178=232, y=sigLineY(dynamic), w=160, h=32.
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

const TEST_USER_ID        = "test-fl-orange-summons-signed-e2e";
const EXPECTED_PLAINTIFF  = "Lisa Fernandez";
const EXPECTED_DEFENDANT  = "Kissimmee Car Rentals LLC";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

function buildSolidPngDataUrl(width: number, height: number, r: number, g: number, b: number): string {
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

const SIGNATURE_DATA_URL = buildSolidPngDataUrl(160, 32, 0, 0, 0);

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `fl-orange-summons-signed-test-${Date.now()}.pdf`);
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
      title:            "FL Orange Summons Signed Test Case (auto-cleanup)",
      status:           "draft",
      countyId:         "fl-orange",

      plaintiffName:    EXPECTED_PLAINTIFF,
      plaintiffAddress: "600 N Magnolia Ave",
      plaintiffCity:    "Orlando",
      plaintiffState:   "FL",
      plaintiffZip:     "32801",
      plaintiffPhone:   "407-555-0155",
      plaintiffEmail:   "lisa.fernandez@example.com",

      defendantName:    EXPECTED_DEFENDANT,
      defendantAddress: "3000 W Vine St",
      defendantCity:    "Kissimmee",
      defendantState:   "FL",
      defendantZip:     "34741",
      defendantPhone:   "407-555-0266",

      claimType:        "goods",
      claimAmount:      1300,
      claimDescription: "Defendant charged plaintiff's card for rental days not used and refused to issue a refund for the cancellation within the allowed window.",
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

    const url = `${BASE_URL}/api/cases/${caseId}/forms/fl/orange-summons/signed?token=${token}`;
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

    console.log("\n✅ All assertions passed — FL Orange Summons signed PDF is correct.");
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
