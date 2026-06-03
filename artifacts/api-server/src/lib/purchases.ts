import { db } from "@workspace/db";
import { purchasesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

export async function ensurePurchasesTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id TEXT NOT NULL,
        stripe_session_id TEXT NOT NULL UNIQUE,
        stripe_price_id TEXT,
        stripe_product_id TEXT,
        plan_key TEXT,
        amount_total INTEGER,
        currency TEXT,
        status TEXT NOT NULL DEFAULT 'complete',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases(user_id)
    `);
    logger.info("purchases table ready");
  } catch (err) {
    logger.error({ err }, "Failed to ensure purchases table");
  }
}

export async function recordPurchase(data: {
  userId: string;
  stripeSessionId: string;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  planKey?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
}): Promise<void> {
  try {
    await db.insert(purchasesTable).values({
      userId: data.userId,
      stripeSessionId: data.stripeSessionId,
      stripePriceId: data.stripePriceId ?? null,
      stripeProductId: data.stripeProductId ?? null,
      planKey: data.planKey ?? null,
      amountTotal: data.amountTotal ?? null,
      currency: data.currency ?? null,
      status: "complete",
    }).onConflictDoNothing();
    logger.info({ userId: data.userId, sessionId: data.stripeSessionId, planKey: data.planKey }, "Purchase recorded");
  } catch (err) {
    logger.error({ err, data }, "Failed to record purchase");
    throw err;
  }
}

export async function userHasPurchase(userId: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: purchasesTable.id })
      .from(purchasesTable)
      .where(eq(purchasesTable.userId, userId))
      .limit(1);
    return rows.length > 0;
  } catch (err) {
    logger.error({ err, userId }, "Failed to check purchase status");
    return false;
  }
}
