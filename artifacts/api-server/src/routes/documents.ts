import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, documentsTable } from "@workspace/db";
import multer from "multer";
import { openai, toFile } from "@workspace/integrations-openai-ai-server";
import mammoth from "mammoth";
// Use lib path directly — pdf-parse index.js runs tests on import which crash in prod
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> = require("pdf-parse/lib/pdf-parse.js");

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
  limits: { fileSize: 20 * 1024 * 1024 },
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
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }
  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const safeDocs = docs.map(({ fileData: _fileData, ...rest }) => rest);
  res.json(safeDocs);
});

router.post("/cases/:id/documents", upload.single("file"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRecord) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const label = typeof req.body.label === "string" ? req.body.label : null;
  const fileBase64 = req.file.buffer.toString("base64");
  const filename = `case-${id}-${Date.now()}-${req.file.originalname}`;

  const [doc] = await db.insert(documentsTable).values({
    caseId: id,
    filename,
    originalName: req.file.originalname,
    label,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    fileData: fileBase64,
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
        console.log(`[OCR] Processing image via Vision: ${originalName}`);
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
                  url: `data:${mime};base64,${fileBase64}`,
                  detail: "high",
                },
              },
            ],
          }],
        });
        ocrText = response.choices[0]?.message?.content ?? null;
        console.log(`[OCR] Image Vision done — chars extracted: ${ocrText?.length ?? 0}`);

      // ── DOCX → mammoth (direct XML text extraction, no AI needed) ───────────
      } else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        console.log(`[OCR] Processing DOCX via mammoth: ${originalName}`);
        const result = await mammoth.extractRawText({ buffer });
        const extractedText = result.value?.trim() ?? "";
        if (result.messages?.length > 0) {
          console.log(`[OCR] mammoth warnings:`, result.messages.map((m: any) => m.message).join("; "));
        }
        ocrText = extractedText.length > 10 ? extractedText : null;
        console.log(`[OCR] DOCX mammoth done — chars extracted: ${ocrText?.length ?? 0}`);

      // ── PDF → pdf-parse (native text), fallback to Vision if scanned ────────
      } else if (mime === "application/pdf") {
        console.log(`[OCR] Processing PDF via pdf-parse: ${originalName}`);
        let nativeText = "";
        try {
          const parsed = await pdfParse(buffer);
          nativeText = parsed.text?.trim() ?? "";
          console.log(`[OCR] pdf-parse result — chars: ${nativeText.length}, pages: ${parsed.numpages}`);
        } catch (parseErr) {
          console.warn(`[OCR] pdf-parse failed, will try Vision fallback:`, parseErr);
        }

        if (nativeText.length > 50) {
          // Good native text — use it directly
          ocrText = nativeText;
          console.log(`[OCR] PDF native text extracted — ${ocrText.length} chars`);
        } else {
          // Scanned/image-only PDF — upload to Files API then reference by file_id
          // in the Responses API (inline file_data is not supported for this model)
          console.log(`[OCR] PDF appears scanned (${nativeText.length} chars native), uploading to Files API for Responses API`);
          let uploadedFileId: string | null = null;
          try {
            const uploaded = await openai.files.create({
              file: await toFile(buffer, originalName, { type: "application/pdf" }),
              purpose: "user_data",
            });
            uploadedFileId = uploaded.id;
            console.log(`[OCR] Files API upload complete — file_id: ${uploadedFileId}`);
          } catch (uploadErr) {
            console.error(`[OCR] Files API upload failed:`, uploadErr);
          }

          if (uploadedFileId) {
            const responsesApi = (openai as any).responses;
            const resp = await responsesApi.create({
              model: "gpt-5.2",
              input: [
                {
                  role: "user",
                  content: [
                    {
                      type: "input_file",
                      file_id: uploadedFileId,
                    },
                    {
                      type: "input_text",
                      text: "Extract ALL text from this scanned PDF document exactly as written — every date, dollar amount, name, address, and legal term. This is for a California small claims court case. Return the complete extracted text only.",
                    },
                  ],
                },
              ],
            });
            ocrText = resp.output_text ?? resp.output?.[0]?.content?.[0]?.text ?? null;
            console.log(`[OCR] PDF Responses API (file_id) done — chars: ${ocrText?.length ?? 0}`);

            // Clean up the uploaded file after extraction
            try {
              await openai.files.del(uploadedFileId);
              console.log(`[OCR] Files API cleanup — deleted ${uploadedFileId}`);
            } catch {
              // Non-critical cleanup failure
            }
          } else {
            console.error(`[OCR] No file_id available — scanned PDF OCR skipped`);
          }
        }
      }

      const finalText = ocrText && ocrText.trim().length > 10 ? ocrText : null;

      await db.update(documentsTable)
        .set({
          ocrText: finalText,
          ocrStatus: finalText ? "complete" : "failed",
        })
        .where(eq(documentsTable.id, doc.id));

      console.log(`[OCR] DB updated — status: ${finalText ? "complete" : "failed"}, doc id: ${doc.id}`);

    } catch (err) {
      console.error("[OCR] Extraction error for", req.file!.originalname, ":", err);
      await db.update(documentsTable)
        .set({ ocrText: null, ocrStatus: "failed" })
        .where(eq(documentsTable.id, doc.id));
    }
  });
});

router.delete("/cases/:id/documents/:docId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawDocId = Array.isArray(req.params.docId) ? req.params.docId[0] : req.params.docId;
  const id = parseInt(rawId, 10);
  const docId = parseInt(rawDocId, 10);

  if (isNaN(id) || isNaN(docId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [deleted] = await db.delete(documentsTable).where(eq(documentsTable.id, docId)).returning();
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
