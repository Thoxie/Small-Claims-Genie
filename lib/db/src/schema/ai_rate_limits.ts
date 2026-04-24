import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const aiRateLimitsTable = pgTable("ai_rate_limits", {
  userId:  text("user_id").primaryKey(),
  count:   integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
