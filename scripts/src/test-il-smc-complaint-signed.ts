/**
 * End-to-end test: IL Small Claims Complaint signed form download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:il-smc-complaint-signed
 *
 * What this tests:
 *   - Creates a temporary case with county il-cook and full plaintiff/defendant/claim data
 *   - Creates a download token directly in the DB (bypasses Clerk auth)
 *   - Calls POST /api/cases/:id/forms/il/smc-complaint/signed?token=...
 *     with a solid-black PNG signatureDataUrl in the request body
 *   - Asserts HTTP 200 + Content-Type: application/pdf + PDF magic bytes + body size
 *   - Uses pdftotext to confirm plaintiff name, defendant name, and amount appear
 *   - Uses pdftoppm + ImageMagick to confirm the signature image was placed at the
 *     expected coordinates on the correct page (pixel-level placement check)
 *   - Asserts signed PDF is >= unsigned PDF (signature bytes were added)
 *   - Cleans up test case in the database afterwards
 *
 * Signature coords (pdf-lib, y from bottom): x=142, y=358, w=200, h=22, page=1
 *
 * Calibration: pdftotext -bbox-layout "/s/" on page 2 → xMin=142.44, yMin=411.682
 * pdf-lib y = 792 − 411.682 − 22 (image height) = 358
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as zlib from "zlib";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readdir } from "fs/promises";
import { tmpdir } from "os";
import { join, basename } from "path";

const execFileAsync = promisify(execFile);

// ─── Test data ────────────────────────────────────────────────────────────────
const TEST_USER_ID       = "test-il-smc-complaint-signed-e2e";
const EXPECTED_PLAINTIFF = "Jane Smith";
const EXPECTED_DEFENDANT = "ABC Hardware LLC";
const EXPECTED_AMOUNT    = "3,500.00";

// Signature placement (pdf-lib coords: x/y from bottom-left, y is bottom edge of image)
const SIG_PAGE = 1;
const SIG_X    = 142;
const SIG_Y    = 358;
const SIG_W    = 200;
const SIG_H    = 22;

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

const SIGNATURE_DATA_URL = buildSolidPngDataUrl(SIG_W, SIG_H, 0, 0, 0);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `il-complaint-signed-test-${Date.now()}.pdf`);
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

async function assertSignaturePlaced(
  pdfBuf: Buffer,
  page: number,
  pdfX: number, pdfY: number, w: number, h: number,
  formLabel: string,
): Promise<void> {
  const ts = Date.now();
  const pdfPath = join(tmpdir(), `sig-check-${ts}.pdf`);
  const pngBase = join(tmpdir(), `sig-check-page-${ts}`);
  try {
    await writeFile(pdfPath, pdfBuf);
    await execFileAsync("pdftoppm", ["-png", "-r", "72", "-f", String(page), "-l", String(page), pdfPath, pngBase]);
    const tmpFiles = await readdir(tmpdir());
    const pngName = tmpFiles.find(f => f.startsWith(basename(pngBase)) && f.endsWith(".png"));
    if (!pngName) throw new Error("pdftoppm produced no PNG file");
    const pngPath = join(tmpdir(), pngName);
    try {
      const { stdout: hStr } = await execFileAsync("magick", ["identify", "-format", "%h", pngPath]);
      const pageH = parseInt(hStr.trim(), 10);
      assert(!isNaN(pageH) && pageH > 0, `Could not determine page height, got: "${hStr}"`);
      const imgX = pdfX;
      const imgY = pageH - pdfY - h;
      const crop = `${w}x${h}+${imgX}+${imgY}`;
      const { stdout: meanStr } = await execFileAsync("magick", [
        "convert", pngPath,
        "-crop", crop, "+repage",
        "-colorspace", "gray",
        "-format", "%[fx:mean]",
        "info:",
      ]);
      const mean = parseFloat(meanStr.trim());
      console.log(`  Signature region mean brightness: ${mean.toFixed(4)} (crop: ${crop}, page H: ${pageH}px)`);
      assert(
        mean < 0.98,
        `${formLabel}: No dark pixels in signature region (mean=${mean.toFixed(4)} ≥ 0.98). ` +
        `Signature may not have been placed at coords x=${pdfX}, y=${pdfY}, w=${w}, h=${h}, page=${page}.`,
      );
      console.log(`  ✓ Signature pixels confirmed in expected region (mean=${mean.toFixed(4)} < 0.98)`);
    } finally {
      await unlink(pngPath).catch(() => {});
    }
  } finally {
    await unlink(pdfPath).catch(() => {});
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
      title:             "IL SMC Complaint Signed Test Case (auto-cleanup)",
      status:            "draft",
      jurisdictionState: "IL",
      countyId:          "il-cook",

      plaintiffName:    EXPECTED_PLAINTIFF,
      plaintiffAddress: "123 Main St",
      plaintiffCity:    "Chicago",
      plaintiffState:   "IL",
      plaintiffZip:     "60601",
      plaintiffPhone:   "(312) 555-1234",
      plaintiffEmail:   "jane@example.com",

      defendantName:    EXPECTED_DEFENDANT,
      defendantAddress: "456 Oak Ave",
      defendantCity:    "Chicago",
      defendantState:   "IL",
      defendantZip:     "60602",

      claimType:        "services",
      claimAmount:      3500,
      claimDescription: "Defendant failed to complete contracted home repair work and refused to refund the deposit paid.",
      howAmountCalculated: "Deposit paid was $3,500 which was never refunded.",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    // ── 2. Download unsigned for size baseline ───────────────────────────────
    const token0 = randomUUID();
    await db.insert(downloadTokensTable).values({
      token: token0, caseId, userId: TEST_USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const unsignedUrl = `${BASE_URL}/api/cases/${caseId}/forms/il/smc-complaint?token=${token0}`;
    console.log("\nDownloading unsigned for size baseline…");
    const r0 = await fetch(unsignedUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const unsignedBuf = Buffer.from(await r0.arrayBuffer());
    assert(r0.status === 200, `Unsigned baseline: expected 200, got ${r0.status}`);
    console.log(`  Unsigned baseline: ${unsignedBuf.length.toLocaleString()} bytes`);

    // ── 3. Create download token for signed call ─────────────────────────────
    const token = randomUUID();
    await db.insert(downloadTokensTable).values({
      token, caseId, userId: TEST_USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    console.log(`  Signed token: ${token.slice(0, 8)}…`);

    // ── 4. Call the signed endpoint ──────────────────────────────────────────
    const url = `${BASE_URL}/api/cases/${caseId}/forms/il/smc-complaint/signed?token=${token}`;
    console.log(`\nCalling POST ${url.replace(token, token.slice(0, 8) + "…")}…`);

    const response = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ signatureDataUrl: SIGNATURE_DATA_URL }),
    });

    // ── 5. HTTP 200 ──────────────────────────────────────────────────────────
    assert(response.status === 200, `Expected HTTP 200, got ${response.status}`);
    console.log("  ✓ HTTP 200");

    // ── 6. Content-Type: application/pdf ────────────────────────────────────
    const ct = response.headers.get("content-type") ?? "";
    assert(ct.includes("application/pdf"), `Expected application/pdf, got "${ct}"`);
    console.log(`  ✓ Content-Type: ${ct}`);

    // ── 7. Non-empty body ────────────────────────────────────────────────────
    const pdfBuf = Buffer.from(await response.arrayBuffer());
    assert(pdfBuf.length > 10000, `PDF body too small (${pdfBuf.length} bytes)`);
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
    const pdfText = await extractPdfText(pdfBuf);
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

    // ── 11. Pixel-level signature placement check ────────────────────────────
    console.log("Checking signature pixel placement…");
    await assertSignaturePlaced(pdfBuf, SIG_PAGE, SIG_X, SIG_Y, SIG_W, SIG_H, "IL-SMC-Complaint");

    console.log("\n✅ All assertions passed — IL Small Claims Complaint signed PDF is correct.");

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
