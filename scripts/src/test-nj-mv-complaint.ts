import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

async function main() {
  console.log("Creating test NJ MV case…");
  const [row] = await db.insert(casesTable).values({
    userId: "test-nj-mv-e2e",
    title: "NJ MV Complaint E2E",
    jurisdictionState: "NJ",
    countyId: "nj-hudson",
    claimType: "Auto Negligence",
    plaintiffName: "Jordan Lee",
    plaintiffAddress: "125 Market Street",
    plaintiffCity: "Newark",
    plaintiffZip: "07102",
    plaintiffPhone: "(973) 555-0142",
    plaintiffEmail: "jordan.lee@example.com",
    defendantName: "ABC Auto Repair LLC",
    defendantAddress: "800 Broad Avenue",
    defendantCity: "Bloomfield",
    defendantState: "NJ",
    defendantZip: "07003",
    defendantPhone: "(973) 555-0188",
    claimAmount: 4200,
    claimDescription: "Defendant performed negligent repairs on plaintiff vehicle following a motor vehicle accident on March 15, 2026. Plaintiff paid $4,200 for repairs that were not completed. Plaintiff demanded a refund on April 1, 2026 but defendant refused.",
  }).returning({ id: casesTable.id });
  const caseId = row!.id;
  console.log("  Case ID:", caseId);

  const token = randomUUID();
  await db.insert(downloadTokensTable).values({
    token, caseId, userId: "test-nj-mv-e2e",
    expiresAt: new Date(Date.now() + 600_000),
  });

  const url = `${BASE_URL}/api/cases/${caseId}/forms/nj/mv-complaint`;
  console.log(`\nPOST ${url}`);
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const body = Buffer.from(await resp.arrayBuffer());

  let pass = true;
  if (resp.status === 200) { console.log("  ✓ HTTP 200"); }
  else { console.log(`  ✗ HTTP ${resp.status}`); console.log("  Body:", body.slice(0, 400).toString()); pass = false; }

  if (resp.headers.get("content-type")?.includes("pdf")) { console.log("  ✓ Content-Type: application/pdf"); }
  else { console.log(`  ✗ CT: ${resp.headers.get("content-type")}`); pass = false; }

  if (body.length > 1000) { console.log(`  ✓ Size: ${body.length.toLocaleString()} bytes`); }
  else { console.log(`  ✗ Too small: ${body.length}`); pass = false; }

  if (body.slice(0, 4).toString() === "%PDF") { console.log("  ✓ Valid PDF"); }
  else { console.log("  ✗ Not a PDF"); pass = false; }

  if (resp.headers.get("content-disposition")?.includes("NJ-MV")) { console.log("  ✓ Filename correct"); }
  else { console.log(`  ✗ Disposition: ${resp.headers.get("content-disposition")}`); }

  await db.delete(casesTable).where(eq(casesTable.id, caseId));
  console.log("\nCleaned up.");

  if (!pass) { console.error("\n❌ Test failed."); process.exit(1); }
  console.log("\n✅ NJ MV Complaint: all assertions passed.");
}

main().catch(e => { console.error(e); process.exit(1); });
