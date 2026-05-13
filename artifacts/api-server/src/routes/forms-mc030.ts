import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getOwnedCase } from "../lib/owned-case";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { documentsTable, casesTable } from "@workspace/db";
import { inArray, and, eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  PW, PH, BLACK,
  loadAsset, today,
  formatDateDisplay,
  friendlyExhibitName, stripExhibitRefsFromDesc,
  addDeclarationContinuationPages, embedExhibitPages,
  getDocumentBuffer, resolveDownloadUser,
  val, xmark, drawLineMixed,
} from "./forms-common";

const router: IRouter = Router();

// ─── MC-030 exported constants (consumed by demand-letter.ts) ─────────────────
export function stripMC030Wrappers(text: string): string {
  if (!text) return "";
  const lines = text.split("\n");

  const isTopWrapper = (l: string): boolean => {
    const t = l.trim();
    if (!t) return true;
    if (/^MC[-\s]*0?30\b/i.test(t)) return true;
    if (/^DECLARATION\b/i.test(t)) return true;
    if (/^RE\s*:/i.test(t)) return true;
    if (/^IN THE MATTER OF\b/i.test(t)) return true;
    if (/^IN SUPPORT OF\b/i.test(t)) return true;
    if (/^#+\s/.test(t)) return true;
    if (t.length <= 80 && /[A-Z]/.test(t) && t === t.toUpperCase() && !/[.!?]$/.test(t)) return true;
    return false;
  };

  const isBottomWrapper = (l: string): boolean => {
    const t = l.trim();
    if (!t) return true;
    if (/penalty\s+of\s+perjury/i.test(t)) return true;
    if (/^I\s+declare\b/i.test(t)) return true;
    if (/under\s+the\s+laws\s+of\s+the\s+state\s+of\s+california/i.test(t)) return true;
    if (/foregoing\s+is\s+true\s+and\s+correct/i.test(t)) return true;
    if (/^Executed\b.*\b(California|on\s|20\d{2}|\d{4})/i.test(t)) return true;
    if (/^Dated?\s*[:.]/i.test(t)) return true;
    if (/^Date\s*[:.]/i.test(t)) return true;
    if (/^\/s\//.test(t) || /\/s\/$/.test(t)) return true;
    if (/^\[?\s*signature\s*\]?$/i.test(t)) return true;
    if (/^\[?\s*sig\s*\]?$/i.test(t)) return true;
    if (/^_+$/.test(t)) return true;
    if (/^Signature of\b/i.test(t)) return true;
    if (/^(Plaintiff|Declarant|Defendant)\s*$/i.test(t)) return true;
    if (t.length <= 50 && /^[A-Z][a-zA-Z'.\-]+(\s+[A-Z][a-zA-Z'.\-]+){0,3}$/.test(t) && !/[.!?]$/.test(t)) return true;
    return false;
  };

  let start = 0;
  let end = lines.length;
  while (start < end && isTopWrapper(lines[start])) start++;
  while (end > start && isBottomWrapper(lines[end - 1])) end--;
  return lines.slice(start, end).join("\n").trim();
}

export const MC030_BODY_SIZE   = 10.5;
export const MC030_BODY_MAX_W  = 540;
export const MC030_MAX_LINES   = 26;

export async function measureMC030BodyLines(text: string): Promise<number> {
  if (!text) return 0;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const paragraphs = text.split(/\n/).map(p => p.trim()).filter(Boolean);
  let lines = 0;
  for (const p of paragraphs) {
    const words = p.split(/\s+/);
    let line = "";
    for (const w of words) {
      const cand = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(cand, MC030_BODY_SIZE) > MC030_BODY_MAX_W && line) {
        lines++;
        line = w;
      } else {
        line = cand;
      }
    }
    if (line) lines++;
  }
  return lines;
}

// ─── Exhibit ordering helper ──────────────────────────────────────────────────
// Given an ordered list of docs and an AI-returned exhibitOrder (1-indexed doc
// numbers in first-mention order), returns docs sorted so index 0 → Exhibit A,
// index 1 → Exhibit B, etc.  Any docs not mentioned by the AI are appended at
// the end so nothing is ever silently dropped.
function applyExhibitOrder<T>(docs: T[], exhibitOrder: number[]): T[] {
  const ordered: T[] = [];
  const usedIndices = new Set<number>();
  for (const docNum of exhibitOrder) {
    const idx = docNum - 1; // 1-indexed → 0-indexed
    if (idx >= 0 && idx < docs.length && !usedIndices.has(idx)) {
      ordered.push(docs[idx]);
      usedIndices.add(idx);
    }
  }
  // Append any docs the AI did not mention (safety net — should not happen)
  for (let i = 0; i < docs.length; i++) {
    if (!usedIndices.has(i)) ordered.push(docs[i]);
  }
  return ordered;
}

// ─── MC-030 AI declaration generator ─────────────────────────────────────────
//
// Exhibits are pre-assigned letters A, B, C… in document-list order.
// The AI must write the narrative referencing them in strict A→B→C order.
// exhibitOrder is always sequential so physical tabs match the pre-assignment.
//
const DECL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

async function generateMC030Declaration(
  d: Record<string, any>,
  exhibits?: Array<{ docIndex: number; name: string }>
): Promise<{ declarationTitle: string; declarationText: string; exhibitOrder: number[] }> {
  const plaintiffName = String(d.plaintiffName  || "Plaintiff");
  const defendantName = String(d.defendantName  || "Defendant");
  const claimAmount   = d.claimAmount ? `$${Number(d.claimAmount).toFixed(2)}` : "an amount to be determined";
  const claimDesc     = stripExhibitRefsFromDesc(String(d.claimDescription || ""));
  const incidentDate  = d.incidentDate ? formatDateDisplay(d.incidentDate) : "";
  const hasExhibits   = exhibits && exhibits.length > 0;

  // Pre-assign letters in document-list order: doc 1 → A, doc 2 → B, etc.
  const documentList = hasExhibits
    ? exhibits!.map((e, i) => `  Exhibit ${DECL_LETTERS[i]}: ${e.name}`).join("\n")
    : "";

  const prompt = [
    `You are drafting a California small claims court MC-030 Declaration for ${plaintiffName} against ${defendantName}.`,
    ``,
    `Case facts:`,
    `- Plaintiff: ${plaintiffName}`,
    `- Defendant: ${defendantName}`,
    `- Claim amount: ${claimAmount}`,
    incidentDate ? `- Date of incident: ${incidentDate}` : "",
    claimDesc    ? `- Case description (background facts only — ignore any exhibit references in this text): ${claimDesc}` : "",
    ``,
    hasExhibits ? [
      `AVAILABLE EXHIBITS — you must reference ALL of them:`,
      documentList,
      ``,
      `EXHIBIT RULES (absolute — no exceptions):`,
      `- Exhibit letters are PRE-ASSIGNED as shown above. Do NOT change them.`,
      `- You MUST reference every exhibit listed — no omissions.`,
      `- Exhibits MUST appear in strict A → B → C → D … order in the narrative.`,
      `  Exhibit A must be the FIRST exhibit mentioned. Exhibit B must be the SECOND. And so on.`,
      `  NEVER write a later letter before an earlier one. Writing B before A is a critical error.`,
      `  If chronological order would cause you to mention B before A, restructure the narrative`,
      `  so A appears first — even if that means departing from strict chronology.`,
      `- Every reference MUST use this exact format (parentheses required):`,
      `  (Exhibit X — [what this document proves and why it supports the claim])`,
      `  Example: (Exhibit A — warranty doc guaranteeing the repair would fix the noise)`,
      `  Describe WHAT the document proves. Never copy a raw filename.`,
    ].join("\n") : "",
    ``,
    `Return a JSON object with exactly these fields:`,
    `1. "declarationTitle": All-caps title, max 80 characters. Specific to the case facts.`,
    `2. "declarationText": Numbered paragraphs separated by \\n. Each paragraph starts with its number and a period ("1. "). Each paragraph is ONE concise sentence, max 120 characters.`,
    hasExhibits
      ? `   Use enough paragraphs to cover all key facts AND every exhibit — minimum 8. Target total length: 600–950 characters.`
      : `   Use 8 paragraphs. Target total length: 550-700 characters.`,
    `   STRICT FORMATTING RULES — violation breaks the PDF layout:`,
    `   - Plain text only. No asterisks, no markdown, no bold. Exhibit references use parentheses as shown above — no square brackets.`,
    `   - Separate paragraphs with \\n only (single newline, never double).`,
    `   - Do NOT include "I declare under penalty of perjury" — already printed on the form.`,
    `   - Do NOT end with a name, date, "Respectfully", "Signed", or any closing — the form already has a signature block.`,
    `   - The final paragraph must state the specific dollar amount requested and nothing else after it.`,
    hasExhibits
      ? `3. "exhibitOrder": ${JSON.stringify(exhibits!.map((_, i) => i + 1))} — exhibits are already in correct order, return this array unchanged.`
      : `3. "exhibitOrder": []`,
    ``,
    `Respond with only the JSON object.`,
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1600,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as {
      declarationTitle?: string;
      declarationText?: string;
      exhibitOrder?: unknown;
    };

    // Validate exhibitOrder: must be an array of integers
    const rawOrder = parsed.exhibitOrder;
    const exhibitOrder: number[] = Array.isArray(rawOrder)
      ? rawOrder.map(Number).filter(n => Number.isInteger(n) && n >= 1)
      : [];

    return {
      declarationTitle: parsed.declarationTitle || `DECLARATION OF ${plaintiffName.toUpperCase()}`,
      declarationText:  stripMC030Wrappers(parsed.declarationText || claimDesc),
      exhibitOrder,
    };
  } catch {
    return {
      declarationTitle: `DECLARATION OF ${plaintiffName.toUpperCase()}`,
      declarationText:  stripMC030Wrappers(claimDesc),
      exhibitOrder:     [],
    };
  }
}

function drawMC030Page(
  page: any,
  font: any,
  fontBold: any,
  d: Record<string, any>,
  b: Record<string, any>,
  declarationTitle: string,
  declarationText: string
) {
  const LIFT = 4.5;
  const DOWN = 6;
  const v  = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT - DOWN, s);
  const vs = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);

  const countyDisplay = String(d.countyId || "").split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const courtCityZip  = [d.courthouseCity, "CA", d.courthouseZip].filter(Boolean).join(" ");
  const cityLine      = [d.plaintiffCity, d.plaintiffState, d.plaintiffZip].filter(Boolean).join(" ");

  v(b.declarantName  || d.plaintiffName,           48,  734);
  v(b.declarantAddress || d.plaintiffAddress || "", 48,  721);
  v(b.declarantCityLine || cityLine,                48,  707);
  v(b.declarantPhone || d.plaintiffPhone,          127, 676);
  v(b.declarantEmail || d.plaintiffEmail,          127, 665);
  v("Self-Representing",                           127, 651);

  v(b.courtCounty || countyDisplay,                238, 636);
  v(b.courtStreet || d.courthouseAddress || "",    127, 625);
  v(b.courtCityZip || courtCityZip,               127, 602);
  v(b.branchName   || d.courthouseName || "Small Claims Division", 127, 591);

  v(d.plaintiffName,  154, 573);
  v(d.defendantName,  154, 556);
  v(d.caseNumber,     413, 544);

  void declarationTitle;

  if (declarationText) {
    const paragraphs = declarationText.split(/\n/).map(p => p.trim()).filter(Boolean);
    let bodyY = 494 + LIFT;
    const bodyX    = 36;
    const bodyMaxW = 540;
    const bodySize    = 10.5;
    const bodyLineH   = 11.5;
    const maxTotalLines = 26;

    const allParaLines: string[][] = [];
    let totalLinesCount = 0;

    for (const para of paragraphs) {
      if (totalLinesCount >= maxTotalLines) break;
      const words = para.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const cand = line ? line + " " + word : word;
        if (font.widthOfTextAtSize(cand, bodySize) > bodyMaxW && line) {
          lines.push(line);
          line = word;
        } else {
          line = cand;
        }
      }
      if (line) lines.push(line);
      allParaLines.push(lines);
      totalLinesCount += lines.length;
    }

    const numGaps = allParaLines.length - 1;
    const spareLines = Math.max(0, maxTotalLines - totalLinesCount);
    const paraGap = numGaps > 0 && spareLines > 0
      ? Math.min((spareLines * bodyLineH) / numGaps, 24)
      : 0;

    let linesUsed = 0;
    for (let pi = 0; pi < allParaLines.length; pi++) {
      for (const lineText of allParaLines[pi]) {
        if (linesUsed >= maxTotalLines) break;
        drawLineMixed(page, font, fontBold, lineText, bodyX, bodyY, bodySize, BLACK);
        bodyY -= bodyLineH;
        linesUsed++;
      }
      if (pi < allParaLines.length - 1) {
        bodyY -= paraGap;
      }
    }
  }

  vs(b.signDate || today(), 77, 157);
  xmark(page, 408, 80 + LIFT, 5);
}

// ─── Overflow check helper ────────────────────────────────────────────────────
function checkOverflow(font: any, declarationText: string): boolean {
  if (!declarationText) return false;
  let lines = 0;
  for (const para of declarationText.split(/\n/).map(p => p.trim()).filter(Boolean)) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const cand = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(cand, MC030_BODY_SIZE) > MC030_BODY_MAX_W && line) { lines++; line = w; } else { line = cand; }
    }
    if (line) lines++;
    if (lines > MC030_MAX_LINES) return true;
  }
  return false;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
router.post("/cases/:id/forms/mc030", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  try {
    let { declarationTitle, declarationText } = b as { declarationTitle?: string; declarationText?: string };
    if (!declarationTitle || !declarationText) {
      const ai = await generateMC030Declaration(d);
      declarationTitle = declarationTitle || ai.declarationTitle;
      declarationText  = declarationText  || ai.declarationText;
    }
    declarationText = stripMC030Wrappers(declarationText || "");

    if (declarationTitle) {
      db.update(casesTable)
        .set({ mc030DeclarationTitle: declarationTitle })
        .where(eq(casesTable.id, id))
        .catch((e: any) => logger.error({ err: e }, "MC-030 title save error"));
    }

    const pdfDoc   = await PDFDocument.create();
    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bg       = await pdfDoc.embedPng(loadAsset("mc030_hq-1.png"));
    const page     = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

    const declOverflows = checkOverflow(font, declarationText);
    const formDeclText = declOverflows ? "SEE ATTACHED DECLARATION PAGES." : declarationText;
    drawMC030Page(page, font, fontBold, d, b, declarationTitle, formDeclText);
    if (declOverflows) addDeclarationContinuationPages(pdfDoc, font, fontBold, declarationText, d, b);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="MC030-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "MC-030 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate MC-030 PDF." });
  }
});

router.post("/cases/:id/forms/mc030/signed", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  const { signatureDataUrl } = b as { signatureDataUrl?: string };
  const exhibitIds: number[] = Array.isArray(b.exhibitDocIds)
    ? b.exhibitDocIds.map(Number).filter((n: number) => !isNaN(n))
    : [];
  let sigBytes: Buffer | undefined;
  if (signatureDataUrl) {
    const base64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    sigBytes = Buffer.from(base64, "base64");
  }
  try {
    const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Fetch docs in user-selected order (exhibitIds preserves the user's ordering)
    const rawExhibitDocs = exhibitIds.length > 0
      ? await db.select().from(documentsTable).where(
          and(inArray(documentsTable.id, exhibitIds), eq(documentsTable.caseId, id))
        )
      : [];
    const exhibitDocMap = new Map(rawExhibitDocs.map((doc) => [doc.id, doc]));
    const exhibitDocs = exhibitIds.map((eid) => exhibitDocMap.get(eid)).filter((d): d is typeof rawExhibitDocs[number] => d !== undefined);

    // Pass documents as a numbered list — no pre-assigned letters.
    // The AI assigns letters in first-mention order and returns exhibitOrder.
    const numberedExhibits = exhibitDocs.map((doc, i) => ({
      docIndex: i + 1,
      name: friendlyExhibitName(doc.description, doc.originalName) || `Document ${i + 1}`,
    }));

    req.log.info(
      { numberedExhibits, rawDescriptions: exhibitDocs.map(doc => ({ id: doc.id, description: doc.description, originalName: doc.originalName })) },
      "[MC-030 Signed] Numbered exhibit list passed to AI"
    );

    let { declarationTitle, declarationText } = b as { declarationTitle?: string; declarationText?: string };
    let exhibitOrder: number[] = [];

    if (!declarationText) {
      // No pre-supplied text — generate everything with AI (assigns exhibit letters in narrative order)
      const ai = await generateMC030Declaration(d, numberedExhibits.length > 0 ? numberedExhibits : undefined);
      declarationTitle = declarationTitle || ai.declarationTitle;
      declarationText  = ai.declarationText;
      exhibitOrder     = ai.exhibitOrder;
    } else {
      // Text already provided — preserve sequential order so physical tabs match the
      // pre-generated narrative (which uses position-based letter assignment from mc030-ai).
      exhibitOrder = exhibitDocs.map((_, i) => i + 1);
      if (!declarationTitle) {
        declarationTitle = `DECLARATION OF ${String(d.plaintiffName || "PLAINTIFF").toUpperCase()}`;
      }
    }
    declarationText = stripMC030Wrappers(declarationText || "");

    req.log.info({ exhibitOrder }, "[MC-030 Signed] exhibit order");

    // Sort exhibit docs to match the narrative order
    const orderedDocs = applyExhibitOrder(exhibitDocs, exhibitOrder);

    if (declarationTitle) {
      db.update(casesTable)
        .set({ mc030DeclarationTitle: declarationTitle })
        .where(eq(casesTable.id, id))
        .catch((e: any) => logger.error({ err: e }, "MC-030 title save error"));
    }

    const masterDoc = await PDFDocument.create();
    const font      = await masterDoc.embedFont(StandardFonts.Helvetica);
    const fontBold  = await masterDoc.embedFont(StandardFonts.HelveticaBold);
    const bg        = await masterDoc.embedPng(loadAsset("mc030_hq-1.png"));
    const page      = masterDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

    const declOverflows = checkOverflow(font, declarationText);
    const formDeclText = declOverflows ? "SEE ATTACHED DECLARATION PAGES." : declarationText;
    drawMC030Page(page, font, fontBold, d, b, declarationTitle, formDeclText);

    if (sigBytes) {
      const sigImg = await masterDoc.embedPng(sigBytes);
      const { width: sw, height: sh } = sigImg.scale(1);
      const maxW = 190, maxH = 42;
      const scale = Math.min(maxW / sw, maxH / sh, 1);
      page.drawImage(sigImg, { x: 370, y: 112, width: sw * scale, height: sh * scale });
    }

    if (declOverflows) addDeclarationContinuationPages(masterDoc, font, fontBold, declarationText, d, b);

    // Attach exhibit tabs in narrative order (A = first mentioned, B = second, …)
    for (let i = 0; i < orderedDocs.length; i++) {
      const doc = orderedDocs[i];
      const letter = LETTERS[i] ?? String(i + 1);
      const label = `EXHIBIT ${letter}`;
      try {
        const fileBuffer = await getDocumentBuffer(doc);
        await embedExhibitPages(masterDoc, fileBuffer, doc.mimeType, friendlyExhibitName(doc.description, doc.originalName), label, font, fontBold);
      } catch (docErr) {
        req.log.error({ err: docErr, exhibit: letter }, "[MC-030 Signed] Failed to embed exhibit");
      }
    }

    const pdfBytes = await masterDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="MC030-Signed-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "MC-030 signed PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate signed MC-030 PDF." });
  }
});

router.post("/cases/:id/forms/mc030-with-exhibits", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  const exhibitIds: number[] = Array.isArray(b.exhibitDocIds)
    ? b.exhibitDocIds.map(Number).filter((n: number) => !isNaN(n))
    : [];

  try {
    const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Fetch docs in user-selected order
    const rawDocs = exhibitIds.length > 0
      ? await db.select().from(documentsTable).where(
          and(inArray(documentsTable.id, exhibitIds), eq(documentsTable.caseId, id))
        )
      : [];
    const docMap = new Map(rawDocs.map((doc) => [doc.id, doc]));
    const exhibitDocs = exhibitIds.map((eid) => docMap.get(eid)).filter((d): d is typeof rawDocs[number] => d !== undefined);

    // Numbered list — AI assigns letters in first-mention order
    const numberedExhibits = exhibitDocs.map((doc, i) => ({
      docIndex: i + 1,
      name: friendlyExhibitName(doc.description, doc.originalName) || `Document ${i + 1}`,
    }));

    const masterDoc = await PDFDocument.create();
    const font = await masterDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await masterDoc.embedFont(StandardFonts.HelveticaBold);

    let { declarationTitle, declarationText } = b as { declarationTitle?: string; declarationText?: string };
    let exhibitOrder: number[] = [];

    if (!declarationText) {
      // No pre-supplied text — generate everything with AI (assigns exhibit letters in narrative order)
      const ai = await generateMC030Declaration(d, numberedExhibits.length > 0 ? numberedExhibits : undefined);
      declarationTitle = declarationTitle || ai.declarationTitle;
      declarationText  = ai.declarationText;
      exhibitOrder     = ai.exhibitOrder;
    } else {
      // Text already provided — preserve sequential order so physical tabs match the
      // pre-generated narrative (which uses position-based letter assignment from mc030-ai).
      exhibitOrder = exhibitDocs.map((_, i) => i + 1);
      if (!declarationTitle) {
        declarationTitle = `DECLARATION OF ${String(d.plaintiffName || "PLAINTIFF").toUpperCase()}`;
      }
    }
    declarationText = stripMC030Wrappers(declarationText || "");

    req.log.info({ exhibitOrder }, "[MC-030 Filing Packet] exhibit order");

    // Sort exhibit docs to match the narrative order
    const orderedDocs = applyExhibitOrder(exhibitDocs, exhibitOrder);

    if (declarationTitle) {
      db.update(casesTable)
        .set({ mc030DeclarationTitle: declarationTitle })
        .where(eq(casesTable.id, id))
        .catch((e: any) => logger.error({ err: e }, "MC-030 title save error"));
    }

    const bg = await masterDoc.embedPng(loadAsset("mc030_hq-1.png"));
    const mc030Page = masterDoc.addPage([PW, PH]);
    mc030Page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

    const declOverflows = checkOverflow(font, declarationText);
    const formDeclText = declOverflows ? "SEE ATTACHED DECLARATION PAGES." : declarationText;
    drawMC030Page(mc030Page, font, fontBold, d, b, declarationTitle, formDeclText);
    if (declOverflows) addDeclarationContinuationPages(masterDoc, font, fontBold, declarationText, d, b);

    // Attach exhibit tabs in narrative order
    for (let i = 0; i < orderedDocs.length; i++) {
      const doc = orderedDocs[i];
      const letter = LETTERS[i] ?? String(i + 1);
      const label = `EXHIBIT ${letter}`;
      try {
        const fileBuffer = await getDocumentBuffer(doc);
        await embedExhibitPages(masterDoc, fileBuffer, doc.mimeType, friendlyExhibitName(doc.description, doc.originalName), label, font, fontBold);
      } catch (docErr) {
        req.log.error({ err: docErr, exhibit: letter }, "[MC-030 Filing Packet] Failed to embed exhibit");
      }
    }

    const pdfBytes = await masterDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="MC030-Filing-Packet-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "MC-030 with-exhibits PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate filing packet." });
  }
});

export default router;
