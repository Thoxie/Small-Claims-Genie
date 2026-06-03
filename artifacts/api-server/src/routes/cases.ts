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
import { checkAiRateLimit, checkWriteRateLimit } from "../lib/rate-limiter";
import { getUserId } from "../lib/owned-case";
import { buildCaseContext } from "../lib/case-context";
import { getUncachableResendClient } from "../lib/resend";
import { logger } from "../lib/logger";
import { buildAdminNewCaseEmail } from "../lib/email-templates";

const ADMIN_EMAIL = "hello@smallclaimsgenie.com";

async function sendAdminPlaintiffNotification(caseRecord: {
  plaintiffName: string | null;
  plaintiffEmail: string | null;
  plaintiffPhone: string | null;
  plaintiffAddress: string | null;
}): Promise<void> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const { subject, html } = buildAdminNewCaseEmail({
      plaintiffName: caseRecord.plaintiffName,
      plaintiffEmail: caseRecord.plaintiffEmail,
      plaintiffPhone: caseRecord.plaintiffPhone,
      plaintiffAddress: caseRecord.plaintiffAddress,
      timestamp,
    });
    await client.emails.send({ from: fromEmail, to: ADMIN_EMAIL, subject, html });
  } catch (err) {
    logger.error({ err }, "[cases] Failed to send admin plaintiff notification");
  }
}

async function recalcReadiness(caseId: number): Promise<number> {
  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, caseId));
  if (!caseRecord) return 0;
  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, caseId));

  const required: Array<unknown> = [
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
  // When the additional plaintiff operates under a DBA, two fields are required
  // to produce a usable SC-103 (Plaintiff 2): the signer's name and the DBA name.
  if (caseRecord.hasAdditionalPlaintiff && caseRecord.additionalPlaintiffIsFictitious) {
    required.push(caseRecord.additionalPlaintiffName);
    required.push(caseRecord.secondPlaintiffDbaName);
  }
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
  const rateCheck = await checkWriteRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `Too many requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes before trying again.` });
    return;
  }
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
    .select({
      id: casesTable.id,
      intakeStep: casesTable.intakeStep,
      plaintiffName: casesTable.plaintiffName,
    })
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

  // Fire admin notification the first time a plaintiff name is saved on this case
  const incomingName = typeof data === "object" && data !== null ? (data as Record<string, unknown>).plaintiffName : undefined;
  const wasEmpty = !existing.plaintiffName;
  const nowHasName = typeof incomingName === "string" && incomingName.trim().length > 0;
  if (wasEmpty && nowHasName && fresh) {
    void sendAdminPlaintiffNotification({
      plaintiffName: fresh.plaintiffName ?? null,
      plaintiffEmail: fresh.plaintiffEmail ?? null,
      plaintiffPhone: fresh.plaintiffPhone ?? null,
      plaintiffAddress: fresh.plaintiffAddress ?? null,
    });
  }
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
  // When the additional plaintiff operates under a DBA, two fields are required
  // to produce a usable SC-103 (Plaintiff 2): the signer's name and the DBA name.
  const additionalPlaintiffDbaRequired = !!(caseRecord.hasAdditionalPlaintiff && caseRecord.additionalPlaintiffIsFictitious);
  if (additionalPlaintiffDbaRequired && !caseRecord.additionalPlaintiffName) {
    missingFields.push("Plaintiff 2 name (required for SC-103 DBA form)");
  }
  if (additionalPlaintiffDbaRequired && !caseRecord.secondPlaintiffDbaName) {
    missingFields.push("Plaintiff 2 DBA business name (required for SC-103 DBA form)");
  }

  const totalRequired = additionalPlaintiffDbaRequired ? 13 : 11;
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

  const claimAmt = caseRecord.claimAmount
    ? `$${Number(caseRecord.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "[claim amount]";

  // Converts a raw uploaded filename to a human-readable evidence description.
  // Strips leading number prefixes, file extensions, duplicate markers like (1), and underscores.
  function humanizeFileName(filename: string): string {
    let name = filename.replace(/\.[^.]+$/, "");        // remove extension
    name = name.replace(/^\d+[_.\s-]+/, "");            // remove leading numbering: "01_", "1. ", etc.
    name = name.replace(/\s*\(\d+\)\s*$/, "").trim();   // remove trailing "(1)", "(2)", etc.
    name = name.replace(/_/g, " ");                     // underscores → spaces
    name = name.replace(/\s+/g, " ").trim();            // normalize whitespace
    return name;
  }

  // Build a synthesized evidence summary from checklist + uploaded docs
  const checklist = Array.isArray(caseRecord.evidenceChecklist)
    ? (caseRecord.evidenceChecklist as { id: string; item: string; checked?: boolean }[])
    : [];
  const gatheredItems = checklist.filter(i => i.checked).map(i => i.item);
  const docNames = docs
    .map(d => humanizeFileName(d.originalName || d.filename || ""))
    .filter(Boolean);

  const evidenceSummary = (gatheredItems.length > 0 || docNames.length > 0)
    ? `═══ EVIDENCE AVAILABLE FOR THIS CASE ═══
Checklist items the plaintiff has gathered: ${gatheredItems.length > 0 ? gatheredItems.join(", ") : "none checked yet"}
Uploaded documents (${docs.length}): ${docNames.length > 0 ? docNames.join(", ") : "none"}

EVIDENCE INSTRUCTION: The document names above have been pre-cleaned from uploaded file names. When referencing them in the statement, write them as natural English descriptions with appropriate articles — e.g. "the invoice from ACME", "a copy of the cancelled check", "my email requesting repair or refund". Pull supporting details (dates, amounts, descriptions) directly from the OCR text in the UPLOADED DOCUMENTS section of the case record above. Do NOT use bracket placeholders for evidence. If no evidence is available, use this exact sentence: "I understand I should bring any documents, photos, messages, receipts, witnesses, or other proof that supports my claim."`
    : `═══ EVIDENCE ═══
No documents uploaded and no evidence checklist items checked yet.
EVIDENCE INSTRUCTION: Use this exact sentence for the evidence paragraph: "I understand I should bring any documents, photos, messages, receipts, witnesses, or other proof that supports my claim."`;

  const prompt = `You are an expert at writing court-ready opening statements for California small claims court. You have the plaintiff's complete case record, all uploaded document text, and a synthesized evidence summary. Read everything carefully before writing a single word.

${context}

${evidenceSummary}

Write the plaintiff's opening statement for use when the defendant IS present in court.

════════════════════════════════════════
REQUIRED STRUCTURE — follow every step in order
════════════════════════════════════════

STEP 1 — INTRODUCTION [exactly 2 sentences]
Sentence 1 must be: "Your Honor, my name is [plaintiff name], and I am the plaintiff in this case against [defendant introduction]."
  Defendant introduction rules:
    • Individual: use their full name exactly once here.
    • Business with a trade name (DBA): write "[Legal Name], doing business as [Trade Name]" — use both names here and nowhere else.
    • Business without a trade name: use the business name.
Sentence 2: One sentence stating what this case is about (what happened at the highest level).
⚠ The plaintiff's name appears ONLY in sentence 1. Never again anywhere in the statement.

STEP 2 — FACTS [3–5 sentences, chronological]
Tell the story in time order: what was agreed to or what service/product was provided, when, what went wrong, what the defendant failed to do, how it remained unresolved. Pull specific dates, amounts, and events from the claim description AND from any OCR text in the uploaded documents (contract terms, invoice line items, service descriptions, etc.).
Rules:
  • Use "I", "my", "me" throughout — first person only.
  • After sentence 1, the defendant is always "the defendant" — never use their name or business name again.
  • Never write "I, [Name], did..." or "As [Name], I..." — just write "I did..."
  • Never output ALL-CAPS raw notes verbatim (e.g. "EMAILED DEMAND 4-2-26", "FROM CONTRACT AND CANCELLED CHECK"). Rewrite as clean English.

STEP 3 — AMOUNT [1–2 sentences]
State the exact amount (${claimAmt}) and explain how it was calculated. Use specific line items or math from the case record if available.
⚠ State the amount EXACTLY ONCE here. Do NOT add any separate line like "I am seeking ${claimAmt} to cover my losses" — that is a duplicate and must not appear.

STEP 4 — PRIOR DEMAND [1 sentence — include only if demand data exists]
Describe what the plaintiff specifically did before filing: what action was taken and when (e.g., "Before filing, I returned to the business on [date] and then sent a formal demand by email on [date], but received no payment.").
Use the specific details from the Demand Details field in the case record.
⚠ Never write "I formally demanded that the defendant pay the amount owed" or any other generic demand sentence. If the Demand Details field is empty AND Prior Demand Made is No or unknown, omit this step entirely.

STEP 5 — EVIDENCE [1–2 sentences]
Name the actual items from the EVIDENCE AVAILABLE section above. List them by type or document name (e.g., "the original invoice, the written estimate, my cancelled check, the email demand I sent, and photos of the damage").
⚠ Never write "I have supporting evidence including documents and records" — that is too vague.
⚠ If no evidence exists, use this exact sentence: "I understand I should bring any documents, photos, messages, receipts, witnesses, or other proof that supports my claim."

STEP 6 — JUDGMENT REQUEST [required — use this exact sentence, word for word]
"For those reasons, I respectfully ask the Court to enter judgment in my favor against the defendant in the amount of ${claimAmt}, plus any allowable court costs and service costs."

════════════════════════════════════════
ABSOLUTE FORMATTING RULES
════════════════════════════════════════
• Dollar amounts: no spaces inside — "$1,542.42" not "$1,542. 42". Remove any extra spaces in entity names like "ACME  INC." → "ACME INC."
• No legal jargon or case citations. Plain English only.
• Do NOT invent facts, dates, or communications not in the record.
• Output ONLY the statement text — no title, no section labels, no commentary.
• Length: 195–260 words (1 minute 30 seconds to 2 minutes spoken aloud). Be concise — cut padding, not facts.

Return plain text only. No markdown.`;

  const noShowPrompt = `You are an expert at writing court-ready statements for California small claims court. You have the plaintiff's complete case record, all uploaded document text, and a synthesized evidence summary. Read everything carefully before writing.

${context}

${evidenceSummary}

Write the plaintiff's statement for use ONLY if the defendant does NOT appear at the hearing.

SERVICE STATUS: No confirmed proof-of-service record exists in this system. Use the cautious service language in Step 4 — do not state that service was completed as a fact.

════════════════════════════════════════
REQUIRED STRUCTURE — follow all 10 steps in order
════════════════════════════════════════

STEP 1 — IDENTIFY YOURSELF
Write: "Your Honor, my name is [plaintiff name]."${caseRecord.caseNumber ? ` Then write: "The case number is ${caseRecord.caseNumber}."` : ""}
⚠ The plaintiff's name appears ONLY here. Never again after this sentence.

STEP 2 — STATE DEFENDANT IS ABSENT
Write: "The defendant is not present."

STEP 3 — STATE READINESS
Write: "I am ready to proceed today."

STEP 4 — ADDRESS SERVICE [use this exact language — do not alter it]
Write: "I understand the Court will need to confirm that service was properly completed before deciding whether the case can proceed today."

STEP 5 — STATE WHAT THE CASE IS ABOUT [1 complete, grammatical sentence]
Write a standalone sentence describing what the case is about. Do NOT write "This case involves On [date]…" — that breaks grammar. Write something like: "This case arises from [subject of dispute]." or "I am here because [what happened]."

STEP 6 — KEY FACTS CHRONOLOGICALLY [2–4 sentences]
Describe the core events in time order: what was agreed to or what happened, when, what went wrong, what the defendant failed to do. Use specific dates and details from the claim description and any OCR text in the uploaded documents. Use "I" for plaintiff actions. After the defendant is first mentioned, use "the defendant" — never repeat their full name.
⚠ Never output ALL-CAPS raw notes verbatim. Rewrite as clean English.

STEP 7 — WHAT PLAINTIFF DID BEFORE FILING [1 sentence]
Describe what the plaintiff specifically did before filing: what action, when (e.g., "Before filing, I contacted the defendant by email on [date] and requested payment, but received no response."). Use the specific details from the Demand Details field in the case record. Never write "I formally demanded payment" as a generic sentence.
If no demand was made, write: "I attempted to resolve this matter before filing, but was unsuccessful."

STEP 8 — DAMAGES [1 sentence]
Write: "My damages total ${claimAmt}."

STEP 9 — EVIDENCE [1–2 sentences]
Write: "I have copies of my evidence for the Court."
Then name the specific items from the EVIDENCE AVAILABLE section (e.g., "This includes the original invoice, my cancelled check, the email demand, and photos of the damage.").
⚠ Never write "I have submitted evidence to the Court" — submission status is unconfirmed.
⚠ Never write "documents and records" generically if specific items are available.
If no evidence items exist, write: "I have gathered documentation to support my claim and am prepared to present it."

STEP 10 — JUDGMENT REQUEST [required — use this exact sentence, word for word]
"For those reasons, I respectfully ask the Court to enter judgment in my favor against the defendant in the amount of ${claimAmt}, plus any allowable court costs and service costs."

════════════════════════════════════════
ABSOLUTE FORMATTING RULES
════════════════════════════════════════
• Write Steps 1–4 as a single flowing paragraph (they form the opening). Then continue with Steps 5–10 as natural prose paragraphs.
• Dollar amounts: no spaces inside — "$1,542.42" not "$1,542. 42".
• No legal jargon. Plain English only.
• Do NOT invent facts, dates, or communications not in the record.
• Output ONLY the statement text — no step labels, no titles, no commentary.
• Length: 150–220 words (under 2 minutes spoken aloud).
• This statement must be structurally and substantively different from the defendant-present version.

Return plain text only. No markdown.`;

  const [primaryCompletion, noShowCompletion] = await Promise.all([
    openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
    openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 600,
      messages: [{ role: "user", content: noShowPrompt }],
    }),
  ]);

  const statement = (primaryCompletion.choices[0].message.content || "").trim();
  if (!statement) { res.status(500).json({ error: "Failed to generate statement" }); return; }

  const noShowStatement = (noShowCompletion.choices[0].message.content || "").trim();

  res.json({ statement, noShowStatement });
});

export default router;
