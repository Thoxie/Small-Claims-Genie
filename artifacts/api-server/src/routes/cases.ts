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
import { getUserId } from "../lib/owned-case";
import { buildCaseContext } from "../lib/case-context";

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

  // Verify ownership and read current intakeStep so we never go backwards
  const [existing] = await db
    .select({ id: casesTable.id, intakeStep: casesTable.intakeStep })
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Case not found" }); return; }

  const { step, data, intakeComplete } = parsed.data;
  const stepAdvances = step !== undefined && step > (existing.intakeStep ?? 0);
  const updatePayload: Record<string, unknown> = {
    // Only advance intakeStep — never let an auto-save drag it backwards
    ...(stepAdvances && { intakeStep: step }),
    ...(intakeComplete !== undefined && { intakeComplete }),
    ...(intakeComplete && { status: "intake_complete" }),
  };
  if (data && typeof data === "object") {
    Object.assign(updatePayload, data);
  }

  // Nothing to update — return the existing row without touching the DB
  if (Object.keys(updatePayload).length === 0) {
    res.json(existing);
    return;
  }

  const [updated] = await db
    .update(casesTable)
    .set(updatePayload as Partial<typeof casesTable.$inferInsert>)
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
// ─── Shared: build advisor case brief (wraps shared buildCaseContext) ─────────
const PER_DOC_CHAR_LIMIT = 30_000;

function buildAdvisorBrief(
  c: typeof casesTable.$inferSelect,
  docs: typeof documentsTable.$inferSelect[]
): { brief: string; truncatedDocs: string[] } {
  const { context: brief, truncatedDocs } = buildCaseContext(c, docs, { docCharLimit: PER_DOC_CHAR_LIMIT });
  return { brief, truncatedDocs };
}

router.post("/cases/:id/advisor/analyze", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = await checkAiRateLimit(userId);
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
  const { brief: caseBrief, truncatedDocs } = buildAdvisorBrief(caseRecord, docs);

  const prompt = `You are a California small claims court advisor. You have received the COMPLETE case record below, including all entered fields AND the full text of every uploaded document. Read every section carefully before generating questions, a legal alert, or an evidence checklist.

${caseBrief}

Return ONLY a valid JSON object — no markdown, no explanation, no code blocks.

Return this exact JSON structure:
{
  "legalAlert": "...",
  "questions": [
    { "id": "q1", "question": "..." }
  ],
  "evidenceChecklist": [
    { "id": "e1", "item": "Short label", "description": "Why this matters and what specifically to look for" }
  ]
}

CALIFORNIA LAW — YOU MUST APPLY THESE RULES WHEN THEY ARE RELEVANT:

Security Deposit (Civil Code §1950.5):
- Landlord must return the full deposit (or a written itemized statement of deductions) within 21 CALENDAR DAYS of the tenant vacating.
- If the landlord fails to return the deposit or provide the itemized statement within 21 days: the tenant is entitled to the FULL deposit back regardless of any claimed damage or deductions.
- If the landlord acted in BAD FAITH (wrongfully withholding the deposit without honest basis, no itemization, ignoring demands, retaliatory, or fabricating damage claims): the court CAN award a penalty of up to 2× the deposit amount IN ADDITION to the deposit itself (Civil Code §1950.5(l)).
- Total possible award in a bad faith case: deposit + up to 2× deposit = up to 3× the deposit amount.
- IMPORTANT: If the claim amount in the case record equals only the deposit itself and the landlord has NOT complied with the 21-day rule or is acting in bad faith, this is a CRITICAL flag — the user may be dramatically under-claiming. You MUST surface this in the legalAlert field.

Demand Before Filing (Civil Code §1950.5 & general small claims):
- The tenant should send a written demand to the landlord before filing if they have not already done so. Failure to demand first is not required by law but strengthens the case.

RULES:
CRITICAL — DO NOT RE-ASK KNOWN INFORMATION:
- Every field in the case record above was entered by the user. Do NOT ask about any field that already has a value.
- If Defendant Name is filled in, that is the established defendant — do NOT ask who should be named as defendant, confirm the legal name, or verify spelling.
- If Defendant Type says BUSINESS or ENTITY, accept that as final.
- Do NOT ask "who should I name as defendant", "is this a business or individual", "what is the LLC's exact name", or any variation.
- Do NOT ask about information already visible in the PLAINTIFF or DEFENDANT sections.

LEGAL ALERT (legalAlert field):
- If there is a California law that the user may NOT be aware of that could significantly increase their claim amount or strengthen their case, include a concise plain-English explanation in legalAlert.
- For security deposit cases: always check whether the claim amount equals only the deposit. If so, flag the 21-day rule and bad faith penalty — e.g.: "California law (Civil Code §1950.5) may entitle you to MORE than just your deposit. If your landlord failed to return it (with an itemized statement) within 21 days of move-out, you can demand the full deposit back regardless of claimed deductions. AND if they acted in bad faith — ignoring your demands, providing no itemization, or fabricating damage — a judge can award up to 2× your deposit as a penalty, on top of the deposit itself. Review your demand amount before filing."
- If no relevant legal enhancement applies, set legalAlert to null.

QUESTIONS:
- Read the full content of every uploaded document before forming questions. If a document answers a question, do NOT ask it.
- Ask 2–4 targeted questions about what is genuinely weak or missing.
- Focus on: timeline gaps, amounts not fully explained, witnesses, events the user hasn't described, or facts that would strengthen the claim.
- Use specific facts from uploaded documents when possible.

EVIDENCE CHECKLIST:
- Generate 3–6 items specific to this exact claim type.
- Exclude documents already uploaded AND items already marked as gathered.
- Security deposit: lease, move-in/out inspection report, bank records showing deposit paid, 21-day notice (or lack thereof), texts/emails with landlord demanding return
- Contract disputes: signed contract, invoices, proof of payment, written communications
- Property damage: repair estimates/receipts, before/after photos, written acknowledgment
- Money owed: loan agreement, payment history, prior demand letters

Plain English only. No legal jargon.`;

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
    res.json({ ...parsed, truncatedDocs });
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
  const { brief: caseBrief } = buildAdvisorBrief(caseRecord, docs);

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

// ─── AI Opening Statement Generator ──────────────────────────────────────────
router.post("/cases/:id/opening-statement", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = await checkAiRateLimit(userId);
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
  const { context } = buildCaseContext(caseRecord, docs, { docCharLimit: 8000 });

  const prompt = `You are an expert at writing court-ready opening statements for California small claims court. You have the complete case record below — including all intake fields AND the full text of every uploaded document. Read everything carefully before writing.

${context}

Write a polished, natural-sounding opening statement that the plaintiff will read aloud in court. Requirements:

- Length: 220–320 words (2–3 minutes when spoken at a calm pace)
- Tone: confident, factual, respectful to the judge — no emotional outbursts
- Structure:
  1. Introduce the plaintiff and the nature of the dispute (1–2 sentences)
  2. Tell the story in chronological order — what happened, key dates, key facts from the claim description AND any uploaded documents
  3. State the exact dollar amount claimed and how it was calculated
  4. Mention whether a prior demand was made and what the defendant's response was (or lack thereof)
  5. Reference specific evidence they have (documents by name if uploaded, or general categories if not)
  6. Close with a clear, respectful ask for the court to rule in their favor

RULES:
- Use the plaintiff's actual name (not "I" as the first word — start with "Your Honor" or their name)
- Incorporate specific facts, dates, amounts, and document contents from the case record — do NOT use placeholders like [amount] or [date]; use the real values
- If a key field is missing (e.g. no incident date), write around it naturally without calling attention to it
- Do NOT include legal jargon or case citations — plain English only
- Output ONLY the statement text — no title, no preamble, no explanation

Return plain text only. No markdown.`;

  const noShowPrompt = `You are an expert at writing court-ready statements for California small claims court.

Using the following case information, write a brief statement for the plaintiff to read to the judge ONLY IF the defendant does not appear at the hearing.

${context}

Requirements:
- Length: 80–120 words (under 1 minute when spoken)
- Tone: calm, respectful, factual — not emotional or aggressive
- Structure:
  1. Plaintiff introduces themselves and notes the defendant has not appeared
  2. States they are prepared to proceed
  3. One sentence summarizing what the case is about
  4. References that evidence has been submitted to the court
  5. Requests judgment in plaintiff's favor for the exact dollar amount, plus allowable court costs and fees
- Include the case number if available: ${caseRecord.caseNumber || "(not yet assigned)"}
- Use actual names and dollar amounts — do NOT use placeholders
- Start with: "Your Honor, my name is [plaintiff name], and I am the plaintiff in this matter."
- Output ONLY the statement text — no title, no label, no markdown

Return plain text only.`;

  const [primaryCompletion, noShowCompletion] = await Promise.all([
    openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
    openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 300,
      messages: [{ role: "user", content: noShowPrompt }],
    }),
  ]);

  const statement = (primaryCompletion.choices[0].message.content || "").trim();
  if (!statement) { res.status(500).json({ error: "Failed to generate statement" }); return; }

  const noShowStatement = (noShowCompletion.choices[0].message.content || "").trim();

  res.json({ statement, noShowStatement });
});

export default router;
