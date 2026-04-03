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
router.post("/cases/:id/advisor/analyze", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const [caseRecord] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, userId)));
  if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }

  const { claimDescription, claimType, claimAmount, incidentDate, howAmountCalculated } = req.body;

  const prompt = `You are a California small claims court advisor. Analyze this case and return ONLY a valid JSON object — no markdown, no explanation, no code blocks.

Case details:
- Claim Type: ${claimType || "Not specified"}
- Amount Claimed: $${claimAmount || "Not specified"}
- When it happened: ${incidentDate || "Not specified"}
- What happened: ${claimDescription || "Not provided"}
- How amount calculated: ${howAmountCalculated || "Not provided"}

Return this exact JSON structure:
{
  "questions": [
    { "id": "q1", "question": "..." },
    { "id": "q2", "question": "..." }
  ],
  "evidenceChecklist": [
    { "id": "e1", "item": "Short label", "description": "Why this document matters and what specifically to look for" }
  ]
}

Rules:
- Generate 2–4 questions targeting the WEAKEST or MISSING parts of the description. Make them specific to what was actually written, not generic.
- Generate 3–6 evidence items specific to this exact claim type. Be specific (e.g. "Signed lease agreement" not "Documents").
- Security deposit cases: lease, move-in/out inspection report, bank records showing deposit paid, texts or emails with landlord
- Contract disputes: signed contract or agreement, invoices, proof of payment, written communications
- Property damage: repair estimates or receipts, before/after photos, written acknowledgment from defendant
- Money owed / unpaid debt: loan agreement, payment history, prior demand letters
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
    res.json(JSON.parse(jsonStr));
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
  }
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

  const { claimDescription, claimType, claimAmount, incidentDate, howAmountCalculated, answers } = req.body;

  const answersText = Array.isArray(answers)
    ? answers.filter((a: any) => a.answer?.trim()).map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")
    : "";

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 800,
    messages: [{
      role: "user",
      content: `You are a California small claims court advisor. Using the original description and the user's follow-up answers, write a clear, polished case description suitable for a California small claims court form.

Original description: ${claimDescription || "None provided"}
Claim Type: ${claimType || "Unknown"}
Amount: $${claimAmount || "Unknown"}
When it happened: ${incidentDate || "Unknown"}
How amount calculated: ${howAmountCalculated || "Not provided"}

Additional answers from the user:
${answersText || "None provided"}

Write 2–4 tight paragraphs that:
1. State the relationship or agreement between the parties
2. Describe what happened clearly and in chronological order
3. State the dollar amount and how it was calculated
4. Mention any prior demand made (if the user mentioned it)
5. Use plain, factual language — no legal jargon
6. Are suitable for copying directly into a California small claims court form

Return ONLY the case description text. No headers, no commentary, no formatting.`
    }],
  });

  res.json({ refinedStatement: completion.choices[0].message.content?.trim() || "" });
});

export default router;
