import { db } from "@workspace/db";
import { betaAccessTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { logger } from "./logger";

export const BETA_LIMIT = 10;

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
