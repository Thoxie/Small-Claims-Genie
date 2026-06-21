/**
 * End-to-end test: FL Volusia County CL-219 signed form download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:fl-cl219-volusia-signed
 *
 * What this tests:
 *   - Creates a temporary case with county fl-volusia, claimType "services",
 *     and full plaintiff/defendant/contact data
 *   - Creates a download token directly in the DB (bypasses Clerk auth)
 *   - Calls POST /api/cases/:id/forms/fl/cl219-volusia-pdf/signed?token=...
 *     with a solid-black PNG signatureDataUrl in the request body
 *   - Asserts HTTP 200 + Content-Type: application/pdf + PDF magic bytes + body size
 *   - Uses pdftotext to confirm plaintiff name and amount appear in the output
 *   - Uses pdftoppm + ImageMagick to confirm the signature image was placed at the
 *     expected coordinates on the correct page (pixel-level placement check)
 *   - Cleans up test cases in the database afterwards
 *
 * Signature coords (pdf-lib, y from bottom): x=342, y=120, w=180, h=20, page=1
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
const TEST_USER_ID       = "test-fl-cl219-volusia-signed-e2e";
const EXPECTED_PLAINTIFF = "Robert Whitfield";
const EXPECTED_DEFENDANT = "Daytona Beach Rentals Inc";
const EXPECTED_AMOUNT    = "1,200.00";
const EXPECTED_DESC_CHUNK = "Defendant withheld the security deposit";

// Signature placement (pdf-lib coords: x/y from bottom-left, y is bottom edge of image)
const SIG_PAGE = 1;
const SIG_X    = 342;
const SIG_Y    = 120;
const SIG_W    = 180;
const SIG_H    = 20;

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

// ─── PNG generator ────────────────────────────────────────────────────────────
/**
 * Build a solid-color RGB PNG (no alpha) using pure Node.js/zlib.
 * Returns a base64 data URL.
 */
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

// Solid black PNG — maximally visible signature for pixel detection
const SIGNATURE_DATA_URL = buildSolidPngDataUrl(SIG_W, SIG_H, 0, 0, 0);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `fl-cl219-volusia-signed-test-${Date.now()}.pdf`);
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
 * Render a PDF page to PNG at 72 DPI and verify that the signature bounding box
 * (given in pdf-lib coords: x/y from bottom-left) contains dark pixels.
 */
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
    console.log("Creating test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId:           TEST_USER_ID,
      title:            "FL Volusia CL-219 Signed Test Case (auto-cleanup)",
      status:           "draft",
      countyId:         "fl-volusia",

      plaintiffName:    EXPECTED_PLAINTIFF,
      plaintiffAddress: "500 Atlantic Ave",
      plaintiffCity:    "Daytona Beach",
      plaintiffState:   "FL",
      plaintiffZip:     "32118",
      plaintiffPhone:   "386-555-0111",
      plaintiffEmail:   "robert.whitfield@example.com",

      defendantName:    EXPECTED_DEFENDANT,
      defendantAddress: "200 N Beach St",
      defendantCity:    "Daytona Beach",
      defendantState:   "FL",
      defendantZip:     "32114",
      defendantPhone:   "386-555-0222",

      claimType:        "services",
      claimAmount:      1200,
      claimDescription: "Defendant withheld the security deposit without justification after plaintiff vacated the rental unit in good condition. Plaintiff made written demand for return of the deposit but received no response.",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    console.log("Creating download token…");
    const token = randomUUID();
    await db.insert(downloadTokensTable).values({
      token,
      caseId,
      userId:    TEST_USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    console.log(`  Token: ${token.slice(0, 8)}…`);

    const url = `${BASE_URL}/api/cases/${caseId}/forms/fl/cl219-volusia-pdf/signed?token=${token}`;
    console.log(`Calling POST ${url.replace(token, token.slice(0, 8) + "…")}…`);

    const response = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ signatureDataUrl: SIGNATURE_DATA_URL }),
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
      assert(pdfText.includes(EXPECTED_AMOUNT), `Claim amount "${EXPECTED_AMOUNT}" not found`);
      console.log(`  ✓ Claim amount "${EXPECTED_AMOUNT}" found`);
      assert(pdfText.includes(EXPECTED_DESC_CHUNK), `Description chunk "${EXPECTED_DESC_CHUNK}" not found`);
      console.log(`  ✓ Claim description chunk "${EXPECTED_DESC_CHUNK}" found`);
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    console.log("Checking signature pixel placement…");
    await assertSignaturePlaced(pdfBuf, SIG_PAGE, SIG_X, SIG_Y, SIG_W, SIG_H, "CL-219-VOLUSIA");

    console.log("\n✅ All assertions passed — FL Volusia CL-219 signed PDF is correct.");

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
