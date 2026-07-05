/**
 * End-to-end test: New Jersey CN 10532 Complaint, Washington MISC 05.0100 (Notice)
 * and MISC 05.0200 (Certificate of Service) form downloads.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/test-nj-wa-forms.ts
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";

const execFileAsync = promisify(execFile);

const TEST_USER_ID = "test-nj-wa-forms-e2e";
const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

async function testForm(
  caseId: number,
  token: string,
  label: string,
  path: string,
  expectedStrings: string[],
) {
  const url = `${BASE_URL}${path}?token=${token}`;
  console.log(`\nTesting ${label}: POST ${url.replace(token, token.slice(0, 8) + "…")}`);

  const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const body = Buffer.from(await resp.arrayBuffer());

  let passed = true;

  if (resp.status !== 200) {
    console.log(`  ✗ HTTP ${resp.status} (expected 200)`);
    console.log(`  Response: ${body.toString("utf8").slice(0, 500)}`);
    return false;
  }
  console.log(`  ✓ HTTP 200`);

  if (resp.headers.get("content-type")?.includes("application/pdf")) {
    console.log(`  ✓ Content-Type: application/pdf`);
  } else {
    console.log(`  ✗ Content-Type: ${resp.headers.get("content-type")}`);
    passed = false;
  }

  console.log(`  Body size: ${body.length.toLocaleString()} bytes`);

  if (body.slice(0, 4).toString() === "%PDF") {
    console.log(`  ✓ Valid PDF magic bytes (%PDF)`);
  } else {
    console.log(`  ✗ Invalid PDF magic bytes`);
    passed = false;
  }

  const tmpPdf = `/tmp/njwa-test-${label.replace(/\s+/g, "-")}.pdf`;
  const tmpTxt = `/tmp/njwa-test-${label.replace(/\s+/g, "-")}.txt`;
  await writeFile(tmpPdf, body);
  try {
    await execFileAsync("pdftotext", [tmpPdf, tmpTxt]);
    const text = await readFile(tmpTxt, "utf8");
    for (const value of expectedStrings) {
      if (text.includes(value)) {
        console.log(`  ✓ "${value}" found`);
      } else {
        console.log(`  ✗ "${value}" NOT found`);
        passed = false;
      }
    }
    await unlink(tmpTxt).catch(() => {});
  } finally {
    await unlink(tmpPdf).catch(() => {});
  }

  return passed;
}

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

async function main() {
  let allOk = true;

  // ─── New Jersey ───
  console.log("Creating test NJ case in database…");
  const [njRow] = await db.insert(casesTable).values({
    userId: TEST_USER_ID,
    title: "NJ Forms E2E Test",
    jurisdictionState: "NJ",
    countyId: "nj-essex",
    plaintiffName: "Jane Doe",
    plaintiffAddress: "123 Main St",
    plaintiffCity: "Newark",
    plaintiffState: "NJ",
    plaintiffZip: "07102",
    plaintiffPhone: "(973) 555-0100",
    plaintiffEmail: "jane@example.com",
    defendantName: "Acme Corp",
    defendantIsBusinessOrEntity: true,
    defendantAddress: "789 Business Blvd",
    defendantCity: "Trenton",
    defendantState: "NJ",
    defendantZip: "08608",
    defendantPhone: "(609) 555-0200",
    claimAmount: 2500,
    claimType: "contract",
    claimDescription: "Defendant failed to pay for consulting services rendered.",
    howAmountCalculated: "40 hours at $62.50/hr",
  }).returning({ id: casesTable.id });

  const njCaseId = njRow!.id;
  console.log(`  Case ID: ${njCaseId}`);

  const njToken = await makeToken(njCaseId);
  const njOk = await testForm(
    njCaseId,
    njToken,
    "NJ CN10532 Complaint",
    `/api/cases/${njCaseId}/forms/nj/complaint`,
    ["Jane Doe", "Acme Corp", "2500.00"],
  );
  allOk = allOk && njOk;

  await db.delete(casesTable).where(eq(casesTable.id, njCaseId));

  // ─── Washington ───
  console.log("\nCreating test WA case in database…");
  const [waRow] = await db.insert(casesTable).values({
    userId: TEST_USER_ID,
    title: "WA Forms E2E Test",
    jurisdictionState: "WA",
    countyId: "wa-king",
    plaintiffName: "John Smith",
    plaintiffAddress: "100 Pine St",
    plaintiffCity: "Seattle",
    plaintiffState: "WA",
    plaintiffZip: "98101",
    plaintiffPhone: "(206) 555-0100",
    plaintiffEmail: "john@example.com",
    defendantName: "Widgets LLC",
    defendantIsBusinessOrEntity: true,
    defendantAddress: "200 Oak Ave",
    defendantCity: "Tacoma",
    defendantState: "WA",
    defendantZip: "98402",
    defendantPhone: "(253) 555-0200",
    claimAmount: 4200,
    claimType: "property_damage",
    claimDescription: "Defendant damaged plaintiff's fence during a delivery and refused to repair it.",
    howAmountCalculated: "Repair estimate of $4,200 from licensed contractor.",
  }).returning({ id: casesTable.id });

  const waCaseId = waRow!.id;
  console.log(`  Case ID: ${waCaseId}`);

  const waToken1 = await makeToken(waCaseId);
  const waNoticeOk = await testForm(
    waCaseId,
    waToken1,
    "WA MISC05-0100 Notice",
    `/api/cases/${waCaseId}/forms/wa/notice`,
    ["John Smith", "Widgets LLC", "4,200.00"],
  );
  allOk = allOk && waNoticeOk;

  const waToken2 = await makeToken(waCaseId);
  const waServiceOk = await testForm(
    waCaseId,
    waToken2,
    "WA MISC05-0200 Certificate of Service",
    `/api/cases/${waCaseId}/forms/wa/service`,
    ["Widgets LLC"],
  );
  allOk = allOk && waServiceOk;

  console.log(`\nCleaning up: deleting test case ${waCaseId}…`);
  await db.delete(casesTable).where(eq(casesTable.id, waCaseId));
  console.log("  Done.");

  if (allOk) {
    console.log("\n✅ All assertions passed — NJ and WA form PDFs are valid.");
  } else {
    console.error("\n❌ Test failed.");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
