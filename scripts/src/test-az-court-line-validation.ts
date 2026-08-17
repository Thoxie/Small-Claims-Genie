/**
 * AZ Court Line Validation — resolveAzCourtLine() data accuracy check
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:az-court-line-validation
 *
 * What this tests:
 *   - Imports ARIZONA_COUNTIES (the data resolveAzCourtLine() uses) directly from
 *     the api-server source — no HTTP call, no PDF rendering, no DB access needed.
 *   - Reimplements the same compose + lookup logic that resolveAzCourtLine() uses
 *     (the function is a direct data lookup; testing the data IS testing the function).
 *   - Asserts, for every entry in ARIZONA_COUNTIES + a set of county-level IDs:
 *       1. resolvedCourtLine is not null (blank court on a filed form)
 *       2. resolvedCourtLine is not an empty string
 *       3. The line does not contain any known stale/wrong address fragments
 *          (e.g. "Washington St" — former wrong Phoenix address)
 *       4. The line contains the county name (sanity: right entry was picked)
 *       5. courthouseAddress is not empty (all entries must have a street address)
 *   - A representative set of county-level IDs (e.g. "az-maricopa", "az-pima")
 *     is also tested to confirm the county-slug fallback path works correctly.
 *
 * Stale-address guard:
 *   Add any historically wrong address fragment to FORBIDDEN_FRAGMENTS below.
 *   The test will fail if any resolved court line contains one of them, catching
 *   a copy-paste or data-drift error before it reaches a filed complaint.
 */

import { ARIZONA_COUNTIES } from "../../artifacts/api-server/src/data/counties-az.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal shape that resolveAzCourtLine() operates on */
interface CaseDataLike {
  courthouseName?: string | null;
  courthouseAddress?: string | null;
  courthouseCity?: string | null;
  courthouseZip?: string | null;
  courthousePhone?: string | null;
  courthouseId?: string | null;
  countyId?: string | null;
}

// ─── Known stale / wrong address fragments ────────────────────────────────────
// Add any historically incorrect address fragment here; the test fails immediately
// if any resolved court line still contains one of these strings (case-insensitive).
const FORBIDDEN_FRAGMENTS: string[] = [
  "washington st",        // old wrong Phoenix address that was used in an early data pass
  "201 w jefferson",      // old Phoenix address sometimes mixed in from the courthouse
  "select a court",       // the Pinal PDF placeholder — must never appear on a real form
];

// ─── Replicated logic (mirrors resolveAzCourtLine in az-complaint-definition.ts) ─
// This stays intentionally minimal: if the real function gains new branches, add
// matching assertions below. The main value here is validating the DATA, not the code.

function compose(
  name: string,
  addr?: string | null,
  city?: string | null,
  zip?: string | null,
  phone?: string | null,
): string {
  let out = name;
  const loc = [addr, city ? `${city}, AZ${zip ? ` ${zip}` : ""}` : ""]
    .filter(Boolean)
    .join(", ");
  if (loc) out += ` - ${loc}`;
  if (phone) out += ` ${phone}`;
  return out;
}

function resolveCourtLine(d: CaseDataLike): string | null {
  // Priority 1: explicit venue data on the case
  if (d.courthouseName) {
    return compose(d.courthouseName, d.courthouseAddress, d.courthouseCity, d.courthouseZip, d.courthousePhone);
  }

  // Priority 2: directory lookup by courthouseId, then countyId
  const rec =
    ARIZONA_COUNTIES.find((c) => c.id === d.courthouseId) ??
    ARIZONA_COUNTIES.find((c) => c.id === d.countyId);
  if (rec) {
    return compose(rec.courthouseName, rec.courthouseAddress, rec.courthouseCity, rec.courthouseZip, rec.phone || null);
  }

  // Priority 3: county-slug fallback (e.g. "az-maricopa" → first Maricopa entry)
  const slug = (d.countyId ?? "").toLowerCase();
  if (slug.startsWith("az-")) {
    const seen = new Set<string>();
    for (const c of ARIZONA_COUNTIES) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      const countySlug = `az-${c.name.toLowerCase().replace(/\s+/g, "-")}`;
      if (slug === countySlug || slug.startsWith(`${countySlug}-`)) {
        // Return generic county fallback (matches resolveAzCountyName path)
        return `${c.name} County Justice Court`;
      }
    }
  }

  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertCourtLine(label: string, d: CaseDataLike, expectedCountyName?: string): void {
  const line = resolveCourtLine(d);

  assert(line !== null, `[${label}] resolveCourtLine() returned null — court will be blank on the form`);
  assert(line!.trim().length > 0, `[${label}] resolveCourtLine() returned an empty string`);

  for (const frag of FORBIDDEN_FRAGMENTS) {
    assert(
      !line!.toLowerCase().includes(frag.toLowerCase()),
      `[${label}] Court line contains forbidden/stale fragment "${frag}": "${line}"`,
    );
  }

  if (expectedCountyName) {
    assert(
      line!.toLowerCase().includes(expectedCountyName.toLowerCase()),
      `[${label}] Expected county name "${expectedCountyName}" in court line, got: "${line}"`,
    );
  }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

async function run() {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function runCheck(label: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${label}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${err.message}`);
      failures.push(err.message);
      failed++;
    }
  }

  console.log(`\nAZ Court Line Validation`);
  console.log(`Testing ${ARIZONA_COUNTIES.length} directory entries + county-slug fallbacks\n`);

  // ── 1. Every entry in ARIZONA_COUNTIES must resolve correctly ────────────────
  console.log("── Per-entry directory checks ──────────────────────────────────────────");
  for (const entry of ARIZONA_COUNTIES) {
    runCheck(`${entry.id} (courthouseId lookup)`, () => {
      // Lookup by courthouseId — the most common runtime path
      assertCourtLine(`courthouseId=${entry.id}`, { courthouseId: entry.id }, entry.name);

      // The composed line must include the address (catches blank/missing address)
      const line = resolveCourtLine({ courthouseId: entry.id })!;
      assert(
        entry.courthouseAddress.trim().length > 0,
        `${entry.id}: courthouseAddress is empty — court line on the form will have no street`,
      );
      assert(
        line.includes(entry.courthouseCity),
        `${entry.id}: City "${entry.courthouseCity}" missing from resolved line: "${line}"`,
      );
    });
  }

  // ── 2. County-level slug fallback (e.g. countyId = "az-maricopa") ───────────
  console.log("\n── County-slug fallback checks ─────────────────────────────────────────");
  const uniqueCounties = [...new Set(ARIZONA_COUNTIES.map((c) => c.name))];
  for (const countyName of uniqueCounties) {
    const slug = `az-${countyName.toLowerCase().replace(/\s+/g, "-")}`;
    runCheck(`county slug "${slug}" fallback`, () => {
      assertCourtLine(`countyId=${slug}`, { countyId: slug }, countyName);
    });
  }

  // ── 3. Explicit venue-data path (priority 1 in resolveAzCourtLine) ───────────
  console.log("\n── Explicit venue-data checks ──────────────────────────────────────────");
  runCheck("explicit courthouseName resolves without lookup", () => {
    const line = resolveCourtLine({
      courthouseName: "Maricopa County Justice Court — Mesa Precinct",
      courthouseAddress: "111 Test Blvd",
      courthouseCity: "Mesa",
      courthouseZip: "85201",
      courthousePhone: "(480) 555-0000",
    });
    assert(line !== null, "explicit venue data returned null");
    assert(line!.includes("111 Test Blvd"), `Address missing from line: "${line}"`);
    assert(line!.includes("Mesa, AZ 85201"), `City/State/Zip missing from line: "${line}"`);
    assert(line!.includes("(480) 555-0000"), `Phone missing from line: "${line}"`);
  });

  // ── 4. No-venue path returns null (not a blank string) ──────────────────────
  runCheck("empty CaseData returns null (not blank)", () => {
    const line = resolveCourtLine({});
    assert(line === null, `Expected null for empty case data, got: "${line}"`);
  });

  // ── 5. Representative spot-checks (specific expected values) ─────────────────
  console.log("\n── Spot-check expected values ───────────────────────────────────────────");

  runCheck("Pima Consolidated Justice Court — 240 N Stone Ave", () => {
    const line = resolveCourtLine({ courthouseId: "az-pima-tucson" })!;
    assert(line.includes("240 N Stone Ave"), `Expected "240 N Stone Ave" in Pima line: "${line}"`);
    assert(line.includes("Tucson"), `Expected "Tucson" in Pima line: "${line}"`);
  });

  runCheck("Maricopa Phoenix — 620 W Jackson St (NOT Washington St)", () => {
    const line = resolveCourtLine({ courthouseId: "az-maricopa-phoenix" })!;
    assert(line.includes("620 W Jackson St"), `Expected "620 W Jackson St" in Phoenix line: "${line}"`);
    assert(!line.toLowerCase().includes("washington st"), `Stale "Washington St" still in Phoenix line: "${line}"`);
  });

  runCheck("Pinal Florence (JP3) — Coolidge", () => {
    const line = resolveCourtLine({ courthouseId: "az-pinal-florence" })!;
    assert(line.includes("Coolidge"), `Expected "Coolidge" in Pinal JP3 line: "${line}"`);
    assert(line.includes("119 W Central Ave"), `Expected "119 W Central Ave" in Pinal JP3 line: "${line}"`);
  });

  runCheck("Coconino Flagstaff — 200 N San Francisco St", () => {
    const line = resolveCourtLine({ courthouseId: "az-coconino-flagstaff" })!;
    assert(line.includes("200 N San Francisco St"), `Expected address in Coconino line: "${line}"`);
  });

  runCheck("Yavapai Prescott — 120 S Cortez St", () => {
    const line = resolveCourtLine({ courthouseId: "az-yavapai-prescott" })!;
    assert(line.includes("120 S Cortez St"), `Expected address in Yavapai Prescott line: "${line}"`);
  });

  runCheck("Mohave Bullhead City — 2225 Trane Rd", () => {
    const line = resolveCourtLine({ courthouseId: "az-mohave-bullheadcity" })!;
    assert(line.includes("2225 Trane Rd"), `Expected address in Mohave Bullhead line: "${line}"`);
  });

  runCheck("Graham Safford — 800 W Main St", () => {
    const line = resolveCourtLine({ courthouseId: "az-graham-safford" })!;
    assert(line.includes("800 W Main St"), `Expected address in Graham line: "${line}"`);
  });

  runCheck("La Paz Parker — 1112 Arizona Ave", () => {
    const line = resolveCourtLine({ courthouseId: "az-lapaz-parker" })!;
    assert(line.includes("1112 Arizona Ave"), `Expected address in La Paz line: "${line}"`);
  });

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(72)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.error("\nFailures:");
    for (const f of failures) console.error(`  • ${f}`);
    process.exit(1);
  }

  console.log("\n✅ All assertions passed — AZ court data resolves correctly.");
}

run().catch((err) => {
  console.error("\n❌ Unexpected error:", err.message);
  process.exit(1);
});
