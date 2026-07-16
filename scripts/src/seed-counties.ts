/**
 * Seed county data from in-memory TS arrays into the counties DB table.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/seed-counties.ts
 *
 * Safe to re-run — uses upsert (ON CONFLICT DO UPDATE).
 * Requires the dev DATABASE_URL to be set (same as the API server).
 */
import { db, countiesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — relative import outside rootDir, fine for tsx runner
import { CALIFORNIA_COUNTIES } from "../../artifacts/api-server/src/data/counties-ca.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { FLORIDA_COUNTIES } from "../../artifacts/api-server/src/data/counties-fl.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TEXAS_COUNTIES } from "../../artifacts/api-server/src/data/counties-tx.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ILLINOIS_COUNTIES } from "../../artifacts/api-server/src/data/counties-il.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { NORTH_CAROLINA_COUNTIES } from "../../artifacts/api-server/src/data/counties-nc.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { VIRGINIA_COUNTIES } from "../../artifacts/api-server/src/data/counties-va.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { NEW_JERSEY_COUNTIES } from "../../artifacts/api-server/src/data/counties-nj.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { WASHINGTON_COUNTIES } from "../../artifacts/api-server/src/data/counties-wa.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ARIZONA_COUNTIES } from "../../artifacts/api-server/src/data/counties-az.js";

type RawCounty = {
  id: string;
  name: string;
  state: string;
  courthouseName?: string;
  courthouseAddress?: string;
  courthouseCity?: string;
  courthouseZip?: string;
  filingFeeUnder1500?: number;
  filingFee1500to5000?: number;
  filingFeeOver5000?: number;
  phone?: string;
  clerkWebsite?: string;
  notes?: string;
  [key: string]: unknown;
};

function toRow(c: RawCounty) {
  return {
    id: c.id,
    name: c.name,
    state: c.state,
    courthouseName: c.courthouseName ?? null,
    courthouseAddress: c.courthouseAddress ?? null,
    courthouseCity: c.courthouseCity ?? null,
    courthouseZip: c.courthouseZip ?? null,
    filingFeeUnder1500: c.filingFeeUnder1500 ?? null,
    filingFee1500to5000: c.filingFee1500to5000 ?? null,
    filingFeeOver5000: c.filingFeeOver5000 ?? null,
    phone: c.phone ?? null,
    clerkWebsite: c.clerkWebsite ?? null,
    notes: c.notes ?? null,
  };
}

const all: RawCounty[] = [
  ...(CALIFORNIA_COUNTIES as RawCounty[]),
  ...(FLORIDA_COUNTIES as RawCounty[]),
  ...(TEXAS_COUNTIES as RawCounty[]),
  ...(ILLINOIS_COUNTIES as RawCounty[]),
  ...(NORTH_CAROLINA_COUNTIES as RawCounty[]),
  ...(VIRGINIA_COUNTIES as RawCounty[]),
  ...(NEW_JERSEY_COUNTIES as RawCounty[]),
  ...(WASHINGTON_COUNTIES as RawCounty[]),
  ...(ARIZONA_COUNTIES as RawCounty[]),
];

const rows = all.map(toRow);

console.log(`Seeding ${rows.length} counties...`);

const CHUNK = 50;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  await db
    .insert(countiesTable)
    .values(chunk)
    .onConflictDoUpdate({
      target: countiesTable.id,
      set: {
        name:               sql`excluded.name`,
        state:              sql`excluded.state`,
        courthouseName:     sql`excluded.courthouse_name`,
        courthouseAddress:  sql`excluded.courthouse_address`,
        courthouseCity:     sql`excluded.courthouse_city`,
        courthouseZip:      sql`excluded.courthouse_zip`,
        filingFeeUnder1500: sql`excluded.filing_fee_under1500`,
        filingFee1500to5000: sql`excluded.filing_fee_1500to5000`,
        filingFeeOver5000:  sql`excluded.filing_fee_over5000`,
        phone:              sql`excluded.phone`,
        clerkWebsite:       sql`excluded.clerk_website`,
        notes:              sql`excluded.notes`,
        updatedAt:          sql`now()`,
      },
    });
  console.log(`  Inserted chunk ${Math.floor(i / CHUNK) + 1} (${i + chunk.length}/${rows.length})`);
}

console.log("Done — counties seeded.");
process.exit(0);
