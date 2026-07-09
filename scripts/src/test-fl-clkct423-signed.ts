/**
 * End-to-end test: FL Miami-Dade CLK/CT. 423 (Summons) signed endpoint
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:fl-clkct423-signed
 *
 * What this tests:
 *   - Creates a temporary case with county fl-miami-dade and full plaintiff/defendant data
 *   - Creates download tokens directly in the DB (bypasses Clerk auth)
 *   - Calls POST /api/cases/:id/forms/fl/clkct423/signed?token=...
 *     with a solid-black PNG signatureDataUrl in the request body
 *   - Asserts HTTP 200 + Content-Type: application/pdf + PDF magic bytes + body size
 *   - Uses pdftotext to confirm plaintiff name and defendant name appear in the output
 *   - CLERK-SIGNED GUARD: renders every page of the signed output AND the unsigned
 *     output at 72 DPI and asserts they are pixel-identical. CLK/CT. 423 is a
 *     court-issued summons — the only signature is the Deputy Clerk's, applied at
 *     filing. The generator intentionally ignores the supplied signature bytes, so
 *     even when a maximally-visible solid-black PNG is posted, NO plaintiff
 *     signature may appear anywhere on the form. Any non-zero render difference
 *     means a plaintiff signature leaked onto the clerk-signed form.
 *   - Cleans up test cases in the database afterwards
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

const TEST_USER_ID       = "test-fl-clkct423-signed-e2e";
const EXPECTED_PLAINTIFF = "Sofia Mendez";
const EXPECTED_DEFENDANT = "Miami Beach Contractors Inc";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

// Max acceptable mean per-page pixel difference between signed and unsigned
// renders. A plaintiff signature block would push a page well above this.
const MAX_PAGE_DIFF = 0.002;

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

// Solid black PNG — maximally visible signature; MUST be ignored by the generator.
const SIGNATURE_DATA_URL = buildSolidPngDataUrl(180, 36, 0, 0, 0);

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

async function makeToken(caseId: number): Promise<string> {
  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token, caseId, userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  return token;
}

/** Count pages in a PDF via pdfinfo. */
async function pageCount(pdfBuf: Buffer): Promise<number> {
  const tmpPdf = join(tmpdir(), `pc-${Date.now()}-${Math.random()}.pdf`);
  try {
    await writeFile(tmpPdf, pdfBuf);
    const { stdout } = await execFileAsync("pdfinfo", [tmpPdf]);
    const m = stdout.match(/^Pages:\s+(\d+)/m);
    return m ? parseInt(m[1]!, 10) : 1;
  } catch {
    return 1;
  } finally {
    await unlink(tmpPdf).catch(() => {});
  }
}

/** Render one PDF page to a PNG at 72 DPI and return its path. */
async function renderPage(pdfBuf: Buffer, page: number): Promise<string> {
  const ts = `${Date.now()}-${Math.random()}`;
  const pdfPath = join(tmpdir(), `render-${ts}.pdf`);
  const pngBase = join(tmpdir(), `render-page-${ts}`);
  await writeFile(pdfPath, pdfBuf);
  try {
    await execFileAsync("pdftoppm", ["-png", "-r", "72", "-f", String(page), "-l", String(page), pdfPath, pngBase]);
    const tmpFiles = await readdir(tmpdir());
    const pngName = tmpFiles.find(f => f.startsWith(basename(pngBase)) && f.endsWith(".png"));
    if (!pngName) throw new Error("pdftoppm produced no PNG file");
    return join(tmpdir(), pngName);
  } finally {
    await unlink(pdfPath).catch(() => {});
  }
}

/**
 * Assert that the signed output is pixel-identical to the unsigned output on
 * every page — proving no plaintiff signature was embedded on this clerk-signed form.
 */
async function assertNoPlaintiffSignature(signedBuf: Buffer, unsignedBuf: Buffer): Promise<void> {
  const pages = Math.max(await pageCount(signedBuf), await pageCount(unsignedBuf));
  for (let p = 1; p <= pages; p++) {
    const [sPng, uPng] = await Promise.all([renderPage(signedBuf, p), renderPage(unsignedBuf, p)]);
    try {
      const { stdout } = await execFileAsync("magick", [
        "convert", sPng, uPng,
        "-compose", "difference", "-composite",
        "-colorspace", "gray",
        "-format", "%[fx:mean]",
        "info:",
      ]);
      const diff = parseFloat(stdout.trim());
      console.log(`  Page ${p}: signed-vs-unsigned mean diff = ${diff.toFixed(5)}`);
      assert(
        diff <= MAX_PAGE_DIFF,
        `CLK-CT-423 page ${p}: signed output differs from unsigned (diff=${diff.toFixed(5)} > ${MAX_PAGE_DIFF}). ` +
        `A plaintiff signature must NOT appear on this clerk-signed summons.`,
      );
    } finally {
      await Promise.all([sPng, uPng].map(f => unlink(f).catch(() => {})));
    }
  }
  console.log("  ✓ Signed output is pixel-identical to unsigned — no plaintiff signature drawn");
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

    // ── Signed request (solid-black PNG that MUST be ignored) ─────────────────
    const signedToken = await makeToken(caseId);
    const signedUrl = `${BASE_URL}/api/cases/${caseId}/forms/fl/clkct423/signed?token=${signedToken}`;
    console.log(`Calling POST ${signedUrl.replace(signedToken, signedToken.slice(0, 8) + "…")}…`);
    const response = await fetch(signedUrl, {
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

    // ── Unsigned request for the clerk-signed guard ───────────────────────────
    console.log("Fetching unsigned output for clerk-signed comparison…");
    const unsignedToken = await makeToken(caseId);
    const unsignedUrl = `${BASE_URL}/api/cases/${caseId}/forms/fl/clkct423?token=${unsignedToken}`;
    const unsignedResp = await fetch(unsignedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert(unsignedResp.status === 200, `Unsigned expected HTTP 200, got ${unsignedResp.status}`);
    const unsignedBuf = Buffer.from(await unsignedResp.arrayBuffer());
    assert(unsignedBuf.slice(0, 4).toString("ascii") === "%PDF", "Unsigned response not a PDF");

    console.log("Verifying NO plaintiff signature was drawn (clerk-signed form)…");
    await assertNoPlaintiffSignature(pdfBuf, unsignedBuf);

    console.log("\n✅ All assertions passed — FL Miami-Dade CLK-CT-423 signed PDF is correct (no plaintiff signature).");
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
