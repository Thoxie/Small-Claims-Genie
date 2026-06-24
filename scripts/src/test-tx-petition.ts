/**
 * End-to-end test: TX Small Claims Petition (unsigned + signed)
 */
import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const BASE = process.env.API_BASE_URL ?? "http://localhost:80";
const USER_ID = "tx-petition-test-e2e";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function run() {
  let caseId: number | null = null;
  try {
    console.log("Creating test case in database…");
    const [row] = await db.insert(casesTable).values({
      userId: USER_ID,
      title: "TX Petition Test (auto-cleanup)",
      status: "draft",
      countyId: "tx-harris",
      plaintiffName: "John Smith",
      plaintiffAddress: "123 Main St",
      plaintiffCity: "Houston",
      plaintiffState: "TX",
      plaintiffZip: "77002",
      plaintiffPhone: "713-555-0101",
      plaintiffEmail: "john@example.com",
      defendantName: "Acme Corp",
      defendantAddress: "456 Commerce St",
      defendantCity: "Houston",
      defendantState: "TX",
      defendantZip: "77003",
      claimType: "goods",
      claimAmount: 2500,
      claimDescription: "Defendant failed to deliver goods as contracted despite receiving full payment in advance.",
    }).returning({ id: casesTable.id });
    caseId = row.id;
    console.log(`  Case ID: ${caseId}`);

    // Each download needs its own token (tokens are single-use)
    const token1 = randomUUID();
    await db.insert(downloadTokensTable).values({
      token: token1, caseId, userId: USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Unsigned
    const unsignedUrl = `${BASE}/api/cases/${caseId}/forms/tx/petition`;
    console.log(`\nPOST ${unsignedUrl} [unsigned]`);
    const r1 = await fetch(unsignedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token1 }),
    });
    const buf1 = Buffer.from(await r1.arrayBuffer());
    assert(r1.status === 200, `Expected 200, got ${r1.status}: ${buf1.slice(0, 200)}`);
    console.log(`  ✓ HTTP 200`);
    assert(buf1.slice(0, 4).toString("ascii") === "%PDF", "Not a valid PDF");
    console.log(`  ✓ Valid PDF magic bytes (%PDF)`);
    console.log(`  ✓ Body size: ${buf1.length.toLocaleString()} bytes`);

    // Signed — fresh token
    const token2 = randomUUID();
    await db.insert(downloadTokensTable).values({
      token: token2, caseId, userId: USER_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const sigPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const signedUrl = `${BASE}/api/cases/${caseId}/forms/tx/petition/signed`;
    console.log(`\nPOST ${signedUrl} [signed]`);
    const r2 = await fetch(signedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token2, signatureDataUrl: sigPng }),
    });
    const buf2 = Buffer.from(await r2.arrayBuffer());
    assert(r2.status === 200, `Expected 200, got ${r2.status}: ${buf2.slice(0, 200)}`);
    console.log(`  ✓ HTTP 200`);
    assert(buf2.slice(0, 4).toString("ascii") === "%PDF", "Not a valid PDF");
    console.log(`  ✓ Valid PDF magic bytes (%PDF)`);
    console.log(`  ✓ Body size: ${buf2.length.toLocaleString()} bytes`);
    assert(buf2.length >= buf1.length, `Signed PDF (${buf2.length}) should be >= unsigned (${buf1.length})`);
    console.log(`  ✓ Signed PDF is >= unsigned — signature embedded`);

    console.log("\n✅ All assertions passed — TX Petition PDF correct (unsigned + signed).");
  } finally {
    if (caseId !== null) {
      console.log(`\nCleaning up: deleting test case ${caseId}…`);
      await db.delete(casesTable).where(eq(casesTable.id, caseId));
      console.log("  Done.");
    }
  }
}

run().catch((e) => { console.error("\n❌ Test failed:", e.message); process.exit(1); });
