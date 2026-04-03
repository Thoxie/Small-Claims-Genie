import { Router, type IRouter } from "express";
import { eq, asc, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable, chatMessagesTable } from "@workspace/db";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

const router: IRouter = Router();

const NAVY = rgb(0.05, 0.15, 0.35);
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);
const TEAL = rgb(0.05, 0.42, 0.36);

// ── helper: fetch messages by scope ──────────────────────────────────────────
async function fetchMessages(caseId: number, scope: string) {
  if (scope === "last") {
    // Only the most recent assistant message
    const rows = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.caseId, caseId))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(20); // fetch recent, find last assistant
    const lastAssistant = rows.find(r => r.role === "assistant");
    return lastAssistant ? [lastAssistant] : [];
  }
  return db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.caseId, caseId))
    .orderBy(asc(chatMessagesTable.createdAt));
}

// ── GET /cases/:id/chat/export/pdf ────────────────────────────────────────────
router.get("/cases/:id/chat/export/pdf", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const scope = (req.query.scope as string) === "last" ? "last" : "all";
  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  const messages = await fetchMessages(id, scope);

  if (messages.length === 0) {
    res.status(400).json({ error: "No content to export" });
    return;
  }

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const W = 612, H = 792, ML = 56, MR = 56, CW = W - ML - MR;
  let page = pdfDoc.addPage([W, H]);
  let y = H - 60;

  const exportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const isLastOnly = scope === "last";
  const headerTitle = isLastOnly ? "AI GENIE — DOCUMENT EXPORT" : "AI CHAT TRANSCRIPT";

  // Header bar
  page.drawRectangle({ x: 0, y: H - 44, width: W, height: 44, color: NAVY });
  page.drawText(headerTitle, { x: ML, y: H - 29, size: 13, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText(`Small Claims Genie  •  Case: ${caseRecord?.title ?? `#${id}`}`, {
    x: W - MR - 260, y: H - 29, size: 8.5, font: regFont, color: rgb(0.75, 0.85, 1),
  });
  page.drawText(`Exported: ${exportDate}`, { x: ML, y: H - 55, size: 8, font: regFont, color: GRAY });
  y = H - 78;

  const SIZE = 9.5;
  const LINE_H = SIZE * 1.6;
  const MAX_Y = 55;

  function wrapText(text: string, maxW: number, font: typeof regFont, size: number): string[] {
    const paragraphs = text.split("\n");
    const result: string[] = [];
    for (const para of paragraphs) {
      if (!para.trim()) { result.push(""); continue; }
      const words = para.split(" ");
      let cur = "";
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) <= maxW) {
          cur = test;
        } else {
          if (cur) result.push(cur);
          cur = w;
        }
      }
      if (cur) result.push(cur);
    }
    return result.length ? result : [""];
  }

  function ensureSpace(linesNeeded: number): void {
    if (y - linesNeeded * LINE_H < MAX_Y) {
      page = pdfDoc.addPage([W, H]);
      page.drawRectangle({ x: 0, y: H - 44, width: W, height: 44, color: NAVY });
      page.drawText(`${headerTitle} (continued)`, { x: ML, y: H - 29, size: 11, font: boldFont, color: rgb(1, 1, 1) });
      y = H - 66;
    }
  }

  if (isLastOnly) {
    // Clean document layout — no role labels, just the content
    const content = (messages[0].content ?? "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^#+\s+/gm, "")
      .replace(/^[-•]\s+/gm, "  • ");

    const lines = wrapText(content, CW, regFont, SIZE);
    for (const line of lines) {
      ensureSpace(1);
      page.drawText(line || " ", { x: ML, y, size: SIZE, font: regFont, color: BLACK });
      y -= LINE_H;
    }
  } else {
    // Full chat transcript layout with role labels
    for (const msg of messages) {
      const isUser = msg.role === "user";
      const label = isUser ? "YOU" : "GENIE";
      const labelColor = isUser ? NAVY : TEAL;

      ensureSpace(2);
      page.drawText(label, { x: ML, y, size: 8, font: boldFont, color: labelColor });
      y -= LINE_H * 0.8;

      const cleanContent = (msg.content ?? "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/^#+\s+/gm, "")
        .replace(/^[-•]\s+/gm, "  • ");

      const lines = wrapText(cleanContent, CW - 12, regFont, SIZE);
      for (const line of lines) {
        ensureSpace(1);
        page.drawText(line || " ", { x: ML + (isUser ? 12 : 0), y, size: SIZE, font: regFont, color: BLACK });
        y -= LINE_H;
      }

      ensureSpace(1);
      page.drawLine({
        start: { x: ML, y: y + LINE_H * 0.5 },
        end: { x: W - MR, y: y + LINE_H * 0.5 },
        thickness: 0.3,
        color: GRAY,
      });
      y -= LINE_H * 0.6;
    }
  }

  // Footer on all pages
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const p = pdfDoc.getPage(i);
    p.drawLine({ start: { x: ML, y: 40 }, end: { x: W - MR, y: 40 }, thickness: 0.4, color: GRAY });
    p.drawText(`Generated by Small Claims Genie  •  Page ${i + 1} of ${pageCount}`, {
      x: ML, y: 26, size: 7.5, font: regFont, color: GRAY,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const safeName = (caseRecord?.title ?? `case-${id}`).replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const fileSuffix = isLastOnly ? "ai-document" : "ai-chat";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}-${fileSuffix}.pdf"`);
  res.send(Buffer.from(pdfBytes));
});

// ── GET /cases/:id/chat/export/word ───────────────────────────────────────────
router.get("/cases/:id/chat/export/word", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const scope = (req.query.scope as string) === "last" ? "last" : "all";
  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  const messages = await fetchMessages(id, scope);

  if (messages.length === 0) {
    res.status(400).json({ error: "No content to export" });
    return;
  }

  const exportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const isLastOnly = scope === "last";

  const children: Paragraph[] = [
    new Paragraph({
      text: isLastOnly ? "AI Genie — Document Export" : "AI Chat Transcript",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Case: `, bold: true, size: 20 }),
        new TextRun({ text: caseRecord?.title ?? `Case #${id}`, size: 20 }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `Exported: ${exportDate}`, size: 18, color: "888888" })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
  ];

  if (isLastOnly) {
    // Clean document layout — just the content, no role labels
    const content = messages[0].content ?? "";
    const paragraphs = content.split("\n");

    for (const para of paragraphs) {
      const cleaned = para
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/^#+\s+/, "")
        .replace(/^[-•]\s+/, "  • ");

      children.push(
        new Paragraph({
          children: [new TextRun({ text: cleaned || " ", size: 22 })],
          spacing: { after: 160 },
        })
      );
    }
  } else {
    // Full chat transcript layout
    for (const msg of messages) {
      const isUser = msg.role === "user";
      const label = isUser ? "YOU:" : "GENIE:";
      const labelColor = isUser ? "0D2357" : "0D6B5E";

      children.push(
        new Paragraph({
          children: [new TextRun({ text: label, bold: true, color: labelColor, size: 20 })],
          spacing: { before: 240, after: 60 },
        })
      );

      const paragraphs = (msg.content ?? "").split("\n").filter((l: string) => l.trim());
      for (const para of paragraphs) {
        const cleaned = para
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/^#+\s+/, "")
          .replace(/^[-•]\s+/, "  • ");

        children.push(
          new Paragraph({
            children: [new TextRun({ text: cleaned, size: 20 })],
            spacing: { after: 80 },
            indent: isUser ? { left: 360 } : {},
          })
        );
      }

      children.push(
        new Paragraph({
          border: { bottom: { style: "single" as any, size: 4, color: "DDDDDD", space: 1 } },
          text: "",
          spacing: { after: 120 },
        })
      );
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  const safeName = (caseRecord?.title ?? `case-${id}`).replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const fileSuffix = isLastOnly ? "ai-document" : "ai-chat";

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}-${fileSuffix}.docx"`);
  res.send(buffer);
});

export default router;
