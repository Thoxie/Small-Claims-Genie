/**
 * docx-to-pdf.ts
 *
 * Standalone document conversion utility: DOCX → PDF.
 *
 * This is NOT part of the form generation pipeline.
 * It is used exclusively by the MC-030 exhibit assembly process
 * to convert DOCX uploads into embeddable PDF pages.
 */

import mammoth from "mammoth";
import { withPage } from "../forms/chromium-pool";

/**
 * Converts a DOCX buffer to a PDF buffer using mammoth (HTML extraction)
 * and Playwright/Chromium (HTML-to-PDF rendering).
 */
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
