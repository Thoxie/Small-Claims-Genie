import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db";
import {
  CreateCaseBody,
  UpdateCaseBody,
  SaveIntakeProgressBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { chatMessagesTable } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { checkAiRateLimit } from "../lib/rate-limiter";

function getUserId(req: any): string {
  return req.userId as string;
}

async function recalcReadiness(caseId: number): Promise<number> {
  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, caseId));
  if (!caseRecord) return 0;
  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, caseId));

  const required = [
    caseRecord.plaintiffName,
    caseRecord.plaintiffAddress,
    caseRecord.defendantName,
    caseRecord.defendantAddress,
    caseRecord.claimAmount,
    caseRecord.claimDescription,
    caseRecord.incidentDate,
    caseRecord.howAmountCalculated,
    caseRecord.priorDemandMade != null ? true : null,
    caseRecord.countyId,
    caseRecord.venueBasis,
  ];
  const filled = required.filter(Boolean).length;
  const intakeScore = Math.round((filled / required.length) * 60);
  const docScore = Math.min(docs.length * 10, 30);
  const demandScore = caseRecord.priorDemandMade ? 10 : 0;
  const score = intakeScore + docScore + demandScore;

  await db.update(casesTable).set({ readinessScore: score }).where(eq(casesTable.id, caseId));
  return score;
}

const router: IRouter = Router();

// List all cases for the current user
router.get("/cases", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const cases = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.userId, userId))
    .orderBy(desc(casesTable.updatedAt));
  res.json(cases);
});

// Stats for the current user's cases
router.get("/cases/stats", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const cases = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.userId, userId))
    .orderBy(desc(casesTable.updatedAt));

  const byStatus: Record<string, number> = {};
  let totalClaimAmount = 0;
  let totalReadiness = 0;

  for (const c of cases) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    totalClaimAmount += c.claimAmount ?? 0;
    totalReadiness += c.readinessScore ?? 0;
  }

  res.json({
    total: cases.length,
    byStatus,
    totalClaimAmount,
    avgReadinessScore: cases.length > 0 ? Math.round(totalReadiness / cases.length) : 0,
    recentCases: cases.slice(0, 5),
  });
});

// Create a new case owned by the current user
router.post("/cases", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [newCase] = await db
    .insert(casesTable)
    .values({
      userId,
      title: parsed.data.title,
      claimType: parsed.data.claimType ?? null,
      countyId: parsed.data.countyId ?? null,
      status: "draft",
    })
    .returning();

  res.status(201).json(newCase);
});

// Get a single case — ownership check enforced
router.get("/cases/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const [caseRecord] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }

  const documents = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const chatMessages = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.caseId, id));

  res.json({ ...caseRecord, documents, chatMessages });
});

// Update a case — ownership check enforced
router.patch("/cases/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Verify ownership first
  const [existing] = await db
    .select({ id: casesTable.id })
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Case not found" }); return; }

  const [updated] = await db
    .update(casesTable)
    .set(parsed.data as Parameters<typeof db.update>[0] extends Parameters<typeof db.update>[0] ? Record<string, unknown> : never)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Case not found" }); return; }

  await recalcReadiness(id);
  const [fresh] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  res.json(fresh ?? updated);
});

// Delete a case — ownership check enforced
router.delete("/cases/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const [deleted] = await db
    .delete(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Case not found" }); return; }

  res.sendStatus(204);
});

// Save intake progress — ownership check enforced
router.patch("/cases/:id/intake", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const parsed = SaveIntakeProgressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Verify ownership
  const [existing] = await db
    .select({ id: casesTable.id })
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Case not found" }); return; }

  const { step, data, intakeComplete } = parsed.data;
  const updatePayload: Record<string, unknown> = {
    intakeStep: step,
    ...(intakeComplete !== undefined && { intakeComplete }),
    ...(intakeComplete && { status: "intake_complete" }),
  };
  if (data && typeof data === "object") {
    Object.assign(updatePayload, data);
  }

  const [updated] = await db
    .update(casesTable)
    .set(updatePayload as Parameters<typeof casesTable.$inferSelect>[0])
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Case not found" }); return; }

  await recalcReadiness(id);
  const [fresh] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  res.json(fresh ?? updated);
});

// Readiness score — ownership check enforced
router.get("/cases/:id/readiness", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const [caseRecord] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));

  const missingFields: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (!caseRecord.plaintiffName) missingFields.push("Your name");
  if (!caseRecord.plaintiffAddress) missingFields.push("Your address");
  if (!caseRecord.defendantName) missingFields.push("Defendant name");
  if (!caseRecord.defendantAddress) missingFields.push("Defendant address");
  if (!caseRecord.claimAmount) missingFields.push("Claim amount");
  if (!caseRecord.claimDescription) missingFields.push("Description of what happened");
  if (!caseRecord.incidentDate) missingFields.push("Date of incident");
  if (!caseRecord.howAmountCalculated) missingFields.push("How you calculated the amount");
  if (caseRecord.priorDemandMade === null || caseRecord.priorDemandMade === undefined) missingFields.push("Prior demand confirmation");
  if (!caseRecord.countyId) missingFields.push("Filing county");
  if (!caseRecord.venueBasis) missingFields.push("Venue basis (why this courthouse)");

  const totalRequired = 11;
  const filled = totalRequired - missingFields.length;
  const intakeScore = Math.round((filled / totalRequired) * 60);
  const docScore = Math.min(docs.length * 10, 30);
  const demandScore = caseRecord.priorDemandMade ? 10 : 0;
  const score = intakeScore + docScore + demandScore;

  if (caseRecord.plaintiffName && caseRecord.plaintiffAddress) strengths.push("Your contact information is complete");
  if (caseRecord.defendantName && caseRecord.defendantAddress) strengths.push("Defendant information is on file");
  if (caseRecord.claimDescription && caseRecord.claimDescription.length > 100) strengths.push("Detailed claim description provided");
  if (docs.length > 0) strengths.push(`${docs.length} supporting document${docs.length > 1 ? "s" : ""} uploaded`);
  if (caseRecord.priorDemandMade) strengths.push("Prior demand to defendant was made");

  if (docs.length === 0) weaknesses.push("No supporting documents uploaded");
  if (!caseRecord.priorDemandMade) weaknesses.push("You must ask the defendant to pay before filing");
  if (missingFields.length > 3) weaknesses.push("Several required fields are incomplete");

  const nextSteps: string[] = [];
  if (!caseRecord.intakeComplete) nextSteps.push("Complete the intake form");
  if (docs.length === 0) nextSteps.push("Upload any contracts, receipts, or evidence");
  if (!caseRecord.priorDemandMade) nextSteps.push("Send a written demand to the defendant");
  if (score >= 80) nextSteps.push("Review your SC-100 form preview and download");
  if (score >= 80) nextSteps.push("Visit your county courthouse to file");

  const filingGuidance = score >= 80
    ? "Your case appears ready to file. Download your SC-100 form, review it carefully, then bring it to your county courthouse."
    : "Complete the missing fields and upload supporting documents to improve your readiness score. You need a score of 80+ to be ready to file.";

  await db.update(casesTable).set({ readinessScore: score }).where(eq(casesTable.id, id));

  res.json({ score, missingFields, strengths, weaknesses, nextSteps, filingGuidance });
});

// ─── Case Advisor: Analyze ────────────────────────────────────────────────────
// ─── Shared: build advisor case brief ────────────────────────────────────────
function buildAdvisorBrief(
  c: typeof casesTable.$inferSelect,
  docs: typeof documentsTable.$inferSelect[]
): string {
  const lines: string[] = ["=== FULL CASE RECORD ==="];

  lines.push(`Title: ${c.title}`);
  lines.push(`Intake Step: ${c.intakeStep ?? 1} of 4 | Complete: ${c.intakeComplete ? "Yes" : "No"}`);
  lines.push(`Readiness Score: ${c.readinessScore ?? 0}%`);

  lines.push("\n-- PLAINTIFF --");
  lines.push(`Name: ${c.plaintiffName || "[not entered]"}`);
  lines.push(`Phone: ${c.plaintiffPhone || "[not entered]"}`);
  lines.push(`Email: ${c.plaintiffEmail || "[not entered]"}`);
  lines.push(`Address: ${[c.plaintiffAddress, c.plaintiffCity, c.plaintiffState || "CA", c.plaintiffZip].filter(Boolean).join(", ") || "[not entered]"}`);

  lines.push("\n-- DEFENDANT --");
  lines.push(`Name: ${c.defendantName || "[not entered]"}`);
  lines.push(`Phone: ${c.defendantPhone || "[not entered]"}`);
  lines.push(`Address: ${[c.defendantAddress, c.defendantCity, c.defendantState || "CA", c.defendantZip].filter(Boolean).join(", ") || "[not entered]"}`);
  lines.push(`Is Business/Entity: ${c.defendantIsBusinessOrEntity ? "Yes" : "No"}`);
  if (c.defendantIsBusinessOrEntity && c.defendantAgentName) lines.push(`Agent for Service: ${c.defendantAgentName}`);

  lines.push("\n-- COURT & FILING --");
  lines.push(`Filing County: ${c.countyId || "[not selected]"}`);
  if (c.courthouseName) lines.push(`Courthouse: ${c.courthouseName}`);
  if (c.filingFee) lines.push(`Filing Fee: $${c.filingFee}`);

  lines.push("\n-- CLAIM --");
  lines.push(`Claim Type: ${c.claimType || "[not entered]"}`);
  lines.push(`Claim Amount: ${c.claimAmount ? `$${Number(c.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "[not entered]"}`);
  lines.push(`Incident Date: ${c.incidentDate || "[not entered]"}`);
  lines.push(`Description:\n${c.claimDescription || "[not entered]"}`);
  lines.push(`How Amount Calculated:\n${c.howAmountCalculated || "[not entered]"}`);

  lines.push("\n-- PRIOR DEMAND & VENUE --");
  lines.push(`Prior Demand Made: ${c.priorDemandMade === true ? "Yes" : c.priorDemandMade === false ? "No" : "[not answered]"}`);
  if (c.priorDemandDescription) lines.push(`Demand Details: ${c.priorDemandDescription}`);
  lines.push(`Venue Basis: ${c.venueBasis || "[not selected]"}`);
  if (c.venueReason) lines.push(`Venue Explanation: ${c.venueReason}`);

  lines.push("\n-- ELIGIBILITY FLAGS --");
  lines.push(`Suing Public Entity: ${c.isSuingPublicEntity ? "Yes" : "No"}`);
  lines.push(`Attorney Fee Dispute: ${c.isAttyFeeDispute ? "Yes" : "No"}`);
  lines.push(`Filed 12+ Claims This Year: ${c.filedMoreThan12Claims ? "Yes" : "No"}`);
  lines.push(`Claim Over $2,500: ${c.claimOver2500 ? "Yes" : "No"}`);

  // What is already filled vs missing
  const missing: string[] = [];
  if (!c.plaintiffName) missing.push("plaintiff name");
  if (!c.plaintiffPhone) missing.push("plaintiff phone");
  if (!c.plaintiffAddress) missing.push("plaintiff address");
  if (!c.defendantName) missing.push("defendant name");
  if (!c.defendantAddress) missing.push("defendant address");
  if (!c.claimAmount) missing.push("claim amount");
  if (!c.claimDescription) missing.push("claim description");
  if (!c.incidentDate) missing.push("incident date");
  if (!c.howAmountCalculated) missing.push("how amount was calculated");
  if (c.priorDemandMade === null) missing.push("prior demand answer");
  if (!c.countyId) missing.push("filing county");
  if (!c.venueBasis) missing.push("venue basis");

  if (missing.length > 0) {
    lines.push(`\n-- MISSING FIELDS (${missing.length}) --`);
    lines.push(missing.map(f => `• ${f}`).join("\n"));
    lines.push("RULE: Do NOT ask the user for information already filled in above. Only ask about or reference these missing fields.");
  } else {
    lines.push("\n-- All required intake fields are filled in. --");
  }

  // Already-uploaded documents
  if (docs.length > 0) {
    lines.push(`\n-- ALREADY UPLOADED DOCUMENTS (${docs.length}) --`);
    lines.push("RULE: Do NOT ask the user to upload documents that are already in this list.");
    for (const doc of docs) {
      lines.push(`• "${doc.originalName}" (${doc.label || "unlabeled"}) — OCR: ${doc.ocrStatus}`);
      if (doc.ocrText && doc.ocrText.length > 0 && !doc.ocrText.startsWith("[")) {
        lines.push(`  Summary: ${doc.ocrText.slice(0, 500)}${doc.ocrText.length > 500 ? "..." : ""}`);
      }
    }
  } else {
    lines.push("\n-- No documents uploaded yet --");
  }

  return lines.join("\n");
}

router.post("/cases/:id/advisor/analyze", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = checkAiRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `Too many AI requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes before trying again.` });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const [caseRecord] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const caseBrief = buildAdvisorBrief(caseRecord, docs);

  const prompt = `You are a California small claims court advisor. You have received the COMPLETE case record below. Review everything that is already filled in before generating questions or an evidence checklist.

${caseBrief}

Return ONLY a valid JSON object — no markdown, no explanation, no code blocks.

Return this exact JSON structure:
{
  "questions": [
    { "id": "q1", "question": "..." }
  ],
  "evidenceChecklist": [
    { "id": "e1", "item": "Short label", "description": "Why this matters and what specifically to look for" }
  ]
}

Rules:
- Review the MISSING FIELDS list above. Ask 2–4 targeted questions about what is weak or missing — NOT about things already filled in.
- If the claim description is already detailed, ask about things that would strengthen it (witnesses, timeline gaps, amounts not accounted for).
- For the evidence checklist: generate 3–6 items specific to this exact claim type. Only list documents NOT already uploaded.
- Security deposit: lease, move-in/out inspection report, bank records showing deposit, texts/emails with landlord
- Contract disputes: signed contract, invoices, proof of payment, written communications
- Property damage: repair estimates/receipts, before/after photos, written acknowledgment
- Money owed: loan agreement, payment history, prior demand letters
- Plain English only. No legal jargon.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw2 = completion.choices[0].message.content || "{}";
  const match = raw2.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : "{}";

  try {
    const parsed = JSON.parse(jsonStr);
    const checklist = parsed.evidenceChecklist || [];
    if (checklist.length > 0) {
      await db.update(casesTable).set({ evidenceChecklist: checklist }).where(eq(casesTable.id, id));
    }
    res.json(parsed);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
  }
});

// ─── Case Advisor: Save Checklist Checked State ───────────────────────────────
router.patch("/cases/:id/advisor/checklist", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const [existing] = await db
    .select({ id: casesTable.id, evidenceChecklist: casesTable.evidenceChecklist })
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Case not found" }); return; }

  const { checkedIds } = req.body;
  if (!Array.isArray(checkedIds)) { res.status(400).json({ error: "checkedIds must be an array" }); return; }

  const currentList = Array.isArray(existing.evidenceChecklist) ? existing.evidenceChecklist as { id: string; item: string; description: string; checked?: boolean }[] : [];
  const updated = currentList.map((item) => ({ ...item, checked: checkedIds.includes(item.id) }));

  await db.update(casesTable).set({ evidenceChecklist: updated }).where(eq(casesTable.id, id));
  res.json({ ok: true });
});

// ─── Case Advisor: Delete a single checklist item ─────────────────────────────
router.delete("/cases/:id/advisor/checklist/:itemId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const { itemId } = req.params;

  const [existing] = await db
    .select({ id: casesTable.id, evidenceChecklist: casesTable.evidenceChecklist })
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Case not found" }); return; }

  const currentList = Array.isArray(existing.evidenceChecklist) ? existing.evidenceChecklist as { id: string; item: string; description: string; checked?: boolean }[] : [];
  const updated = currentList.filter((item) => item.id !== itemId);

  await db.update(casesTable).set({ evidenceChecklist: updated }).where(eq(casesTable.id, id));
  res.json({ ok: true });
});

// ─── Case Advisor: Refine Statement ───────────────────────────────────────────
router.post("/cases/:id/advisor/refine", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const [caseRecord] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const caseBrief = buildAdvisorBrief(caseRecord, docs);

  const { answers } = req.body;
  const answersText = Array.isArray(answers)
    ? answers.filter((a: any) => a.answer?.trim()).map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")
    : "";

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 800,
    messages: [{
      role: "user",
      content: `You are a California small claims court advisor. You have the COMPLETE case record below. Use all available information — including the original description, all filled-in fields, uploaded documents, and the user's follow-up answers — to write the best possible case description for a California small claims court form.

${caseBrief}

${answersText ? `Additional answers from the user:\n${answersText}` : "No additional answers provided."}

Write 2–4 tight paragraphs that:
1. State the relationship or agreement between the parties (use the actual names from the case record)
2. Describe what happened clearly and in chronological order (use the actual incident date)
3. State the dollar amount and exactly how it was calculated
4. Mention any prior demand made and whether it was ignored
5. Use plain, factual language — no legal jargon
6. Are suitable for copying directly into a California small claims court form (SC-100)

Return ONLY the case description text. No headers, no commentary, no formatting.`
    }],
  });

  res.json({ refinedStatement: completion.choices[0].message.content?.trim() || "" });
});

// ─── PATCH /cases/:id/hearing — save court hearing details ────────────────────
router.patch("/cases/:id/hearing", async (req, res): Promise<void> => {
  const userId = req.userId;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case id" }); return; }

  const existing = await db.select().from(casesTable).where(and(eq(casesTable.id, id), eq(casesTable.userId, userId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Not found" }); return; }

  const allowed = ["caseNumber", "hearingDate", "hearingTime", "hearingJudge", "hearingCourtroom", "hearingNotes"];
  const updates: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key] ?? null;
  }

  if (!Object.keys(updates).length) { res.status(400).json({ error: "No valid fields provided" }); return; }

  const [updated] = await db.update(casesTable).set(updates).where(eq(casesTable.id, id)).returning();
  res.json(updated);
});

export default router;
