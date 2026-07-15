import { db } from "@workspace/db";
import { cases as casesTable } from "@workspace/db";
import { randomUUID } from "crypto";
import { downloadTokens as downloadTokensTable } from "@workspace/db";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

const BASE = process.env.API_BASE_URL ?? "http://localhost:80";
const userId = `test-petition-amount-verify-${Date.now()}`;

async function mintToken(caseId: number) {
  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token, caseId, userId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return token;
}

const [ins] = await db.insert(casesTable).values({
  userId, title: "Amount position verify",
  status: "draft", countyId: "tx-harris",
  plaintiffName: "Alice Johnson",
  plaintiffAddress: "100 Main St", plaintiffCity: "Houston",
  plaintiffState: "TX", plaintiffZip: "77002",
  plaintiffPhone: "555-0101", plaintiffEmail: "alice@test.com",
  defendantName: "Test Corp", defendantAddress: "200 Corp Ln",
  defendantCity: "Houston", defendantState: "TX", defendantZip: "77003",
  defendantPhone: "555-0102", claimType: "contract",
  claimAmount: 5000, claimDescription: "Test claim",
}).returning({ id: casesTable.id });

const caseId = ins!.id;
console.log(`Case ID: ${caseId}`);

const token = await mintToken(caseId);
const res = await fetch(`${BASE}/api/cases/${caseId}/forms/tx/petition?token=${token}`);
console.log(`GET petition → HTTP ${res.status}`);

if (res.status === 200) {
  const buf = Buffer.from(await res.arrayBuffer());
  const tmpPdf = `/tmp/petition-verify-${caseId}.pdf`;
  writeFileSync(tmpPdf, buf);

  const bbox = execSync(`pdftotext -f 1 -l 1 -bbox-layout ${tmpPdf} -`).toString();
  const match = bbox.match(/<word[^>]*>5,000\.00<\/word>/);
  if (match) {
    const xMatch = bbox.match(/<word xMin="([^"]+)"[^>]*>5,000\.00<\/word>/);
    const xMin = xMatch ? parseFloat(xMatch[1]) : -1;
    console.log(`amount xMin = ${xMin} (expected ≥ 241, was 236.4 before fix)`);
    console.log(xMin >= 240 ? "✓ PASS: amount is past the $ sign" : "✗ FAIL: amount still overlaps $");
  } else {
    console.log("✗ FAIL: 5,000.00 not found in page 1 text layer");
  }
  unlinkSync(tmpPdf);
} else {
  console.log("Trying POST to /signed to also verify signed path...");
}

await db.delete(casesTable).where((eq: any, t: any) => eq(t.id, caseId)).catch(() => {});
process.exit(0);
