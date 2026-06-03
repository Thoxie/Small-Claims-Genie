import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const downloadTokensTable = pgTable("download_tokens", {
  token: text("token").primaryKey(),
  caseId: integer("case_id").notNull(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
