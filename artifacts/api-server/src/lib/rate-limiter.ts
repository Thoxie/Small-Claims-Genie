const limits = new Map<string, { count: number; resetAt: number }>();

const MAX_AI_CALLS_PER_HOUR = 30;

export function checkAiRateLimit(userId: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = limits.get(userId);

  if (!entry || now > entry.resetAt) {
    limits.set(userId, { count: 1, resetAt: now + 3_600_000 });
    return { allowed: true };
  }

  if (entry.count >= MAX_AI_CALLS_PER_HOUR) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  entry.count++;
  return { allowed: true };
}
