import { Router, type IRouter } from "express";
import { eq, or, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, documentsTable, aiRateLimitsTable, downloadTokensTable } from "@workspace/db";
import { getUserId } from "../lib/owned-case";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { clerkClient } from "@clerk/express";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

// DELETE /account — permanently removes all data for the authenticated user.
// Order of operations:
//   1. Collect GCS storage paths from all user documents
//   2. Best-effort delete each GCS file (errors are logged, not fatal)
//   3. Delete all cases (DB cascade removes documents, chat_messages, download_tokens by case_id)
//   4. Delete any remaining download_tokens rows keyed by userId
//   5. Delete rate-limit counters (AI and write-op buckets)
//   6. Delete the Clerk account — must be last (auth must stay valid through step 5)
router.delete("/account", async (req, res): Promise<void> => {
  const userId = getUserId(req);

  // 1. Collect all document storage paths before deleting anything
  const userCases = await db
    .select({ id: casesTable.id })
    .from(casesTable)
    .where(eq(casesTable.userId, userId));

  const caseIds = userCases.map((c) => c.id);

  if (caseIds.length > 0) {
    const docs = await db
      .select({ storageObjectPath: documentsTable.storageObjectPath })
      .from(documentsTable)
      .where(inArray(documentsTable.caseId, caseIds));

    // 2. Best-effort GCS deletion — never let a storage error block account deletion
    for (const doc of docs) {
      if (!doc.storageObjectPath) continue;
      try {
        const file = await objectStorage.getObjectEntityFile(doc.storageObjectPath);
        await file.delete();
      } catch (err) {
        if (!(err instanceof ObjectNotFoundError)) {
          req.log.warn({ err, path: doc.storageObjectPath }, "[Account] GCS file delete failed");
        }
      }
    }
  }

  // 3. Delete all cases — DB cascades handle documents, chat_messages, download_tokens (by case_id)
  await db.delete(casesTable).where(eq(casesTable.userId, userId));

  // 4. Delete download_tokens keyed directly by userId (not via case cascade)
  await db.delete(downloadTokensTable).where(eq(downloadTokensTable.userId, userId));

  // 5. Delete rate-limit rows (AI bucket + write-op bucket)
  await db
    .delete(aiRateLimitsTable)
    .where(
      or(
        eq(aiRateLimitsTable.userId, userId),
        eq(aiRateLimitsTable.userId, `write:${userId}`)
      )
    );

  // 6. Delete the Clerk account — must be last so auth stays valid until here
  await clerkClient.users.deleteUser(userId);

  res.sendStatus(204);
});

export default router;
