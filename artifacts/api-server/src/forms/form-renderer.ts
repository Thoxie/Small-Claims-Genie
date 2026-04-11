/**
 * form-renderer.ts
 * Generic PDF form renderer.
 *
 * Loads a FormConfig (JSON), iterates over every FieldDef, evaluates
 * conditions against enriched case data, and draws text / X-marks / wrapped
 * paragraphs at the calibrated coordinates onto pdf-lib page objects.
 *
 * To add a new form:
 *   1. Place background PNG(s) in assets/forms/
 *   2. Create a <formId>.json config (see FormConfig type below)
 *   3. Write an enrich function that pre-computes derived fields
 *   4. Call buildFormPdf(config, enrichedData, assetDir)
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

const BLACK = rgb(0, 0, 0);

// ─── Types ────────────────────────────────────────────────────────────────────

export type Condition =
  | { exists: string }           // field has a truthy value
  | { isTrue: string }           // field === true
  | { isFalse: string }          // field === false (after enrichment defaults)
  | { notTrue: string }          // field !== true  (false / null / undefined)
  | { any: string[] }            // at least one field is truthy
  | { all: string[] }            // every field is truthy
  | { allTrue: string[] };       // every field === true

export type WrapOptions = {
  maxW: number;     // maximum line width in points
  lineH: number;    // line height in points
  maxLines: number; // maximum number of lines to render
};

/**
 * A single renderable element on a form page.
 *
 * type "text"        – drawText at (x, y)
 * type "xmark"       – draw an X at (x, y)
 * type "wrapText"    – word-wrap text starting at (x, y)
 * type "xmarkFromMap"– look up venueBasisLetter (or similar) in `map`,
 *                      then draw an X at the mapped coordinates
 */
export type FieldDef = {
  id: string;
  page: number;        // 1-based page index
  type: "text" | "xmark" | "wrapText" | "xmarkFromMap";
  x: number;           // PDF points from left edge
  y: number;           // PDF points from bottom edge (before LIFT applied)
  size?: number;       // font size for text; default = config.defaultSize
  source?: string;     // data key or {{template}} string
  fallback?: string;   // literal value used when source is empty
  condition?: Condition;
  wrap?: WrapOptions;
  map?: Record<string, [number, number]>; // for xmarkFromMap: key → [cx, cy]
};

export type FormConfig = {
  id: string;
  name: string;
  lift?: number;         // upward shift in pts applied to all y values (default 4.5)
  defaultSize?: number;  // default font size (default 9)
  backgroundAssets: string[];  // filenames relative to assetDir
  fields: FieldDef[];
};

// ─── Condition evaluation ─────────────────────────────────────────────────────

function evalCondition(cond: Condition, data: Record<string, any>): boolean {
  if ("exists"  in cond) return !!data[cond.exists];
  if ("isTrue"  in cond) return data[cond.isTrue]  === true;
  if ("isFalse" in cond) return data[cond.isFalse] === false;
  if ("notTrue" in cond) return data[cond.notTrue]  !== true;
  if ("any"     in cond) return cond.any.some(f  => !!data[f]);
  if ("all"     in cond) return cond.all.every(f => !!data[f]);
  if ("allTrue" in cond) return cond.allTrue.every(f => data[f] === true);
  return true;
}

// ─── Source resolution ────────────────────────────────────────────────────────

/**
 * Resolve a source string to a displayable string.
 *   "fieldName"           → data[fieldName]
 *   "{{f1}} and {{f2}}"   → interpolate each {{…}} with data[key]
 *   fallback              → used when resolved value is empty
 */
function resolveSource(
  source: string,
  data: Record<string, any>,
  fallback?: string
): string | null {
  if (source.includes("{{")) {
    const result = source.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      data[key] != null ? String(data[key]) : ""
    );
    return result.trim() || fallback || null;
  }
  const v = data[source];
  if (v != null && v !== "") return String(v);
  return fallback ?? null;
}

// ─── X-mark drawing ───────────────────────────────────────────────────────────

function drawXmark(page: any, cx: number, cy: number, halfSize = 2.5) {
  page.drawLine({
    start: { x: cx - halfSize, y: cy - halfSize },
    end:   { x: cx + halfSize, y: cy + halfSize },
    thickness: 1, color: BLACK,
  });
  page.drawLine({
    start: { x: cx + halfSize, y: cy - halfSize },
    end:   { x: cx - halfSize, y: cy + halfSize },
    thickness: 1, color: BLACK,
  });
}

// ─── Word-wrap drawing ────────────────────────────────────────────────────────

function drawWrapped(
  page: any,
  font: any,
  text: string,
  x: number,
  startY: number,
  size: number,
  opts: WrapOptions
): void {
  const { maxW, lineH, maxLines } = opts;
  const words = text.split(/\s+/);
  let line = "";
  let y = startY;
  let count = 0;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxW && line) {
      page.drawText(line, { x, y, size, font, color: BLACK });
      y -= lineH;
      count++;
      line = word;
      if (count >= maxLines) return;
    } else {
      line = candidate;
    }
  }
  if (line && count < maxLines) {
    page.drawText(line, { x, y, size, font, color: BLACK });
  }
}

// ─── Main renderer ────────────────────────────────────────────────────────────

/**
 * Build a multi-page PDF from a FormConfig + enriched data object.
 *
 * @param config     Parsed FormConfig (from JSON)
 * @param data       Enriched case data (all derived fields pre-computed)
 * @param assetDir   Absolute path to the folder containing background PNGs
 * @param extraRender Optional callback for things not expressible in config
 *                   (e.g. embedding a signature image). Receives the array of
 *                   pdf-lib page objects, the PDFDocument, the embedded font,
 *                   and the enriched data.
 */
export async function buildFormPdf(
  config: FormConfig,
  data: Record<string, any>,
  assetDir: string,
  extraRender?: (
    pages: any[],
    pdfDoc: PDFDocument,
    font: any,
    data: Record<string, any>
  ) => Promise<void>
): Promise<Uint8Array> {
  const LIFT         = config.lift        ?? 4.5;
  const DEFAULT_SIZE = config.defaultSize ?? 9;
  const PW = 612, PH = 792;

  const pdfDoc = await PDFDocument.create();
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Load and embed background images
  const bgImages = await Promise.all(
    config.backgroundAssets.map(async (asset) => {
      const bytes = fs.readFileSync(path.join(assetDir, asset));
      return pdfDoc.embedPng(bytes);
    })
  );

  // Add pages and stamp backgrounds
  const pages = bgImages.map((bg) => {
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    return page;
  });

  // Process every field definition
  for (const field of config.fields) {
    const page = pages[field.page - 1];
    if (!page) continue;

    // Skip if condition not met
    if (field.condition && !evalCondition(field.condition, data)) continue;

    const liftedY = field.y + LIFT;
    const size    = field.size ?? DEFAULT_SIZE;

    switch (field.type) {
      case "text": {
        if (!field.source) break;
        const text = resolveSource(field.source, data, field.fallback);
        if (!text) break;
        page.drawText(text, { x: field.x, y: liftedY, size, font, color: BLACK });
        break;
      }

      case "xmark": {
        drawXmark(page, field.x, liftedY);
        break;
      }

      case "wrapText": {
        if (!field.source || !field.wrap) break;
        const text = resolveSource(field.source, data, field.fallback);
        if (!text) break;
        drawWrapped(page, font, text, field.x, liftedY, size, field.wrap);
        break;
      }

      case "xmarkFromMap": {
        if (!field.source || !field.map) break;
        const key    = data[field.source];
        if (!key) break;
        const coords = field.map[String(key)];
        if (!coords) break;
        const [mx, my] = coords;
        drawXmark(page, mx, my + LIFT);
        break;
      }
    }
  }

  // Optional extra rendering (e.g. signature image)
  if (extraRender) {
    await extraRender(pages, pdfDoc, font, data);
  }

  return pdfDoc.save();
}
