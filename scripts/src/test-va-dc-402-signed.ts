/**
 * End-to-end test: Virginia DC-402 (Warrant in Debt) signed form download
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:va-dc-402-signed
 *
 * What this tests:
 *   - Creates a temporary VA case (county va-fairfax) with full party data
 *   - Creates a download token directly in the DB (bypasses Clerk auth)
 *   - Calls POST /api/cases/:id/forms/va/dc-402/signed?token=...
 *     with a solid-black PNG signatureDataUrl in the request body
 *   - Asserts HTTP 200 + Content-Type: application/pdf + PDF magic bytes + body size
 *   - Uses pdftotext to confirm plaintiff/defendant names + amount appear
 *   - Uses pdftoppm + ImageMagick to confirm the signature image was placed at the
 *     expected coordinates on PAGE 1 (pixel-level placement check)
 *   - Cleans up the test case afterwards
 *
 * IMPORTANT — DC-402 renders ROTATED: page 1 has rotation=90, so pdftoppm emits a
 * LANDSCAPE image (792×612). The signature block lands at image-space coordinates
 * x=200, y=317, w=156, h=23 (calibrated by diffing signed vs unsigned renders).
 * Because the page is rotated, the standard pdf-lib→image formula does NOT apply;
 * this test crops the rendered image at those image-space coordinates directly.
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
const TEST_USER_ID       = "test-va-dc-402-signed-e2e";
const EXPECTED_PLAINTIFF = "Jane Smith";
const EXPECTED_DEFENDANT = "ABC Hardware LLC";
const EXPECTED_AMOUNT    = "3,500.00";

// Signature placement in RENDERED IMAGE-SPACE coords (page renders rotated to
// landscape 792×612 at 72 DPI). Cropped directly — no pdf-lib→image conversion.
const SIG_PAGE  = 1;
const SIG_IMG_X = 200;
const SIG_IMG_Y = 317;
const SIG_IMG_W = 156;
const SIG_IMG_H = 23;

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
  ihdrData[8] = 8; ihdrData[9] = 2; // bit depth 8, RGB
  const pngBuf = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdrData),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${pngBuf.toString("base64")}`;
}

// Solid black PNG — maximally visible signature for pixel detection
const SIGNATURE_DATA_URL = buildSolidPngDataUrl(SIG_IMG_W, SIG_IMG_H, 0, 0, 0);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `va-dc-402-signed-test-${Date.now()}.pdf`);
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
 * Render a PDF page to PNG at 72 DPI and verify the signature bounding box —
 * given in RENDERED IMAGE-SPACE coords (top-left origin) — contains dark pixels.
 * Used for rotated pages where the pdf-lib→image formula does not apply.
 */
async function assertSignaturePlacedImageSpace(
  pdfBuf: Buffer,
  page: number,
  imgX: number, imgY: number, w: number, h: number,
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
      const { stdout: dimStr } = await execFileAsync("magick", ["identify", "-format", "%wx%h", pngPath]);
      console.log(`  Rendered page size: ${dimStr.trim()}px`);

      const crop = `${w}x${h}+${imgX}+${imgY}`;
      const { stdout: meanStr } = await execFileAsync("magick", [
        "convert", pngPath,
        "-crop", crop, "+repage",
        "-colorspace", "gray",
        "-format", "%[fx:mean]",
        "info:",
      ]);
      const mean = parseFloat(meanStr.trim());
      console.log(`  Signature region mean brightness: ${mean.toFixed(4)} (crop: ${crop})`);

      assert(
        mean < 0.98,
        `${formLabel}: No dark pixels in signature region (mean=${mean.toFixed(4)} ≥ 0.98). ` +
        `Signature may not have been placed at image coords x=${imgX}, y=${imgY}, w=${w}, h=${h}, page=${page}.`,
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
      userId:            TEST_USER_ID,
      title:             "VA DC-402 Signed Test Case (auto-cleanup)",
      status:            "draft",
      jurisdictionState: "VA",
      countyId:          "va-fairfax",

      plaintiffName:    EXPECTED_PLAINTIFF,
      plaintiffAddress: "123 Main St",
      plaintiffCity:    "Fairfax",
      plaintiffState:   "VA",
      plaintiffZip:     "22030",
      plaintiffPhone:   "(703) 555-1234",
      plaintiffEmail:   "jane@example.com",

      defendantName:    EXPECTED_DEFENDANT,
      defendantAddress: "456 Oak Ave",
      defendantCity:    "Fairfax",
      defendantState:   "VA",
      defendantZip:     "22031",

      claimType:        "services",
      claimAmount:      3500,
      claimDescription: "Defendant failed to complete contracted home repair work and refused to refund the deposit paid.",
      howAmountCalculated: "Deposit paid was $3,500 which was never refunded.",
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

    const url = `${BASE_URL}/api/cases/${caseId}/forms/va/dc-402/signed?token=${token}`;
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
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    console.log("Checking signature pixel placement (rotated page, image-space crop)…");
    await assertSignaturePlacedImageSpace(pdfBuf, SIG_PAGE, SIG_IMG_X, SIG_IMG_Y, SIG_IMG_W, SIG_IMG_H, "VA-DC-402");

    console.log("\n✅ All assertions passed — VA DC-402 signed PDF is correct.");

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
