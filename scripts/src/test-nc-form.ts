/**
 * End-to-end test: NC AOC-CVM-200 Complaint for Money Owed form download.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/test-nc-form.ts
 */

import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";

const execFileAsync = promisify(execFile);
const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

async function main() {
  let allOk = true;

  console.log("Creating test NC case in database...");
  const [row] = await db.insert(casesTable).values({
    userId: "test-nc-form-e2e",
    title: "NC Forms E2E Test",
    jurisdictionState: "NC",
    countyId: "nc-wake",
    plaintiffName: "Alice Johnson",
    plaintiffAddress: "456 Oak Lane",
    plaintiffCity: "Raleigh",
    plaintiffState: "NC",
    plaintiffZip: "27601",
    plaintiffPhone: "(919) 555-0100",
    plaintiffEmail: "alice@example.com",
    defendantName: "Bob Williams",
    defendantAddress: "789 Pine Rd",
    defendantCity: "Durham",
    defendantState: "NC",
    defendantZip: "27701",
    defendantPhone: "(919) 555-0200",
    claimAmount: 3500,
    claimType: "loan",
    claimDescription: "Defendant borrowed $3,500 on January 15, 2025 and has refused to repay the sum.",
  }).returning({ id: casesTable.id });

  const caseId = row!.id;
  console.log(`  Case ID: ${caseId}`);

  // ── Unsigned variant ──────────────────────────────────────────────────────
  const token1 = randomUUID();
  await db.insert(downloadTokensTable).values({
    token: token1, caseId, userId: "test-nc-form-e2e",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const url1 = `${BASE_URL}/api/cases/${caseId}/forms/nc/aoc-cvm-200?token=${token1}`;
  console.log(`\nTesting NC AOC-CVM-200 (unsigned): POST ${url1.replace(token1, token1.slice(0, 8) + "…")}`);
  const resp1 = await fetch(url1, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const body1 = Buffer.from(await resp1.arrayBuffer());

  console.log(`  HTTP ${resp1.status}`);
  console.log(`  Content-Type: ${resp1.headers.get("content-type")}`);
  console.log(`  Body size: ${body1.length.toLocaleString()} bytes`);

  if (resp1.status !== 200) {
    console.log(`  ✗ Expected 200`);
    console.log(`  Response: ${body1.toString("utf8").slice(0, 500)}`);
    allOk = false;
  } else if (body1.slice(0, 4).toString() === "%PDF") {
    console.log("  ✓ Valid PDF magic bytes");
    const tmp = `/tmp/nc-test-${caseId}.pdf`;
    const txt = `/tmp/nc-test-${caseId}.txt`;
    await writeFile(tmp, body1);
    try {
      await execFileAsync("pdftotext", [tmp, txt]);
      const text = await readFile(txt, "utf8");
      for (const v of ["Alice Johnson", "Bob Williams", "3,500.00", "Wake"]) {
        if (text.includes(v)) {
          console.log(`  ✓ "${v}" found in PDF text`);
        } else {
          console.log(`  ✗ "${v}" NOT found`);
          allOk = false;
        }
      }
    } finally {
      await unlink(tmp).catch(() => {});
      await unlink(txt).catch(() => {});
    }
  } else {
    console.log(`  ✗ Not a valid PDF — ${body1.toString("utf8").slice(0, 200)}`);
    allOk = false;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  console.log(`\nCleaning up: deleting test case ${caseId}...`);
  await db.delete(casesTable).where(eq(casesTable.id, caseId));
  console.log("  Done.");

  if (allOk) {
    console.log("\n✅ NC AOC-CVM-200 test passed.");
  } else {
    console.error("\n❌ NC AOC-CVM-200 test FAILED.");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
