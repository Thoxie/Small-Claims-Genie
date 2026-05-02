import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, documentsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { logger } from "../lib/logger";
import { checkAiRateLimit } from "../lib/rate-limiter";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { stripMC030Wrappers, measureMC030BodyLines, MC030_MAX_LINES } from "./forms";

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
- NO names in the body. No plaintiff name, no defendant name. Use "you"/"your" for the defendant. Facts only.
- State facts in plain declarative sentences: "On [date], [event occurred]. Payment of $X remains due."
- The consequence sentence must read: "In the event payment is not received by the deadline, I will file a court action against you in [County] Small Claims Court seeking the full amount owed plus court costs and filing fees."
- Do not soften or hedge the consequence — state it as certain fact
- Closing should be brief: "I trust you will address this matter promptly."`,

  firm: `TONE — FIRM (Assertive Demand):
- Open with a direct statement of the debt owed — no pleasantries
- NO names in the body. No plaintiff name, no defendant name. Use "you"/"your" for the defendant. Facts only.
- State the facts crisply. Every sentence should apply pressure without being hostile.
- Emphasize the deadline prominently: "You have until [date] to remit payment in full."
- The consequence sentence must read: "Failure to pay by this date will result in a court action filed against you in [County] Small Claims Court. I will seek the full amount owed, plus court filing fees, service costs, and any other relief the court deems appropriate."
- End with: "I am prepared to file immediately upon expiration of this deadline."
- This letter should feel like the last warning before legal action — because it is.`,

  friendly: `TONE — FRIENDLY (Resolution-Oriented):
- Acknowledge any prior dealings in the opening sentence without using names — reference the transaction or matter directly
- NO names in the body. No plaintiff name, no defendant name. Use "you"/"your" for the defendant. Facts only.
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

  // Court / filing location — prefer human-readable courthouse name over raw county ID
  if (caseRecord.courthouseName) {
    parts.push(`Filing Court: ${caseRecord.courthouseName}`);
  } else if (caseRecord.countyId) {
    parts.push(`Filing County: ${caseRecord.countyId} County`);
  }
  if (caseRecord.courthouseAddress && caseRecord.courthouseCity) {
    parts.push(`Court Address: ${caseRecord.courthouseAddress}, ${caseRecord.courthouseCity}, CA ${caseRecord.courthouseZip ?? ""}`);
  }
  if (caseRecord.caseNumber) parts.push(`Case Number: ${caseRecord.caseNumber}`);

  if (caseRecord.claimAmount) {
    const amt = `$${Number(caseRecord.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    parts.push(`Amount Sought (AUTHORITATIVE — use this exact figure as the demand amount everywhere it appears in the letter): ${amt}`);
  }

  // ── Plaintiff ──
  if (caseRecord.plaintiffName) {
    const isBiz = caseRecord.plaintiffIsBusiness;
    parts.push(`Plaintiff (Sender): ${caseRecord.plaintiffName}${isBiz ? " (Business/Organization)" : ""}`);
    if (isBiz && caseRecord.secondPlaintiffName) parts.push(`Plaintiff Individual Representative: ${caseRecord.secondPlaintiffName}${caseRecord.plaintiffTitle ? `, ${caseRecord.plaintiffTitle}` : ""}`);
  }
  if (caseRecord.plaintiffAddress && caseRecord.plaintiffCity) {
    parts.push(`Plaintiff Address: ${caseRecord.plaintiffAddress}, ${caseRecord.plaintiffCity}, ${caseRecord.plaintiffState ?? "CA"} ${caseRecord.plaintiffZip ?? ""}`);
  }
  if (caseRecord.plaintiffEmail)  parts.push(`Plaintiff Email: ${caseRecord.plaintiffEmail}`);
  if (caseRecord.plaintiffPhone)  parts.push(`Plaintiff Phone: ${caseRecord.plaintiffPhone}`);

  // ── Defendant ──
  if (caseRecord.defendantName) {
    const isBizDef = caseRecord.defendantIsBusinessOrEntity;
    parts.push(`Defendant (Recipient): ${caseRecord.defendantName}${isBizDef ? " (Business/Entity)" : ""}`);
    if (isBizDef && caseRecord.defendantAgentName) {
      parts.push(`Defendant Registered Agent: ${caseRecord.defendantAgentName}${caseRecord.defendantAgentTitle ? `, ${caseRecord.defendantAgentTitle}` : ""}`);
      if (caseRecord.defendantAgentStreet && caseRecord.defendantAgentCity) {
        parts.push(`Agent Address: ${caseRecord.defendantAgentStreet}, ${caseRecord.defendantAgentCity}, ${caseRecord.defendantAgentState ?? "CA"} ${caseRecord.defendantAgentZip ?? ""}`);
      }
    }
  }
  if (caseRecord.defendantAddress && caseRecord.defendantCity) {
    parts.push(`Defendant Address: ${caseRecord.defendantAddress}, ${caseRecord.defendantCity}, ${caseRecord.defendantState ?? "CA"} ${caseRecord.defendantZip ?? ""}`);
  }
  if (caseRecord.defendantPhone) parts.push(`Defendant Phone: ${caseRecord.defendantPhone}`);

  // ── Claim details ──
  if (caseRecord.incidentDate)    parts.push(`Incident Date: ${caseRecord.incidentDate}`);
  if (caseRecord.venueBasis)      parts.push(`Venue Basis: ${caseRecord.venueBasis}`);
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

  // ── Prior demand ──
  if (caseRecord.priorDemandMade !== null) {
    parts.push(`Prior Demand Made: ${caseRecord.priorDemandMade ? "Yes" : "No"}`);
    if (caseRecord.priorDemandMade && caseRecord.priorDemandDescription) {
      parts.push(`Prior Demand Details: ${caseRecord.priorDemandDescription}`);
    }
    if (!caseRecord.priorDemandMade && caseRecord.priorDemandWhyNot) {
      parts.push(`Why No Prior Demand: ${caseRecord.priorDemandWhyNot}`);
    }
  }

  // ── Hearing ──
  if (caseRecord.hearingDate) {
    const hDate = new Date(caseRecord.hearingDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    parts.push(`Hearing Date: ${hDate}${caseRecord.hearingTime ? ` at ${caseRecord.hearingTime}` : ""}${caseRecord.hearingCourtroom ? `, ${caseRecord.hearingCourtroom}` : ""}`);
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

═══ NAMES IN THE BODY — CRITICAL RULES ═══
The PLAINTIFF name must NEVER appear anywhere in the body paragraphs. It belongs only in the sender block at the top and the signature line at the bottom. The plaintiff is signing this letter — their name does not need to be stated in the text.
- WRONG: "I, Paul Andrews, am writing to demand payment of $5,000."
- WRONG: "As Paul Andrews, I am hereby demanding..."
- WRONG: "The undersigned, Paul Andrews, demands payment."
- RIGHT: "This letter serves as formal demand for payment of $5,000 currently owed and outstanding."
- RIGHT: "On April 1, 2026, my vehicle was damaged. To date, no payment has been received."

The DEFENDANT name must also NOT appear in the body paragraphs. The letter is addressed directly to the defendant — use "you" and "your" throughout.
- WRONG: "John Smith has failed to pay the amount owed."
- RIGHT: "You have failed to remit the amount owed despite prior notice."

Write the body entirely in factual, impersonal terms. The facts speak — no declarations, no self-identification.

═══ LENGTH & STRUCTURE RULES ═══
Target: 4 tight body paragraphs. ONE PAGE ONLY — this is a hard limit. If content risks spilling to a second page, tighten every paragraph. No padding, no filler, no repetition.

Paragraph 1 — Opening (2 sentences max): The purpose of this letter and the amount owed. No names in the body — the sender is identified only in the signature block.
Paragraph 2 — Facts (3-4 sentences max): The actual events using the claim description. Specific dates, what happened, what was not done. Do not insert the demand dollar amount here — that belongs in Paragraph 3.
Paragraph 3 — Demand (2-3 sentences): State the exact "Amount Sought" value as the demand. Clear deadline (14 days from today). No hedging.
Paragraph 4 — Consequences (2 sentences max): What happens if they don't pay. Must use "court action against you" language — NOT "small claims action." Reference court costs added on top.

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
    letters: {
      formal:   caseRecord.demandLetterTextFormal   ?? null,
      firm:     caseRecord.demandLetterTextFirm     ?? null,
      friendly: caseRecord.demandLetterTextFriendly ?? null,
    },
  });
});

// POST — generate demand letter via AI (SSE stream), save on completion
router.post("/cases/:id/demand-letter", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = await checkAiRateLimit(userId);
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

  // Save generated letter to DB — per-tone column + legacy single column
  const toneField =
    tone === "formal"   ? { demandLetterTextFormal:   fullText } :
    tone === "firm"     ? { demandLetterTextFirm:     fullText } :
                          { demandLetterTextFriendly: fullText };

  await db.update(casesTable)
    .set({ demandLetterText: fullText, demandLetterTone: tone, ...toneField })
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
const _STATUTE_MAP: Record<string, string[]> = {
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

const MC030_SYSTEM = `You are drafting the body of a California Judicial Council MC-030 Declaration for a self-represented small claims plaintiff. This is a sworn statement under penalty of perjury that the judge will read before the hearing.

GOAL:
Produce a polished, short, court-ready declaration — approximately two-thirds of a page — that gives the judge the clearest factual basis to rule in the plaintiff's favor. Every sentence must help the judge decide the issue. Cut anything that does not.

────────────────────────────────────────
STRUCTURE — four paragraphs in this exact order:
────────────────────────────────────────

PARAGRAPH 1 — OPENING (1–2 sentences):
State who the plaintiff is and what they are asking the Court to do. Lead with the strongest fact, not a long introduction.
Example: "I am [Name], and I ask this Court to enter judgment against [Defendant] for $[amount] for [specific breach or harm]."

PARAGRAPH 2 — KEY FACTS (3–5 sentences):
The top 3–5 facts that support the plaintiff, in chronological order. Include:
- Specific dates for every event.
- The agreement, payment, or transaction (with amount and date).
- Exactly what the defendant did or failed to do, and when.
- The strongest document or exhibit (reference it by name and state what it proves).
- Any fact the other side is likely to dispute — state the provable counter-fact.
Mention only facts provable by documents, exhibits, emails, payments, or other evidence. Prefer specific facts over conclusions. Do not write "they acted in bad faith" — write "they refused to respond to my written request dated [date]."

PARAGRAPH 3 — HARM / PREJUDICE (2–3 sentences):
Explain what the plaintiff has lost and what the ongoing harm is. If there is a deadline or urgency, state it. Keep it factual, not emotional.

PARAGRAPH 4 — RELIEF (1–2 sentences):
State the exact dollar amount or specific order the plaintiff is asking for, and briefly why it is fair. Use "I request" or "I ask this Court."

NOTE ON THE CLOSING: The MC-030 form is already pre-printed with "I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct." DO NOT output that sentence — it is already on the form and will be a duplicate if you include it.

────────────────────────────────────────
FORMAT RULES:
────────────────────────────────────────
- Plain narrative paragraphs separated by blank lines. No numbered paragraphs, no headings, no bullet points, no markdown, no bold, no italics.
- First person throughout: "I," "my," "I request."
- Plain English. No legalese ("aforementioned," "herein," "the party of the first part," etc.).
- Do NOT include a title at the top — the form is pre-printed with "DECLARATION" and "MC-030."
- Do NOT include a perjury closing or signature block at the bottom — both are pre-printed on the form.
- Avoid repeating the same point. One mention per fact.
- Do not include argument headings unless space specifically allows.

────────────────────────────────────────
TONE:
────────────────────────────────────────
Calm, credible, factual, and judicial. No emotional exaggeration. No insults. No speculation. No unsupported accusations.

────────────────────────────────────────
EVIDENCE — REQUIRED:
────────────────────────────────────────
You MUST reference every supporting document provided in the case, by name, and state what fact it proves (e.g., "the signed contract attached as Exhibit A confirms the agreed price of $[amount]," "the cancelled check dated [date] proves payment in full"). Weave evidence references naturally into Paragraph 2. If no documents have been uploaded, note in Paragraph 2 that the plaintiff will present their testimony at the hearing.

────────────────────────────────────────
STATUTES — DEFAULT IS NONE:
────────────────────────────────────────
Do NOT cite California statutes by default. The judge applies the law. Most small claims cases are decided on the facts alone. Only cite a statute if it is genuinely necessary to explain why the defendant's conduct was wrongful and there is space. When in doubt, leave it out.

────────────────────────────────────────
DEMAND LETTER:
────────────────────────────────────────
If a demand letter is provided, mine it for facts (dates, amounts, the defendant's response or silence). Do NOT copy it verbatim. Refer to it as "the written demand I sent on [date]" — never as "the demand letter."

────────────────────────────────────────
SPACE LIMIT — HARD PHYSICAL CONSTRAINT:
────────────────────────────────────────
The MC-030 form body renders at 10.5pt Helvetica, 1/2 inch margins, ~26 lines, ~92 characters per line, ~2,400 characters maximum. Text beyond 26 lines is cut off by the renderer and never reaches the court.
- Target: 1,500–2,100 characters of body text.
- Aim for 4 tight paragraphs (matching the 4-paragraph structure above).
- If a fact does not fit, drop the least important one — never exceed the limit.

────────────────────────────────────────
STRICT RULES:
────────────────────────────────────────
- Use ONLY the facts provided in the case context. NEVER invent facts, dates, dollar amounts, witnesses, or evidence.
- The dollar amount stated must match the Amount Sought exactly.
- Output ONLY the four-paragraph body — no title, no perjury closing, no signature block.`;

router.post("/cases/:id/forms/mc030-ai", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = await checkAiRateLimit(userId);
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

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const amt = caseRecord.claimAmount
    ? `$${Number(caseRecord.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "[AMOUNT]";

  const parts: string[] = [
    `=== CASE FACTS ===`,
    `Plaintiff (Declarant): ${caseRecord.plaintiffName ?? "[Plaintiff]"}`,
    `Defendant: ${caseRecord.defendantName ?? "[Defendant]"}`,
    `Amount Sought (AUTHORITATIVE — your declaration must state this exact amount): ${amt}`,
    `Claim Type: ${caseRecord.claimType ?? "Not specified"}`,
    caseRecord.incidentDate ? `Incident Date: ${caseRecord.incidentDate}` : "",
    caseRecord.claimDescription ? `\nPlaintiff's Description of What Happened:\n${caseRecord.claimDescription}` : "",
    caseRecord.howAmountCalculated ? `\nHow the Amount Was Calculated:\n${caseRecord.howAmountCalculated}` : "",
    caseRecord.priorDemandMade != null ? `Prior Demand Made: ${caseRecord.priorDemandMade ? "Yes" : "No"}` : "",
    caseRecord.priorDemandDescription ? `Prior Demand Details: ${caseRecord.priorDemandDescription}` : "",
    caseRecord.priorDemandWhyNot ? `Why No Prior Demand Was Made: ${caseRecord.priorDemandWhyNot}` : "",
    caseRecord.countyId ? `Filing County: ${caseRecord.countyId} County` : "",
    caseRecord.plaintiffCity ? `Declarant City: ${caseRecord.plaintiffCity}` : "",
    `Today's Date: ${today}`,
  ].filter(Boolean);

  // Demand letter — fact source only. Mine it for dates / amounts / resolution attempts.
  if (caseRecord.demandLetterText) {
    parts.push(
      `\n=== DEMAND LETTER (fact source — already sent to defendant) ===`,
      `Use this letter to extract concrete facts (dates, dollar amounts, what was demanded, attempts to resolve). Do NOT copy it verbatim and do NOT call it out as "the demand letter" in the narrative — refer to "the written demand I sent on [date]" instead.`,
      caseRecord.demandLetterText.slice(0, 4000),
    );
  }

  // Evidence — the AI MUST reference each item by name in the narrative.
  if (docs.length > 0) {
    parts.push(`\n=== EVIDENCE — supporting documents the plaintiff has uploaded ===`);
    parts.push(`(REQUIRED: reference each item below by name in your declaration narrative, and tell the judge what fact it proves.)`);
    for (const doc of docs.slice(0, 8)) {
      const tag = [doc.label, doc.description].filter(Boolean).join(" — ");
      const heading = tag ? `"${doc.originalName}" (${tag})` : `"${doc.originalName}"`;
      parts.push(`\nEvidence item: ${heading}`);
      if (doc.ocrText && !doc.ocrText.startsWith("[")) {
        parts.push(`Contents extracted from document:\n${doc.ocrText.slice(0, 1500)}`);
      }
    }
  } else {
    parts.push(`\n=== EVIDENCE ===`);
    parts.push(`No supporting documents have been uploaded for this case. In the declaration, briefly note that the plaintiff will be presenting their testimony at the hearing.`);
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
    const rawText = completion.choices[0]?.message?.content ?? "";
    // Strip any title/header line at the top and any signature/perjury closing
    // at the bottom. Even with the system prompt forbidding these, models can
    // still slip them in — this guarantees the textarea the user sees only
    // contains the numbered body paragraphs.
    let declarationText = stripMC030Wrappers(rawText);

    // ── Auto-shrink loop ──────────────────────────────────────────────────────
    // If the draft would overflow the form's hard physical line cap, ask the
    // model to compress it (preserving facts/dates/dollar amounts/statutes).
    // Up to 2 retries; we keep the best (shortest) version.
    let lineCount = await measureMC030BodyLines(declarationText);
    let shrinkAttempts = 0;
    const maxShrinkAttempts = 2;
    while (lineCount > MC030_MAX_LINES && shrinkAttempts < maxShrinkAttempts) {
      shrinkAttempts++;
      try {
        const shrink = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 2000,
          messages: [
            { role: "system", content: MC030_SYSTEM },
            { role: "user", content:
              `Your previous draft is ${lineCount} lines. The MC-030 form's hard physical limit is ${MC030_MAX_LINES} lines. ` +
              `Rewrite the SAME facts to fit within ${MC030_MAX_LINES} lines (target ${MC030_MAX_LINES - 2} lines for safety). ` +
              `Keep every dollar amount, date, party name, and statute citation intact — do not drop any fact. ` +
              `Compress by tightening sentences, removing filler words, and merging related points. ` +
              `Output ONLY numbered paragraphs (no title, no perjury closing, no signature block).\n\n` +
              `Previous draft to compress:\n${declarationText}` },
          ],
        });
        const newRaw = shrink.choices[0]?.message?.content ?? "";
        const newStripped = stripMC030Wrappers(newRaw);
        const newCount = await measureMC030BodyLines(newStripped);
        if (newStripped && newCount < lineCount) {
          declarationText = newStripped;
          lineCount = newCount;
        } else {
          break; // not improving; stop spending tokens
        }
      } catch (e) {
        // If the shrink call fails, fall through with whatever we have.
        req.log?.warn?.({ err: e }, "MC-030 shrink attempt failed");
        break;
      }
    }
    req.log?.info?.({ lineCount, shrinkAttempts, fits: lineCount <= MC030_MAX_LINES }, "MC-030 declaration line count");

    // Derive a declaration title and persist it so SC-100 Section 3 can reference it exactly
    const plaintiffName = caseRecord.plaintiffName ?? "Declarant";
    const declarationTitle = caseRecord.mc030DeclarationTitle
      || `DECLARATION OF ${plaintiffName.toUpperCase()} IN SUPPORT OF CLAIM`;
    db.update(casesTable)
      .set({ mc030DeclarationTitle: declarationTitle })
      .where(eq(casesTable.id, id))
      .catch((e: any) => logger.error({ err: e }, "MC-030 title save error"));

    res.json({ declarationText, declarationTitle });
  } catch (err: any) {
    req.log.error({ err }, "MC-030 AI error");
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
- 3–4 paragraphs. Plain English. No legal jargon. ONE PAGE — hard limit.
- NEVER open with "I, [Name]" or introduce the sender by name in the body. The sender's name belongs only in the signature block.
- Paragraph 1: State that a dispute exists and that this letter proposes resolution without a hearing — no sender name in the body.
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
  const rateCheck = await checkAiRateLimit(userId);
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
    // Plaintiff
    `Plaintiff (Sender): ${caseRecord.plaintiffName ?? "[Plaintiff]"}${caseRecord.plaintiffIsBusiness ? " (Business/Organization)" : ""}`,
    caseRecord.plaintiffIsBusiness && caseRecord.secondPlaintiffName
      ? `Plaintiff Representative: ${caseRecord.secondPlaintiffName}${caseRecord.plaintiffTitle ? `, ${caseRecord.plaintiffTitle}` : ""}`
      : "",
    caseRecord.plaintiffAddress && caseRecord.plaintiffCity
      ? `Plaintiff Address: ${caseRecord.plaintiffAddress}, ${caseRecord.plaintiffCity}, ${caseRecord.plaintiffState ?? "CA"} ${caseRecord.plaintiffZip ?? ""}`
      : "",
    caseRecord.plaintiffEmail ? `Plaintiff Email: ${caseRecord.plaintiffEmail}` : "",
    caseRecord.plaintiffPhone ? `Plaintiff Phone: ${caseRecord.plaintiffPhone}` : "",
    // Defendant
    `Defendant (Recipient): ${caseRecord.defendantName ?? "[Defendant]"}${caseRecord.defendantIsBusinessOrEntity ? " (Business/Entity)" : ""}`,
    caseRecord.defendantIsBusinessOrEntity && caseRecord.defendantAgentName
      ? `Defendant Registered Agent: ${caseRecord.defendantAgentName}${caseRecord.defendantAgentTitle ? `, ${caseRecord.defendantAgentTitle}` : ""}`
      : "",
    caseRecord.defendantIsBusinessOrEntity && caseRecord.defendantAgentStreet && caseRecord.defendantAgentCity
      ? `Agent Address: ${caseRecord.defendantAgentStreet}, ${caseRecord.defendantAgentCity}, ${caseRecord.defendantAgentState ?? "CA"} ${caseRecord.defendantAgentZip ?? ""}`
      : "",
    caseRecord.defendantAddress && caseRecord.defendantCity
      ? `Defendant Address: ${caseRecord.defendantAddress}, ${caseRecord.defendantCity}, ${caseRecord.defendantState ?? "CA"} ${caseRecord.defendantZip ?? ""}`
      : "",
    caseRecord.defendantPhone ? `Defendant Phone: ${caseRecord.defendantPhone}` : "",
    // Court
    caseRecord.courthouseName
      ? `Filing Court: ${caseRecord.courthouseName}`
      : caseRecord.countyId ? `Filing County: ${caseRecord.countyId} County` : "",
    caseRecord.caseNumber ? `Case Number: ${caseRecord.caseNumber}` : "",
    // Claim
    caseRecord.claimType ? `Claim Type: ${caseRecord.claimType}` : "",
    caseRecord.incidentDate ? `Incident Date: ${caseRecord.incidentDate}` : "",
    caseRecord.venueBasis ? `Venue Basis: ${caseRecord.venueBasis}` : "",
    // Amounts
    `Original Claim Amount: ${origAmt}`,
    `Settlement Amount Being Offered: ${settleAmt}`,
    installmentText,
    `Response Deadline: ${deadlineStr}`,
    // Hearing
    caseRecord.hearingDate
      ? `Hearing Date (already scheduled): ${new Date(caseRecord.hearingDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}${caseRecord.hearingTime ? ` at ${caseRecord.hearingTime}` : ""}`
      : "Hearing Date: Not yet scheduled",
    // Prior demand
    caseRecord.priorDemandMade
      ? `Prior Demand: Yes — a written demand was previously sent and not resolved.${caseRecord.priorDemandDescription ? ` Details: ${caseRecord.priorDemandDescription}` : ""}`
      : "",
    // Claim narrative
    caseRecord.claimDescription ? `\nCase Description:\n${caseRecord.claimDescription}` : "",
    caseRecord.howAmountCalculated ? `\nHow Amount Was Calculated:\n${caseRecord.howAmountCalculated}` : "",
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

// ─── SETTLEMENT AGREEMENT ────────────────────────────────────────────────────

const AGREEMENT_SYSTEM = `You are an expert California civil attorney drafting a Settlement Agreement and Mutual Release. 
Write a complete, professional settlement agreement that could be signed by both parties to resolve a California small claims dispute.
Use formal legal language appropriate for a binding agreement. The document must be thorough but readable.`;

// GET — load saved agreement
router.get("/cases/:id/settlement-agreement", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }
  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  res.json({ text: (caseRecord as any).settlementAgreementText ?? null });
});

// POST — generate settlement agreement via SSE
router.post("/cases/:id/settlement-agreement", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = await checkAiRateLimit(userId);
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
    settlementAmount,
    installments = false,
    installmentCount = 3,
    paymentMethod = "check",
    includeConfidentiality = false,
  } = req.body ?? {};

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const origAmt = caseRecord.claimAmount
    ? `$${Number(caseRecord.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "[ORIGINAL CLAIM AMOUNT]";
  const settleAmt = settlementAmount
    ? `$${Number(settlementAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : origAmt;
  const perInstallment = installments && settlementAmount
    ? `$${(Number(settlementAmount) / Number(installmentCount)).toFixed(2)}`
    : null;

  const paymentTerms = installments && perInstallment
    ? `${settleAmt} payable in ${installmentCount} equal monthly installments of ${perInstallment} each, with the first payment due within 30 days of execution of this Agreement, and each subsequent payment due on the same day of each following month, paid by ${paymentMethod}`
    : `${settleAmt} paid in full within 14 days of execution of this Agreement by ${paymentMethod}`;

  const hearingDateStr = caseRecord.hearingDate
    ? new Date(caseRecord.hearingDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;

  const contextParts = [
    `=== PARTIES ===`,
    // Plaintiff
    `Plaintiff (Claimant): ${caseRecord.plaintiffName ?? "[PLAINTIFF NAME]"}${caseRecord.plaintiffIsBusiness ? " (Business/Organization)" : ""}`,
    caseRecord.plaintiffIsBusiness && caseRecord.secondPlaintiffName
      ? `Plaintiff Representative: ${caseRecord.secondPlaintiffName}${caseRecord.plaintiffTitle ? `, ${caseRecord.plaintiffTitle}` : ""}`
      : "",
    caseRecord.plaintiffAddress
      ? `Plaintiff Address: ${caseRecord.plaintiffAddress}, ${caseRecord.plaintiffCity ?? ""}, ${caseRecord.plaintiffState ?? "CA"} ${caseRecord.plaintiffZip ?? ""}`.trim()
      : "",
    caseRecord.plaintiffEmail ? `Plaintiff Email: ${caseRecord.plaintiffEmail}` : "",
    caseRecord.plaintiffPhone ? `Plaintiff Phone: ${caseRecord.plaintiffPhone}` : "",
    // Defendant
    `Defendant (Respondent): ${caseRecord.defendantName ?? "[DEFENDANT NAME]"}${caseRecord.defendantIsBusinessOrEntity ? " (Business/Entity)" : ""}`,
    caseRecord.defendantIsBusinessOrEntity && caseRecord.defendantAgentName
      ? `Defendant Registered Agent: ${caseRecord.defendantAgentName}${caseRecord.defendantAgentTitle ? `, ${caseRecord.defendantAgentTitle}` : ""}`
      : "",
    caseRecord.defendantIsBusinessOrEntity && caseRecord.defendantAgentStreet && caseRecord.defendantAgentCity
      ? `Agent Address: ${caseRecord.defendantAgentStreet}, ${caseRecord.defendantAgentCity}, ${caseRecord.defendantAgentState ?? "CA"} ${caseRecord.defendantAgentZip ?? ""}`
      : "",
    caseRecord.defendantAddress
      ? `Defendant Address: ${caseRecord.defendantAddress}, ${caseRecord.defendantCity ?? ""}, ${caseRecord.defendantState ?? "CA"} ${caseRecord.defendantZip ?? ""}`.trim()
      : "",
    caseRecord.defendantPhone ? `Defendant Phone: ${caseRecord.defendantPhone}` : "",
    `\n=== CASE DETAILS ===`,
    caseRecord.caseNumber
      ? `Case Number: ${caseRecord.caseNumber}`
      : "Case: Filed in California Small Claims Court (case number to be inserted if applicable)",
    caseRecord.courthouseName
      ? `Court: ${caseRecord.courthouseName}`
      : caseRecord.countyId ? `Court: ${caseRecord.countyId} County Small Claims Court` : "",
    caseRecord.courthouseAddress && caseRecord.courthouseCity
      ? `Court Address: ${caseRecord.courthouseAddress}, ${caseRecord.courthouseCity}, CA ${caseRecord.courthouseZip ?? ""}`
      : "",
    caseRecord.claimType ? `Claim Type: ${caseRecord.claimType}` : "",
    caseRecord.incidentDate ? `Incident Date: ${caseRecord.incidentDate}` : "",
    caseRecord.venueBasis ? `Venue Basis: ${caseRecord.venueBasis}` : "",
    hearingDateStr ? `Scheduled Hearing Date: ${hearingDateStr}${caseRecord.hearingTime ? ` at ${caseRecord.hearingTime}` : ""}` : "",
    `Original Claim Amount: ${origAmt}`,
    caseRecord.claimDescription ? `\nDispute Background:\n${caseRecord.claimDescription}` : "",
    caseRecord.howAmountCalculated ? `\nHow Amount Was Calculated:\n${caseRecord.howAmountCalculated}` : "",
    caseRecord.priorDemandMade != null
      ? `Prior Demand Made: ${caseRecord.priorDemandMade ? `Yes${caseRecord.priorDemandDescription ? ` — ${caseRecord.priorDemandDescription}` : ""}` : `No${caseRecord.priorDemandWhyNot ? ` — ${caseRecord.priorDemandWhyNot}` : ""}`}`
      : "",
    `\n=== SETTLEMENT TERMS ===`,
    `Agreed Settlement Amount: ${settleAmt}`,
    `Payment Terms: ${paymentTerms}`,
    includeConfidentiality ? "Include a confidentiality/non-disclosure clause." : "No confidentiality clause required.",
    `\nToday's Date: ${todayStr}`,
  ].filter(Boolean).join("\n");

  const prompt = `Draft a complete SETTLEMENT AGREEMENT AND MUTUAL RELEASE for this California small claims dispute.

${contextParts}

The agreement must include these sections in order:
1. TITLE: "SETTLEMENT AGREEMENT AND MUTUAL RELEASE"
2. PREAMBLE: Date, parties, and purpose
3. RECITALS: Background facts (the dispute, that it has been filed or threatened in small claims court)
4. SETTLEMENT PAYMENT: Exact amount and payment schedule
5. MUTUAL RELEASE OF ALL CLAIMS: Both parties release all claims arising from this dispute
6. DISMISSAL: Plaintiff agrees to dismiss/withdraw the case with prejudice upon receipt of payment
7. NO ADMISSION OF LIABILITY: Standard clause
8. ENTIRE AGREEMENT: Merger clause
${includeConfidentiality ? "9. CONFIDENTIALITY: Both parties agree to keep terms confidential\n10." : "9."} GOVERNING LAW: California
${includeConfidentiality ? "11." : "10."} COUNTERPARTS: Agreement may be signed in counterparts
SIGNATURE BLOCK: Full signature lines for both parties with printed name, date, and address lines

Use [BLANK] for any fields the parties must fill in at signing. Be complete and legally thorough.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullText = "";
  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: AGREEMENT_SYSTEM },
      { role: "user", content: prompt },
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
    .set({ settlementAgreementText: fullText } as any)
    .where(eq(casesTable.id, id));

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// POST /pdf — generate settlement agreement PDF (formal legal document style)
router.post("/cases/:id/settlement-agreement/pdf", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  const agreementText: string = req.body?.text ?? (caseRecord as any).settlementAgreementText ?? "";
  if (!agreementText.trim()) { res.status(400).json({ error: "No agreement text to export" }); return; }

  const NAVY = rgb(0.08, 0.16, 0.36);

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regFont  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const W = 612, H = 792, ML = 72, MR = 72, CW = W - ML - MR;
  let page = pdfDoc.addPage([W, H]);
  let y = H - 56;

  page.drawRectangle({ x: 0, y: H - 48, width: W, height: 48, color: NAVY });
  page.drawText("SETTLEMENT AGREEMENT", { x: ML, y: H - 22, size: 14, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText("AND MUTUAL RELEASE", { x: ML, y: H - 38, size: 11, font: boldFont, color: rgb(0.8, 0.85, 1) });
  page.drawText("Confidential Legal Document", {
    x: W - MR - 148, y: H - 30, size: 9, font: regFont, color: rgb(0.7, 0.75, 0.9),
  });
  page.drawLine({ start: { x: ML, y: H - 58 }, end: { x: W - MR, y: H - 58 }, thickness: 0.5, color: GRAY });
  y = H - 80;

  const SIZE = 10.5, _LINE_H = SIZE * 1.55, MAX_Y = 72;
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

  for (const rawLine of agreementText.split("\n")) {
    const isHeading = /^[A-Z\s]{6,}$/.test(rawLine.trim()) || /^\d+\.\s+[A-Z]/.test(rawLine.trim());
    const font = isHeading ? boldFont : regFont;
    const size = isHeading ? SIZE + 0.5 : SIZE;
    const lineH = size * 1.6;
    for (const wl of wrapLine(rawLine, CW)) {
      if (y < MAX_Y) {
        page = pdfDoc.addPage([W, H]);
        page.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: NAVY });
        page.drawText("SETTLEMENT AGREEMENT (continued)", { x: ML, y: H - 26, size: 11, font: boldFont, color: rgb(1, 1, 1) });
        y = H - 68;
      }
      page.drawText(wl || " ", { x: ML, y, size, font, color: BLACK });
      y -= lineH;
    }
    y -= lineH * 0.12;
  }

  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const p = pdfDoc.getPage(i);
    p.drawLine({ start: { x: ML, y: 44 }, end: { x: W - MR, y: 44 }, thickness: 0.5, color: GRAY });
    p.drawText(`Generated by Small Claims Genie  •  Page ${i + 1} of ${pageCount}  •  NOT LEGAL ADVICE`, {
      x: ML, y: 28, size: 7.5, font: regFont, color: GRAY,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const defName = (caseRecord.defendantName ?? "defendant").replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="Settlement_Agreement_${defName}_${dateStr}.pdf"`);
  res.send(Buffer.from(pdfBytes));
});

export default router;
