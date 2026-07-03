/**
 * End-to-end test: Virginia DC-402 (Warrant in Debt) and DC-409 (In Forma Pauperis) form downloads
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/test-va-forms.ts
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";

const execFileAsync = promisify(execFile);

const TEST_USER_ID       = "test-va-forms-e2e";
const EXPECTED_PLAINTIFF = "Jane Smith";
const EXPECTED_DEFENDANT = "ABC Hardware LLC";
const EXPECTED_AMOUNT    = "3,500.00";
const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

async function testForm(caseId: number, token: string, label: string, path: string, checkAmount = true) {
  const url = `${BASE_URL}/api/cases/${caseId}/forms/va/${path}?token=${token}`;
  console.log(`\nTesting ${label}: POST ${url.replace(token, token.slice(0, 8) + "…")}`);

  const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const body = Buffer.from(await resp.arrayBuffer());

  let passed = true;

  if (resp.status !== 200) {
    console.log(`  ✗ HTTP ${resp.status} (expected 200)`);
    const text = body.toString("utf8").slice(0, 500);
    console.log(`  Response: ${text}`);
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

  const tmpPdf = `/tmp/va-test-${label.replace(/\s+/g, "-")}.pdf`;
  const tmpTxt = `/tmp/va-test-${label.replace(/\s+/g, "-")}.txt`;
  await writeFile(tmpPdf, body);
  try {
    await execFileAsync("pdftotext", [tmpPdf, tmpTxt]);
    const text = await readFile(tmpTxt, "utf8");
    const checks: [string, string][] = [
      ["Plaintiff name", EXPECTED_PLAINTIFF],
      ["Defendant name", EXPECTED_DEFENDANT],
    ];
    if (checkAmount) checks.push(["Claim amount", EXPECTED_AMOUNT]);
    for (const [fieldLabel, value] of checks) {
      if (text.includes(value)) {
        console.log(`  ✓ ${fieldLabel} "${value}" found`);
      } else {
        console.log(`  ✗ ${fieldLabel} "${value}" NOT found`);
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
  console.log("Creating test VA case in database…");
  const [row] = await db.insert(casesTable).values({
    userId: TEST_USER_ID,
    title: "VA Forms E2E Test",
    jurisdictionState: "VA",
    countyId: "va-fairfax",
    plaintiffName: EXPECTED_PLAINTIFF,
    plaintiffAddress: "123 Main St",
    plaintiffCity: "Fairfax",
    plaintiffState: "VA",
    plaintiffZip: "22030",
    plaintiffPhone: "(703) 555-1234",
    plaintiffEmail: "jane@example.com",
    defendantName: EXPECTED_DEFENDANT,
    defendantAddress: "456 Oak Ave",
    defendantCity: "Fairfax",
    defendantState: "VA",
    defendantZip: "22031",
    claimAmount: 3500,
    claimType: "services",
    claimDescription: "Defendant failed to complete contracted home repair work and refused to refund the deposit paid.",
    howAmountCalculated: "Deposit paid was $3,500 which was never refunded.",
  }).returning({ id: casesTable.id });

  const caseId = row!.id;
  console.log(`  Case ID: ${caseId}`);

  const token1 = await makeToken(caseId);
  const dc402Ok = await testForm(caseId, token1, "DC-402 Warrant in Debt", "dc-402");

  const token2 = await makeToken(caseId);
  const dc409Ok = await testForm(caseId, token2, "DC-409 In Forma Pauperis", "dc-409", false);

  console.log(`\nCleaning up: deleting test case ${caseId}…`);
  await db.delete(casesTable).where(eq(casesTable.id, caseId));
  console.log("  Done.");

  if (dc402Ok && dc409Ok) {
    console.log("\n✅ All assertions passed — VA DC-402 and DC-409 PDFs are valid.");
  } else {
    console.error("\n❌ Test failed.");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
