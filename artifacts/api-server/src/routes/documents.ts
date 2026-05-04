import { Router, type IRouter } from "express";
import { Readable } from "stream";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, documentsTable } from "@workspace/db";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { checkAiRateLimit } from "../lib/rate-limiter";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import mammoth from "mammoth";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { ObjectStorageService } from "../lib/objectStorage";

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
  setImmediate(async () => {
    let ocrText: string | null = null;

    try {
      const mime = req.file!.mimetype;
      const originalName = req.file!.originalname;
      const buffer = req.file!.buffer;

      // ── IMAGES → Vision API ──────────────────────────────────────────────────
      if (mime.startsWith("image/")) {
        const imgRateCheck = await checkAiRateLimit(userId);
        if (!imgRateCheck.allowed) {
          req.log.warn({ userId, originalName }, "[OCR] Rate limit reached — skipping Vision OCR for image");
          await db.update(documentsTable).set({ ocrText: null, ocrStatus: "failed" }).where(eq(documentsTable.id, doc.id));
          return;
        }
        req.log.info({ originalName }, "[OCR] Processing image via Vision");
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
        req.log.info({ chars: ocrText?.length ?? 0 }, "[OCR] Image Vision done");

      // ── DOCX → mammoth (direct XML text extraction, no AI needed) ───────────
      } else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        req.log.info({ originalName }, "[OCR] Processing DOCX via mammoth");
        const result = await mammoth.extractRawText({ buffer });
        const extractedText = result.value?.trim() ?? "";
        if (result.messages?.length > 0) {
          req.log.warn({ warnings: result.messages.map((m: any) => m.message).join("; ") }, "[OCR] mammoth warnings");
        }
        ocrText = extractedText.length > 10 ? extractedText : null;
        req.log.info({ chars: ocrText?.length ?? 0 }, "[OCR] DOCX mammoth done");

      // ── PDF → pdf-parse (native text), fallback to Vision if scanned ────────
      } else if (mime === "application/pdf") {
        req.log.info({ originalName }, "[OCR] Processing PDF via pdf-parse");
        let nativeText = "";
        try {
          const parsed = await pdfParse(buffer);
          nativeText = parsed.text?.trim() ?? "";
          req.log.info({ chars: nativeText.length, pages: parsed.numpages }, "[OCR] pdf-parse result");
        } catch (parseErr) {
          req.log.warn({ err: parseErr }, "[OCR] pdf-parse failed, will try Vision fallback");
        }

        if (nativeText.length > 50) {
          // Good native text — use it directly
          ocrText = nativeText;
          req.log.info({ chars: ocrText.length }, "[OCR] PDF native text extracted");
        } else {
          // Scanned/image-only PDF — render each page to PNG via pdfjs-dist + @napi-rs/canvas
          // (pure Node.js, no system tools needed — works in both dev and production)
          // (OpenAI Files API and inline file_data are not supported by this proxy.)
          req.log.info({ nativeChars: nativeText.length }, "[OCR] PDF appears scanned, converting pages via pdfjs-dist");

          const pdfData = new Uint8Array(buffer);
          const pdfDoc = await (pdfjsLib as any).getDocument({
            data: pdfData,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: 0,
          }).promise;

          const numPages = Math.min(pdfDoc.numPages, 20);
          req.log.info({ totalPages: pdfDoc.numPages, processing: numPages }, "[OCR] pdfjs loaded");

          const pdfRateCheck = await checkAiRateLimit(userId);
          if (!pdfRateCheck.allowed) {
            req.log.warn({ userId, originalName }, "[OCR] Rate limit reached — skipping Vision OCR for scanned PDF");
            await db.update(documentsTable).set({ ocrText: null, ocrStatus: "failed" }).where(eq(documentsTable.id, doc.id));
            return;
          }

          const pageTexts: string[] = [];
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 }); // ~108 DPI — legible for Vision

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
            req.log.info({ pageNum, numPages, chars: pageText.length }, "[OCR] Page done");
          }

          ocrText = pageTexts.join("\n\n--- Page Break ---\n\n");
          req.log.info({ totalChars: ocrText.length }, "[OCR] pdfjs+Vision done");
        }
      }

      const finalText = ocrText && ocrText.trim().length > 10 ? ocrText : null;

      await db.update(documentsTable)
        .set({
          ocrText: finalText,
          ocrStatus: finalText ? "complete" : "failed",
        })
        .where(eq(documentsTable.id, doc.id));

      req.log.info({ status: finalText ? "complete" : "failed", docId: doc.id }, "[OCR] DB updated");

    } catch (err) {
      req.log.error({ err, originalName: req.file!.originalname }, "[OCR] Extraction error");
      await db.update(documentsTable)
        .set({ ocrText: null, ocrStatus: "failed" })
        .where(eq(documentsTable.id, doc.id));
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
