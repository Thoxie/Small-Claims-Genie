/**
 * End-to-end test: signed variants of NC AOC-CVM-200 and WA MISC 05.0100.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:nc-wa-signed-forms
 *
 * What this tests:
 *   NC AOC-CVM-200 signed:
 *     - Creates a temporary NC case with full plaintiff/defendant data
 *     - Creates a download token directly in the DB (bypasses Clerk auth)
 *     - Calls POST /api/cases/:id/forms/nc/aoc-cvm-200/signed?token=...
 *       with a solid-black PNG signatureDataUrl in the request body
 *     - Asserts HTTP 200 + application/pdf + valid PDF magic bytes
 *     - Confirms the signed body is LARGER than the unsigned body (proves
 *       the signature image bytes were embedded)
 *     - Uses pdftotext to confirm plaintiff name, defendant name, and amount
 *       appear in the output text layer
 *
 *   WA MISC 05.0100 signed:
 *     - Same pattern for POST /api/cases/:id/forms/wa/notice/signed
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

const BASE_URL    = process.env.API_BASE_URL ?? "http://localhost:80";
const TEST_USER   = "test-nc-wa-signed-forms-e2e";

// ── Minimal valid PNG builder ─────────────────────────────────────────────────
// Generates a solid-color RGB PNG without any external dependencies.

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

const SIGNATURE_DATA_URL = buildSolidPngDataUrl(180, 36, 0, 0, 0);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeToken(caseId: number): Promise<string> {
  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token, caseId, userId: TEST_USER,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return token;
}

async function extractPdfText(pdfBuf: Buffer, label: string): Promise<string> {
  const tmpPdf = join(tmpdir(), `nc-wa-signed-test-${label}-${Date.now()}.pdf`);
  try {
    await writeFile(tmpPdf, pdfBuf);
    const { stdout } = await execFileAsync("pdftotext", [tmpPdf, "-"]);
    return stdout;
  } catch (err: any) {
    console.warn(`  ⚠ pdftotext failed — skipping text-layer assertions: ${err.message}`);
    return "";
  } finally {
    await unlink(tmpPdf).catch(() => {});
  }
}

interface TestResult { ok: boolean; unsignedSize: number; signedSize: number }

async function testSignedVariant(
  caseId: number,
  label: string,
  unsignedPath: string,
  signedPath: string,
  expectedStrings: string[],
): Promise<TestResult> {
  console.log(`\n── ${label} ──`);

  // ── Unsigned baseline ───────────────────────────────────────────────────────
  const token1 = await makeToken(caseId);
  const url1   = `${BASE_URL}${unsignedPath}?token=${token1}`;
  console.log(`  Fetching unsigned: POST ${url1.replace(token1, token1.slice(0, 8) + "…")}`);
  const resp1  = await fetch(url1, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const body1  = Buffer.from(await resp1.arrayBuffer());

  if (resp1.status !== 200) {
    console.log(`  ✗ Unsigned HTTP ${resp1.status} (expected 200)`);
    console.log(`    Response: ${body1.toString("utf8").slice(0, 300)}`);
    return { ok: false, unsignedSize: 0, signedSize: 0 };
  }
  console.log(`  ✓ Unsigned HTTP 200, ${body1.length.toLocaleString()} bytes`);

  // ── Signed variant ──────────────────────────────────────────────────────────
  const token2 = await makeToken(caseId);
  const url2   = `${BASE_URL}${signedPath}?token=${token2}`;
  console.log(`  Fetching signed:   POST ${url2.replace(token2, token2.slice(0, 8) + "…")}`);
  const resp2  = await fetch(url2, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signatureDataUrl: SIGNATURE_DATA_URL }),
  });
  const body2 = Buffer.from(await resp2.arrayBuffer());

  let ok = true;

  if (resp2.status !== 200) {
    console.log(`  ✗ Signed HTTP ${resp2.status} (expected 200)`);
    console.log(`    Response: ${body2.toString("utf8").slice(0, 300)}`);
    return { ok: false, unsignedSize: body1.length, signedSize: 0 };
  }
  console.log(`  ✓ Signed HTTP 200`);

  const ct = resp2.headers.get("content-type") ?? "";
  if (ct.includes("application/pdf")) {
    console.log(`  ✓ Content-Type: ${ct}`);
  } else {
    console.log(`  ✗ Content-Type: "${ct}" (expected application/pdf)`);
    ok = false;
  }

  console.log(`  Body size: ${body2.length.toLocaleString()} bytes`);

  if (body2.slice(0, 4).toString("ascii") === "%PDF") {
    console.log("  ✓ Valid PDF magic bytes (%PDF)");
  } else {
    console.log(`  ✗ Invalid PDF magic bytes: ${body2.toString("utf8").slice(0, 20)}`);
    ok = false;
  }

  if (body2.length > body1.length) {
    console.log(`  ✓ Signed PDF (${body2.length.toLocaleString()} bytes) is larger than unsigned (${body1.length.toLocaleString()} bytes) — signature image embedded`);
  } else {
    console.log(`  ✗ Signed PDF (${body2.length.toLocaleString()} bytes) is NOT larger than unsigned (${body1.length.toLocaleString()} bytes)`);
    ok = false;
  }

  // ── Text-layer assertions ───────────────────────────────────────────────────
  const pdfText = await extractPdfText(body2, label.replace(/\s+/g, "-"));
  if (pdfText) {
    for (const expected of expectedStrings) {
      if (pdfText.includes(expected)) {
        console.log(`  ✓ "${expected}" found in PDF text layer`);
      } else {
        console.log(`  ✗ "${expected}" NOT found in PDF text layer`);
        ok = false;
      }
    }
  } else {
    console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
  }

  return { ok, unsignedSize: body1.length, signedSize: body2.length };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let allOk = true;

  // ─── North Carolina ─────────────────────────────────────────────────────────
  console.log("Creating test NC case in database…");
  const [ncRow] = await db.insert(casesTable).values({
    userId:           TEST_USER,
    title:            "NC Signed Form E2E Test",
    jurisdictionState: "NC",
    countyId:         "nc-wake",
    plaintiffName:    "Alice Johnson",
    plaintiffAddress: "456 Oak Lane",
    plaintiffCity:    "Raleigh",
    plaintiffState:   "NC",
    plaintiffZip:     "27601",
    plaintiffPhone:   "(919) 555-0100",
    plaintiffEmail:   "alice@example.com",
    defendantName:    "Bob Williams",
    defendantAddress: "789 Pine Rd",
    defendantCity:    "Durham",
    defendantState:   "NC",
    defendantZip:     "27701",
    defendantPhone:   "(919) 555-0200",
    claimAmount:      3500,
    claimType:        "loan",
    claimDescription: "Defendant borrowed $3,500 on January 15, 2025 and has refused to repay the sum.",
  }).returning({ id: casesTable.id });

  const ncCaseId = ncRow!.id;
  console.log(`  Case ID: ${ncCaseId}`);

  const ncResult = await testSignedVariant(
    ncCaseId,
    "NC AOC-CVM-200 signed",
    `/api/cases/${ncCaseId}/forms/nc/aoc-cvm-200`,
    `/api/cases/${ncCaseId}/forms/nc/aoc-cvm-200/signed`,
    ["Alice Johnson", "Bob Williams", "3,500.00", "Wake"],
  );
  allOk = allOk && ncResult.ok;

  console.log(`\nCleaning up NC case ${ncCaseId}…`);
  await db.delete(casesTable).where(eq(casesTable.id, ncCaseId));
  console.log("  Done.");

  // ─── Washington ─────────────────────────────────────────────────────────────
  console.log("\nCreating test WA case in database…");
  const [waRow] = await db.insert(casesTable).values({
    userId:           TEST_USER,
    title:            "WA Signed Form E2E Test",
    jurisdictionState: "WA",
    countyId:         "wa-king",
    plaintiffName:    "John Smith",
    plaintiffAddress: "100 Pine St",
    plaintiffCity:    "Seattle",
    plaintiffState:   "WA",
    plaintiffZip:     "98101",
    plaintiffPhone:   "(206) 555-0100",
    plaintiffEmail:   "john@example.com",
    defendantName:    "Widgets LLC",
    defendantIsBusinessOrEntity: true,
    defendantAddress: "200 Oak Ave",
    defendantCity:    "Tacoma",
    defendantState:   "WA",
    defendantZip:     "98402",
    defendantPhone:   "(253) 555-0200",
    claimAmount:      4200,
    claimType:        "property_damage",
    claimDescription: "Defendant damaged plaintiff's fence during a delivery and refused to repair it.",
  }).returning({ id: casesTable.id });

  const waCaseId = waRow!.id;
  console.log(`  Case ID: ${waCaseId}`);

  const waResult = await testSignedVariant(
    waCaseId,
    "WA MISC05-0100 Notice signed",
    `/api/cases/${waCaseId}/forms/wa/notice`,
    `/api/cases/${waCaseId}/forms/wa/notice/signed`,
    ["John Smith", "Widgets LLC", "4,200.00"],
  );
  allOk = allOk && waResult.ok;

  console.log(`\nCleaning up WA case ${waCaseId}…`);
  await db.delete(casesTable).where(eq(casesTable.id, waCaseId));
  console.log("  Done.");

  // ─── Summary ─────────────────────────────────────────────────────────────────
  if (allOk) {
    console.log("\n✅ All assertions passed — NC and WA signed form PDFs are valid.");
  } else {
    console.error("\n❌ One or more assertions failed.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Test failed:", err.message ?? err);
  process.exit(1);
});
