import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db";
import { type Request } from "express";

export function getUserId(req: Request): string {
  return (req as any).userId as string;
}

/** Returns the case if it exists and belongs to the current user, null otherwise. */
export async function getOwnedCase(caseId: number, userId: string) {
  const [c] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));
  return c ?? null;
}
