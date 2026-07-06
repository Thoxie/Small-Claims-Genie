import { db } from "@workspace/db";
import { aiRateLimitsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const MAX_AI_CALLS_PER_HOUR = 30;
const MAX_HELP_CALLS_PER_HOUR = 30;
const MAX_WRITE_OPS_PER_HOUR = 60;
const WINDOW_MS = 3_600_000;

const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/**
 * Internal test bypass for the public, IP-based Help Genie rate limiter.
 *
 * `/api/help` and `/api/help/conversion` are rate-limited per-IP (not per-user,
 * since visitors aren't signed in). That means manual curl/test-script traffic
 * hitting these endpoints from the dev container consumes the SAME budget a
 * real visitor from that IP would use, and repeated test runs can trip a
 * false 429 for unrelated legitimate traffic sharing the IP.
 *
 * Rather than a shared secret/header (which would be a standing credential
 * that could leak and let anyone bypass the public rate limit), the bypass
 * is scoped to something a real internet visitor can never present:
 *   - the request must resolve to a loopback address (127.0.0.1 / ::1), i.e.
 *     it originated from *inside this container* (e.g. `curl localhost:80`
 *     during manual testing or `scripts/src/test-help-chat-mode-b.ts`
 *     running with the default `API_BASE_URL=http://localhost:80`).
 *     `app.set("trust proxy", 1)` in app.ts means req.ip already reflects
 *     the real client IP for actual internet traffic via the shared proxy,
 *     so a genuine visitor's IP is never loopback.
 *   - AND the app is not running in production (`APP_ENV !== "production"`),
 *     so this can never activate against real production traffic even if
 *     someone manages to reach the process over loopback there.
 *
 * This means: no credential to configure, rotate, or accidentally commit —
 * and no hand-deleting rows from `ai_rate_limits` to reset test runs.
 */
export function isInternalTestBypass(ip: string): boolean {
  if (process.env.APP_ENV === "production") return false;
  return LOOPBACK_IPS.has(ip);
}

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
  if (isInternalTestBypass(ip)) {
    return { allowed: true };
  }
  return checkRateLimit(`ip:${ip}`, MAX_HELP_CALLS_PER_HOUR);
}

// General write-operation limiter — applied to case creation, document uploads,
// and voice transcription to prevent scripted abuse and runaway storage costs.
export async function checkWriteRateLimit(
  userId: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkRateLimit(`write:${userId}`, MAX_WRITE_OPS_PER_HOUR);
}
