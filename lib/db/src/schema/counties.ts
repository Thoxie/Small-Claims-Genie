import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const countiesTable = pgTable("counties", {
  id:                 text("id").primaryKey(),
  name:               text("name").notNull(),
  state:              text("state").notNull(),
  courthouseName:     text("courthouse_name"),
  courthouseAddress:  text("courthouse_address"),
  courthouseCity:     text("courthouse_city"),
  courthouseZip:      text("courthouse_zip"),
  filingFeeUnder1500: integer("filing_fee_under1500"),
  filingFee1500to5000: integer("filing_fee_1500to5000"),
  filingFeeOver5000:  integer("filing_fee_over5000"),
  phone:              text("phone"),
  clerkWebsite:       text("clerk_website"),
  notes:              text("notes"),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("counties_state_idx").on(t.state),
]);

export type County = typeof countiesTable.$inferSelect;
export type CountyInsert = typeof countiesTable.$inferInsert;
