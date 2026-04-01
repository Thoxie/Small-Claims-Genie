import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, chatMessagesTable, documentsTable } from "@workspace/db";
import { SendChatMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are the Small Claims Genie, a friendly and knowledgeable legal assistant specializing in California small claims court. You help everyday people — often with no legal background — prepare and file their small claims cases.

Your role:
- Answer questions about the small claims process in plain English
- Help users understand their rights and options
- Review their case details and evidence to give practical advice
- Guide them on what to bring to court
- Explain legal terms simply

Rules:
- Always use plain language — no legal jargon without explanation
- Be encouraging but honest — tell them if their case has weaknesses
- Never tell them to hire a lawyer (small claims court doesn't allow lawyers)
- Ground your advice in the case facts and documents provided
- Be concise — users are on mobile devices
- If the user asks something outside your expertise, say so clearly`;

router.get("/cases/:id/chat", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.caseId, id))
    .orderBy(asc(chatMessagesTable.createdAt));

  res.json(messages);
});

router.post("/cases/:id/chat", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

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
    parts.push("\n=== UPLOADED DOCUMENTS ===");
    for (const doc of docs) {
      parts.push(`\nDocument: ${doc.originalName} (${doc.label || 'No label'})`);
      if (doc.ocrText) {
        parts.push(`Extracted Text:\n${doc.ocrText.slice(0, 2000)}${doc.ocrText.length > 2000 ? '... [truncated]' : ''}`);
      } else {
        parts.push(`[No text extracted]`);
      }
    }
  } else {
    parts.push("\n[No documents uploaded yet]");
  }

  return parts.join("\n");
}

export default router;
