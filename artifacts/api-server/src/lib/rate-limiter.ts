import { db } from "@workspace/db";
import { aiRateLimitsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const MAX_AI_CALLS_PER_HOUR = 30;
const MAX_HELP_CALLS_PER_HOUR = 30;
const MAX_WRITE_OPS_PER_HOUR = 60;
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

/**
 * Reserve `pages` AI tokens at once for multi-page OCR jobs.
 * Increments the counter by `pages` atomically so each page is properly accounted for.
 */
export async function checkAiRateLimitBulk(
  userId: string,
  pages: number
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + WINDOW_MS);

  const [result] = await db
    .insert(aiRateLimitsTable)
    .values({ userId, count: pages, resetAt })
    .onConflictDoUpdate({
      target: aiRateLimitsTable.userId,
      set: {
        count: sql`CASE WHEN ${aiRateLimitsTable.resetAt} < NOW() THEN ${pages} ELSE ${aiRateLimitsTable.count} + ${pages} END`,
        resetAt: sql`CASE WHEN ${aiRateLimitsTable.resetAt} < NOW() THEN ${resetAt} ELSE ${aiRateLimitsTable.resetAt} END`,
      },
    })
    .returning();

  if (result.count > MAX_AI_CALLS_PER_HOUR) {
    const retryAfterSec = Math.ceil((result.resetAt.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true };
}

export async function checkHelpChatRateLimit(
  ip: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkRateLimit(`ip:${ip}`, MAX_HELP_CALLS_PER_HOUR);
}

// General write-operation limiter — applied to case creation, document uploads,
// and voice transcription to prevent scripted abuse and runaway storage costs.
export async function checkWriteRateLimit(
  userId: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkRateLimit(`write:${userId}`, MAX_WRITE_OPS_PER_HOUR);
}
