import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, documentsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const router: IRouter = Router();

const BLACK = rgb(0, 0, 0);
const NAVY  = rgb(0.05, 0.15, 0.35);
const GRAY  = rgb(0.4, 0.4, 0.4);

const VALID_TONES = ["formal", "firm", "friendly"] as const;
type DemandLetterTone = typeof VALID_TONES[number];

function parseTone(value: unknown): DemandLetterTone {
  if (typeof value === "string" && VALID_TONES.includes(value as DemandLetterTone)) {
    return value as DemandLetterTone;
  }
  return "formal";
}

// ── Tone instructions ─────────────────────────────────────────────────────────
const TONE_INSTRUCTIONS: Record<string, string> = {
  formal: "Write in a neutral, professional tone. State facts clearly. Do not threaten or plead.",
  firm:   "Write in a firm, assertive tone. Emphasize the legal basis, the deadline, and the consequences of non-response clearly but without hostility.",
  friendly: "Write in a cooperative, solution-oriented tone. Acknowledge the relationship where appropriate and express a preference for resolution without court involvement.",
};

function buildLetterContext(
  caseRecord: typeof casesTable.$inferSelect,
  docs: typeof documentsTable.$inferSelect[],
): string {
  const parts: string[] = [];

  parts.push(`=== CASE FACTS ===`);
  parts.push(`Case Title: ${caseRecord.title}`);
  if (caseRecord.claimType)     parts.push(`Claim Type: ${caseRecord.claimType}`);
  if (caseRecord.claimAmount)   parts.push(`Amount Sought: $${caseRecord.claimAmount.toLocaleString()}`);
  if (caseRecord.plaintiffName) parts.push(`Plaintiff (Sender): ${caseRecord.plaintiffName}`);
  if (caseRecord.plaintiffAddress && caseRecord.plaintiffCity) {
    parts.push(`Plaintiff Address: ${caseRecord.plaintiffAddress}, ${caseRecord.plaintiffCity}, ${caseRecord.plaintiffState ?? "CA"} ${caseRecord.plaintiffZip ?? ""}`);
  }
  if (caseRecord.plaintiffEmail)  parts.push(`Plaintiff Email: ${caseRecord.plaintiffEmail}`);
  if (caseRecord.plaintiffPhone)  parts.push(`Plaintiff Phone: ${caseRecord.plaintiffPhone}`);
  if (caseRecord.defendantName)   parts.push(`Defendant (Recipient): ${caseRecord.defendantName}`);
  if (caseRecord.defendantAddress && caseRecord.defendantCity) {
    parts.push(`Defendant Address: ${caseRecord.defendantAddress}, ${caseRecord.defendantCity}, ${caseRecord.defendantState ?? "CA"} ${caseRecord.defendantZip ?? ""}`);
  }
  if (caseRecord.defendantIsBusinessOrEntity) parts.push(`Defendant is a business/entity`);
  if (caseRecord.incidentDate)    parts.push(`Incident Date: ${caseRecord.incidentDate}`);
  if (caseRecord.claimDescription) parts.push(`\nClaim Description:\n${caseRecord.claimDescription}`);
  if (caseRecord.howAmountCalculated) parts.push(`How Amount Calculated: ${caseRecord.howAmountCalculated}`);
  if (caseRecord.priorDemandMade !== null) {
    parts.push(`Prior Demand Made: ${caseRecord.priorDemandMade ? "Yes" : "No"}`);
    if (caseRecord.priorDemandDescription) parts.push(`Prior Demand Details: ${caseRecord.priorDemandDescription}`);
  }

  if (docs.length > 0) {
    parts.push(`\n=== SUPPORTING DOCUMENTS (${docs.length} total) ===`);
    for (const doc of docs) {
      parts.push(`\n--- Document: "${doc.originalName}" ---`);
      if (doc.ocrText && !doc.ocrText.startsWith("[")) {
        parts.push(`Extracted Text:\n${doc.ocrText.slice(0, 3000)}`);
      }
    }
  }

  return parts.join("\n");
}

const SYSTEM_PROMPT = `You are a professional legal document writer specializing in California pre-litigation demand letters for small claims matters. You produce clean, court-ready demand letters that are factually grounded, professional, and effective.

CRITICAL RULES — read before writing a single word:
1. The "Claim Description" field in the case facts contains the user's own explanation of what happened. You MUST use this verbatim as the foundation of the factual basis paragraph. Do NOT paraphrase it into a generic summary. Do NOT replace it with "a dispute arose." Reproduce the key facts from it directly in the letter.
2. If supporting documents are provided with extracted text, use specific details from them (dates, dollar amounts, names, addresses, property details) to enrich the letter. Do NOT ignore them.
3. NEVER write generic filler like "a dispute arose" or "money is owed." Every sentence must reference the actual facts of this specific case.
4. Ground every fact in the case information provided — do NOT invent facts not present in the context.

Format rules:
- Output ONLY the letter text — no commentary, no preamble, no markdown headers outside the letter
- Use standard business letter format with today's date
- Structure: Sender block → Date → Recipient block → RE: subject line → Body paragraphs → Signature block
- Body must include: statement of the dispute, factual basis (using the ACTUAL claim description), amount demanded with breakdown, response deadline (14 days from today), and consequences of non-response
- If plaintiff address is missing, use "[Your Address]" as placeholder
- If defendant address is missing, use "[Defendant Address]" as placeholder
- Amount demanded must match the claim amount exactly — do not round or estimate
- Response deadline: exactly 14 calendar days from today's date
- Sign off with plaintiff's name or "[Your Name]" if not provided`;

// GET — retrieve saved letter
router.get("/cases/:id/demand-letter", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  res.json({
    text: caseRecord.demandLetterText ?? null,
    tone: caseRecord.demandLetterTone ?? null,
  });
});

// POST — generate demand letter via AI (SSE stream), save on completion
router.post("/cases/:id/demand-letter", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const tone = parseTone(req.body?.tone);

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const context = buildLetterContext(caseRecord, docs);
  const toneInstruction = TONE_INSTRUCTIONS[tone];
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const claimDescriptionHighlight = caseRecord.claimDescription
    ? `\n\n⚠️ IMPORTANT — USE THIS IN THE FACTUAL BASIS PARAGRAPH (do not replace with generic language):\n"${caseRecord.claimDescription}"\n`
    : "\n\n⚠️ WARNING: No claim description was provided. Do your best with the information available but note the letter may be incomplete.\n";

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `Today's date is ${today}.\n\nTone instruction: ${toneInstruction}\n\n${context}${claimDescriptionHighlight}\nWrite the demand letter now. Remember: use the actual claim description above — never replace it with generic filler.`,
    },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullText = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullText += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  // Save generated letter to DB
  await db.update(casesTable)
    .set({ demandLetterText: fullText, demandLetterTone: tone })
    .where(eq(casesTable.id, id));

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// POST /pdf — generate PDF from saved (or provided) letter text
router.post("/cases/:id/demand-letter/pdf", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  const letterText: string = req.body?.text ?? caseRecord.demandLetterText ?? "";
  if (!letterText.trim()) { res.status(400).json({ error: "No letter text to export" }); return; }

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regFont  = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const W = 612, H = 792, ML = 72, MR = 72, CW = W - ML - MR;
  let page = pdfDoc.addPage([W, H]);
  let y = H - 56;

  // Header bar
  page.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: NAVY });
  page.drawText("DEMAND LETTER", { x: ML, y: H - 28, size: 13, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText("Confidential — Pre-Litigation Communication", {
    x: W - MR - 230, y: H - 28, size: 9, font: regFont, color: rgb(0.8, 0.85, 1),
  });

  // Thin separator
  page.drawLine({ start: { x: ML, y: H - 50 }, end: { x: W - MR, y: H - 50 }, thickness: 0.5, color: GRAY });
  y = H - 72;

  // Wrap and render body text
  const lines = letterText.split("\n");
  const SIZE = 10.5;
  const LINE_H = SIZE * 1.55;
  const MAX_Y = 60;

  function wrapLine(text: string, maxW: number): string[] {
    if (!text.trim()) return [""];
    const words = text.split(" ");
    const result: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (regFont.widthOfTextAtSize(test, SIZE) <= maxW) {
        cur = test;
      } else {
        if (cur) result.push(cur);
        cur = w;
      }
    }
    if (cur) result.push(cur);
    return result.length ? result : [""];
  }

  for (const rawLine of lines) {
    const wrapped = wrapLine(rawLine, CW);
    for (const wl of wrapped) {
      if (y < MAX_Y) {
        page = pdfDoc.addPage([W, H]);
        page.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: NAVY });
        page.drawText("DEMAND LETTER (continued)", { x: ML, y: H - 28, size: 11, font: boldFont, color: rgb(1, 1, 1) });
        y = H - 72;
      }
      page.drawText(wl || " ", { x: ML, y, size: SIZE, font: regFont, color: BLACK });
      y -= LINE_H;
    }
    y -= LINE_H * 0.15; // extra spacing between paragraphs
  }

  // Footer
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const p = pdfDoc.getPage(i);
    p.drawLine({ start: { x: ML, y: 40 }, end: { x: W - MR, y: 40 }, thickness: 0.5, color: GRAY });
    p.drawText(`Generated by Small Claims Genie  •  Page ${i + 1} of ${pageCount}`, {
      x: ML, y: 26, size: 8, font: regFont, color: GRAY,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const safeName = (caseRecord.title ?? "demand-letter").replace(/[^a-z0-9]/gi, "-").toLowerCase();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}-demand-letter.pdf"`);
  res.send(Buffer.from(pdfBytes));
});

export default router;
