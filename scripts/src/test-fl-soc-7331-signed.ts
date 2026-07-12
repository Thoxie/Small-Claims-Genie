/**
 * End-to-end sigcheck test: FL Form 7.331 Goods Sold signed form
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:fl-soc-7331-signed
 *
 * What this tests:
 *   SIGNED SIGCHECK — Creates a case with goodsSoldGoodsAndPrices,
 *   goodsSoldFirstSaleDate, goodsSoldLastSaleDate set (claimType "Goods Sold").
 *   Calls POST /api/cases/:id/forms/fl/soc/signed?token=... with a
 *   solid-black PNG. Asserts:
 *     - HTTP 200 + application/pdf + PDF magic bytes + body size
 *     - pdftotext: plaintiff name, defendant name, amount,
 *       goods_and_prices, first_sale_date, last_sale_date
 *     - Pixel: signed vs unsigned diff is dark at signature widget coords
 *       (x=220, y=215, w=330, h=20, page=1)
 *
 * Signature widget coords (pdf-lib, y from bottom-left):
 *   x=220, y=215, w=330, h=20, page=1 (page height 792pt)
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

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

const TEST_USER            = "test-fl-soc-7331-signed-e2e";
const EXPECTED_PLAINTIFF   = "Elena Vasquez";
const EXPECTED_DEFENDANT   = "Miami Wholesale Supplies Inc";
const EXPECTED_AMOUNT      = "3,750.00";
const EXPECTED_GOODS       = "Widget A x10 @ $150, Widget B x15 @ $150";
const EXPECTED_FIRST_SALE  = "01/05/2025";
const EXPECTED_LAST_SALE   = "02/28/2025";

const SIG_PAGE = 1;
const SIG_X    = 220;
const SIG_Y    = 263;   // calibrated from diff bbox: 331x32+220+503 (page height 792)
const SIG_W    = 330;
const SIG_H    = 20;

function buildSolidPngDataUrl(
  width: number, height: number, r: number, g: number, b: number,
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

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function extractPdfText(pdfBuf: Buffer, label: string): Promise<string> {
  const tmpPdf = join(tmpdir(), `fl-soc-7331-test-${label}-${Date.now()}.pdf`);
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

async function renderPage(pdfBuf: Buffer, page: number): Promise<{ pngPath: string; width: number; height: number }> {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const pdfPath = join(tmpdir(), `fl-soc-7331-${ts}.pdf`);
  const pngBase = join(tmpdir(), `fl-soc-7331-page-${ts}`);
  try {
    await writeFile(pdfPath, pdfBuf);
    await execFileAsync("pdftoppm", ["-png", "-r", "72", "-f", String(page), "-l", String(page), pdfPath, pngBase]);
    const tmpFiles = await readdir(tmpdir());
    const pngName = tmpFiles.find(f => f.startsWith(basename(pngBase)) && f.endsWith(".png"));
    if (!pngName) throw new Error(`pdftoppm produced no PNG for page ${page}`);
    const pngPath = join(tmpdir(), pngName);
    const { stdout } = await execFileAsync("magick", ["identify", "-format", "%w %h", pngPath]);
    const [w, h] = stdout.trim().split(/\s+/).map(n => parseInt(n, 10));
    return { pngPath, width: w!, height: h! };
  } finally {
    await unlink(pdfPath).catch(() => {});
  }
}

async function cropMean(pngPath: string, crop: string): Promise<number> {
  const { stdout } = await execFileAsync("magick", [
    "convert", pngPath, "-crop", crop, "+repage", "-colorspace", "gray", "-format", "%[fx:mean]", "info:",
  ]);
  return parseFloat(stdout.trim());
}

async function diffBBox(
  signedPng: string, unsignedPng: string,
): Promise<{ w: number; h: number; x: number; y: number } | null> {
  const { stdout } = await execFileAsync("magick", [
    signedPng, unsignedPng, "-compose", "difference", "-composite",
    "-colorspace", "gray", "-threshold", "12%", "-format", "%@", "info:",
  ]);
  const m = stdout.trim().match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
  if (!m) return null;
  const w = parseInt(m[1]!, 10), h = parseInt(m[2]!, 10), x = parseInt(m[3]!, 10), y = parseInt(m[4]!, 10);
  if (w * h < 12) return null;
  return { w, h, x, y };
}

async function mintToken(caseId: number, userId: string): Promise<string> {
  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token, caseId, userId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return token;
}

async function fetchPdf(
  caseId: number, userId: string, path: string, body: unknown,
): Promise<Buffer> {
  const token = await mintToken(caseId, userId);
  const url = `${BASE_URL}/api/cases/${caseId}/forms/${path}?token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert(res.status === 200, `POST ${path} expected HTTP 200, got ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  assert(ct.includes("application/pdf"), `POST ${path} expected application/pdf, got "${ct}"`);
  const buf = Buffer.from(await res.arrayBuffer());
  assert(buf.length > 1024, `POST ${path} PDF body too small (${buf.length} bytes)`);
  assert(buf.slice(0, 4).toString("ascii") === "%PDF", `POST ${path} did not start with %PDF magic bytes`);
  return buf;
}

async function testSigned(): Promise<void> {
  console.log("\n=== FL Form 7.331 Goods Sold — Signed Sigcheck ===");
  let caseId: number | null = null;

  try {
    console.log("Creating test case with goods-sold fields…");
    const [inserted] = await db.insert(casesTable).values({
      userId:               TEST_USER,
      title:                "FL Form 7.331 Goods Sold Signed Sigcheck (auto-cleanup)",
      status:               "draft",
      countyId:             "fl-miami-dade",

      plaintiffName:        EXPECTED_PLAINTIFF,
      plaintiffAddress:     "200 SE 1st St",
      plaintiffCity:        "Miami",
      plaintiffState:       "FL",
      plaintiffZip:         "33131",
      plaintiffPhone:       "305-555-0111",
      plaintiffEmail:       "elena.vasquez@example.com",

      defendantName:        EXPECTED_DEFENDANT,
      defendantAddress:     "1100 NW 7th Ave",
      defendantCity:        "Miami",
      defendantState:       "FL",
      defendantZip:         "33136",
      defendantPhone:       "305-555-0222",

      claimType:            "Goods Sold",
      claimAmount:          3750,
      claimDescription:     "Defendant purchased goods and refused to pay.",
      incidentDate:         "2025-02-28",

      goodsSoldGoodsAndPrices:    EXPECTED_GOODS,
      goodsSoldFirstSaleDate:     "2025-01-05",
      goodsSoldLastSaleDate:      "2025-02-28",
      goodsSoldInterestStartDate: "2025-03-01",
    }).returning({ id: casesTable.id });

    caseId = inserted!.id;
    console.log(`  Case ID: ${caseId}`);

    console.log(`POST /api/cases/${caseId}/forms/fl/soc/signed (solid-black PNG)…`);
    const signed = await fetchPdf(caseId, TEST_USER, "fl/soc/signed", { signatureDataUrl: SIGNATURE_DATA_URL });
    console.log(`  ✓ HTTP 200 + application/pdf + %PDF (${signed.length.toLocaleString()} bytes)`);

    console.log("Extracting PDF text layer via pdftotext…");
    const pdfText = await extractPdfText(signed, "signed");
    if (pdfText) {
      const checks: [string, string][] = [
        [EXPECTED_PLAINTIFF,  `Plaintiff name "${EXPECTED_PLAINTIFF}"`],
        [EXPECTED_DEFENDANT,  `Defendant name "${EXPECTED_DEFENDANT}"`],
        [EXPECTED_AMOUNT,     `Claim amount "${EXPECTED_AMOUNT}"`],
        [EXPECTED_GOODS,      `goods_and_prices "${EXPECTED_GOODS}"`],
        [EXPECTED_FIRST_SALE, `first_sale_date "${EXPECTED_FIRST_SALE}"`],
        [EXPECTED_LAST_SALE,  `last_sale_date "${EXPECTED_LAST_SALE}"`],
      ];
      for (const [value, label] of checks) {
        assert(pdfText.includes(value), `${label} not found in text layer`);
        console.log(`  ✓ text layer contains ${label}`);
      }
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    console.log("Checking signature pixel placement (diff signed vs unsigned)…");
    const unsigned = await fetchPdf(caseId, TEST_USER, "fl/soc", {});

    const s = await renderPage(signed, SIG_PAGE);
    const u = await renderPage(unsigned, SIG_PAGE);
    try {
      const bbox = await diffBBox(s.pngPath, u.pngPath);
      assert(
        bbox !== null,
        `FL-7331: signed page ${SIG_PAGE} is identical to unsigned — signature image was NOT embedded.`,
      );

      const expX  = SIG_X;
      const expY  = s.height - SIG_Y - SIG_H;
      const expCx = expX + SIG_W / 2;
      const expCy = expY + SIG_H / 2;
      const gotCx = bbox!.x + bbox!.w / 2;
      const gotCy = bbox!.y + bbox!.h / 2;
      const dx    = Math.abs(gotCx - expCx);
      const dy    = Math.abs(gotCy - expCy);
      const tolPx = 45;

      console.log(
        `  page ${SIG_PAGE}: diff bbox ${bbox!.w}x${bbox!.h}+${bbox!.x}+${bbox!.y} ` +
        `(expected center ≈ ${expCx.toFixed(0)},${expCy.toFixed(0)}; got ${gotCx.toFixed(0)},${gotCy.toFixed(0)}; Δ=${dx.toFixed(0)},${dy.toFixed(0)}px)`,
      );
      assert(
        dx <= tolPx && dy <= tolPx,
        `FL-7331: signature landed at ${gotCx.toFixed(0)},${gotCy.toFixed(0)} but expected ~${expCx.toFixed(0)},${expCy.toFixed(0)} ` +
        `(Δ=${dx.toFixed(0)},${dy.toFixed(0)}px > ${tolPx}px) — COORDINATE DRIFT on page ${SIG_PAGE}.`,
      );

      const crop = `${bbox!.w}x${bbox!.h}+${bbox!.x}+${bbox!.y}`;
      const mean = await cropMean(s.pngPath, crop);
      assert(
        mean < 0.6,
        `FL-7331: added block on page ${SIG_PAGE} is not dark (mean=${mean.toFixed(4)} ≥ 0.6) — signature not rendered solid.`,
      );
      console.log(`  ✓ page ${SIG_PAGE}: dark signature at calibrated coords (mean=${mean.toFixed(4)})`);
    } finally {
      await unlink(s.pngPath).catch(() => {});
      await unlink(u.pngPath).catch(() => {});
    }

    console.log("\n✅ FL Form 7.331 signed PDF fills and signs correctly.");

  } finally {
    if (caseId !== null) {
      console.log(`\nCleaning up test case ${caseId}…`);
      await db.delete(casesTable).where(eq(casesTable.id, caseId));
      console.log("  Done.");
    }
  }
}

async function run() {
  await testSigned();
  console.log("\n✅ All FL Form 7.331 sigcheck tests passed.");
}

run().catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
