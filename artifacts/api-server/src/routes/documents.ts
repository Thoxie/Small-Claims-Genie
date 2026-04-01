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
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
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

  setImmediate(async () => {
    try {
      let ocrText: string | null = null;

      if (req.file!.mimetype.startsWith("image/")) {
        const response = await openai.chat.completions.create({
          model: "gpt-5.2",
          max_completion_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all text from this document image. Return the raw text only, preserving the original structure as much as possible. This is a legal document, so accuracy is critical.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${req.file!.mimetype};base64,${fileBase64}`,
                    detail: "high",
                  },
                },
              ],
            },
          ],
        });
        ocrText = response.choices[0]?.message?.content ?? null;
      } else if (req.file!.mimetype === "application/pdf") {
        const response = await openai.chat.completions.create({
          model: "gpt-5.2",
          max_completion_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "This is a PDF document encoded in base64. Extract and return all readable text from it. This is a legal document used in a small claims court case.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${fileBase64}`,
                    detail: "high",
                  },
                },
              ],
            },
          ],
        });
        ocrText = response.choices[0]?.message?.content ?? null;
      } else {
        ocrText = "[Document type does not support automatic text extraction. Add a label to describe this document.]";
      }

      await db.update(documentsTable)
        .set({ ocrText, ocrStatus: "complete" })
        .where(eq(documentsTable.id, doc.id));
    } catch (err) {
      await db.update(documentsTable)
        .set({ ocrStatus: "failed" })
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
