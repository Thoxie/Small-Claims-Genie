import { db } from "@workspace/db";
import { aiRateLimitsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const MAX_AI_CALLS_PER_HOUR = 30;
const MAX_HELP_CALLS_PER_HOUR = 10;
const WINDOW_MS = 3_600_000;

async function checkRateLimit(
  key: string,
  max: number
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + WINDOW_MS);

  const [result] = await db
    .insert(aiRateLimitsTable)
    .values({ userId: key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: aiRateLimitsTable.userId,
      set: {
        count: sql`CASE WHEN ${aiRateLimitsTable.resetAt} < NOW() THEN 1 ELSE ${aiRateLimitsTable.count} + 1 END`,
        resetAt: sql`CASE WHEN ${aiRateLimitsTable.resetAt} < NOW() THEN ${resetAt} ELSE ${aiRateLimitsTable.resetAt} END`,
      },
    })
    .returning();

  if (result.count > max) {
    const retryAfterSec = Math.ceil((result.resetAt.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true };
}

export async function checkAiRateLimit(
  userId: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkRateLimit(userId, MAX_AI_CALLS_PER_HOUR);
}

export async function checkHelpChatRateLimit(
  ip: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkRateLimit(`ip:${ip}`, MAX_HELP_CALLS_PER_HOUR);
}
