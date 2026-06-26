import { pgTable, text, serial, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";

export const efileCourtLocationsTable = pgTable("efile_court_locations", {
  id: serial("id").primaryKey(),
  cliCode: text("cli_code").notNull(),
  jurisdictionState: text("jurisdiction_state").notNull(),
  courthouseId: text("courthouse_id"),
  courtName: text("court_name"),
  filingFeeAmount: integer("filing_fee_amount"),
  supportsSmallClaims: boolean("supports_small_claims").default(true),
  togaUrl: text("toga_url"),
  reviewToolUrl: text("review_tool_url"),
  lastRefreshed: timestamp("last_refreshed", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("efile_court_locations_state_idx").on(t.jurisdictionState),
  index("efile_court_locations_courthouse_idx").on(t.courthouseId),
]);

export type EfileCourtLocation = typeof efileCourtLocationsTable.$inferSelect;
