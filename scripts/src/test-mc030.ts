/**
 * End-to-end test: MC-030 Declaration — all three download variants
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:mc030
 *
 * What this tests:
 *   1. POST /api/cases/:id/forms/mc030            — basic variant (no sig, no exhibits)
 *   2. POST /api/cases/:id/forms/mc030/signed     — signed variant (PNG signature embedded)
 *   3. POST /api/cases/:id/forms/mc030-with-exhibits — exhibits variant (one PNG exhibit doc)
 *
 *   All three must return:
 *     - HTTP 200
 *     - Content-Type: application/pdf
 *     - Body > 1 KB
 *     - Valid PDF magic bytes (%PDF)
 *
 *   Additionally:
 *     - Basic:          Content-Disposition filename contains "MC030-Case"
 *     - Signed:         Content-Disposition filename contains "MC030-Signed"
 *     - With-exhibits:  Content-Disposition filename contains "MC030-Filing-Packet"
 *     - Basic (text):   Plaintiff name found in PDF text layer (if pdftotext available)
 *
 *   Auth is bypassed by inserting a short-lived download token directly into the
 *   database for each request (identical pattern to test-sc103-primary.ts).
 *
 *   Pre-supplied declarationTitle + declarationText are passed in all request bodies
 *   so the test never calls OpenAI.
 *
 *   The one test document uses in-DB fileData (base64 PNG) so no GCS call is needed.
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

const TEST_USER_ID = "test-mc030-e2e";
const BASE_URL     = process.env.API_BASE_URL ?? "http://localhost:80";

// Pre-canned declaration body so tests never hit OpenAI.
const DECLARATION_TITLE = "DECLARATION OF JANE DOE";
const DECLARATION_TEXT  = [
  "1. I am the plaintiff in this action and have personal knowledge of the facts herein.",
  "2. On January 1, 2025, defendant failed to return a $500 deposit.",
  "3. I made written demand on February 1, 2025 via certified mail.",
  "4. Defendant has not responded or refunded any portion of the deposit.",
  "5. I seek judgment for $500.00.",
].join("\n");

const PLAINTIFF_NAME  = "Jane Doe";
const DEFENDANT_NAME  = "Acme Rentals LLC";

/**
 * Minimal 1×1 transparent PNG (valid for pdf-lib embedPng and exhibit embedding).
 * Used both as the signature image and the single exhibit document.
 */
const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** data: URL form used for signatureDataUrl */
const SIGNATURE_DATA_URL = `data:image/png;base64,${MINIMAL_PNG_BASE64}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

/** Extract plain text from PDF bytes using pdftotext. Returns "" on failure. */
async function extractPdfText(pdfBuf: Buffer): Promise<string> {
  const tmpPdf = join(tmpdir(), `mc030-test-${Date.now()}.pdf`);
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
 * in 5 minutes, then immediately returns the raw token string.
 */
async function makeToken(caseId: number): Promise<string> {
  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token,
    caseId,
    userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
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
 * Assert the common PDF response guarantees that all three variants must meet.
 */
function assertValidPdfResponse(
  label: string,
  status: number,
  headers: Headers,
  pdfBuf: Buffer
): void {
  assert(status === 200, `[${label}] Expected HTTP 200, got ${status} — body: ${pdfBuf.slice(0, 200).toString()}`);
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  let caseId: number | null = null;

  try {
    // ── 1. Insert test case ──────────────────────────────────────────────────
    console.log("Creating test case in database…");
    const [inserted] = await db.insert(casesTable).values({
      userId:         TEST_USER_ID,
      title:          "MC-030 E2E Test Case (auto-cleanup)",
      status:         "draft",
      plaintiffName:  PLAINTIFF_NAME,
      plaintiffAddress: "100 Main St",
      plaintiffCity:  "Los Angeles",
      plaintiffState: "CA",
      plaintiffZip:   "90001",
      plaintiffPhone: "213-555-0100",
      plaintiffEmail: "jane@example.com",
      defendantName:  DEFENDANT_NAME,
      claimAmount:    500,
      claimDescription: "Defendant failed to return security deposit after tenancy ended.",
      incidentDate:   "2025-01-01",
      countyId:       "los-angeles",
      courthouseName: "Stanley Mosk Courthouse",
      courthouseAddress: "111 N Hill St",
      courthouseCity: "Los Angeles",
      courthouseZip:  "90012",
      caseNumber:     "25SC00001",
    }).returning({ id: casesTable.id });

    caseId = inserted.id;
    console.log(`  Case ID: ${caseId}`);

    // ── 2. Insert one exhibit document (PNG stored as base64 fileData) ───────
    console.log("Creating exhibit document in database…");
    const [insertedDoc] = await db.insert(documentsTable).values({
      caseId,
      filename:     "exhibit-receipt.png",
      originalName: "Receipt.png",
      description:  "Deposit receipt",
      mimeType:     "image/png",
      fileSize:     Buffer.from(MINIMAL_PNG_BASE64, "base64").length,
      fileData:     MINIMAL_PNG_BASE64,
      ocrStatus:    "done",
    }).returning({ id: documentsTable.id });

    const docId = insertedDoc.id;
    console.log(`  Document ID: ${docId}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Variant 1 — Basic (no signature, no exhibits, pre-supplied text)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Variant 1: Basic ────────────────────────────────────────────────────────");
    const { status: s1, headers: h1, pdfBuf: pdf1 } = await callEndpoint(
      "POST",
      `/api/cases/${caseId}/forms/mc030`,
      caseId,
      {
        declarationTitle: DECLARATION_TITLE,
        declarationText:  DECLARATION_TEXT,
      }
    );
    assertValidPdfResponse("basic", s1, h1, pdf1);

    const cd1 = h1.get("content-disposition") ?? "";
    assert(
      cd1.includes("MC030-Case"),
      `[basic] Expected filename to contain "MC030-Case", got "${cd1}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd1}`);

    console.log("Extracting PDF text layer…");
    const text1 = await extractPdfText(pdf1);
    if (text1) {
      assert(
        text1.includes(PLAINTIFF_NAME),
        `[basic] Plaintiff name "${PLAINTIFF_NAME}" not found in PDF text`
      );
      console.log(`  ✓ Plaintiff name "${PLAINTIFF_NAME}" found in text layer`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Variant 2 — Signed (PNG signature embedded)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Variant 2: Signed ───────────────────────────────────────────────────────");
    const { status: s2, headers: h2, pdfBuf: pdf2 } = await callEndpoint(
      "POST",
      `/api/cases/${caseId}/forms/mc030/signed`,
      caseId,
      {
        declarationTitle:  DECLARATION_TITLE,
        declarationText:   DECLARATION_TEXT,
        signatureDataUrl:  SIGNATURE_DATA_URL,
      }
    );
    assertValidPdfResponse("signed", s2, h2, pdf2);

    const cd2 = h2.get("content-disposition") ?? "";
    assert(
      cd2.includes("MC030-Signed"),
      `[signed] Expected filename to contain "MC030-Signed", got "${cd2}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd2}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Variant 3 — With-exhibits (one PNG exhibit, pre-supplied text + order)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Variant 3: With-exhibits ────────────────────────────────────────────────");
    const { status: s3, headers: h3, pdfBuf: pdf3 } = await callEndpoint(
      "POST",
      `/api/cases/${caseId}/forms/mc030-with-exhibits`,
      caseId,
      {
        declarationTitle: DECLARATION_TITLE,
        declarationText:  DECLARATION_TEXT,
        exhibitDocIds:    [docId],
        exhibitOrder:     [1],
      }
    );
    assertValidPdfResponse("with-exhibits", s3, h3, pdf3);

    const cd3 = h3.get("content-disposition") ?? "";
    assert(
      cd3.includes("MC030-Filing-Packet"),
      `[with-exhibits] Expected filename to contain "MC030-Filing-Packet", got "${cd3}"`
    );
    console.log(`  ✓ Content-Disposition: ${cd3}`);

    // With exhibits the PDF must be larger than basic (extra exhibit page)
    assert(
      pdf3.length > pdf1.length,
      `[with-exhibits] Expected packet (${pdf3.length} bytes) to be larger than basic (${pdf1.length} bytes)`
    );
    console.log(`  ✓ Packet size (${pdf3.length.toLocaleString()} bytes) > basic (${pdf1.length.toLocaleString()} bytes)`);

    console.log("\n✅ All assertions passed — all three MC-030 variants generate valid PDFs.");

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
