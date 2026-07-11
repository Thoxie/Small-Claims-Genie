import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { writeFileSync } from "fs";

const BASE_URL = "http://localhost:80";
const userId = "diag-fw-vis-x2";

// 1. Create test case
const [row] = await db.insert(casesTable).values({
  userId,
  title: "FW Visual Diag",
  status: "draft",
  countyId: "fl-miami-dade",
  plaintiffName: "Alice Johnson",
  plaintiffAddress: "123 Main Street",
  plaintiffCity: "Miami",
  plaintiffState: "FL",
  plaintiffZip: "33101",
  plaintiffPhone: "(305) 555-0123",
  plaintiffEmail: "alice.johnson@email.com",
}).returning({ id: casesTable.id });

const caseId = row!.id;
console.log("Case ID:", caseId);

// 2. Mint token (same as test-kit)
const token = randomUUID();
const expiresAt = new Date(Date.now() + 60_000);
await db.insert(downloadTokensTable).values({
  caseId, userId, formId: "FL-FEE-WAIVER", token, expiresAt,
});

// 3. Fetch unsigned PDF via token
const url = `${BASE_URL}/api/cases/${caseId}/forms/fl/fee-waiver?token=${token}`;
const resp = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
console.log("Status:", resp.status, resp.headers.get("content-type"));

if (resp.ok) {
  const bytes = Buffer.from(await resp.arrayBuffer());
  writeFileSync("/tmp/fw-output.pdf", bytes);
  console.log("Saved /tmp/fw-output.pdf (" + bytes.length + " bytes)");
} else {
  console.error("Failed:", await resp.text());
}

// 4. Cleanup
await db.delete(casesTable).where(eq(casesTable.id, caseId));
console.log("Done");
process.exit(0);
