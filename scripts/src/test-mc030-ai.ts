/**
 * Integration test: MC-030 Declaration — AI code path (no pre-supplied text)
 *
 * ⚠️  This test calls the OpenAI API and WILL incur API costs.
 *     It is intentionally excluded from the default CI run.
 *
 * Run manually with:
 *   pnpm --filter @workspace/scripts run test:mc030-ai
 *
 * What this tests:
 *   1. POST /api/cases/:id/forms/mc030              — basic variant, AI-generated declaration
 *   2. POST /api/cases/:id/forms/mc030-with-exhibits — with-exhibits variant, AI-generated declaration
 *
 *   Both variants omit declarationTitle and declarationText from the request body,
 *   forcing the live generateMC030Declaration() OpenAI path to run.
 *
 *   All variants must return:
 *     - HTTP 200
 *     - Content-Type: application/pdf
 *     - Body > 1 KB
 *     - Valid PDF magic bytes (%PDF)
 *
 *   Text-layer quality assertions (requires pdftotext):
 *     - Plaintiff name appears in the generated declaration
 *     - Defendant name appears in the generated declaration
 *     - A dollar amount (e.g. "$500") appears in the generated declaration
 *
 *   Auth is bypassed by inserting a short-lived download token directly into the
 *   database for each request (identical pattern to test-mc030.ts).
 *
 *   The exhibit document uses in-DB fileData (base64 PNG) so no GCS call is needed.
 *
 *   Cleanup: test case is deleted (cascade removes documents + tokens) on exit.
 */

import { db, casesTable, documentsTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_USER_ID = "test-mc030-ai-e2e";
const BASE_URL     = process.env.API_BASE_URL ?? "http://localhost:80";

const PLAINTIFF_NAME = "Maria Reyes";
const DEFENDANT_NAME = "Sunset Auto Repair Inc";
const CLAIM_AMOUNT   = 750;

/**
 * Minimal 1×1 transparent PNG — valid for pdf-lib embedPng and exhibit embedding.
 * Used as the exhibit document image.
 */
const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

/** Extract plain text from PDF bytes using pdftotext. Returns "" on failure. */
async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `mc030-ai-test-${Date.now()}.pdf`);
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
 * Create a single-use download token for (caseId, TEST_USER_ID) that expires
 * in 10 minutes (extra headroom for OpenAI latency).
 */
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

/**
 * Call one MC-030 endpoint and return { status, headers, pdfBuf }.
 * Uses a fresh single-use token each time (tokens are single-use).
 */
async function callEndpoint(
  method: "GET" | "POST",
  path: string,
  caseId: number,
  body?: Record<string, unknown>
): Promise<{ status: number; headers: Headers; pdfBuf: Buffer }> {
  const token = await makeToken(caseId);
  const url    = `${BASE_URL}${path}?token=${token}`;
  const fetchOpts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  const response = await fetch(url, fetchOpts);
  const pdfBuf   = Buffer.from(await response.arrayBuffer());
  return { status: response.status, headers: response.headers, pdfBuf };
}

/**
 * Assert the common PDF response guarantees all variants must meet.
 */
function assertValidPdfResponse(
  label: string,
  status: number,
  headers: Headers,
  pdfBuf: Buffer
): void {
  assert(
    status === 200,
    `[${label}] Expected HTTP 200, got ${status} — body: ${pdfBuf.slice(0, 400).toString()}`
  );
  console.log(`  ✓ HTTP 200`);

  const ct = headers.get("content-type") ?? "";
  assert(ct.includes("application/pdf"), `[${label}] Expected application/pdf, got "${ct}"`);
  console.log(`  ✓ Content-Type: ${ct}`);

  assert(pdfBuf.length > 1024, `[${label}] PDF body too small (${pdfBuf.length} bytes)`);
  console.log(`  ✓ Body size: ${pdfBuf.length.toLocaleString()} bytes`);

  assert(
    pdfBuf.slice(0, 4).toString("ascii") === "%PDF",
    `[${label}] Response does not start with %PDF magic bytes`
  );
  console.log(`  ✓ Valid PDF magic bytes (%PDF)`);
}

/**
 * Assert that the AI-generated text layer contains the required content signals.
 * Checks for plaintiff name, defendant name, and a dollar amount.
 */
function assertDeclarationQuality(label: string, text: string): void {
  assert(
    text.includes(PLAINTIFF_NAME),
    `[${label}] Plaintiff name "${PLAINTIFF_NAME}" not found in AI-generated PDF text layer`
  );
  console.log(`  ✓ Plaintiff name "${PLAINTIFF_NAME}" found in text layer`);

  assert(
    text.includes(DEFENDANT_NAME),
    `[${label}] Defendant name "${DEFENDANT_NAME}" not found in AI-generated PDF text layer`
  );
  console.log(`  ✓ Defendant name "${DEFENDANT_NAME}" found in text layer`);

  const dollarPattern = /\$\d+/;
  assert(
    dollarPattern.test(text),
    `[${label}] No dollar amount (e.g. "$750") found in AI-generated PDF text layer`
  );
  const dollarMatch = text.match(dollarPattern)?.[0] ?? "";
  console.log(`  ✓ Dollar amount found in text layer: ${dollarMatch}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  let caseId: number | null = null;

  try {
    // ── 1. Insert test case ──────────────────────────────────────────────────
    console.log("Creating test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId:            TEST_USER_ID,
      title:             "MC-030 AI Integration Test Case (auto-cleanup)",
      status:            "draft",
      plaintiffName:     PLAINTIFF_NAME,
      plaintiffAddress:  "456 Oak Ave",
      plaintiffCity:     "San Jose",
      plaintiffState:    "CA",
      plaintiffZip:      "95101",
      plaintiffPhone:    "408-555-0199",
      plaintiffEmail:    "maria@example.com",
      defendantName:     DEFENDANT_NAME,
      claimAmount:       CLAIM_AMOUNT,
      claimDescription:  "Defendant charged $750 for repairs that were never performed on my vehicle.",
      incidentDate:      "2025-03-15",
      countyId:          "santa-clara",
      courthouseName:    "Hall of Justice",
      courthouseAddress: "191 N First St",
      courthouseCity:    "San Jose",
      courthouseZip:     "95113",
      caseNumber:        "25SC00999",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    // ── 2. Insert one exhibit document (PNG stored as base64 fileData) ───────
    console.log("Creating exhibit document in database…");
    const [insertedDoc] = await db.insert(documentsTable).values({
      caseId,
      filename:     "repair-invoice.png",
      originalName: "Repair Invoice",
      description:  "Repair invoice",
      mimeType:     "image/png",
      fileSize:     Buffer.from(MINIMAL_PNG_BASE64, "base64").length,
      fileData:     MINIMAL_PNG_BASE64,
      ocrStatus:    "done",
    }).returning({ id: documentsTable.id });

    const docId = insertedDoc.id;
    console.log(`  Document ID: ${docId}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Variant 1 — Basic, no pre-supplied text → AI generates declaration
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Variant 1: Basic (AI-generated, no pre-supplied text) ───────────────────");
    console.log("  Calling OpenAI… (this may take a few seconds)");

    const { status: s1, headers: h1, pdfBuf: pdf1 } = await callEndpoint(
      "POST",
      `/api/cases/${caseId}/forms/mc030`,
      caseId,
      {}
    );
    assertValidPdfResponse("basic-ai", s1, h1, pdf1);

    const cd1 = h1.get("content-disposition") ?? "";
    assert(
      cd1.includes("MC030-Case"),
      `[basic-ai] Expected filename to contain "MC030-Case", got "${cd1}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd1}`);

    console.log("  Extracting PDF text layer…");
    const text1 = await extractPdfText(pdf1);
    if (text1) {
      assertDeclarationQuality("basic-ai", text1);
    } else {
      console.warn("  ⚠ Text extraction unavailable — quality assertions skipped for basic variant");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Variant 2 — With-exhibits, no pre-supplied text → AI generates declaration
    //              and determines exhibit ordering
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Variant 2: With-exhibits (AI-generated, no pre-supplied text) ───────────");
    console.log("  Calling OpenAI… (this may take a few seconds)");

    const { status: s2, headers: h2, pdfBuf: pdf2 } = await callEndpoint(
      "POST",
      `/api/cases/${caseId}/forms/mc030-with-exhibits`,
      caseId,
      {
        exhibitDocIds: [docId],
      }
    );
    assertValidPdfResponse("with-exhibits-ai", s2, h2, pdf2);

    const cd2 = h2.get("content-disposition") ?? "";
    assert(
      cd2.includes("MC030-Filing-Packet"),
      `[with-exhibits-ai] Expected filename to contain "MC030-Filing-Packet", got "${cd2}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd2}`);

    // Packet must be larger than the basic PDF (extra exhibit page appended)
    assert(
      pdf2.length > pdf1.length,
      `[with-exhibits-ai] Expected packet (${pdf2.length} bytes) to be larger than basic (${pdf1.length} bytes)`
    );
    console.log(`  ✓ Packet size (${pdf2.length.toLocaleString()} bytes) > basic (${pdf1.length.toLocaleString()} bytes)`);

    console.log("  Extracting PDF text layer…");
    const text2 = await extractPdfText(pdf2);
    if (text2) {
      assertDeclarationQuality("with-exhibits-ai", text2);
    } else {
      console.warn("  ⚠ Text extraction unavailable — quality assertions skipped for with-exhibits variant");
    }

    console.log("\n✅ All assertions passed — MC-030 AI declaration path generates valid, quality PDFs.");

  } finally {
    if (caseId !== null) {
      console.log(`\nCleaning up: deleting test case ${caseId} (cascade removes documents)…`);
      await db.delete(casesTable).where(eq(casesTable.id, caseId));
      console.log("  Done.");
    }
  }
}

run().catch((err) => {
  console.error("\n❌ Test failed:", err.message ?? err);
  process.exit(1);
});
