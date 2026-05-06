import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { documentsTable, casesTable } from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middlewares/auth";
import { getUserId } from "../lib/owned-case";

function parseUploadUrlBody(body: unknown): { name: string; size: number; contentType: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || typeof b.size !== "number" || typeof b.contentType !== "string") return null;
  return { name: b.name, size: b.size, contentType: b.contentType };
}

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * Requires Clerk JWT — only authenticated users may obtain an upload URL.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const body = parseUploadUrlBody(req.body);
  if (!body) {
    res.status(400).json({ error: "Missing or invalid required fields (name, size, contentType)" });
    return;
  }

  try {
    const { name, size, contentType } = body;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
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
