import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as fs from "fs";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";
const TEST_USER_ID = "test-fw-inspect";

async function main() {
  const [row] = await db.insert(casesTable).values({
    userId: TEST_USER_ID,
    title: "FW Inspect",
    jurisdictionState: "FL",
    countyId: "fl-brevard",
    plaintiffName: "Company Inc.",
    plaintiffAddress: "1050 Main Street",
    plaintiffCity: "Merced",
    plaintiffState: "CA",
    plaintiffZip: "94022",
    plaintiffPhone: "(650) 533-2222",
    plaintiffEmail: "john@example.com",
    caseNumber: "2024-SC-1234",
    defendantName: "Acme Corp",
    defendantAddress: "200 Oak Ave",
    defendantCity: "Tampa",
    defendantState: "FL",
    defendantZip: "33602",
    claimAmount: 500,
    claimType: "contract",
    claimDescription: "Test.",
  }).returning({ id: casesTable.id });
  const caseId = row!.id;

  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token, caseId, userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  const resp = await fetch(`${BASE_URL}/api/cases/${caseId}/forms/fl/fee-waiver`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync("/tmp/fw-inspect.pdf", buf);
  console.log(`HTTP ${resp.status}, ${buf.length} bytes → /tmp/fw-inspect.pdf`);

  await db.delete(casesTable).where(eq(casesTable.id, caseId));
}
main().catch(e => { console.error(e); process.exit(1); });
