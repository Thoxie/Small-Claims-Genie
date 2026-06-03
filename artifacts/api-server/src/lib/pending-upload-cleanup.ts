import { eq, and, lte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { documentsTable, casesTable } from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { logger } from "./logger";

const objectStorage = new ObjectStorageService();

// A pending document is considered abandoned if it has not been finalized
// within this window. Covers: user abandoned the direct upload, upload failed
// mid-transfer, or an attacker skipped the finalize step to leave oversized
// blobs in storage without the size/type check running.
const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Limits per cleanup pass — prevents the job from doing unbounded work in a
// single tick if many stale rows accumulate (e.g. after an outage).
const MAX_DOCS_PER_PASS = 100;

// Maximum allowed object size — same cap as the upload route and finalize endpoint.
const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function cleanupStalePendingUploads(): Promise<void> {
  const cutoff = new Date(Date.now() - PENDING_TTL_MS);

  const staleDocs = await db
    .select({
      id: documentsTable.id,
      caseId: documentsTable.caseId,
      storageObjectPath: documentsTable.storageObjectPath,
      originalName: documentsTable.originalName,
    })
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.ocrStatus, "pending"),
        lte(documentsTable.createdAt, cutoff)
      )
    )
    .limit(MAX_DOCS_PER_PASS);

  if (staleDocs.length === 0) return;

  logger.info({ count: staleDocs.length }, "[PendingCleanup] Found stale pending documents");

  for (const doc of staleDocs) {
    try {
      if (doc.storageObjectPath) {
        // Try to fetch GCS metadata to determine whether the object exists and
        // whether it violates size/type policy. Either way we delete the object
        // and document row — abandoned pending uploads have no legitimate use.
        try {
          const objectFile = await objectStorage.getObjectEntityFile(doc.storageObjectPath);
          const [metadata] = await objectFile.getMetadata();

          const gcsSizeBytes = metadata.size ? Number(metadata.size) : undefined;
          const gcsContentType = metadata.contentType as string | undefined;

          const sizeViolation = gcsSizeBytes !== undefined && gcsSizeBytes > MAX_UPLOAD_SIZE_BYTES;
          const typeViolation = gcsContentType !== undefined && !ALLOWED_MIME_TYPES.has(gcsContentType);

          if (sizeViolation || typeViolation) {
            logger.warn({ docId: doc.id, gcsSizeBytes, gcsContentType }, "[PendingCleanup] Policy violation on stale upload — deleting");
          } else {
            logger.info({ docId: doc.id }, "[PendingCleanup] Deleting abandoned pending upload (no policy violation, just timed out)");
          }

          await objectFile.delete();
        } catch (gcsErr) {
          if (!(gcsErr instanceof ObjectNotFoundError)) {
            logger.warn({ err: gcsErr, docId: doc.id }, "[PendingCleanup] GCS operation failed during cleanup — deleting document row anyway");
          }
          // Object already gone or unreachable — fall through to delete the DB row
        }
      }

      // Remove the document row and reconcile documentCount on the parent case
      await db.delete(documentsTable).where(eq(documentsTable.id, doc.id));
      await db.update(casesTable)
        .set({ documentCount: sql`GREATEST(COALESCE(document_count, 1) - 1, 0)` })
        .where(eq(casesTable.id, doc.caseId));
      logger.info({ docId: doc.id, caseId: doc.caseId, originalName: doc.originalName }, "[PendingCleanup] Stale pending document removed");
    } catch (err) {
      logger.error({ err, docId: doc.id }, "[PendingCleanup] Unexpected error processing stale document");
    }
  }
}

export function startPendingUploadCleanup(): void {
  // Run once shortly after startup to catch anything left from a previous
  // server instance, then repeat every 15 minutes.
  setTimeout(() => {
    cleanupStalePendingUploads().catch((err) =>
      logger.error({ err }, "[PendingCleanup] Initial cleanup run failed")
    );
  }, 60_000); // 1-minute delay so startup completes first

  setInterval(() => {
    cleanupStalePendingUploads().catch((err) =>
      logger.error({ err }, "[PendingCleanup] Scheduled cleanup run failed")
    );
  }, 15 * 60 * 1000); // every 15 minutes

  logger.info("[PendingCleanup] Pending upload cleanup scheduler started (runs every 15 minutes)");
}
