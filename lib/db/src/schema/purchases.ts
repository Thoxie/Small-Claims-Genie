import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const purchasesTable = pgTable("purchases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePriceId: text("stripe_price_id"),
  stripeProductId: text("stripe_product_id"),
  planKey: text("plan_key"),
  amountTotal: integer("amount_total"),
  currency: text("currency"),
  status: text("status").notNull().default("complete"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Purchase = typeof purchasesTable.$inferSelect;
