import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, chatMessagesTable, documentsTable } from "@workspace/db";
import { SendChatMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { checkAiRateLimit } from "../lib/rate-limiter";

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
  const parts: string[] = ["=== FULL CASE RECORD ==="];

  // ── Identity & Status ────────────────────────────────────────────────────
  parts.push(`Case Title: ${caseRecord.title}`);
  parts.push(`Status: ${caseRecord.status}`);
  parts.push(`Intake Step: ${caseRecord.intakeStep ?? 1} of 4 | Intake Complete: ${caseRecord.intakeComplete ? "Yes" : "No"}`);
  parts.push(`Readiness Score: ${caseRecord.readinessScore ?? 0}%`);

  // ── Plaintiff (Step 1) ───────────────────────────────────────────────────
  parts.push("\n-- PLAINTIFF --");
  parts.push(`Name: ${caseRecord.plaintiffName || "[not entered]"}`);
  parts.push(`Phone: ${caseRecord.plaintiffPhone || "[not entered]"}`);
  parts.push(`Email: ${caseRecord.plaintiffEmail || "[not entered]"}`);
  parts.push(`Address: ${[caseRecord.plaintiffAddress, caseRecord.plaintiffCity, caseRecord.plaintiffState || "CA", caseRecord.plaintiffZip].filter(Boolean).join(", ") || "[not entered]"}`);

  // ── Defendant (Step 1) ───────────────────────────────────────────────────
  parts.push("\n-- DEFENDANT --");
  parts.push(`Name: ${caseRecord.defendantName || "[not entered]"}`);
  parts.push(`Phone: ${caseRecord.defendantPhone || "[not entered]"}`);
  parts.push(`Address: ${[caseRecord.defendantAddress, caseRecord.defendantCity, caseRecord.defendantState || "CA", caseRecord.defendantZip].filter(Boolean).join(", ") || "[not entered]"}`);
  parts.push(`Is Business/Entity: ${caseRecord.defendantIsBusinessOrEntity ? "Yes" : "No"}`);
  if (caseRecord.defendantIsBusinessOrEntity && caseRecord.defendantAgentName) {
    parts.push(`Agent for Service: ${caseRecord.defendantAgentName}`);
  }

  // ── Filing County & Courthouse (Step 1) ──────────────────────────────────
  parts.push("\n-- COURT & FILING --");
  parts.push(`Filing County: ${caseRecord.countyId || "[not selected]"}`);
  if (caseRecord.courthouseName) parts.push(`Courthouse: ${caseRecord.courthouseName}`);
  if (caseRecord.courthouseAddress) parts.push(`Courthouse Address: ${[caseRecord.courthouseAddress, caseRecord.courthouseCity, caseRecord.courthouseZip].filter(Boolean).join(", ")}`);
  if (caseRecord.courthousePhone) parts.push(`Courthouse Phone: ${caseRecord.courthousePhone}`);
  if (caseRecord.filingFee) parts.push(`Filing Fee: $${caseRecord.filingFee}`);

  // ── Claim Details (Step 2) ───────────────────────────────────────────────
  parts.push("\n-- CLAIM --");
  parts.push(`Claim Type: ${caseRecord.claimType || "[not entered]"}`);
  parts.push(`Claim Amount: ${caseRecord.claimAmount ? `$${Number(caseRecord.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "[not entered]"}`);
  parts.push(`Incident Date: ${caseRecord.incidentDate || "[not entered]"}`);
  parts.push(`Claim Description:\n${caseRecord.claimDescription || "[not entered]"}`);
  parts.push(`How Amount Calculated:\n${caseRecord.howAmountCalculated || "[not entered]"}`);

  // ── Prior Demand & Venue (Step 3) ────────────────────────────────────────
  parts.push("\n-- PRIOR DEMAND --");
  parts.push(`Prior Demand Made: ${caseRecord.priorDemandMade === true ? "Yes" : caseRecord.priorDemandMade === false ? "No" : "[not answered]"}`);
  if (caseRecord.priorDemandDescription) parts.push(`Demand Details: ${caseRecord.priorDemandDescription}`);

  parts.push("\n-- VENUE --");
  parts.push(`Venue Basis: ${caseRecord.venueBasis || "[not selected]"}`);
  if (caseRecord.venueReason) parts.push(`Venue Explanation: ${caseRecord.venueReason}`);

  // ── Eligibility Flags (Step 4) ───────────────────────────────────────────
  parts.push("\n-- ELIGIBILITY FLAGS --");
  parts.push(`Suing a Public Entity: ${caseRecord.isSuingPublicEntity ? "Yes" : "No"}`);
  if (caseRecord.isSuingPublicEntity && caseRecord.publicEntityClaimFiledDate) {
    parts.push(`Public Entity Claim Filed: ${caseRecord.publicEntityClaimFiledDate}`);
  }
  parts.push(`Attorney Fee Dispute: ${caseRecord.isAttyFeeDispute ? "Yes" : "No"}`);
  parts.push(`Filed 12+ Claims This Year: ${caseRecord.filedMoreThan12Claims ? "Yes" : "No"}`);
  parts.push(`Claim Over $2,500: ${caseRecord.claimOver2500 ? "Yes" : "No"}`);

  // ── Demand Letter ────────────────────────────────────────────────────────
  parts.push("\n-- DEMAND LETTER --");
  if (caseRecord.demandLetterText) {
    parts.push(`Tone: ${caseRecord.demandLetterTone || "standard"}`);
    parts.push(`Demand Letter Written: Yes (${caseRecord.demandLetterText.length} chars)`);
  } else {
    parts.push("Demand Letter Written: No");
  }

  // ── Evidence Checklist ───────────────────────────────────────────────────
  const checklist = Array.isArray(caseRecord.evidenceChecklist) ? caseRecord.evidenceChecklist as { id: string; item: string; checked?: boolean }[] : [];
  if (checklist.length > 0) {
    parts.push("\n-- EVIDENCE CHECKLIST --");
    for (const item of checklist) {
      parts.push(`${item.checked ? "✓" : "○"} ${item.item}`);
    }
  }

  // ── What Is Still Missing ────────────────────────────────────────────────
  const missing: string[] = [];
  if (!caseRecord.plaintiffName) missing.push("plaintiff name");
  if (!caseRecord.plaintiffPhone) missing.push("plaintiff phone");
  if (!caseRecord.plaintiffAddress) missing.push("plaintiff address");
  if (!caseRecord.defendantName) missing.push("defendant name");
  if (!caseRecord.defendantAddress) missing.push("defendant address");
  if (!caseRecord.claimAmount) missing.push("claim amount");
  if (!caseRecord.claimDescription) missing.push("claim description");
  if (!caseRecord.incidentDate) missing.push("incident date");
  if (!caseRecord.howAmountCalculated) missing.push("how amount was calculated");
  if (caseRecord.priorDemandMade === null) missing.push("prior demand answer");
  if (!caseRecord.countyId) missing.push("filing county");
  if (!caseRecord.venueBasis) missing.push("venue basis");
  if (missing.length > 0) {
    parts.push(`\n-- MISSING INTAKE FIELDS (${missing.length}) --`);
    parts.push(missing.map(f => `• ${f}`).join("\n"));
    parts.push("IMPORTANT: Do NOT ask the user for information that is already filled in above. Only ask about or reference the missing fields listed here.");
  } else {
    parts.push("\n-- INTAKE COMPLETE: All required fields have been filled in. --");
  }

  // ── Documents ────────────────────────────────────────────────────────────
  if (docs.length > 0) {
    parts.push(`\n=== UPLOADED DOCUMENTS (${docs.length} total) ===`);
    parts.push("You have full access to the extracted text below. When the user asks about documents, name them and summarize their contents. Do NOT ask the user to upload documents that are already listed here.");
    for (const doc of docs) {
      parts.push(`\n--- "${doc.originalName}" | Type: ${doc.mimeType} | Label: ${doc.label || "unlabeled"} | OCR: ${doc.ocrStatus} ---`);
      if (doc.ocrText && doc.ocrText.length > 0 && !doc.ocrText.startsWith("[")) {
        const truncated = doc.ocrText.length > 6000;
        parts.push(`Extracted Text (${truncated ? "first 6000 chars" : "complete"}):\n${doc.ocrText.slice(0, 6000)}${truncated ? "\n... [document continues]" : ""}`);
      } else if (doc.ocrText?.startsWith("[")) {
        parts.push(`Extraction note: ${doc.ocrText}`);
      } else if (doc.ocrStatus === "processing") {
        parts.push("[OCR still processing — text not yet available]");
      } else {
        parts.push("[No text extracted from this document]");
      }
    }
  } else {
    parts.push("\n[No documents uploaded yet — encourage the user to upload receipts, contracts, texts, or photos as evidence]");
  }

  return parts.join("\n");
}

export default router;
