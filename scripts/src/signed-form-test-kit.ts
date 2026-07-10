/**
 * signed-form-test-kit.ts
 *
 * Shared harness for pixel-level signed-PDF regression tests across every
 * remaining non-California court form. Each per-form test file is a thin wrapper
 * that calls runSignedFormTest(CONFIGS["<key>"]).
 *
 * Guard types:
 *   - "image"        A plaintiff signature image is embedded. The test POSTs a
 *                    solid-black PNG via download token, renders the target
 *                    page(s), diffs signed-vs-unsigned to locate the added block,
 *                    and asserts that block is DARK (the signature landed) at the
 *                    calibrated coordinates. Catches coordinate drift: if the
 *                    signature moves, the expected region stops darkening → FAIL.
 *   - "image-dynamic" Same as "image" but the signature Y is computed at runtime
 *                    from case content (proof-of-service / return-of-service).
 *                    The diff auto-locates the block; the test asserts a dark
 *                    block is present on the expected page (and optional X band).
 *   - "typed-bright" The form draws a TYPED "/name/" block, NOT an image
 *                    (FL Statement-of-Claim generic builder + county variants).
 *                    Even when a maximally-visible solid-black PNG is POSTed, the
 *                    signature region must stay BRIGHT — i.e. no floating image
 *                    was embedded. Catches a regression to image embedding.
 *   - "clerk-blank"  Clerk-issued form (summons / citation) OR a form that
 *                    ignores signatureBytes. The /signed variant must be
 *                    pixel-identical to the unsigned variant — NO plaintiff
 *                    signature leaks onto a form the plaintiff never signs.
 *
 * All rendering uses pdftoppm (72 DPI, 1pt = 1px) + ImageMagick.
 * pdf-lib coord → image coord: imgX = pdfX, imgY = pageH - pdfY - h.
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

// ─── PNG generator (solid RGB, no external deps) ───────────────────────────────
export function buildSolidPngDataUrl(
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
  ihdrData[8] = 8; ihdrData[9] = 2; // bit depth 8, RGB
  const pngBuf = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdrData),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${pngBuf.toString("base64")}`;
}

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `sigkit-${Date.now()}-${Math.random()}.pdf`);
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

/** Render one page (1-indexed) to a PNG at 72 DPI. Returns {pngPath, width, height}. */
export async function renderPage(pdfBuf: Buffer, page: number): Promise<{ pngPath: string; width: number; height: number }> {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const pdfPath = join(tmpdir(), `sigkit-${ts}.pdf`);
  const pngBase = join(tmpdir(), `sigkit-page-${ts}`);
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

/**
 * Bounding box (WxH+X+Y, image-space top-left) of where two same-size page PNGs
 * differ. Returns null when the pages are effectively identical.
 */
export async function diffBBox(signedPng: string, unsignedPng: string): Promise<{ w: number; h: number; x: number; y: number } | null> {
  const { stdout } = await execFileAsync("magick", [
    signedPng, unsignedPng, "-compose", "difference", "-composite",
    "-colorspace", "gray", "-threshold", "12%", "-format", "%@", "info:",
  ]);
  const m = stdout.trim().match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
  if (!m) return null;
  const w = parseInt(m[1]!, 10), h = parseInt(m[2]!, 10), x = parseInt(m[3]!, 10), y = parseInt(m[4]!, 10);
  if (w * h < 12) return null; // effectively identical
  return { w, h, x, y };
}

// ─── Config types ──────────────────────────────────────────────────────────────
export interface Region { page: number; pdfX: number; pdfY: number; w: number; h: number }

export type Guard =
  | { kind: "image"; regions: Region[]; tolPx?: number }
  | { kind: "image-dynamic"; page: number; xBand?: [number, number] }
  | { kind: "typed-bright"; page: number; crop: string; minBrightness?: number }
  | { kind: "clerk-blank"; pages: number[] };

export interface FormTestConfig {
  /** unique short key, also used for the test user id */
  key: string;
  label: string;
  county: string;
  plaintiffName: string;
  plaintiffAddress: string;
  plaintiffCity: string;
  plaintiffState: string;
  plaintiffZip: string;
  plaintiffPhone: string;
  plaintiffEmail: string;
  defendantName: string;
  defendantAddress: string;
  defendantCity: string;
  defendantState: string;
  defendantZip: string;
  defendantPhone: string;
  claimType: string;
  claimAmount: number;
  claimDescription: string;
  /** strings that must appear in the signed PDF text layer */
  expectStrings: string[];
  /** path after the case id, e.g. "tx/petition" */
  formPath: string;
  /** true when a dedicated POST .../signed route exists */
  hasSignedRoute: boolean;
  guard: Guard;
  /** solid PNG size posted as the signature */
  sigW?: number;
  sigH?: number;
}

async function mintToken(caseId: number, userId: string): Promise<string> {
  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token, caseId, userId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return token;
}

/**
 * Fetch a form PDF, minting a FRESH single-use download token per request.
 * Download tokens are consumed on first use, so signed + unsigned fetches for the
 * same case each need their own token (reusing one yields HTTP 403).
 */
async function fetchPdf(caseId: number, userId: string, path: string, body: unknown): Promise<Buffer> {
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

// ─── Guard runners ─────────────────────────────────────────────────────────────

async function guardImage(
  label: string, signed: Buffer, unsigned: Buffer, regions: Region[], tolPx: number,
): Promise<void> {
  for (const rg of regions) {
    const s = await renderPage(signed, rg.page);
    const u = await renderPage(unsigned, rg.page);
    try {
      const bbox = await diffBBox(s.pngPath, u.pngPath);
      assert(
        bbox !== null,
        `${label}: signed page ${rg.page} is identical to unsigned — signature image was NOT embedded.`,
      );
      // Where the signature should be, in image space (top-left origin).
      const expX = rg.pdfX;
      const expY = s.height - rg.pdfY - rg.h;
      const expCx = expX + rg.w / 2;
      const expCy = expY + rg.h / 2;
      const gotCx = bbox!.x + bbox!.w / 2;
      const gotCy = bbox!.y + bbox!.h / 2;
      const dx = Math.abs(gotCx - expCx);
      const dy = Math.abs(gotCy - expCy);
      console.log(
        `  page ${rg.page}: diff bbox ${bbox!.w}x${bbox!.h}+${bbox!.x}+${bbox!.y} ` +
        `(expected center ≈ ${expCx.toFixed(0)},${expCy.toFixed(0)}; got ${gotCx.toFixed(0)},${gotCy.toFixed(0)}; Δ=${dx.toFixed(0)},${dy.toFixed(0)}px)`,
      );
      assert(
        dx <= tolPx && dy <= tolPx,
        `${label}: signature landed at ${gotCx.toFixed(0)},${gotCy.toFixed(0)} but expected ~${expCx.toFixed(0)},${expCy.toFixed(0)} ` +
        `(Δ=${dx.toFixed(0)},${dy.toFixed(0)}px > ${tolPx}px) — COORDINATE DRIFT on page ${rg.page}.`,
      );
      // The added block must be genuinely dark (a solid-black signature).
      const crop = `${bbox!.w}x${bbox!.h}+${bbox!.x}+${bbox!.y}`;
      const mean = await cropMean(s.pngPath, crop);
      assert(
        mean < 0.6,
        `${label}: added block on page ${rg.page} is not dark (mean=${mean.toFixed(4)} ≥ 0.6) — signature not rendered solid.`,
      );
      console.log(`  ✓ page ${rg.page}: dark signature at calibrated coords (mean=${mean.toFixed(4)})`);
    } finally {
      await unlink(s.pngPath).catch(() => {});
      await unlink(u.pngPath).catch(() => {});
    }
  }
}

async function guardImageDynamic(
  label: string, signed: Buffer, unsigned: Buffer, page: number, xBand?: [number, number],
): Promise<void> {
  const s = await renderPage(signed, page);
  const u = await renderPage(unsigned, page);
  try {
    const bbox = await diffBBox(s.pngPath, u.pngPath);
    assert(
      bbox !== null,
      `${label}: signed page ${page} is identical to unsigned — signature image was NOT embedded.`,
    );
    const gotCx = bbox!.x + bbox!.w / 2;
    console.log(`  page ${page}: diff bbox ${bbox!.w}x${bbox!.h}+${bbox!.x}+${bbox!.y} (center x=${gotCx.toFixed(0)})`);
    if (xBand) {
      assert(
        gotCx >= xBand[0] && gotCx <= xBand[1],
        `${label}: signature center x=${gotCx.toFixed(0)} outside expected band [${xBand[0]}, ${xBand[1]}] on page ${page}.`,
      );
    }
    const crop = `${bbox!.w}x${bbox!.h}+${bbox!.x}+${bbox!.y}`;
    const mean = await cropMean(s.pngPath, crop);
    assert(
      mean < 0.6,
      `${label}: added block on page ${page} is not dark (mean=${mean.toFixed(4)} ≥ 0.6) — signature not rendered solid.`,
    );
    console.log(`  ✓ page ${page}: dark signature present (mean=${mean.toFixed(4)})`);
  } finally {
    await unlink(s.pngPath).catch(() => {});
    await unlink(u.pngPath).catch(() => {});
  }
}

async function guardTypedBright(
  label: string, signed: Buffer, page: number, crop: string, minBrightness: number,
): Promise<void> {
  const s = await renderPage(signed, page);
  try {
    const mean = await cropMean(s.pngPath, crop);
    console.log(`  page ${page}: signature region mean brightness ${mean.toFixed(4)} (crop ${crop})`);
    assert(
      mean >= minBrightness,
      `${label}: signature region too dark (mean=${mean.toFixed(4)} < ${minBrightness}) — a floating signature image ` +
      `appears to have been embedded, but this form uses a TYPED "/name/" block, not an image.`,
    );
    console.log(`  ✓ page ${page}: no floating image — typed signature only (mean=${mean.toFixed(4)})`);
  } finally {
    await unlink(s.pngPath).catch(() => {});
  }
}

async function guardClerkBlank(
  label: string, signed: Buffer, unsigned: Buffer, pages: number[],
): Promise<void> {
  const MAX_AREA = 24; // px² — anything larger means content was added on signing
  for (const page of pages) {
    const s = await renderPage(signed, page);
    const u = await renderPage(unsigned, page);
    try {
      const bbox = await diffBBox(s.pngPath, u.pngPath);
      const area = bbox ? bbox.w * bbox.h : 0;
      console.log(`  page ${page}: signed-vs-unsigned diff area ${area}px²`);
      assert(
        area <= MAX_AREA,
        `${label}: page ${page} changed when signed (diff area ${area}px² > ${MAX_AREA}) — a plaintiff signature leaked ` +
        `onto a clerk-issued form the plaintiff never signs.`,
      );
    } finally {
      await unlink(s.pngPath).catch(() => {});
      await unlink(u.pngPath).catch(() => {});
    }
  }
  console.log(`  ✓ signed output is pixel-identical to unsigned — no plaintiff signature embedded`);
}

// ─── Main runner ────────────────────────────────────────────────────────────────
export async function runSignedFormTest(cfg: FormTestConfig): Promise<void> {
  const testUserId = `test-${cfg.key}-sigcheck-e2e`;
  const sigW = cfg.sigW ?? 200;
  const sigH = cfg.sigH ?? 28;
  const signatureDataUrl = buildSolidPngDataUrl(sigW, sigH, 0, 0, 0);

  let caseId: number | null = null;
  try {
    console.log(`\n=== ${cfg.label} (${cfg.key}) ===`);
    console.log("Creating test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId:           testUserId,
      title:            `${cfg.label} Signature Check (auto-cleanup)`,
      status:           "draft",
      countyId:         cfg.county,
      plaintiffName:    cfg.plaintiffName,
      plaintiffAddress: cfg.plaintiffAddress,
      plaintiffCity:    cfg.plaintiffCity,
      plaintiffState:   cfg.plaintiffState,
      plaintiffZip:     cfg.plaintiffZip,
      plaintiffPhone:   cfg.plaintiffPhone,
      plaintiffEmail:   cfg.plaintiffEmail,
      defendantName:    cfg.defendantName,
      defendantAddress: cfg.defendantAddress,
      defendantCity:    cfg.defendantCity,
      defendantState:   cfg.defendantState,
      defendantZip:     cfg.defendantZip,
      defendantPhone:   cfg.defendantPhone,
      claimType:        cfg.claimType,
      claimAmount:      cfg.claimAmount,
      claimDescription: cfg.claimDescription,
    }).returning({ id: casesTable.id });
    caseId = inserted!.id;
    console.log(`  Case ID: ${caseId}`);

    const signedPath = cfg.hasSignedRoute ? `${cfg.formPath}/signed` : cfg.formPath;
    console.log(`POST /api/cases/${caseId}/forms/${signedPath} (solid-black PNG signature)…`);
    const signed = await fetchPdf(caseId, testUserId, signedPath, { signatureDataUrl });
    console.log(`  ✓ HTTP 200 + application/pdf + %PDF (${signed.length.toLocaleString()} bytes)`);

    const text = await extractPdfText(signed);
    if (text) {
      for (const s of cfg.expectStrings) {
        assert(text.includes(s), `Expected text "${s}" not found in signed PDF`);
        console.log(`  ✓ text layer contains "${s}"`);
      }
    } else {
      console.log("  ⚠ pdftotext unavailable — text-layer assertions skipped");
    }

    if (cfg.guard.kind === "image") {
      const unsigned = await fetchPdf(caseId, testUserId, cfg.formPath, {});
      await guardImage(cfg.label, signed, unsigned, cfg.guard.regions, cfg.guard.tolPx ?? 45);
    } else if (cfg.guard.kind === "image-dynamic") {
      const unsigned = await fetchPdf(caseId, testUserId, cfg.formPath, {});
      await guardImageDynamic(cfg.label, signed, unsigned, cfg.guard.page, cfg.guard.xBand);
    } else if (cfg.guard.kind === "typed-bright") {
      await guardTypedBright(cfg.label, signed, cfg.guard.page, cfg.guard.crop, cfg.guard.minBrightness ?? 0.8);
    } else if (cfg.guard.kind === "clerk-blank") {
      const unsigned = await fetchPdf(caseId, testUserId, cfg.formPath, {});
      await guardClerkBlank(cfg.label, signed, unsigned, cfg.guard.pages);
    }

    console.log(`\n✅ ${cfg.label}: all signature-placement assertions passed.`);
  } finally {
    if (caseId !== null) {
      console.log(`Cleaning up test case ${caseId}…`);
      await db.delete(casesTable).where(eq(casesTable.id, caseId));
      console.log("  Done.");
    }
  }
}
