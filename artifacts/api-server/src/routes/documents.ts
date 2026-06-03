import { Router, type IRouter } from "express";
import { Readable } from "stream";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, documentsTable } from "@workspace/db";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { checkAiRateLimit, checkAiRateLimitBulk, checkWriteRateLimit } from "../lib/rate-limiter";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import mammoth from "mammoth";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { ObjectStorageService } from "../lib/objectStorage";
import { logger } from "../lib/logger";

const objectStorage = new ObjectStorageService();
// Use lib path directly — pdf-parse index.js runs tests on import which crash in prod
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> = require("pdf-parse/lib/pdf-parse.js");

// pdfjs needs a canvas factory for Node.js rendering
const NodeCanvasFactory = {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  },
  reset(obj: { canvas: ReturnType<typeof createCanvas> }, width: number, height: number) {
    obj.canvas.width = width;
    obj.canvas.height = height;
  },
  destroy() { /* no-op */ },
};

// ── Per-user OCR concurrency gate ───────────────────────────────────────────
// Limits simultaneous background OCR jobs per user so a burst of uploads
// cannot spawn an unbounded number of CPU/AI-heavy goroutines in the Node process.
const MAX_CONCURRENT_OCR_PER_USER = 2;
const activeOcrJobs = new Map<string, number>();

function acquireOcrSlot(userId: string): boolean {
  const current = activeOcrJobs.get(userId) ?? 0;
  if (current >= MAX_CONCURRENT_OCR_PER_USER) return false;
  activeOcrJobs.set(userId, current + 1);
  return true;
}

function releaseOcrSlot(userId: string): void {
  const current = activeOcrJobs.get(userId) ?? 1;
  if (current <= 1) activeOcrJobs.delete(userId);
  else activeOcrJobs.set(userId, current - 1);
}

const router: IRouter = Router();

const storage = multer.memoryStorage();

// Accept by extension — browser-reported mime types vary across OS/versions
// (e.g. Windows sends application/octet-stream for PDFs on some browsers)
const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".docx"]);

// Map extension to canonical mime type so our OCR pipeline always sees a known value
function canonicalMime(originalname: string, reportedMime: string): string {
  const ext = originalname.toLowerCase().slice(originalname.lastIndexOf("."));
  const map: Record<string, string> = {
    ".pdf":  "application/pdf",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] ?? reportedMime;
}

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
    if (ALLOWED_EXTENSIONS.has(ext)) {
      // Normalize the mime type before multer stores it
      file.mimetype = canonicalMime(file.originalname, file.mimetype);
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type "${ext}". Upload a PDF, JPG, PNG, or DOCX.`));
    }
  },
});

// ── Shared OCR runner ────────────────────────────────────────────────────────
// Used by both the server-side upload route and the storage-finalize endpoint.
// Caller must hold (and release) the per-user OCR concurrency slot.
async function runOcr(params: {
  docId: number;
  userId: string;
  mime: string;
  originalName: string;
  buffer: Buffer;
}): Promise<void> {
  const { docId, userId, mime, originalName, buffer } = params;
  const log = logger.child({ docId, userId });

  let ocrText: string | null = null;

  try {
    // ── IMAGES → Vision API ──────────────────────────────────────────────────
    if (mime.startsWith("image/")) {
      const imgRateCheck = await checkAiRateLimit(userId);
      if (!imgRateCheck.allowed) {
        log.warn({ originalName }, "[OCR] Rate limit reached — skipping Vision OCR for image");
        await db.update(documentsTable).set({ ocrText: null, ocrStatus: "failed" }).where(eq(documentsTable.id, docId));
        return;
      }
      log.info({ originalName }, "[OCR] Processing image via Vision");
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL text from this document image exactly as written. Preserve structure, dates, amounts, names. This is a legal document for a California small claims court case — accuracy is critical. Return raw text only.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${buffer.toString("base64")}`,
                detail: "high",
              },
            },
          ],
        }],
      });
      ocrText = response.choices[0]?.message?.content ?? null;
      log.info({ chars: ocrText?.length ?? 0 }, "[OCR] Image Vision done");

    // ── DOCX → mammoth (direct XML text extraction, no AI needed) ───────────
    } else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      log.info({ originalName }, "[OCR] Processing DOCX via mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const extractedText = result.value?.trim() ?? "";
      if (result.messages?.length > 0) {
        log.warn({ warnings: result.messages.map((m: any) => m.message).join("; ") }, "[OCR] mammoth warnings");
      }
      ocrText = extractedText.length > 10 ? extractedText : null;
      log.info({ chars: ocrText?.length ?? 0 }, "[OCR] DOCX mammoth done");

    // ── PDF → pdf-parse (native text), fallback to Vision if scanned ────────
    } else if (mime === "application/pdf") {
      log.info({ originalName }, "[OCR] Processing PDF via pdf-parse");
      let nativeText = "";
      try {
        const parsed = await pdfParse(buffer);
        nativeText = parsed.text?.trim() ?? "";
        log.info({ chars: nativeText.length, pages: parsed.numpages }, "[OCR] pdf-parse result");
      } catch (parseErr) {
        log.warn({ err: parseErr }, "[OCR] pdf-parse failed, will try Vision fallback");
      }

      if (nativeText.length > 50) {
        // Good native text — use it directly
        ocrText = nativeText;
        log.info({ chars: ocrText.length }, "[OCR] PDF native text extracted");
      } else {
        // Scanned/image-only PDF — render each page to PNG via pdfjs-dist + @napi-rs/canvas
        // (pure Node.js, no system tools needed — works in both dev and production)
        // (OpenAI Files API and inline file_data are not supported by this proxy.)
        log.info({ nativeChars: nativeText.length }, "[OCR] PDF appears scanned, converting pages via pdfjs-dist");

        const pdfData = new Uint8Array(buffer);
        const pdfDoc = await (pdfjsLib as any).getDocument({
          data: pdfData,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
          disableFontFace: true,
          verbosity: 0,
        }).promise;

        // Cap pages to 10 — each page consumes one AI token; 20 pages let one upload
        // burn 20 tokens, enabling 600 AI calls/hour per user (30 uploads × 20 pages).
        const numPages = Math.min(pdfDoc.numPages, 10);
        log.info({ totalPages: pdfDoc.numPages, processing: numPages }, "[OCR] pdfjs loaded");

        // Reserve one AI token per page upfront (atomic bulk check).
        // This prevents a single upload from consuming multiple tokens while
        // only being counted as one against the rate limit.
        const pdfRateCheck = await checkAiRateLimitBulk(userId, numPages);
        if (!pdfRateCheck.allowed) {
          log.warn({ userId, originalName, pages: numPages }, "[OCR] Rate limit reached — skipping Vision OCR for scanned PDF");
          await db.update(documentsTable).set({ ocrText: null, ocrStatus: "failed" }).where(eq(documentsTable.id, docId));
          return;
        }

        // Maximum canvas dimension per side — prevents a crafted PDF with an
        // oversized page box from allocating gigabytes of memory in one render.
        const MAX_CANVAS_DIMENSION = 2000;

        const pageTexts: string[] = [];
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          // Compute a safe scale: start at 1.5 (~108 DPI) but clamp so neither
          // rendered dimension exceeds MAX_CANVAS_DIMENSION. A crafted PDF with an
          // enormous page box would otherwise force a multi-gigabyte canvas allocation.
          const naturalViewport = page.getViewport({ scale: 1.0 });
          const safeScale = Math.min(
            1.5,
            MAX_CANVAS_DIMENSION / naturalViewport.width,
            MAX_CANVAS_DIMENSION / naturalViewport.height
          );
          const viewport = page.getViewport({ scale: safeScale });

          const canvasObj = NodeCanvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
          await page.render({
            canvasContext: canvasObj.context as any,
            viewport,
            canvasFactory: NodeCanvasFactory,
          }).promise;
          page.cleanup();

          const pngBuffer = (canvasObj.canvas as any).toBuffer("image/png") as Buffer;
          const pageB64 = pngBuffer.toString("base64");

          const pageResp = await openai.chat.completions.create({
            model: "gpt-5.2",
            max_completion_tokens: 3000,
            messages: [{
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract ALL text from this scanned document page exactly as written — every date, dollar amount, name, address, and legal term. This is a page from a California small claims court document. Return raw extracted text only, preserving structure.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${pageB64}`,
                    detail: "high",
                  },
                },
              ],
            }],
          });
          const pageText = pageResp.choices[0]?.message?.content ?? "";
          pageTexts.push(pageText);
          log.info({ pageNum, numPages, chars: pageText.length }, "[OCR] Page done");
        }

        ocrText = pageTexts.join("\n\n--- Page Break ---\n\n");
        log.info({ totalChars: ocrText.length }, "[OCR] pdfjs+Vision done");
      }
    }

    const finalText = ocrText && ocrText.trim().length > 10 ? ocrText : null;

    await db.update(documentsTable)
      .set({
        ocrText: finalText,
        ocrStatus: finalText ? "complete" : "failed",
      })
      .where(eq(documentsTable.id, docId));

    log.info({ status: finalText ? "complete" : "failed" }, "[OCR] DB updated");

  } catch (err) {
    log.error({ err, originalName }, "[OCR] Extraction error");
    await db.update(documentsTable)
      .set({ ocrText: null, ocrStatus: "failed" })
      .where(eq(documentsTable.id, docId));
  }
}

router.get("/cases/:id/documents", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }
  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const safeDocs = docs.map(({ fileData: _fileData, ...rest }) => rest);
  res.json(safeDocs);
});

// Serve the raw file so the user can view/download it in the browser
router.get("/cases/:id/documents/:docId/file", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const caseId = parseInt(req.params.id, 10);
  const docId = parseInt(req.params.docId, 10);
  if (isNaN(caseId) || isNaN(docId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const ownedCase = await getOwnedCase(caseId, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }
  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, docId));
  if (!doc || doc.caseId !== caseId) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const mime = doc.mimeType ?? "application/octet-stream";
  const disposition = mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ? `attachment; filename="${doc.originalName}"`
    : `inline; filename="${doc.originalName}"`;
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", disposition);

  if (doc.storageObjectPath) {
    const objectFile = await objectStorage.getObjectEntityFile(doc.storageObjectPath);
    const gcsRes = await objectStorage.downloadObject(objectFile);
    res.status(gcsRes.status);
    gcsRes.headers.forEach((value, key) => { if (key.toLowerCase() !== "content-disposition") res.setHeader(key, value); });
    if (gcsRes.body) {
      Readable.fromWeb(gcsRes.body as import("stream/web").ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } else {
    const buffer = Buffer.from((doc as any).fileData as string, "base64");
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  }
});

router.post("/cases/:id/documents", upload.single("file"), async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = await checkWriteRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `Too many requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes before trying again.` });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const caseRecord = await getOwnedCase(id, userId);
  if (!caseRecord) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const label = typeof req.body.label === "string" ? req.body.label : null;
  const filename = `case-${id}-${Date.now()}-${req.file.originalname}`;

  // Upload to object storage — no DB blob fallback
  let storageObjectPath: string;
  try {
    const uploadURL = await objectStorage.getObjectEntityUploadURL();
    storageObjectPath = objectStorage.normalizeObjectEntityPath(uploadURL);
    const gcsUploadRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": req.file.mimetype },
      body: req.file.buffer,
      duplex: "half",
      signal: AbortSignal.timeout(60_000),
    } as RequestInit);
    if (!gcsUploadRes.ok) {
      throw new Error(`GCS PUT returned ${gcsUploadRes.status}`);
    }
  } catch (storageErr) {
    req.log.error({ err: storageErr }, "[Storage] GCS upload failed");
    res.status(503).json({ error: "File storage is temporarily unavailable. Please try again in a moment." });
    return;
  }

  const [doc] = await db.insert(documentsTable).values({
    caseId: id,
    filename,
    originalName: req.file.originalname,
    label,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    fileData: null,
    storageObjectPath,
    ocrStatus: "processing",
  }).returning();

  await db.update(casesTable)
    .set({ documentCount: (caseRecord.documentCount ?? 0) + 1 })
    .where(eq(casesTable.id, id));

  const { fileData: _fileData, ...safeDoc } = doc;
  res.status(201).json({ ...safeDoc, ocrStatus: "processing" });

  // ── OCR pipeline (runs after response is sent) ──────────────────────────────
  setImmediate(() => {
    if (!acquireOcrSlot(userId)) {
      req.log.warn({ userId, docId: doc.id }, "[OCR] Per-user concurrency limit reached — skipping OCR");
      db.update(documentsTable)
        .set({ ocrText: null, ocrStatus: "failed" })
        .where(eq(documentsTable.id, doc.id))
        .catch((err) => req.log.error({ err }, "[OCR] Failed to update status after concurrency reject"));
      return;
    }
    runOcr({
      docId: doc.id,
      userId,
      mime: req.file!.mimetype,
      originalName: req.file!.originalname,
      buffer: req.file!.buffer,
    }).finally(() => releaseOcrSlot(userId));
  });
});

// ── POST /cases/:id/documents/:docId/storage-finalize ───────────────────────
// Called by the client after completing a direct-to-GCS upload via a presigned
// URL issued by POST /storage/uploads/request-url.
//
// Security responsibilities:
//   1. Verifies the GCS object's actual size and content-type against policy.
//      Because signed PUT URLs cannot carry content-length-range or content-type
//      constraints via the Replit sidecar, we enforce limits here after the fact.
//   2. Deletes the GCS object AND the pending document row if either constraint
//      is violated — no oversized or off-type objects survive in storage.
//   3. Triggers the OCR pipeline (same as the server-side upload path) only
//      for compliant objects.
router.post("/cases/:id/documents/:docId/storage-finalize", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const caseId = parseInt(req.params.id, 10);
  const docId = parseInt(req.params.docId, 10);
  if (isNaN(caseId) || isNaN(docId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const ownedCase = await getOwnedCase(caseId, userId);
  if (!ownedCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, docId), eq(documentsTable.caseId, caseId)));

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  if (doc.ocrStatus !== "pending") {
    res.status(409).json({ error: "Document has already been finalized." });
    return;
  }

  if (!doc.storageObjectPath) {
    res.status(422).json({ error: "Document has no associated storage object." });
    return;
  }

  // ── Fetch GCS metadata to enforce size and content-type constraints ──────
  const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
  const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

  let gcsContentType: string | undefined;
  let gcsSizeBytes: number | undefined;

  try {
    const objectFile = await objectStorage.getObjectEntityFile(doc.storageObjectPath);
    const [metadata] = await objectFile.getMetadata();
    gcsContentType = metadata.contentType as string | undefined;
    gcsSizeBytes = metadata.size ? Number(metadata.size) : undefined;

    // Fail closed: if GCS does not return both fields we cannot verify the upload.
    // Treat missing metadata the same as a policy violation — reject and delete.
    if (!gcsContentType || gcsSizeBytes === undefined || isNaN(gcsSizeBytes)) {
      req.log.warn({ userId, docId, gcsContentType, gcsSizeBytes }, "[Finalize] GCS metadata incomplete — rejecting upload");
      try { await objectFile.delete(); } catch (delErr) {
        req.log.warn({ err: delErr }, "[Finalize] GCS delete failed after incomplete metadata");
      }
      await db.delete(documentsTable).where(eq(documentsTable.id, docId));
      await db.update(casesTable)
        .set({ documentCount: sql`GREATEST(COALESCE(document_count, 1) - 1, 0)` })
        .where(eq(casesTable.id, caseId));
      res.status(422).json({ error: "Could not verify the uploaded file. Please try again." });
      return;
    }

    const sizeViolation = gcsSizeBytes > MAX_UPLOAD_SIZE_BYTES;
    const typeViolation = !ALLOWED_MIME_TYPES.has(gcsContentType);

    if (sizeViolation || typeViolation) {
      req.log.warn({ userId, docId, gcsSizeBytes, gcsContentType, sizeViolation, typeViolation }, "[Finalize] GCS object violates policy — deleting");
      // Best-effort GCS delete; then remove the document row and reconcile count
      try { await objectFile.delete(); } catch (delErr) {
        req.log.warn({ err: delErr }, "[Finalize] GCS delete failed after policy violation");
      }
      await db.delete(documentsTable).where(eq(documentsTable.id, docId));
      await db.update(casesTable)
        .set({ documentCount: sql`GREATEST(COALESCE(document_count, 1) - 1, 0)` })
        .where(eq(casesTable.id, caseId));
      res.status(422).json({
        error: sizeViolation
          ? `File too large. Maximum allowed size is ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)} MB.`
          : "Unsupported file type.",
      });
      return;
    }
  } catch (metaErr) {
    req.log.error({ err: metaErr, docId }, "[Finalize] Failed to fetch GCS metadata");
    res.status(503).json({ error: "Could not verify uploaded file. Please try again." });
    return;
  }

  // ── Object is compliant — update metadata from GCS source of truth ───────
  // Both gcsContentType and gcsSizeBytes are guaranteed defined at this point.
  const verifiedMime = gcsContentType!;
  const verifiedSize = gcsSizeBytes!;

  await db.update(documentsTable)
    .set({ mimeType: verifiedMime, fileSize: verifiedSize, ocrStatus: "processing" })
    .where(eq(documentsTable.id, docId));

  const { fileData: _fd, ...safeDoc } = doc;
  res.status(200).json({ ...safeDoc, mimeType: verifiedMime, fileSize: verifiedSize, ocrStatus: "processing" });

  // ── Download GCS object and run OCR pipeline ──────────────────────────────
  setImmediate(async () => {
    if (!acquireOcrSlot(userId)) {
      logger.warn({ userId, docId }, "[Finalize/OCR] Per-user concurrency limit reached — skipping OCR");
      await db.update(documentsTable)
        .set({ ocrStatus: "failed" })
        .where(eq(documentsTable.id, docId))
        .catch((err) => logger.error({ err }, "[Finalize/OCR] Failed to update status after concurrency reject"));
      return;
    }
    try {
      const objectFile = await objectStorage.getObjectEntityFile(doc.storageObjectPath!);
      const gcsResponse = await objectStorage.downloadObject(objectFile);
      if (!gcsResponse.body) {
        throw new Error("GCS download returned no body");
      }
      const chunks: Buffer[] = [];
      const nodeStream = Readable.fromWeb(gcsResponse.body as import("stream/web").ReadableStream<Uint8Array>);
      for await (const chunk of nodeStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      await runOcr({ docId, userId, mime: verifiedMime, originalName: doc.originalName, buffer });
    } catch (downloadErr) {
      logger.error({ err: downloadErr, docId }, "[Finalize/OCR] Failed to download GCS object for OCR");
      await db.update(documentsTable)
        .set({ ocrStatus: "failed" })
        .where(eq(documentsTable.id, docId))
        .catch((err) => logger.error({ err }, "[Finalize/OCR] Failed to update status after download error"));
    } finally {
      releaseOcrSlot(userId);
    }
  });
});

router.patch("/cases/:id/documents/:docId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawDocId = Array.isArray(req.params.docId) ? req.params.docId[0] : req.params.docId;
  const id = parseInt(rawId, 10);
  const docId = parseInt(rawDocId, 10);
  if (isNaN(id) || isNaN(docId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }
  const { label, description } = req.body;
  const update: Record<string, any> = {};
  if (typeof label === "string") update.label = label.trim() || null;
  if (typeof description === "string") update.description = description.trim() || null;
  const [updated] = await db.update(documentsTable).set(update).where(and(eq(documentsTable.id, docId), eq(documentsTable.caseId, id))).returning();
  if (!updated) { res.status(404).json({ error: "Document not found" }); return; }
  res.json(updated);
});

router.delete("/cases/:id/documents/:docId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawDocId = Array.isArray(req.params.docId) ? req.params.docId[0] : req.params.docId;
  const id = parseInt(rawId, 10);
  const docId = parseInt(rawDocId, 10);

  if (isNaN(id) || isNaN(docId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const [deleted] = await db.delete(documentsTable).where(and(eq(documentsTable.id, docId), eq(documentsTable.caseId, id))).returning();
  if (!deleted) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (caseRecord) {
    await db.update(casesTable)
      .set({ documentCount: Math.max(0, (caseRecord.documentCount ?? 1) - 1) })
      .where(eq(casesTable.id, id));
  }

  res.sendStatus(204);
});

export default router;
