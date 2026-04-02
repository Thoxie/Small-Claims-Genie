import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, chatMessagesTable, documentsTable } from "@workspace/db";
import { SendChatMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getUserId, getOwnedCase } from "../lib/owned-case";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are the Small Claims Genie, an expert AI legal assistant specializing in California small claims court. You help everyday people — often with no legal background — prepare, organize, and file their small claims cases with confidence.

Your role:
- Answer questions about the small claims process in plain, everyday English
- Review the user's case facts AND their uploaded documents — you have full access to extracted text from every document they uploaded
- Identify key facts, dates, dollar amounts, and names from documents and use them in your answers
- Help users understand what evidence is strong, what is weak, and what is missing
- Guide them on what to say and bring to court
- Provide step-by-step filing guidance for their specific county

Critical rules:
- You HAVE the document text — do NOT say you "can't see" or "don't have access" to documents when ocrText is present in the case context
- When asked to name or summarize documents, LIST every document by name and summarize its extracted contents
- Always use plain language — no legal jargon without explanation
- Be encouraging but honest — tell them if their case has weaknesses
- Lawyers are NOT allowed in small claims court — never suggest hiring one for the hearing
- Ground ALL advice in the specific case facts and documents provided above
- Be concise — users may be on mobile devices
- California small claims limits (2026): $12,500 for individuals, $6,250 for businesses`;

router.get("/cases/:id/chat", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.caseId, id))
    .orderBy(asc(chatMessagesTable.createdAt));

  res.json(messages);
});

router.post("/cases/:id/chat", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRecord) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const history = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.caseId, id))
    .orderBy(asc(chatMessagesTable.createdAt));

  await db.insert(chatMessagesTable).values({
    caseId: id,
    role: "user",
    content: parsed.data.content,
  });

  const caseContext = buildCaseContext(caseRecord, docs);

  const chatMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT + "\n\n" + caseContext },
    ...history.slice(-20).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: parsed.data.content },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  await db.insert(chatMessagesTable).values({
    caseId: id,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.delete("/cases/:id/chat", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.caseId, id));
  res.sendStatus(204);
});

function buildCaseContext(caseRecord: typeof casesTable.$inferSelect, docs: typeof documentsTable.$inferSelect[]): string {
  const parts: string[] = ["=== CASE CONTEXT ==="];

  parts.push(`Case Title: ${caseRecord.title}`);
  parts.push(`Status: ${caseRecord.status}`);
  if (caseRecord.claimAmount) parts.push(`Claim Amount: $${caseRecord.claimAmount}`);
  if (caseRecord.claimType) parts.push(`Claim Type: ${caseRecord.claimType}`);
  if (caseRecord.plaintiffName) parts.push(`Plaintiff: ${caseRecord.plaintiffName}`);
  if (caseRecord.defendantName) parts.push(`Defendant: ${caseRecord.defendantName}`);
  if (caseRecord.defendantIsBusinessOrEntity) parts.push(`Defendant is a business/entity`);
  if (caseRecord.claimDescription) parts.push(`\nClaim Description:\n${caseRecord.claimDescription}`);
  if (caseRecord.incidentDate) parts.push(`Incident Date: ${caseRecord.incidentDate}`);
  if (caseRecord.howAmountCalculated) parts.push(`Amount Calculation: ${caseRecord.howAmountCalculated}`);
  if (caseRecord.priorDemandMade !== null) parts.push(`Prior Demand Made: ${caseRecord.priorDemandMade ? 'Yes' : 'No'}`);
  if (caseRecord.priorDemandDescription) parts.push(`Demand Description: ${caseRecord.priorDemandDescription}`);
  if (caseRecord.countyId) parts.push(`Filing County: ${caseRecord.countyId}`);
  if (caseRecord.isSuingPublicEntity) parts.push(`Suing a public entity`);

  if (docs.length > 0) {
    parts.push(`\n=== UPLOADED DOCUMENTS (${docs.length} total) ===`);
    parts.push("IMPORTANT: You have full access to the extracted text of every document below. When the user asks about documents, name them and summarize their contents using this text.");
    for (const doc of docs) {
      parts.push(`\n--- Document: "${doc.originalName}" ---`);
      parts.push(`File type: ${doc.mimeType} | Label: ${doc.label || 'No label'} | OCR Status: ${doc.ocrStatus}`);
      if (doc.ocrText && doc.ocrText.length > 0 && !doc.ocrText.startsWith("[")) {
        const truncated = doc.ocrText.length > 6000;
        parts.push(`Extracted Text (${truncated ? 'first 6000 chars' : 'complete'}):\n${doc.ocrText.slice(0, 6000)}${truncated ? '\n... [document continues — ask user for more details if needed]' : ''}`);
      } else if (doc.ocrText?.startsWith("[")) {
        parts.push(`Extraction note: ${doc.ocrText}`);
      } else if (doc.ocrStatus === "processing") {
        parts.push(`[OCR still processing — text not yet available]`);
      } else {
        parts.push(`[No text was extracted from this document]`);
      }
    }
  } else {
    parts.push("\n[No documents uploaded yet — encourage the user to upload their evidence]");
  }

  return parts.join("\n");
}

export default router;
