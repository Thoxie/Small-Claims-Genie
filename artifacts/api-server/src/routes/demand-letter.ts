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
  if (caseRecord.claimAmount) {
    const amt = `$${Number(caseRecord.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    parts.push(`Amount Sought (AUTHORITATIVE — use this exact figure as the demand amount everywhere it appears in the letter): ${amt}`);
  }
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

═══ AMOUNT — SINGLE SOURCE OF TRUTH ═══
The case data includes a field called "Amount Sought." This is the ONLY dollar figure you may use anywhere in the letter as the demand amount. Use it exactly as written — same digits, same formatting.
- The claim description and other fields may mention dollar figures as part of the factual narrative. Those figures are background context. Do NOT use them as the demand amount.
- Every instance of a dollar demand in this letter (in the body, the RE: line, and the consequences paragraph) must match the "Amount Sought" value exactly.
- If "Amount Sought" is not provided, write "[AMOUNT]" as a placeholder rather than guessing from the description.

═══ CRITICAL CONTENT RULES ═══
1. USE THE ACTUAL CLAIM DESCRIPTION. The highlighted facts below are the real basis of this claim. Use them directly in the factual basis paragraph. Do NOT replace them with generic filler like "a dispute arose" or "money is owed."
2. NEVER invent facts. Every sentence must be grounded in the case data provided.
3. If documents are provided with extracted text, pull specific details (dates, addresses, names) from them to strengthen the letter — but never pull a dollar amount from a document to use as the demand figure. The demand amount is always from "Amount Sought."
4. NEVER use the words "mock," "sample," or "hypothetical" — these are real case facts.
5. COUNTY: Where a filing county is known, the consequences paragraph must name it specifically: "...file a court action against you in [County Name] County Small Claims Court..." If no county is given, use "California Small Claims Court."

═══ LENGTH & STRUCTURE RULES ═══
Target: 4 tight body paragraphs. One page. No padding.

Paragraph 1 — Opening (2 sentences max): Who you are, what this letter is about.
Paragraph 2 — Facts (3-5 sentences): The actual events using the claim description. Specific dates, what happened, what was not done. Do not insert the demand dollar amount here — that belongs in Paragraph 3.
Paragraph 3 — Demand (2-3 sentences): State the exact "Amount Sought" value as the demand. Clear deadline (14 days from today). No hedging.
Paragraph 4 — Consequences (2-3 sentences): What happens if they don't pay. Must use "court action against you" language — NOT "small claims action." Reference court costs added on top.

FORMAT:
- Output ONLY the letter text — no commentary, no markdown, no preamble
- Standard business letter format: Sender block → Date → Recipient block → RE: line → Body → Signature
- Plaintiff address missing → use "[Your Address]"
- Defendant address missing → use "[Defendant Address]"
- RE: line must include the exact "Amount Sought" value
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

// ── MC-030 Declaration AI generation ─────────────────────────────────────────
// Statute map by claim type — California-specific
const STATUTE_MAP: Record<string, string[]> = {
  "Security Deposit": [
    "Civil Code § 1950.5 — landlord must return the security deposit within 21 days of move-out with an itemized statement of deductions",
    "Civil Code § 1950.5(l) — if deposit is withheld in bad faith, landlord is liable for up to twice the amount wrongfully withheld",
  ],
  "Property Damage": [
    "Civil Code § 3333 — the measure of damages for tort is the amount that will compensate for all detriment proximately caused",
    "Civil Code § 3281 — every person who suffers detriment from the unlawful act of another may recover compensation in damages",
  ],
  "Contract Dispute": [
    "Civil Code § 3300 — the measure of damages for breach of contract is the amount that will compensate for all detriment proximately caused by the breach",
    "Civil Code § 3301 — damages must be certain, or capable of being made certain by calculation, from the breach",
    "Civil Code § 1550 — essential elements of a contract: parties capable of contracting, mutual consent, lawful object, sufficient consideration",
  ],
  "Unpaid Debt": [
    "Civil Code § 1605 — consideration exists when the promisor receives a benefit or the promisee suffers a detriment",
    "Civil Code § 3287 — a person entitled to damages certain or capable of being made certain may recover prejudgment interest from the day the right vested",
    "Civil Code § 3289 — if no interest rate is specified in the contract, the legal rate is 10% per annum",
  ],
  "Money Owed": [
    "Civil Code § 1605 — consideration exists when the promisor receives a benefit or the promisee suffers a detriment",
    "Civil Code § 3287 — a party entitled to recover damages certain in amount may also recover interest from the date the obligation became due",
    "Civil Code § 3289 — the statutory interest rate when none is specified is 10% per annum",
  ],
  "Fraud": [
    "Civil Code § 1709 — one who willfully deceives another with intent to induce an act or omission to their prejudice is liable for any damage caused",
    "Civil Code § 3343 — the measure of fraud damages is the out-of-pocket loss and any additional damage arising from the fraud",
    "Civil Code § 1572 — actual fraud includes intentional misrepresentation, concealment, false promise, and other deceptive acts",
  ],
  "Other": [
    "Civil Code § 3281 — every person who suffers detriment from the unlawful act of another may recover compensation in damages",
    "Civil Code § 3333 — the measure of damages is the amount that compensates for all detriment proximately caused",
  ],
};

const MC030_SYSTEM = `You are a California legal document drafter helping a self-represented party in small claims court. Write a MC-030 Declaration — a sworn statement under penalty of perjury.

FORMAT RULES:
- Number every paragraph starting at 1.
- One fact or idea per paragraph. Keep each paragraph 2–4 sentences max.
- Write in first person ("I," "me," "my").
- Do not use bullet points, headers, or markdown.
- Do not use the word "aforementioned," "herein," or other legalese.
- End with a closing paragraph: "I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct, and that this declaration was executed on [DATE] in [City], California."

CONTENT ORDER:
1. Who you are and your relationship to the case.
2. Chronological facts — what happened, specific dates, specific amounts, specific actions taken.
3. What you did to try to resolve the matter before filing.
4. What relief you are seeking and why the amount is fair.
5. Applicable California statutes (list each statute cited as a separate numbered paragraph explaining how it applies).
6. Closing declaration paragraph.

IMPORTANT: Use only the facts provided. Never invent facts. The dollar amount must match the Amount Sought exactly.`;

router.post("/cases/:id/forms/mc030-ai", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = checkAiRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `Too many AI requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes.` });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));

  const statutes = STATUTE_MAP[caseRecord.claimType ?? "Other"] ?? STATUTE_MAP["Other"];
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const amt = caseRecord.claimAmount
    ? `$${Number(caseRecord.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "[AMOUNT]";

  const parts: string[] = [
    `=== CASE FACTS ===`,
    `Plaintiff (Declarant): ${caseRecord.plaintiffName ?? "[Plaintiff]"}`,
    `Defendant: ${caseRecord.defendantName ?? "[Defendant]"}`,
    `Amount Sought (AUTHORITATIVE): ${amt}`,
    `Claim Type: ${caseRecord.claimType ?? "Not specified"}`,
    caseRecord.incidentDate ? `Incident Date: ${caseRecord.incidentDate}` : "",
    caseRecord.claimDescription ? `\nFull Claim Description:\n${caseRecord.claimDescription}` : "",
    caseRecord.howAmountCalculated ? `\nHow Amount Was Calculated:\n${caseRecord.howAmountCalculated}` : "",
    caseRecord.priorDemandMade != null ? `Prior Demand Made: ${caseRecord.priorDemandMade ? "Yes" : "No"}` : "",
    caseRecord.priorDemandDescription ? `Prior Demand Details: ${caseRecord.priorDemandDescription}` : "",
    caseRecord.countyId ? `Filing County: ${caseRecord.countyId} County` : "",
    caseRecord.plaintiffCity ? `Declarant City: ${caseRecord.plaintiffCity}` : "",
    `Today's Date: ${today}`,
    `\n=== APPLICABLE CALIFORNIA STATUTES ===`,
    ...statutes,
  ].filter(Boolean);

  if (docs.length > 0) {
    parts.push(`\n=== SUPPORTING DOCUMENTS ===`);
    for (const doc of docs.slice(0, 4)) {
      if (doc.ocrText && !doc.ocrText.startsWith("[")) {
        parts.push(`Document: "${doc.originalName}"\n${doc.ocrText.slice(0, 2000)}`);
      }
    }
  }

  const userContent = parts.join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [
        { role: "system", content: MC030_SYSTEM },
        { role: "user", content: `Write the MC-030 declaration now.\n\n${userContent}` },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? "";
    res.json({ declarationText: text });
  } catch (err: any) {
    console.error("MC-030 AI error:", err?.message);
    res.status(500).json({ error: "Failed to generate declaration. Please try again." });
  }
});

// ── SETTLEMENT LETTER ─────────────────────────────────────────────────────────

const SETTLEMENT_TONES: Record<string, string> = {
  firm: `TONE — FIRM:
- Open with the facts directly. You have filed (or are ready to file) in small claims court.
- Make clear that this offer is a business decision, not weakness — you are offering to avoid the time and cost of a hearing.
- Reference the hearing date if provided: "My hearing is currently scheduled for [date]."
- State the settlement amount clearly. State the deadline clearly.
- End: "If I do not receive a response by [deadline], I will proceed with my court case."
- No hostility, but zero ambiguity about what happens if they don't respond.`,

  cooperative: `TONE — COOPERATIVE:
- Open by acknowledging the dispute and expressing a preference for resolution without court.
- Frame the settlement offer as a fair compromise — not a capitulation.
- Keep language conciliatory: "I believe a reasonable resolution is possible."
- Reference the hearing date if set, but frame it as context, not a threat.
- End with an invitation to discuss: include phone/email if provided.
- End: "I hope we can resolve this matter without the need for a court hearing."`,
};

const SETTLEMENT_SYSTEM = `You are a professional legal document writer helping a California small claims plaintiff write a settlement negotiation letter.

RULES:
- Output ONLY the letter text — no commentary, no markdown, no preamble
- Standard business letter format: Sender block → Date → Recipient block → RE: line → Body → Signature block
- 3–4 paragraphs. Plain English. No legal jargon.
- Paragraph 1: Who you are, that a dispute exists, that you are proposing to resolve it without a hearing.
- Paragraph 2: Brief factual summary — what happened, what is owed. Reference the original claim amount, then frame the settlement amount as a practical offer.
- Paragraph 3: The settlement offer — state the exact settlement amount, any installment terms, and the response deadline.
- Paragraph 4: Consequences and close — what happens if they don't respond. Reference hearing date if known.
- RE: line must include "Settlement Offer — $[settlement amount]"
- Never use the word "mock," "sample," or "hypothetical."
- Never invent facts. Use only what is provided.`;

// GET — load saved settlement letter
router.get("/cases/:id/settlement-letter", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }
  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  res.json({
    text: (caseRecord as any).settlementLetterText ?? null,
    tone: (caseRecord as any).settlementLetterTone ?? null,
  });
});

// POST — generate settlement letter via SSE stream
router.post("/cases/:id/settlement-letter", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = checkAiRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `Too many AI requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes.` });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }

  const {
    tone = "firm",
    settlementAmount,
    installments = false,
    installmentCount = 3,
    responseDays = 14,
  } = req.body ?? {};

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const deadline = new Date(today);
  deadline.setDate(deadline.getDate() + (Number(responseDays) || 14));
  const deadlineStr = deadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const origAmt = caseRecord.claimAmount
    ? `$${Number(caseRecord.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "[ORIGINAL AMOUNT]";
  const settleAmt = settlementAmount
    ? `$${Number(settlementAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : origAmt;

  const installmentText = installments
    ? `Settlement Payment Terms: ${settleAmt} payable in ${installmentCount} equal monthly installments of ${`$${(Number(settlementAmount) / Number(installmentCount)).toFixed(2)}`} each, beginning within 30 days of acceptance.`
    : `Settlement Payment Terms: ${settleAmt} paid in full within 14 days of acceptance.`;

  const parts: string[] = [
    `=== CASE FACTS ===`,
    `Plaintiff (Sender): ${caseRecord.plaintiffName ?? "[Plaintiff]"}`,
    caseRecord.plaintiffAddress && caseRecord.plaintiffCity
      ? `Plaintiff Address: ${caseRecord.plaintiffAddress}, ${caseRecord.plaintiffCity}, ${caseRecord.plaintiffState ?? "CA"} ${caseRecord.plaintiffZip ?? ""}`
      : "",
    caseRecord.plaintiffEmail ? `Plaintiff Email: ${caseRecord.plaintiffEmail}` : "",
    caseRecord.plaintiffPhone ? `Plaintiff Phone: ${caseRecord.plaintiffPhone}` : "",
    `Defendant (Recipient): ${caseRecord.defendantName ?? "[Defendant]"}`,
    caseRecord.defendantAddress && caseRecord.defendantCity
      ? `Defendant Address: ${caseRecord.defendantAddress}, ${caseRecord.defendantCity}, ${caseRecord.defendantState ?? "CA"} ${caseRecord.defendantZip ?? ""}`
      : "",
    caseRecord.claimType ? `Claim Type: ${caseRecord.claimType}` : "",
    caseRecord.incidentDate ? `Incident Date: ${caseRecord.incidentDate}` : "",
    `Original Claim Amount: ${origAmt}`,
    `Settlement Amount Being Offered: ${settleAmt}`,
    installmentText,
    `Response Deadline: ${deadlineStr}`,
    caseRecord.hearingDate
      ? `Hearing Date (already scheduled): ${new Date(caseRecord.hearingDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`
      : "Hearing Date: Not yet scheduled",
    caseRecord.priorDemandMade ? `Prior Demand: Yes — a written demand was previously sent and not resolved.` : "",
    caseRecord.claimDescription ? `\nCase Description:\n${caseRecord.claimDescription}` : "",
    `\nToday's Date: ${todayStr}`,
  ].filter(Boolean);

  const toneInstruction = SETTLEMENT_TONES[tone] ?? SETTLEMENT_TONES.firm;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullText = "";
  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 2048,
    messages: [
      { role: "system", content: SETTLEMENT_SYSTEM },
      { role: "user", content: `Today's date: ${todayStr}\n\n${toneInstruction}\n\n${parts.join("\n")}\n\nWrite the settlement offer letter now.` },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullText += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  await db.update(casesTable)
    .set({ settlementLetterText: fullText, settlementLetterTone: tone } as any)
    .where(eq(casesTable.id, id));

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// POST /pdf — generate settlement letter PDF
router.post("/cases/:id/settlement-letter/pdf", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  const letterText: string = req.body?.text ?? (caseRecord as any).settlementLetterText ?? "";
  if (!letterText.trim()) { res.status(400).json({ error: "No letter text to export" }); return; }

  const GREEN = rgb(0.05, 0.42, 0.37);

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regFont  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const W = 612, H = 792, ML = 72, MR = 72, CW = W - ML - MR;
  let page = pdfDoc.addPage([W, H]);
  let y = H - 56;

  page.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: GREEN });
  page.drawText("SETTLEMENT OFFER", { x: ML, y: H - 28, size: 13, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText("Confidential Settlement Communication", {
    x: W - MR - 210, y: H - 28, size: 9, font: regFont, color: rgb(0.8, 1, 0.95),
  });
  page.drawLine({ start: { x: ML, y: H - 50 }, end: { x: W - MR, y: H - 50 }, thickness: 0.5, color: GRAY });
  y = H - 72;

  const SIZE = 10.5, LINE_H = SIZE * 1.55, MAX_Y = 60;
  function wrapLine(text: string, maxW: number): string[] {
    if (!text.trim()) return [""];
    const words = text.split(" ");
    const result: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (regFont.widthOfTextAtSize(test, SIZE) <= maxW) { cur = test; }
      else { if (cur) result.push(cur); cur = w; }
    }
    if (cur) result.push(cur);
    return result.length ? result : [""];
  }

  for (const rawLine of letterText.split("\n")) {
    for (const wl of wrapLine(rawLine, CW)) {
      if (y < MAX_Y) {
        page = pdfDoc.addPage([W, H]);
        page.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: GREEN });
        page.drawText("SETTLEMENT OFFER (continued)", { x: ML, y: H - 28, size: 11, font: boldFont, color: rgb(1, 1, 1) });
        y = H - 72;
      }
      page.drawText(wl || " ", { x: ML, y, size: SIZE, font: regFont, color: BLACK });
      y -= LINE_H;
    }
    y -= LINE_H * 0.15;
  }

  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const p = pdfDoc.getPage(i);
    p.drawLine({ start: { x: ML, y: 40 }, end: { x: W - MR, y: 40 }, thickness: 0.5, color: GRAY });
    p.drawText(`Generated by Small Claims Genie  •  Page ${i + 1} of ${pageCount}`, {
      x: ML, y: 26, size: 8, font: regFont, color: GRAY,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const defName = (caseRecord.defendantName ?? "defendant").replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="Settlement_Offer_${defName}_${dateStr}.pdf"`);
  res.send(Buffer.from(pdfBytes));
});

export default router;
