import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { writeFileSync } from "fs";

const BASE_URL = "http://localhost:80";
const userId = "diag-summons-vis";

const [row] = await db.insert(casesTable).values({
  userId,
  title: "Summons Visual Diag",
  status: "draft",
  countyId: "fl-broward",
  plaintiffName: "Alice Johnson",
  plaintiffAddress: "123 Main Street",
  plaintiffCity: "Fort Lauderdale",
  plaintiffState: "FL",
  plaintiffZip: "33301",
  plaintiffPhone: "(754) 555-0123",
  plaintiffEmail: "alice@test.com",
  defendantName: "Bob Williams",
  defendantAddress: "456 Oak Avenue",
  defendantCity: "Fort Lauderdale",
  defendantState: "FL",
  defendantZip: "33302",
}).returning({ id: casesTable.id });

const caseId = row!.id;
console.log("Case ID:", caseId);

const token = randomUUID();
await db.insert(downloadTokensTable).values({
  caseId, userId, formId: "FL-SUMMONS", token,
  expiresAt: new Date(Date.now() + 60_000),
});

const url = `${BASE_URL}/api/cases/${caseId}/forms/fl/broward-summons?token=${token}`;
const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
console.log("Status:", resp.status);

if (resp.ok) {
  const bytes = Buffer.from(await resp.arrayBuffer());
  writeFileSync("/tmp/summons-output.pdf", bytes);
  console.log("Saved /tmp/summons-output.pdf (" + bytes.length + " bytes)");
} else {
  console.error("Failed:", await resp.text());
}

await db.delete(casesTable).where(eq(casesTable.id, caseId));
process.exit(0);
