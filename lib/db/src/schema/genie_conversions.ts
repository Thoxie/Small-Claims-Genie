import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const genieConversionsTable = pgTable("genie_conversions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  question: text("question").notNull(),
  answerSnippet: text("answer_snippet"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GenieConversion = typeof genieConversionsTable.$inferSelect;
