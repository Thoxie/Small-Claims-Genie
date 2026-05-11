import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import mammoth from "mammoth";
import { withPage } from "../forms/chromium-pool";
import { ObjectStorageService } from "../lib/objectStorage";
import { redeemDownloadToken } from "../lib/download-tokens";
import { getUserId } from "../lib/owned-case";
import type { Request, Response, NextFunction } from "express";

const execFileAsync = promisify(execFile);

export const objectStorage = new ObjectStorageService();

export const ASSET_DIR  = path.join(__dirname, "..", "assets");
export const FORMS_DIR  = path.join(ASSET_DIR, "forms");

// ─── Constants ────────────────────────────────────────────────────────────────
export const PW    = 612;
export const PH    = 792;
export const BLACK = rgb(0, 0, 0);

// ─── Dev-only guard ───────────────────────────────────────────────────────────
export function devOnly(_req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
}

// ─── Auth helper ─────────────────────────────────────────────────────────────
export async function resolveDownloadUser(
  req: Request,
  res: Response,
  caseId: number
): Promise<string | null> {
  const queryToken = req.query.token as string | undefined;
  const bodyToken  = (req as any).body?.token as string | undefined;
  const token = queryToken || bodyToken;
  if (token) {
    const userId = await redeemDownloadToken(token, caseId);
    if (!userId) {
      res.status(403).json({ error: "Invalid or expired download link." });
      return null;
    }
    return userId;
  }
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

// ─── Overlay helpers ──────────────────────────────────────────────────────────
export function val(page: any, font: any, text: string | null | undefined, x: number, y: number, size = 9) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color: BLACK });
}

// Draw a line of text with inline bold for exhibit references.
export function drawLineMixed(
  page: any,
  font: any,
  fontBold: any,
  text: string,
  x: number,
  y: number,
  size: number,
  color: any
) {
  const EXHIBIT_RE = /(\(Exhibit\s+[^)]+\)|Exhibit\s+[A-Z]+(?:\s*—\s*[^;)\n]*)?)/g;
  const segments: { text: string; bold: boolean }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = EXHIBIT_RE.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), bold: false });
    segments.push({ text: m[1], bold: true });
    last = m.index + m[1].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false });

  let curX = x;
  for (const seg of segments) {
    if (!seg.text) continue;
    const f = seg.bold ? fontBold : font;
    page.drawText(seg.text, { x: curX, y, size, font: f, color });
    curX += f.widthOfTextAtSize(seg.text, size);
  }
}

export function wrapVal(page: any, font: any, text: string | null | undefined, x: number, startY: number, maxW: number, size: number, lineH: number, maxLines: number): number {
  if (!text) return startY;
  const words = text.split(/\s+/);
  let line = "";
  let y = startY;
  let count = 0;
  for (const word of words) {
    const cand = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(cand, size) > maxW && line) {
      page.drawText(line, { x, y, size, font, color: BLACK });
      y -= lineH;
      count++;
      line = word;
      if (count >= maxLines) break;
    } else {
      line = cand;
    }
  }
  if (line && count < maxLines) {
    page.drawText(line, { x, y, size, font, color: BLACK });
    y -= lineH;
  }
  return y;
}

export function xmark(page: any, cx: number, cy: number, size = 5) {
  const h = size / 2;
  page.drawLine({ start: { x: cx - h, y: cy - h }, end: { x: cx + h, y: cy + h }, thickness: 1, color: BLACK });
  page.drawLine({ start: { x: cx + h, y: cy - h }, end: { x: cx - h, y: cy + h }, thickness: 1, color: BLACK });
}

export function loadAsset(filename: string): Buffer {
  return fs.readFileSync(path.join(ASSET_DIR, filename));
}

export function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function formatDateDisplay(d: string | null | undefined): string {
  if (!d) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return d;
}

export function formatTimeDisplay(t: string | null | undefined): string {
  if (!t) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return t;
  const h = parseInt(m[1], 10);
  const min = m[2];
  const period = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${period}`;
}

// ─── Exhibit & declaration helpers ───────────────────────────────────────────

export function friendlyExhibitName(description: string | null | undefined, originalName: string): string {
  if (description?.trim()) return description.trim();
  return originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/^\s*\d+\s*[-.\s]+\s*/, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripExhibitRefsFromDesc(text: string): string {
  return text
    .replace(/\(Exhibit\s+[^)]+\)/gi, "")
    .replace(/Exhibit\s+\d+[_\w().\s-]*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function generateExhibitCoverPage(
  masterDoc: PDFDocument,
  label: string,
  originalName: string,
  font: any,
  fontBold: any
): void {
  const page = masterDoc.addPage([PW, PH]);
  const midY = PH / 2;
  page.drawLine({ start: { x: 72, y: midY + 70 }, end: { x: PW - 72, y: midY + 70 }, thickness: 1.5, color: BLACK });
  const labelW = fontBold.widthOfTextAtSize(label, 36);
  page.drawText(label, { x: (PW - labelW) / 2, y: midY + 26, size: 36, font: fontBold, color: BLACK });
  page.drawLine({ start: { x: 72, y: midY + 10 }, end: { x: PW - 72, y: midY + 10 }, thickness: 1.5, color: BLACK });
  const nameToShow = originalName.length > 60 ? originalName.slice(0, 57) + "…" : originalName;
  const nameW = font.widthOfTextAtSize(nameToShow, 11);
  page.drawText(nameToShow, { x: (PW - nameW) / 2, y: midY - 22, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
}

export function addDeclarationContinuationPages(
  masterDoc: PDFDocument,
  font: any,
  fontBold: any,
  fullText: string,
  d: Record<string, any>,
  b: Record<string, any>
): void {
  const MARGIN   = 72;
  const CONTENTW = PW - MARGIN * 2;
  const BSIZE    = 11;
  const LINEH    = 14.5;

  const allLines: string[] = [];
  for (const para of fullText.split(/\n/).map(p => p.trim()).filter(Boolean)) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const cand = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(cand, BSIZE) > CONTENTW && line) { allLines.push(line); line = w; }
      else { line = cand; }
    }
    if (line) allLines.push(line);
    allLines.push("");
  }
  while (allLines.length && !allLines[allLines.length - 1]) allLines.pop();

  const HEADER_H   = 88;
  const FOOTER_H   = 72;
  const firstLines = Math.floor((PH - MARGIN - HEADER_H - FOOTER_H) / LINEH);
  const fullLines  = Math.floor((PH - MARGIN * 2) / LINEH);

  let lineIdx = 0;
  let pageNum  = 0;

  while (lineIdx < allLines.length) {
    const page = masterDoc.addPage([PW, PH]);
    pageNum++;
    const isFirst = pageNum === 1;

    if (isFirst) {
      const headerTitle = "ATTACHMENT TO MC-030 DECLARATION";
      const hw = fontBold.widthOfTextAtSize(headerTitle, 13);
      page.drawText(headerTitle, { x: (PW - hw) / 2, y: PH - MARGIN, size: 13, font: fontBold, color: BLACK });
      page.drawLine({ start: { x: MARGIN, y: PH - MARGIN - 14 }, end: { x: PW - MARGIN, y: PH - MARGIN - 14 }, thickness: 0.5, color: BLACK });
      const plaintiff = String(d.plaintiffName || b?.plaintiffName || "");
      const defendant = String(d.defendantName || b?.defendantName || "");
      const caseNo    = String(d.caseNumber    || b?.caseNumber    || "");
      page.drawText(`${plaintiff} vs. ${defendant}`, { x: MARGIN, y: PH - MARGIN - 30, size: 10, font, color: BLACK });
      if (caseNo) {
        const cnText = `Case No.: ${caseNo}`;
        const cnW = font.widthOfTextAtSize(cnText, 10);
        page.drawText(cnText, { x: PW - MARGIN - cnW, y: PH - MARGIN - 30, size: 10, font, color: BLACK });
      }
      page.drawLine({ start: { x: MARGIN, y: PH - MARGIN - 42 }, end: { x: PW - MARGIN, y: PH - MARGIN - 42 }, thickness: 0.5, color: BLACK });
    }

    const startY       = isFirst ? PH - MARGIN - HEADER_H : PH - MARGIN;
    const linesOnPage  = isFirst ? firstLines : fullLines;
    let y = startY;

    for (let i = 0; i < linesOnPage && lineIdx < allLines.length; i++, lineIdx++) {
      if (allLines[lineIdx]) drawLineMixed(page, font, fontBold, allLines[lineIdx], MARGIN, y, BSIZE, BLACK);
      y -= LINEH;
    }

    if (lineIdx >= allLines.length) {
      y -= LINEH;
      const perjury = "I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.";
      const pwords = perjury.split(" ");
      let pline = "";
      for (const pw of pwords) {
        const cand = pline ? pline + " " + pw : pw;
        if (font.widthOfTextAtSize(cand, BSIZE) > CONTENTW && pline) {
          page.drawText(pline, { x: MARGIN, y, size: BSIZE, font, color: BLACK }); y -= LINEH; pline = pw;
        } else { pline = cand; }
      }
      if (pline) { page.drawText(pline, { x: MARGIN, y, size: BSIZE, font, color: BLACK }); y -= LINEH; }
      y -= LINEH * 2;
      const dateStr  = String(b?.declarationDate || "");
      const declarant = String(b?.declarantName || d.plaintiffName || "");
      page.drawText(`Date: ${dateStr || "_________________________"}`, { x: MARGIN, y, size: BSIZE, font, color: BLACK });
      page.drawText(`Signature: _________________________`, { x: MARGIN + 230, y, size: BSIZE, font, color: BLACK });
      y -= LINEH * 2;
      page.drawText(`Printed Name: ${declarant}`, { x: MARGIN, y, size: BSIZE, font, color: BLACK });
    }
  }
}

// ─── File format detection & conversion ──────────────────────────────────────

export function sniffFormat(buf: Buffer): "pdf" | "jpeg" | "png" | "docx" | "webp" | "unknown" {
  if (buf.length < 12) return "unknown";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return "docx";
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  return "unknown";
}

export async function imageToJpeg(buf: Buffer): Promise<Buffer> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inPath  = path.join(os.tmpdir(), `ex-${id}-in`);
  const outPath = path.join(os.tmpdir(), `ex-${id}-out.jpg`);
  try {
    await fsp.writeFile(inPath, buf);
    await execFileAsync("magick", [inPath, "-quality", "90", outPath]);
    return await fsp.readFile(outPath);
  } finally {
    fsp.unlink(inPath).catch(() => {});
    fsp.unlink(outPath).catch(() => {});
  }
}

export async function docxToPdf(buf: Buffer): Promise<Buffer> {
  const { value: html } = await mammoth.convertToHtml({ buffer: buf });
  const fullHtml = `<!DOCTYPE html><html><head><style>
    body{font-family:Arial,sans-serif;margin:40px;font-size:12px;line-height:1.6;color:#000}
    h1,h2,h3{margin-bottom:8px}
    table{border-collapse:collapse;width:100%}
    td,th{border:1px solid #ccc;padding:6px;text-align:left}
    p{margin:0 0 8px}
  </style></head><body>${html}</body></html>`;
  return await withPage(async (page) => {
    await page.setContent(fullHtml, { waitUntil: "domcontentloaded" });
    const pdfBuf = await page.pdf({
      format: "Letter",
      margin: { top: "0.75in", bottom: "0.75in", left: "0.75in", right: "0.75in" },
    });
    return Buffer.from(pdfBuf);
  });
}

export async function embedExhibitPages(
  masterDoc: PDFDocument,
  fileBuffer: Buffer,
  mimeType: string | null,
  originalName: string,
  label: string,
  font: any,
  fontBold: any
): Promise<void> {
  generateExhibitCoverPage(masterDoc, label, originalName, font, fontBold);

  const fmt = sniffFormat(fileBuffer);

  function stampExhibit(page: any) {
    const lw = fontBold.widthOfTextAtSize(label, 10);
    page.drawRectangle({ x: PW - lw - 22, y: 28, width: lw + 16, height: 18, color: rgb(1, 1, 1), borderColor: BLACK, borderWidth: 0.7 });
    page.drawText(label, { x: PW - lw - 14, y: 33, size: 10, font: fontBold, color: BLACK });
  }

  async function embedImagePage(imgBuf: Buffer, isJpeg: boolean) {
    const exPage = masterDoc.addPage([PW, PH]);
    const img = isJpeg ? await masterDoc.embedJpg(imgBuf) : await masterDoc.embedPng(imgBuf);
    const { width: iw, height: ih } = img.scale(1);
    const scale = Math.min((PW - 72) / iw, (PH - 120) / ih, 1);
    const dw = iw * scale; const dh = ih * scale;
    exPage.drawImage(img, { x: (PW - dw) / 2, y: (PH - dh) / 2 + 20, width: dw, height: dh });
    exPage.drawText(originalName, { x: 54, y: PH - 36, size: 8, font, color: rgb(0.45, 0.45, 0.45) });
    stampExhibit(exPage);
  }

  async function embedPdfBuffer(pdfBuf: Buffer) {
    const extDoc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
    const copied = await masterDoc.copyPages(extDoc, extDoc.getPageIndices());
    copied.forEach((p, pi) => { masterDoc.addPage(p); if (pi === 0) stampExhibit(p); });
  }

  if (fmt === "pdf") {
    await embedPdfBuffer(fileBuffer);
  } else if (fmt === "jpeg") {
    await embedImagePage(fileBuffer, true);
  } else if (fmt === "png") {
    await embedImagePage(fileBuffer, false);
  } else if (fmt === "docx") {
    const pdfBuf = await docxToPdf(fileBuffer);
    await embedPdfBuffer(pdfBuf);
  } else if (fmt === "webp" || (fmt === "unknown" && mimeType?.startsWith("image/"))) {
    const jpegBuf = await imageToJpeg(fileBuffer);
    await embedImagePage(jpegBuf, true);
  } else {
    const ph = masterDoc.addPage([PW, PH]);
    ph.drawText(label, { x: 54, y: PH - 80, size: 16, font: fontBold, color: BLACK });
    ph.drawText(`File: ${originalName}`, { x: 54, y: PH - 110, size: 10, font, color: BLACK });
    ph.drawText(`(Unsupported format — please convert to PDF and re-upload)`, { x: 54, y: PH - 130, size: 9, font, color: rgb(0.45, 0.45, 0.45) });
    stampExhibit(ph);
  }
}

export async function getDocumentBuffer(doc: { storageObjectPath: string | null; fileData?: string | null }): Promise<Buffer> {
  if (doc.storageObjectPath) {
    const normalizedPath = objectStorage.normalizeObjectEntityPath(doc.storageObjectPath);
    const gcsFile = await objectStorage.getObjectEntityFile(normalizedPath);
    const [buffer] = await gcsFile.download();
    return buffer;
  }
  if (doc.fileData) {
    return Buffer.from(doc.fileData, "base64");
  }
  throw new Error("Document has no file content (neither storageObjectPath nor fileData)");
}
