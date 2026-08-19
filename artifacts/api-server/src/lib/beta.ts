import { db } from "@workspace/db";
import { betaAccessTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { logger } from "./logger";

export const BETA_LIMIT = 10;

export type BetaGrantStatus = "inserted" | "alreadyClaimed" | "full";

/**
 * Adds an account to the shared beta pool. Both public self-service claims and
 * admin grants use this routine so they share the same race-safe slot limit.
 */
export async function grantBetaAccess(input: {
  userId: string;
  email: string | null;
}): Promise<BetaGrantStatus> {
  return db.transaction(async (tx): Promise<BetaGrantStatus> => {
    await tx.execute(sql`LOCK TABLE beta_access IN EXCLUSIVE MODE`);

    const existing = await tx
      .select({ id: betaAccessTable.id })
      .from(betaAccessTable)
      .where(eq(betaAccessTable.userId, input.userId))
      .limit(1);

    if (existing.length > 0) {
      return "alreadyClaimed";
    }

    const [row] = await tx.select({ claimed: count() }).from(betaAccessTable);
    if (Number(row?.claimed ?? 0) >= BETA_LIMIT) {
      return "full";
    }

    await tx.insert(betaAccessTable).values(input);
    return "inserted";
  });
}

export async function userHasBetaAccess(userId: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: betaAccessTable.id })
      .from(betaAccessTable)
      .where(eq(betaAccessTable.userId, userId))
      .limit(1);
    return rows.length > 0;
  } catch (err) {
    logger.error({ err, userId }, "Failed to check beta access");
    return false;
  }
}

export async function getBetaSlotCount(): Promise<{ claimed: number; total: number; available: number }> {
  const [row] = await db.select({ claimed: count() }).from(betaAccessTable);
  const claimed = Number(row?.claimed ?? 0);
  return { claimed, total: BETA_LIMIT, available: Math.max(0, BETA_LIMIT - claimed) };
}
