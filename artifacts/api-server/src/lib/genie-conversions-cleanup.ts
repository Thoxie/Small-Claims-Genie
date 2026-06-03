import { lt, sql } from "drizzle-orm";
import { db, genieConversionsTable } from "@workspace/db";
import { logger } from "./logger";

const RETENTION_DAYS = 90;
const INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

async function purgeOldGenieConversions(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(genieConversionsTable)
      .where(lt(genieConversionsTable.createdAt, cutoff))
      .returning({ id: sql<number>`id` });
    if (result.length > 0) {
      logger.info({ deleted: result.length, retentionDays: RETENTION_DAYS }, "Purged old genie_conversions rows");
    }
  } catch (err) {
    logger.error({ err }, "Failed to purge old genie_conversions rows");
  }
}

export function startGenieConversionsCleanup(): void {
  void purgeOldGenieConversions();
  setInterval(() => void purgeOldGenieConversions(), INTERVAL_MS);
}
