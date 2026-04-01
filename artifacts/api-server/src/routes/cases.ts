import { Router, type IRouter } from "express";
import { eq, desc, sum, avg } from "drizzle-orm";
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

const router: IRouter = Router();

router.get("/cases", async (_req, res): Promise<void> => {
  const cases = await db.select().from(casesTable).orderBy(desc(casesTable.updatedAt));
  res.json(cases);
});

router.get("/cases/stats", async (_req, res): Promise<void> => {
  const cases = await db.select().from(casesTable).orderBy(desc(casesTable.updatedAt));

  const byStatus: Record<string, number> = {};
  let totalClaimAmount = 0;
  let totalReadiness = 0;

  for (const c of cases) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    totalClaimAmount += c.claimAmount ?? 0;
    totalReadiness += c.readinessScore ?? 0;
  }

  const stats = {
    total: cases.length,
    byStatus,
    totalClaimAmount,
    avgReadinessScore: cases.length > 0 ? Math.round(totalReadiness / cases.length) : 0,
    recentCases: cases.slice(0, 5),
  };

  res.json(stats);
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [newCase] = await db
    .insert(casesTable)
    .values({
      title: parsed.data.title,
      claimType: parsed.data.claimType ?? null,
      countyId: parsed.data.countyId ?? null,
      status: "draft",
    })
    .returning();

  res.status(201).json(newCase);
});

router.get("/cases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRecord) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const documents = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const chatMessages = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.caseId, id));

  res.json({ ...caseRecord, documents, chatMessages });
});

router.patch("/cases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateData[snakeKey] = value;
    }
  }

  const [updated] = await db
    .update(casesTable)
    .set(parsed.data as Parameters<typeof db.update>[0] extends Parameters<typeof db.update>[0] ? Record<string, unknown> : never)
    .where(eq(casesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json(updated);
});

router.delete("/cases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const [deleted] = await db.delete(casesTable).where(eq(casesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/cases/:id/intake", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const parsed = SaveIntakeProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

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
    .where(eq(casesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json(updated);
});

router.get("/cases/:id/readiness", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRecord) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

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
  if (docs.length > 0) strengths.push(`${docs.length} supporting document${docs.length > 1 ? 's' : ''} uploaded`);
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
    : `Complete the missing fields and upload supporting documents to improve your readiness score. You need a score of 80+ to be ready to file.`;

  await db.update(casesTable).set({ readinessScore: score }).where(eq(casesTable.id, id));

  res.json({ score, missingFields, strengths, weaknesses, nextSteps, filingGuidance });
});

export default router;
