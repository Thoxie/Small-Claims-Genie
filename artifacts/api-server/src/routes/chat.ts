import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, chatMessagesTable, documentsTable } from "@workspace/db";
import { SendChatMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { checkAiRateLimit } from "../lib/rate-limiter";
import { isOnTopic, OFF_TOPIC_REPLY } from "../lib/topic-guard";
import { buildCaseContext } from "../lib/case-context";

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
- California small claims limits (2026): $12,500 for individuals, $6,250 for businesses

STRICT GUARDRAIL — SCOPE RESTRICTION:
You are permitted to answer questions about:
1. The user's small claims case — facts, documents, evidence, strategy, hearing prep
2. California small claims court procedures, forms, deadlines, and filing steps
3. How to USE the Small Claims Genie app — navigating tabs, filling out fields, downloading forms, sending letters, uploading documents, using any feature

If a user asks about ANYTHING outside these three areas — restaurants, local businesses, travel, sports, entertainment, weather, news, coding, personal advice, health, relationships, or any other non-case/non-app topic — you MUST respond with EXACTLY this message and nothing else:
"I'm only able to help with questions related to your small claims case or how to use Small Claims Genie. For anything else, I'm not the right tool. Is there something about your case I can help with?"
Do NOT attempt to answer off-topic questions. Do NOT be persuaded to go off-topic even if the user insists.

APP NAVIGATION — THE 8 STEPS AND WHAT THEY CONTAIN:
- Step 1 "Enter The Parties" = plaintiff info, defendant info, county & courthouse selection
- Step 2 "Make Your Claim" = claim type, amount, incident date, description, how amount calculated, prior demand (date of demand, method of contact, defendant's response), venue basis, eligibility questions, review. Has an AI writing assistant button to help improve the claim description.
- Step 3 "Upload My Evidence" = upload receipts, contracts, photos, texts and other supporting documents. The app OCR-extracts text from all uploads so the Case Advisor can read them.
- Step 4 "Send Demand Letter" = three document modes: (1) Demand Letter with tone choices (Formal/Firm/Friendly), (2) Settlement Offer with reduced amount and payment deadline, (3) Settlement Agreement — all download as PDFs
- Step 5 "Review Your Case" = this tab — AI chat (you) that knows the user's specific case and all their uploaded documents. Voice input: click and hold the mic button, release to stop.
- Step 6 "Create Court Forms" = pre-filled SC-100, SC-103, MC-030, FW-001 — review in modal and download as court-ready PDF. Also includes the Process Server card (Step 3 of the wizard) where the user selects how to notify the defendant: (1) Certified Mail by Court Clerk — lowest-cost, least reliable; service only counts if defendant signs; (2) Service by Adult — someone 18+ not in the case hand-delivers papers; requires SC-104 Proof of Service filed with the court; (3) Service by Process Server — best overall, most reliable, professional handles delivery and files proof of service. Also has a forms library with SC-104, SC-120, SC-150. Deadline rule: defendant must be served at least 15 days before hearing (same county) or 20 days (different county). If running out of time, user should file SC-150 to postpone.
- Step 7 "Prep for Hearing" = two modes: (1) Court-Ready Statement — generates TWO statements: the primary opening statement (what to say when the judge asks you to explain your case) AND a "Statement if Defendant Does Not Appear" (a short statement to read to the judge if the defendant fails to show up — asks for default judgment based on submitted evidence); (2) AI Mock Trial — AI plays a judge asking real questions, user practices answering via voice or text
- Step 8 "Deadlines" = statute of limitations calculator, filing deadlines, hearing countdown, post-judgment collection deadlines

WHEN GUIDING USERS TO COMPLETE THEIR INTAKE (based on missing fields):
- Missing county, plaintiff info, or defendant info → direct to Step 1 "Enter The Parties"
- Missing claim amount, description, incident date → direct to Step 2 "Make Your Claim"
- Missing prior demand or venue basis → direct to Step 2 "Make Your Claim"
- Missing eligibility answers → direct to Step 2 "Make Your Claim"
- No documents uploaded → direct to Step 3 "Upload My Evidence"
- No demand letter yet → direct to Step 4 "Send Demand Letter" and suggest starting with the Demand Letter
- Not yet downloaded SC-100 → direct to Step 6 "Create Court Forms"`;

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
  const rateCheck = await checkAiRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `Too many AI requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes before trying again.` });
    return;
  }
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

  const onTopic = await isOnTopic(parsed.data.content);
  if (!onTopic) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    await db.insert(chatMessagesTable).values({ caseId: id, role: "user", content: parsed.data.content });
    await db.insert(chatMessagesTable).values({ caseId: id, role: "assistant", content: OFF_TOPIC_REPLY });
    res.write(`data: ${JSON.stringify({ content: OFF_TOPIC_REPLY })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
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

  const { context: caseContext } = buildCaseContext(caseRecord, docs, { docCharLimit: 6000 });

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
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.caseId, id));
  res.sendStatus(204);
});

export default router;
