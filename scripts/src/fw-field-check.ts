import { runSignedFormTest } from "./signed-form-test-kit";
import { CONFIGS } from "./signed-form-configs";
import fetch from "node-fetch";
import * as fs from "fs";
import { execSync } from "child_process";

const cfg = CONFIGS["tx-fee-waiver"]!;
const BASE = process.env.API_BASE_URL || "http://localhost:80";

// Create the case the same way the test kit does
const caseResp = await fetch(`${BASE}/api/cases`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    claimAmount: 1500,
    claimDescription: "Encoding verification",
    plaintiffName: "Alice Johnson",
    plaintiffAddress: cfg.plaintiffAddress ?? "100 Main St",
    plaintiffCity: cfg.plaintiffCity ?? "Houston",
    plaintiffState: cfg.plaintiffState ?? "TX",
    plaintiffZip: cfg.plaintiffZip ?? "77002",
    plaintiffPhone: cfg.plaintiffPhone ?? "555-555-0101",
    plaintiffEmail: cfg.plaintiffEmail ?? "alice.johnson@example.com",
    plaintiffIsBusiness: false,
    defendantName: cfg.defendantName ?? "Test Corp",
    countyId: cfg.countyId ?? "tx-harris",
    state: "TX",
  })
});
const c = await caseResp.json() as any;
const id = c.id;
console.log("Case ID:", id);

const pdfResp = await fetch(`${BASE}/api/cases/${id}/forms/tx/fee-waiver`);
if (!pdfResp.ok) throw new Error(`PDF fetch failed: ${pdfResp.status}`);
const buf = Buffer.from(await pdfResp.arrayBuffer());
fs.writeFileSync("/tmp/fw-check.pdf", buf);

// Check page 2 (personal info page) — index 2 in pdftotext
const text = execSync("pdftotext -f 2 -l 2 /tmp/fw-check.pdf -").toString();
const checks = [
  { label: "full name",  val: "Alice Johnson" },
  { label: "phone",      val: "555-555-0101" },
  { label: "email",      val: "alice.johnson@example.com" },
  { label: "address",    val: "100 Main St" },
];
let ok = true;
for (const { label, val } of checks) {
  const found = text.includes(val);
  console.log((found ? "✓" : "✗") + ` ${label}: "${val}"`);
  if (!found) ok = false;
}
// Cleanup
await fetch(`${BASE}/api/cases/${id}`, { method: "DELETE" }).catch(() => {});
process.exit(ok ? 0 : 1);
