import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const betaAccessTable = pgTable("beta_access", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull().unique(),
  email: text("email"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BetaAccess = typeof betaAccessTable.$inferSelect;
