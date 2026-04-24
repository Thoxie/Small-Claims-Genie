import { db } from "@workspace/db";
import { aiRateLimitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const MAX_AI_CALLS_PER_HOUR = 30;
const WINDOW_MS = 3_600_000; // 1 hour

export async function checkAiRateLimit(userId: string): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + WINDOW_MS);

  const [existing] = await db
    .select()
    .from(aiRateLimitsTable)
    .where(eq(aiRateLimitsTable.userId, userId));

  if (!existing || existing.resetAt < now) {
    await db
      .insert(aiRateLimitsTable)
      .values({ userId, count: 1, resetAt })
      .onConflictDoUpdate({
        target: aiRateLimitsTable.userId,
        set: { count: 1, resetAt },
      });
    return { allowed: true };
  }

  if (existing.count >= MAX_AI_CALLS_PER_HOUR) {
    const retryAfterSec = Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfterSec };
  }

  await db
    .update(aiRateLimitsTable)
    .set({ count: existing.count + 1 })
    .where(eq(aiRateLimitsTable.userId, userId));

  return { allowed: true };
}
