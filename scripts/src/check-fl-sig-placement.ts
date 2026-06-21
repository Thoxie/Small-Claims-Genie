/**
 * Visual signature placement check for 4 FL pdftk-based forms.
 *
 * Generates each form via the /signed endpoint with a sample PNG signature,
 * saves the PDFs to /tmp/fl-sig-check/, and converts the signature page to PNG
 * for visual inspection.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run check:fl-sig-placement
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readdir, readFile } from "fs/promises";
import { mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";
const OUT_DIR  = "/tmp/fl-sig-check";
mkdirSync(OUT_DIR, { recursive: true });

const TEST_USER_ID = "check-fl-sig-placement-visual";

// ── Build a simple test signature PNG ────────────────────────────────────────
// A 200×50 RGBA PNG with a dark hand-writing-style stroke and a red bottom
// border line so we can clearly see where the image baseline sits.
function buildSigPng(): string {
  // We use the pre-generated base64 from /tmp/fl-sig-check/sig.b64 if available,
  // otherwise fall back to a minimal valid PNG.
  try {
    const { readFileSync } = require("fs") as typeof import("fs");
    const b64file = "/tmp/fl-sig-check/sig.b64";
    const b64 = readFileSync(b64file, "utf8").trim();
    return `data:image/png;base64,${b64}`;
  } catch {
    // Minimal 1×1 transparent PNG
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeToken(caseId: number): Promise<string> {
  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token,
    caseId,
    userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return token;
}

async function toPngPage(label: string, pdfBuf: Buffer, pageNum: number): Promise<string | null> {
  const pdfPath = join(OUT_DIR, `${label}.pdf`);
  await writeFile(pdfPath, pdfBuf);
  const pngBase = join(OUT_DIR, label);
  try {
    await execFileAsync("pdftoppm", [
      "-r", "150",
      "-f", String(pageNum),
      "-l", String(pageNum),
      "-png",
      pdfPath,
      pngBase,
    ]);
    const files = await readdir(OUT_DIR);
    const pngs = files.filter(f => f.startsWith(label) && f.endsWith(".png")).sort();
    return pngs.length > 0 ? join(OUT_DIR, pngs[pngs.length - 1]!) : null;
  } catch (e) {
    console.warn(`  ⚠ pdftoppm failed for ${label}:`, e);
    return null;
  }
}

interface FormCheck {
  label: string;
  countyId: string;
  endpoint: string;
  signatePage: number; // 1-indexed for pdftoppm
  /** Current sig coords from the definition — used only for logging */
  coords: { x: number; y: number; w: number; h: number };
  caseOverrides?: Record<string, unknown>;
}

const FORMS: FormCheck[] = [
  {
    label: "CLK-CT-333",
    countyId: "fl-miami-dade",
    endpoint: "/forms/fl/clkct333/signed",
    signatePage: 1,
    coords: { x: 323, y: 235, w: 130, h: 36 },
  },
  {
    label: "CL-219-VOLUSIA",
    countyId: "fl-volusia",
    endpoint: "/forms/fl/cl219-volusia-pdf/signed",
    signatePage: 1,
    // h reduced from 28 → 20 after visual check on 2026-06-21 (was overlapping printed name area)
    coords: { x: 342, y: 120, w: 180, h: 20 },
  },
  {
    label: "PLAIN-SOC-ORANGE",
    countyId: "fl-orange",
    endpoint: "/forms/fl/plain-soc-orange/signed",
    signatePage: 1,
    coords: { x: 378, y: 68, w: 150, h: 28 },
  },
  {
    label: "SOC-HILLSBOROUGH",
    countyId: "fl-hillsborough",
    endpoint: "/forms/fl/soc-hillsborough/signed",
    signatePage: 2, // signature is on page 2
    coords: { x: 346, y: 582, w: 180, h: 36 },
  },
];

async function checkForm(f: FormCheck, sigDataUrl: string): Promise<void> {
  console.log(`\n── ${f.label} ─────────────────────────────────────────────`);
  console.log(`   Coords: x=${f.coords.x}, y=${f.coords.y}, w=${f.coords.w}, h=${f.coords.h}`);
  console.log(`   Signature page: ${f.signatePage}`);

  let caseId: number | null = null;
  try {
    // 1. Create test case
    const [row] = await db.insert(casesTable).values({
      userId:           TEST_USER_ID,
      title:            `${f.label} sig check (auto-cleanup)`,
      status:           "draft",
      countyId:         f.countyId,
      plaintiffName:    "Jane Doe",
      plaintiffAddress: "123 Main St",
      plaintiffCity:    "Miami",
      plaintiffState:   "FL",
      plaintiffZip:     "33101",
      plaintiffPhone:   "305-555-0100",
      plaintiffEmail:   "jane@example.com",
      defendantName:    "Acme Corp",
      defendantAddress: "456 Commerce Blvd",
      defendantCity:    "Miami",
      defendantState:   "FL",
      defendantZip:     "33102",
      defendantPhone:   "305-555-0200",
      claimType:        "goods",
      claimAmount:      2500,
      claimDescription: "Defendant failed to deliver goods ordered and paid for on 2024-01-15. Despite repeated requests for either delivery or refund, Defendant has not responded.",
      ...f.caseOverrides,
    }).returning({ id: casesTable.id });
    caseId = row.id;
    console.log(`   Case ID: ${caseId}`);

    // 2. Token
    const token = await makeToken(caseId);

    // 3. Call the signed endpoint
    const url = `${BASE_URL}/api/cases/${caseId}${f.endpoint}?token=${token}`;
    const resp = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ signatureDataUrl: sigDataUrl }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`   ✗ HTTP ${resp.status} — ${body.slice(0, 200)}`);
      return;
    }

    const pdfBuf = Buffer.from(await resp.arrayBuffer());
    console.log(`   ✓ HTTP 200 — PDF ${pdfBuf.length.toLocaleString()} bytes`);

    // 4. Convert to PNG for visual inspection
    const pngPath = await toPngPage(f.label, pdfBuf, f.signatePage);
    if (pngPath) {
      console.log(`   ✓ PNG saved: ${pngPath}`);
    }

  } finally {
    if (caseId !== null) {
      await db.delete(casesTable).where(eq(casesTable.id, caseId)).catch(() => {});
    }
  }
}

async function main(): Promise<void> {
  console.log("FL Signature Placement Visual Check");
  console.log("====================================");
  console.log(`Output: ${OUT_DIR}`);

  const sigDataUrl = buildSigPng();
  console.log(`Signature data URL length: ${sigDataUrl.length} chars`);

  for (const form of FORMS) {
    await checkForm(form, sigDataUrl);
  }

  const files = await readdir(OUT_DIR);
  const pngs = files.filter(f => f.endsWith(".png")).sort();
  console.log(`\n✓ Done. ${pngs.length} PNG(s) in ${OUT_DIR}:`);
  pngs.forEach(f => console.log(`    ${join(OUT_DIR, f)}`));
}

main().catch(e => { console.error("\n❌", e.message ?? e); process.exit(1); });
