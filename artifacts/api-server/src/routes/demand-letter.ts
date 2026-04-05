import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, documentsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { checkAiRateLimit } from "../lib/rate-limiter";
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
  formal: `TONE — FORMAL (Professional Notice):
- Write as a calm, official notice of debt — no emotion, no pleading, no hostility
- State facts in plain declarative sentences: "On [date], [event occurred]. Payment of $X remains due."
- The consequence sentence must read: "In the event payment is not received by the deadline, I will file a court action against you in [County] Small Claims Court seeking the full amount owed plus court costs and filing fees."
- Do not soften or hedge the consequence — state it as certain fact
- Closing should be brief: "I trust you will address this matter promptly."`,

  firm: `TONE — FIRM (Assertive Demand):
- Open with a direct statement of the debt owed — no pleasantries
- State the facts crisply. Every sentence should apply pressure without being hostile.
- Emphasize the deadline prominently: "You have until [date] to remit payment in full."
- The consequence sentence must read: "Failure to pay by this date will result in a court action filed against you in [County] Small Claims Court. I will seek the full amount owed, plus court filing fees, service costs, and any other relief the court deems appropriate."
- End with: "I am prepared to file immediately upon expiration of this deadline."
- This letter should feel like the last warning before legal action — because it is.`,

  friendly: `TONE — FRIENDLY (Resolution-Oriented):
- Acknowledge any prior relationship or dealings in the opening sentence
- Express a genuine preference for resolving this without court involvement
- State the facts plainly but without accusation — "It appears there may be a misunderstanding regarding..."
- Keep the payment request clear: the dollar amount and deadline must not be buried
- The consequence sentence must read: "If I do not hear from you by [date], I will have no choice but to file a court action against you in [County] Small Claims Court to recover the amount owed."
- Close with an invitation to contact you: include phone or email if provided
- End with: "I hope we can resolve this matter quickly and amicably."`,
};

function buildLetterContext(
  caseRecord: typeof casesTable.$inferSelect,
  docs: typeof documentsTable.$inferSelect[],
): string {
  const parts: string[] = [];

  parts.push(`=== CASE FACTS ===`);
  parts.push(`Case Title: ${caseRecord.title}`);
  if (caseRecord.claimType)     parts.push(`Claim Type: ${caseRecord.claimType}`);
  if (caseRecord.countyId)      parts.push(`Filing County: ${caseRecord.countyId} County`);
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
  if (caseRecord.claimDescription) {
    const cleanedDesc = caseRecord.claimDescription
      .replace(/mock\s+small\s+claims\s+case\s+summary/gi, "")
      .replace(/mock\s+case\s+summary/gi, "")
      .replace(/sample\s+case/gi, "")
      .replace(/^\s*[-–—:]+\s*/gm, "")
      .trim();
    if (cleanedDesc) parts.push(`\nClaim Description:\n${cleanedDesc}`);
  }
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

const SYSTEM_PROMPT = `You are a professional legal document writer specializing in California pre-litigation demand letters for small claims matters. You write letters that are tight, factual, and effective — the kind a seasoned paralegal would produce.

═══ CRITICAL CONTENT RULES ═══
1. USE THE ACTUAL CLAIM DESCRIPTION. The highlighted facts below are the real basis of this claim. Use them directly in the factual basis paragraph. Do NOT replace them with generic filler like "a dispute arose" or "money is owed."
2. NEVER invent facts. Every sentence must be grounded in the case data provided.
3. If documents are provided with extracted text, pull specific details (dates, amounts, addresses, names) from them to strengthen the letter.
4. NEVER use the words "mock," "sample," or "hypothetical" — these are real case facts.
5. COUNTY: Where a filing county is known, the consequences paragraph must name it specifically: "...file a court action against you in [County Name] County Small Claims Court..." If no county is given, use "California Small Claims Court."

═══ LENGTH & STRUCTURE RULES ═══
Target: 4 tight body paragraphs. One page. No padding.

Paragraph 1 — Opening (2 sentences max): Who you are, what this letter is about.
Paragraph 2 — Facts (3-5 sentences): The actual events using the claim description. Specific dates, amounts, what happened, what was not done.
Paragraph 3 — Demand (2-3 sentences): Exact dollar amount with breakdown. Clear deadline (14 days from today). No hedging.
Paragraph 4 — Consequences (2-3 sentences): What happens if they don't pay. Must use "court action against you" language — NOT "small claims action." Reference court costs added on top.

FORMAT:
- Output ONLY the letter text — no commentary, no markdown, no preamble
- Standard business letter format: Sender block → Date → Recipient block → RE: line → Body → Signature
- Plaintiff address missing → use "[Your Address]"
- Defendant address missing → use "[Defendant Address]"  
- Dollar amount must match exactly — never round or estimate
- Sign off with plaintiff name or "[Your Name]" if not provided
- Response deadline: exactly 14 calendar days from today`;

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

  const tone = parseTone(req.body?.tone);

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const context = buildLetterContext(caseRecord, docs);
  const toneInstruction = TONE_INSTRUCTIONS[tone];
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Strip any mock/sample labels before sending to AI
  const cleanDescription = (caseRecord.claimDescription ?? "")
    .replace(/mock\s+small\s+claims\s+case\s+summary/gi, "")
    .replace(/mock\s+case\s+summary/gi, "")
    .replace(/sample\s+case/gi, "")
    .replace(/^\s*[-–—:]+\s*/gm, "")
    .trim();

  const claimDescriptionHighlight = cleanDescription
    ? `\n\n⚠️ IMPORTANT — USE THESE FACTS IN THE FACTUAL BASIS PARAGRAPH. These are real case facts — do NOT label them as mock, sample, or hypothetical. Do NOT include any "Mock" or "Summary" headers. Write them as the actual factual basis of this claim:\n"${cleanDescription}"\n`
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
