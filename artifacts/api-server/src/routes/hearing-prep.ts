import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, documentsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { checkAiRateLimit } from "../lib/rate-limiter";
import { isOnTopic, OFF_TOPIC_REPLY } from "../lib/topic-guard";

const router: IRouter = Router();

const HEARING_PREP_SYSTEM_PROMPT = `You are facilitating a California small claims court practice hearing. Your role is to help the plaintiff prepare for their upcoming hearing by conducting a realistic, encouraging practice session.

Your approach:
- Speak in plain, clear English — no legal jargon without explanation
- Be firm but kind — like a good teacher who wants them to succeed
- Stay in the role of the court throughout the session
- Use the case context provided to ask questions specific to their case
- Ask follow-up questions that a real court hearing would include
- Point out when an answer is strong and when it needs more detail
- After 5-6 exchanges, offer a summary of how they did and specific tips

Session flow:
1. Introduce yourself and explain the practice session warmly
2. Ask them to state their name and explain in their own words what happened
3. Ask 3-4 specific follow-up questions based on their answers (amounts, dates, evidence, what they tried first)
4. Challenge any vague answers politely — "Can you be more specific about..."
5. After the session, give encouraging feedback with 2-3 specific improvements

Critical rules:
- Never break character unless the user explicitly asks to stop
- Base your questions entirely on the actual case facts provided — amounts, parties, incident date
- If they give a strong answer, say so — this builds confidence
- If an answer is weak, ask them to try again with more detail
- Keep each response concise — judges speak clearly, not in paragraphs
- The goal is confidence-building, not intimidation

STRICT GUARDRAIL — SCOPE RESTRICTION:
You are ONLY permitted to engage with content related to the user's court case and small claims hearing preparation.
If the user asks about ANYTHING off-topic — restaurants, travel, entertainment, sports, news, coding, health, or any non-legal topic — respond in character as a judge: "That's outside the scope of these proceedings. Let's stay focused on your case. Please answer my question."
Do NOT break character. Do NOT answer off-topic questions under any circumstances.`;

function buildHearingPrepContext(caseRecord: typeof casesTable.$inferSelect, docs: typeof documentsTable.$inferSelect[]): string {
  const parts: string[] = ["=== CASE FACTS FOR THIS PRACTICE SESSION ==="];

  parts.push(`Plaintiff: ${caseRecord.plaintiffName || "[not entered]"}`);
  parts.push(`Defendant: ${caseRecord.defendantName || "[not entered]"}${caseRecord.defendantIsBusinessOrEntity ? " (business/entity)" : ""}`);
  parts.push(`Claim Amount: ${caseRecord.claimAmount ? `$${caseRecord.claimAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "[not entered]"}`);
  parts.push(`Claim Type: ${caseRecord.claimType || "[not specified]"}`);
  parts.push(`Incident Date: ${caseRecord.incidentDate || "[not entered]"}`);
  parts.push(`County: ${caseRecord.countyId || "[not selected]"}`);

  if (caseRecord.claimDescription) {
    parts.push(`\nWhat happened (plaintiff's account): ${caseRecord.claimDescription}`);
  }
  if (caseRecord.howAmountCalculated) {
    parts.push(`How the amount was calculated: ${caseRecord.howAmountCalculated}`);
  }
  if (caseRecord.priorDemandMade) {
    parts.push(`Prior demand made: Yes${caseRecord.priorDemandDescription ? ` — ${caseRecord.priorDemandDescription}` : ""}`);
  }
  if (caseRecord.caseNumber) {
    parts.push(`Case Number: ${caseRecord.caseNumber}`);
  }
  if (caseRecord.hearingDate) {
    parts.push(`Hearing Date: ${caseRecord.hearingDate}${caseRecord.hearingTime ? ` at ${caseRecord.hearingTime}` : ""}`);
    parts.push(`Courthouse: ${caseRecord.courthouseName || "[not set]"}`);
  }

  if (docs.length > 0) {
    parts.push(`\nEvidence uploaded (${docs.length} document${docs.length > 1 ? "s" : ""}):`);
    for (const doc of docs) {
      parts.push(`- ${doc.fileName}${doc.ocrText ? ` [contains: ${doc.ocrText.slice(0, 200)}...]` : ""}`);
    }
  }

  return parts.join("\n");
}

router.post("/cases/:id/hearing-prep", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = checkAiRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `Too many AI requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes before trying again.` });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));

  const body = req.body as { messages?: { role: string; content: string }[] };
  const sessionMessages = body.messages || [];

  const lastUserMsg = [...sessionMessages].reverse().find(m => m.role === "user")?.content ?? "";
  if (lastUserMsg && !(await isOnTopic(lastUserMsg))) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const judgeReply = "That's outside the scope of these proceedings. Let's stay focused on your case. Please answer my question.";
    res.write(`data: ${JSON.stringify({ content: judgeReply })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return;
  }

  const caseContext = buildHearingPrepContext(caseRecord, docs);

  const messages = [
    { role: "system" as const, content: HEARING_PREP_SYSTEM_PROMPT + "\n\n" + caseContext },
    ...sessionMessages.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
