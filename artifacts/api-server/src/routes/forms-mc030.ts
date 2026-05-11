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

// ─── MC-030 internals ─────────────────────────────────────────────────────────
async function generateMC030Declaration(
  d: Record<string, any>,
  exhibits?: Array<{ letter: string; name: string }>
): Promise<{ declarationTitle: string; declarationText: string }> {
  const plaintiffName  = String(d.plaintiffName  || "Plaintiff");
  const defendantName  = String(d.defendantName  || "Defendant");
  const claimAmount    = d.claimAmount  ? `$${Number(d.claimAmount).toFixed(2)}` : "an amount to be determined";
  const claimDesc      = stripExhibitRefsFromDesc(String(d.claimDescription || ""));
  const incidentDate   = d.incidentDate ? formatDateDisplay(d.incidentDate) : "";
  const hasExhibits    = exhibits && exhibits.length > 0;

  const exhibitTable = hasExhibits
    ? exhibits!.map(e => `  Exhibit ${e.letter} — ${e.name}`).join("\n")
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
    hasExhibits ? `AUTHORITATIVE EXHIBIT LIST — use ONLY these identifiers and names. Do not invent others.\n${exhibitTable}` : "",
    ``,
    `Return a JSON object with exactly two fields:`,
    `1. "declarationTitle": All-caps title, max 80 characters. Specific to the case facts.`,
    `2. "declarationText": Numbered paragraphs separated by \\n. Each paragraph starts with its number and a period ("1. "). Each paragraph is ONE concise sentence, max 120 characters.`,
    hasExhibits
      ? `   Use enough paragraphs to cover all key facts AND every exhibit — minimum 8, add more if needed to reference all ${exhibits!.length} exhibit(s). Target total length: 600–950 characters.`
      : `   Use 8 paragraphs. Target total length: 550-700 characters.`,
    `   STRICT RULES — violation will break the PDF form layout:`,
    `   - Plain text only. Absolutely NO asterisks, NO markdown, NO bold, NO brackets.`,
    `   - Separate paragraphs with \\n only (single newline, never double).`,
    `   - Do NOT include "I declare under penalty of perjury" — already printed on the form.`,
    `   - The form already has a printed signature block, date line, and printed name line at the bottom — NEVER add any of those to the text. Do not end with a name, a date, "Respectfully", "Sincerely", "Signed", or any closing statement whatsoever.`,
    `   - The final paragraph must end with the specific dollar amount requested and nothing else after it.`,
    hasExhibits ? [
      `   EXHIBIT REFERENCE RULES (strictly enforced):`,
      `   - You MUST reference EVERY exhibit from the AUTHORITATIVE EXHIBIT LIST — no exceptions, no skipping.`,
      `   - If there are 4 or more exhibits, after 2 key narrative facts add one compact sentence listing all remaining exhibits: "Supporting documents include: [Name] (Exhibit C), [Name] (Exhibit D)..."`,
      `   - Use EXACTLY this format: (Exhibit LETTER — Name) — e.g. (Exhibit A — Repair Invoice).`,
      `   - The LETTER must come from the list above (A, B, C…). NEVER use a number (1, 2, 3) as the identifier.`,
      `   - The Name must match the name in the list exactly. NEVER copy filenames or any text from the case description.`,
      `   - Any exhibit reference in the case description is wrong — discard it and use the list above instead.`,
    ].join("\n") : "",
    ``,
    `Respond with only the JSON object.`,
  ].filter(Boolean).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as { declarationTitle?: string; declarationText?: string };
    return {
      declarationTitle: parsed.declarationTitle || `DECLARATION OF ${plaintiffName.toUpperCase()}`,
      declarationText:  stripMC030Wrappers(parsed.declarationText  || claimDesc),
    };
  } catch {
    return {
      declarationTitle: `DECLARATION OF ${plaintiffName.toUpperCase()}`,
      declarationText:  stripMC030Wrappers(claimDesc),
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
    const rawExhibitDocs = exhibitIds.length > 0
      ? await db.select().from(documentsTable).where(
          and(inArray(documentsTable.id, exhibitIds), eq(documentsTable.caseId, id))
        )
      : [];
    const exhibitDocMap = new Map(rawExhibitDocs.map((doc) => [doc.id, doc]));
    const exhibitDocs = exhibitIds.map((eid) => exhibitDocMap.get(eid)).filter((d): d is typeof rawExhibitDocs[number] => d !== undefined);
    const exhibitList: Array<{ letter: string; name: string }> = exhibitDocs.map((doc, i) => ({
      letter: LETTERS[i] ?? String(i + 1),
      name: friendlyExhibitName(doc.description, doc.originalName) || `Document ${i + 1}`,
    }));

    req.log.info(
      { exhibitList: exhibitList.map(e => ({ letter: e.letter, name: e.name })),
        rawDescriptions: exhibitDocs.map(doc => ({ id: doc.id, description: doc.description, originalName: doc.originalName })) },
      "[MC-030 Signed] Exhibit list passed to AI"
    );

    let { declarationTitle, declarationText } = b as { declarationTitle?: string; declarationText?: string };
    if (!declarationTitle || !declarationText) {
      const ai = await generateMC030Declaration(d, exhibitList);
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

    for (let i = 0; i < exhibitDocs.length; i++) {
      const doc = exhibitDocs[i];
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
    const LETTERS_FP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const rawFpDocs = exhibitIds.length > 0
      ? await db.select().from(documentsTable).where(
          and(inArray(documentsTable.id, exhibitIds), eq(documentsTable.caseId, id))
        )
      : [];
    const fpDocMap = new Map(rawFpDocs.map((doc) => [doc.id, doc]));
    const fpExhibitDocs = exhibitIds.map((eid) => fpDocMap.get(eid)).filter((d): d is typeof rawFpDocs[number] => d !== undefined);
    const fpExhibitList: Array<{ letter: string; name: string }> = fpExhibitDocs.map((doc, i) => ({
      letter: LETTERS_FP[i] ?? String(i + 1),
      name: friendlyExhibitName(doc.description, doc.originalName) || `Document ${i + 1}`,
    }));

    const masterDoc = await PDFDocument.create();
    const font = await masterDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await masterDoc.embedFont(StandardFonts.HelveticaBold);

    let { declarationTitle, declarationText } = b as { declarationTitle?: string; declarationText?: string };
    if (!declarationTitle || !declarationText) {
      const ai = await generateMC030Declaration(d, fpExhibitList);
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

    const bg = await masterDoc.embedPng(loadAsset("mc030_hq-1.png"));
    const mc030Page = masterDoc.addPage([PW, PH]);
    mc030Page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

    const declOverflows = checkOverflow(font, declarationText);
    const formDeclText = declOverflows ? "SEE ATTACHED DECLARATION PAGES." : declarationText;
    drawMC030Page(mc030Page, font, fontBold, d, b, declarationTitle, formDeclText);
    if (declOverflows) addDeclarationContinuationPages(masterDoc, font, fontBold, declarationText, d, b);

    for (let i = 0; i < fpExhibitDocs.length; i++) {
      const doc = fpExhibitDocs[i];
      const letter = LETTERS_FP[i] ?? String(i + 1);
      const label = `EXHIBIT ${letter}`;
      try {
        const fileBuffer = await getDocumentBuffer(doc);
        await embedExhibitPages(masterDoc, fileBuffer, doc.mimeType, friendlyExhibitName(doc.description, doc.originalName), label, font, fontBold);
      } catch (docErr) {
        req.log.error({ err: docErr, exhibit: letter }, "[MC-030 Exhibits] Failed to embed exhibit");
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
