import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { downloadTokensTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function createDownloadToken(caseId: number, userId: string): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.insert(downloadTokensTable).values({ token, caseId, userId, expiresAt });

  // Lazy cleanup: delete expired tokens older than 10 minutes
  await db.delete(downloadTokensTable).where(lt(downloadTokensTable.expiresAt, new Date(Date.now() - TTL_MS)));

  return token;
}

export async function redeemDownloadToken(token: string, caseId: number): Promise<string | null> {
  const [entry] = await db
    .select()
    .from(downloadTokensTable)
    .where(and(eq(downloadTokensTable.token, token), eq(downloadTokensTable.caseId, caseId)));

  if (!entry) return null;
  if (entry.expiresAt < new Date()) {
    await db.delete(downloadTokensTable).where(eq(downloadTokensTable.token, token));
    return null;
  }

  // Single-use: delete immediately after redeeming
  await db.delete(downloadTokensTable).where(eq(downloadTokensTable.token, token));
  return entry.userId;
}
