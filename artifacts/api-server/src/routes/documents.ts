import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, documentsTable } from "@workspace/db";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, PNG, and DOCX files are supported"));
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

      // ── IMAGES: send directly to GPT Vision ────────────────────────────────
      if (mime.startsWith("image/")) {
        console.log(`[OCR] Processing image: ${originalName}`);
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
        console.log(`[OCR] Image done, chars extracted: ${ocrText?.length ?? 0}`);

      // ── PDFs + DOCX: upload to OpenAI Files API → GPT reads it ─────────────
      } else if (
        mime === "application/pdf" ||
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const fileType = mime === "application/pdf" ? "PDF" : "DOCX";
        console.log(`[OCR] Uploading ${fileType} to OpenAI Files API: ${originalName}`);

        // Map DOCX mime to a name OpenAI will accept
        const uploadName = mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ? originalName.endsWith(".docx") ? originalName : originalName + ".docx"
          : originalName;

        let uploadedFileId: string | null = null;

        try {
          const filesApi = openai.files as any;
          const uploadedFile = await filesApi.create({
            file: new File([buffer], uploadName, { type: mime }),
            purpose: "user_data",
          });
          uploadedFileId = uploadedFile.id;
          console.log(`[OCR] File uploaded, id: ${uploadedFileId}`);

          const response = await openai.chat.completions.create({
            model: "gpt-5.2",
            max_completion_tokens: 4096,
            messages: [{
              role: "user",
              content: [
                {
                  type: "file",
                  file: { file_id: uploadedFileId },
                } as any,
                {
                  type: "text",
                  text: `Extract ALL text from this ${fileType} document exactly as written. Preserve every date, dollar amount, name, address, and legal term. This is a legal document for a California small claims court case — accuracy is critical. If this is a scanned document, use OCR to read it. Return the complete extracted text only.`,
                },
              ],
            }],
          });

          ocrText = response.choices[0]?.message?.content ?? null;
          console.log(`[OCR] ${fileType} extraction done, chars: ${ocrText?.length ?? 0}`);
        } finally {
          if (uploadedFileId) {
            const filesApi = openai.files as any;
            await filesApi.del(uploadedFileId).catch((e: unknown) => {
              console.warn("[OCR] Failed to delete OpenAI file:", e);
            });
          }
        }
      }

      const finalText = ocrText && ocrText.trim().length > 10
        ? ocrText
        : null;

      await db.update(documentsTable)
        .set({
          ocrText: finalText,
          ocrStatus: finalText ? "complete" : "failed",
        })
        .where(eq(documentsTable.id, doc.id));

      console.log(`[OCR] Saved to DB — status: ${finalText ? "complete" : "failed"}`);

    } catch (err) {
      console.error("[OCR] Extraction error for", req.file!.originalname, ":", err);
      await db.update(documentsTable)
        .set({
          ocrText: null,
          ocrStatus: "failed",
        })
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
