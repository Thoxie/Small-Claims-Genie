import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { documentsTable, casesTable } from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middlewares/auth";
import { requiresPurchase } from "../middlewares/requiresPurchase";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { checkWriteRateLimit } from "../lib/rate-limiter";

// Same file-size and MIME allowlist enforced by the document upload route.
const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function parseUploadUrlBody(body: unknown): {
  name: string;
  size: number;
  contentType: string;
  caseId: number;
  label?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (
    typeof b.name !== "string" ||
    typeof b.size !== "number" ||
    typeof b.contentType !== "string" ||
    typeof b.caseId !== "number"
  ) return null;
  return {
    name: b.name,
    size: b.size,
    contentType: b.contentType,
    caseId: b.caseId,
    label: typeof b.label === "string" ? b.label : undefined,
  };
}

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for direct file upload to object storage.
 *
 * Security controls:
 *   - Requires a valid Clerk JWT (requireAuth) AND a confirmed Stripe purchase (requiresPurchase).
 *   - Rate-limited to the same 60/hr write-op bucket as document uploads.
 *   - Requires a valid `caseId` the caller owns — every presigned URL is immediately
 *     tied to a pending document row so uploads are never orphaned in GCS.
 *   - Enforces the same MIME-type allowlist and 50 MB size ceiling as the server-side
 *     upload path. Declared size is validated here; actual GCS object size is verified
 *     by the POST /cases/:id/documents/:docId/storage-finalize endpoint before OCR runs.
 */
router.post("/storage/uploads/request-url", requireAuth, requiresPurchase, async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const rateCheck = await checkWriteRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({
      error: `Too many requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes before trying again.`,
    });
    return;
  }

  const body = parseUploadUrlBody(req.body);
  if (!body) {
    res.status(400).json({ error: "Missing or invalid required fields (name, size, contentType, caseId)" });
    return;
  }

  const { name, size, contentType, caseId, label } = body;

  if (size <= 0) {
    res.status(400).json({ error: "Invalid file size." });
    return;
  }

  if (size > MAX_UPLOAD_SIZE_BYTES) {
    res.status(413).json({ error: `File too large. Maximum allowed size is ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)} MB.` });
    return;
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(contentType)) {
    res.status(415).json({ error: "Unsupported file type. Allowed types: PDF, JPG, PNG, DOCX." });
    return;
  }

  // Verify the caller owns the target case — prevents cross-user document injection.
  const caseRecord = await getOwnedCase(caseId, userId);
  if (!caseRecord) {
    res.status(404).json({ error: "Case not found." });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    // Pre-create a pending document row so this upload is always tracked.
    // Without this record the GCS object would be invisible to account deletion
    // and could survive indefinitely as an orphan in the bucket.
    // The row stays in ocrStatus "pending" until POST .../storage-finalize completes.
    const filename = `case-${caseId}-${Date.now()}-${name}`;
    const [doc] = await db.insert(documentsTable).values({
      caseId,
      filename,
      originalName: name,
      label: label ?? null,
      mimeType: contentType,
      fileSize: size,
      fileData: null,
      storageObjectPath: objectPath,
      ocrStatus: "pending",
    }).returning();

    // Keep documentCount in sync — increment now; if finalize rejects the upload,
    // the finalize/cleanup path decrements it back.
    await db.update(casesTable)
      .set({ documentCount: sql`COALESCE(document_count, 0) + 1` })
      .where(eq(casesTable.id, caseId));

    res.json({
      uploadURL,
      objectPath,
      documentId: doc.id,
      metadata: { name, size, contentType },
    });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve private object entities from PRIVATE_OBJECT_DIR.
 * Requires a valid Clerk JWT AND ownership: the object must belong to a
 * document whose case is owned by the authenticated user.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    // Ownership check — the object must be linked to a document in a case
    // belonging to the requesting user. Prevents any authenticated user from
    // accessing another user's files by guessing object paths.
    const [ownershipRow] = await db
      .select({ docId: documentsTable.id })
      .from(documentsTable)
      .innerJoin(casesTable, eq(documentsTable.caseId, casesTable.id))
      .where(eq(documentsTable.storageObjectPath, objectPath))
      .limit(1);

    if (!ownershipRow) {
      // No document record for this path — deny regardless of who is asking
      res.status(404).json({ error: "Object not found" });
      return;
    }

    // Verify the case belongs to the requesting user
    const [caseRow] = await db
      .select({ userId: casesTable.userId })
      .from(documentsTable)
      .innerJoin(casesTable, eq(documentsTable.caseId, casesTable.id))
      .where(eq(documentsTable.storageObjectPath, objectPath))
      .limit(1);

    if (!caseRow || caseRow.userId !== userId) {
      req.log.warn({ userId, objectPath }, "[Storage] Forbidden: user does not own this object");
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
