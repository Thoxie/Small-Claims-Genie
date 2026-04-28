import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from "pdf-lib";
import { getOwnedCase, getUserId } from "../lib/owned-case";
import { redeemDownloadToken } from "../lib/download-tokens";
import type { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { db } from "@workspace/db";
import { documentsTable, casesTable } from "@workspace/db";
import { inArray, and, eq } from "drizzle-orm";
import { CALIFORNIA_COUNTIES } from "./counties";
import { ObjectStorageService } from "../lib/objectStorage";
import { openai } from "@workspace/integrations-openai-ai-server";
import { type FormConfig } from "../forms/form-renderer";
import { buildSC100Pdf as buildSC100PlaywrightPdf, refreshFieldMap } from "../forms/sc100-playwright";
import { calibrateSC100, verifySC100 } from "../forms/sc100-calibrate";

// ─── Load form configs at startup (JSON files in assets/forms/) ────────────────
const ASSET_DIR  = path.join(__dirname, "..", "assets");
const FORMS_DIR  = path.join(ASSET_DIR, "forms");

function loadFormConfig(filename: string): FormConfig {
  return JSON.parse(fs.readFileSync(path.join(FORMS_DIR, filename), "utf8")) as FormConfig;
}

const SC100_CONFIG = loadFormConfig("sc100.json");

const objectStorage = new ObjectStorageService();

const router: IRouter = Router();

// ─── Auth helper ─────────────────────────────────────────────────────────────
async function resolveDownloadUser(
  req: Request,
  res: Response,
  caseId: number
): Promise<string | null> {
  const queryToken = req.query.token as string | undefined;
  const bodyToken = (req as any).body?.token as string | undefined;
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

// ─── Constants ────────────────────────────────────────────────────────────────
const PW = 612;
const PH = 792;
const BLACK = rgb(0, 0, 0);

// ─── Overlay helpers ──────────────────────────────────────────────────────────
function val(page: any, font: any, text: string | null | undefined, x: number, y: number, size = 9) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color: BLACK });
}

function wrapVal(page: any, font: any, text: string | null | undefined, x: number, startY: number, maxW: number, size: number, lineH: number, maxLines: number): number {
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


function xmark(page: any, cx: number, cy: number, size = 5) {
  const h = size / 2;
  page.drawLine({ start: { x: cx - h, y: cy - h }, end: { x: cx + h, y: cy + h }, thickness: 1, color: BLACK });
  page.drawLine({ start: { x: cx + h, y: cy - h }, end: { x: cx - h, y: cy + h }, thickness: 1, color: BLACK });
}

function loadAsset(filename: string): Buffer {
  return fs.readFileSync(path.join(__dirname, "..", "assets", filename));
}

function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

// ─── Date / time formatters ───────────────────────────────────────────────────
function formatDateDisplay(d: string | null | undefined): string {
  if (!d) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return d;
}

function formatTimeDisplay(t: string | null | undefined): string {
  if (!t) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return t;
  const h = parseInt(m[1], 10);
  const min = m[2];
  const period = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${period}`;
}

// ─── SC-100 deterministic enrichment ─────────────────────────────────────────
// Pre-computes ALL derived fields that the sc100.json config references by name.
// Anything computed here is available as a plain field in the config's "source".
function enrichForSC100(c: Record<string, any>): Record<string, any> {
  const e = { ...c };

  // 1. Format hearing date/time
  if (e.hearingDate) e.hearingDate = formatDateDisplay(e.hearingDate);
  if (e.hearingTime) e.hearingTime = formatTimeDisplay(e.hearingTime);

  // 2. Parse incidentDate (may be "MM/dd/yyyy" or "MM/dd/yyyy – MM/dd/yyyy")
  if (e.incidentDate) {
    const parts = e.incidentDate.split(/[–\-]/).map((s: string) => s.trim()).filter(Boolean);
    e.incidentDate = parts[0] || e.incidentDate;
    if (parts.length >= 2 && parts[1] !== parts[0]) {
      // Actual date range — fill both start and through
      e.dateStarted   = parts[0];
      e.dateThrough   = parts[1];
      e.hasDateRange  = true;
    } else {
      // Single date — only incidentDate is used; date-range row stays blank
      e.dateStarted  = undefined;
      e.dateThrough  = undefined;
      e.hasDateRange = undefined;
    }
  }

  // 3. Map venueZip from defendant or courthouse
  if (!e.venueZip) e.venueZip = e.defendantZip || e.courthouseZip || "";

  // 4. Auto-compute claimOver2500
  if (e.claimAmount != null) e.claimOver2500 = Number(e.claimAmount) > 2500;

  // 5. Default venueBasis if not set
  if (!e.venueBasis) e.venueBasis = "where_defendant_lives";

  // 6. Boolean defaults
  if (e.priorDemandMade    == null) e.priorDemandMade    = false;
  if (e.filedMoreThan12Claims == null) e.filedMoreThan12Claims = false;
  if (e.isAttyFeeDispute   == null) e.isAttyFeeDispute   = false;
  if (e.isSuingPublicEntity == null) e.isSuingPublicEntity = false;
  if (e.hadArbitration      == null) e.hadArbitration      = false;

  // 7. Default defendant agent address from defendant business address
  if (e.defendantIsBusinessOrEntity) {
    if (!e.defendantAgentStreet) e.defendantAgentStreet = e.defendantAddress || "";
    if (!e.defendantAgentCity)   e.defendantAgentCity   = e.defendantCity    || "";
    if (!e.defendantAgentState)  e.defendantAgentState  = e.defendantState   || "CA";
    if (!e.defendantAgentZip)    e.defendantAgentZip    = e.defendantZip     || "";
  }

  // 8. declarationDate = today
  if (!e.declarationDate) e.declarationDate = today();

  // ── Derived display fields (referenced by name in sc100.json) ────────────

  // "Superior Court of California, County of ___"
  if (e.countyId) {
    e.countyDisplay = String(e.countyId)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  // "Plaintiff v. Defendant" case name
  if (e.plaintiffName && e.defendantName) {
    e.caseNameDisplay = `${e.plaintiffName} v. ${e.defendantName}`;
  }

  // "City CA ZIP" for courthouse location line
  if (e.courthouseCity || e.courthouseZip) {
    e.courthouseLocation = [e.courthouseCity, "CA", e.courthouseZip]
      .filter(Boolean).join(" ");
  }

  // Second plaintiff name + optional title (use second plaintiff's own title if provided)
  if (e.secondPlaintiffName) {
    const p2Title = e.secondPlaintiffTitle || "";
    e.p2NameTitle = p2Title
      ? `${e.secondPlaintiffName}, ${p2Title}`
      : e.secondPlaintiffName;
  }

  // Claim amount formatted as currency
  if (e.claimAmount != null) {
    e.claimAmountFormatted = Number(e.claimAmount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Description for §3a — truncate to ~5 lines (≈80 chars/line at 9pt, maxW=480)
  const MAX_DESC_CHARS = 360; // ~4.5 lines at 80 chars/line — leaves room for note
  const desc = e.claimDescription || "";
  if (desc) {
    if (desc.length > MAX_DESC_CHARS) {
      e.claimDescriptionForForm = desc.slice(0, MAX_DESC_CHARS).trimEnd() + "… (see MC-030)";
      e.needsMC031 = true;
    } else {
      e.claimDescriptionForForm = desc;
    }
  } else {
    const signer = e.secondPlaintiffName || e.plaintiffName || "";
    e.claimDescriptionForForm = `See attached MC-030 Declaration of ${signer}.`;
  }

  // howAmountCalculated: if longer than ~3 lines (≈80 chars/line), flag overflow
  const MAX_HOW_CHARS = 210; // 3 lines × 70 chars
  const howText = e.howAmountCalculated || "";
  if (howText.length > MAX_HOW_CHARS) {
    e.needsMC031 = true;
  }

  // Venue basis → single letter for xmarkFromMap
  const VENUE_LETTER: Record<string, string> = {
    where_defendant_lives:      "a",
    where_damage_happened:      "a",
    where_plaintiff_injured:    "a",
    where_contract_made_broken: "a",
    buyer_household_goods:      "b",
    retail_installment:         "c",
    vehicle_finance:            "d",
    other:                      "e",
  };
  e.venueBasisLetter = VENUE_LETTER[e.venueBasis ?? ""] ?? "";

  // Flag: venue option "e" (Other) for conditional text field
  e.isVenueOther = e.venueBasisLetter === "e" ? true : undefined;

  // Flag: defendant has a named agent for service
  e.hasAgent = (e.defendantIsBusinessOrEntity && e.defendantAgentName)
    ? e.defendantAgentName   // truthy string — condition checks { exists: "hasAgent" }
    : undefined;

  // Flag: both atty fee dispute and arbitration occurred
  e.attyFeeAndArbitration = (e.isAttyFeeDispute === true && e.hadArbitration === true) || false;

  // Flag: public entity AND a claim date was filed
  e.publicEntityHasDate = (e.isSuingPublicEntity === true && !!e.publicEntityClaimFiledDate) || false;

  // Declaration print name: individual if business filing, otherwise primary plaintiff
  const declarantBase = (e.plaintiffIsBusiness && e.secondPlaintiffName)
    ? e.secondPlaintiffName
    : e.plaintiffName;
  e.declarantName      = declarantBase;
  e.declarantNameTitle = declarantBase + (e.plaintiffTitle ? `, ${e.plaintiffTitle}` : "");

  return e;
}

// ─── SC-100 AI enrichment ─────────────────────────────────────────────────────
// ── AI: generate a 2-3 sentence Section 3 summary + MC-030 reference ────────
async function generateSC100ClaimSummary(c: Record<string, any>): Promise<string> {
  const plaintiffName = String(c.plaintiffName || "Plaintiff");
  const defendantName = String(c.defendantName || "Defendant");
  const claimDesc     = String(c.claimDescription || "");
  const incidentDate  = c.incidentDate ? formatDateDisplay(c.incidentDate) : "";
  const claimAmount   = c.claimAmount
    ? `$${Number(c.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "an amount to be determined";

  // Use the saved MC-030 title if available; otherwise use a reliable default formula
  const mc030Title: string = c.mc030DeclarationTitle
    || `Declaration of ${plaintiffName} in Support of Claim`;

  try {
    const prompt = [
      `Write a 2-3 sentence summary for Section 3 of a California SC-100 small claims form.`,
      ``,
      `Case facts:`,
      `- Plaintiff: ${plaintiffName}`,
      `- Defendant: ${defendantName}`,
      `- Claim amount: ${claimAmount}`,
      incidentDate ? `- Date of incident: ${incidentDate}` : "",
      claimDesc    ? `- Description: ${claimDesc}`         : "",
      ``,
      `Rules:`,
      `- Plain text only, no markdown, no quotes`,
      `- Maximum 300 characters total for the summary sentences`,
      `- Cover who, what happened, and the dollar amount`,
      `- Do NOT include any signature, name, date, or closing`,
      `- Stop after 2-3 sentences — do NOT add the MC-030 reference; that is appended separately`,
      ``,
      `Return ONLY the plain summary text.`,
    ].filter(Boolean).join("\n");

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.3,
    });

    let summary = (resp.choices[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "");

    // Cap at 300 chars, breaking cleanly on sentence boundary
    if (summary.length > 300) {
      summary = summary.slice(0, 300).trimEnd();
      const lastPeriod = summary.lastIndexOf(".");
      if (lastPeriod > 80) summary = summary.slice(0, lastPeriod + 1);
    }

    return `${summary} (see MC-030 Declaration: ${mc030Title})`;
  } catch {
    // Graceful fallback — use existing description with reference appended
    const fallback = claimDesc.length > 300 ? claimDesc.slice(0, 300).trimEnd() + "…" : claimDesc;
    return fallback
      ? `${fallback} (see MC-030 Declaration: ${mc030Title})`
      : `See attached MC-030 Declaration: ${mc030Title}.`;
  }
}

async function aiEnrichForSC100(c: Record<string, any>): Promise<Record<string, any>> {
  const needsFill = !c.howAmountCalculated || !c.venueBasis || c.isAttyFeeDispute == null || c.isSuingPublicEntity == null;

  // Run both tasks in parallel: field-filling (if needed) + AI Section 3 description
  const [filledFields, claimDescriptionForForm] = await Promise.all([
    needsFill ? (async () => {
      try {
        const prompt = `You are a California small claims court expert helping fill out an SC-100 form.

Case data:
${JSON.stringify({
  claimType: c.claimType,
  claimAmount: c.claimAmount,
  claimDescription: c.claimDescription,
  howAmountCalculated: c.howAmountCalculated,
  defendantName: c.defendantName,
  incidentDate: c.incidentDate,
  venueBasis: c.venueBasis,
  priorDemandMade: c.priorDemandMade,
  isAttyFeeDispute: c.isAttyFeeDispute,
  isSuingPublicEntity: c.isSuingPublicEntity,
}, null, 2)}

Return ONLY a JSON object (no markdown) filling in ONLY the fields that are null/undefined/empty:
- venueBasis: one of "where_defendant_lives" | "where_damage_happened" | "where_plaintiff_injured" | "where_contract_made_broken" | "buyer_household_goods" | "retail_installment" | "vehicle_finance" | "other"
- howAmountCalculated: concise explanation of how $${c.claimAmount} was calculated (1-2 sentences)
- isAttyFeeDispute: boolean — true ONLY if claim is an attorney fee dispute
- isSuingPublicEntity: boolean — true ONLY if defendant is a government agency/city/county/district
- priorDemandMade: boolean — true if claimDescription implies plaintiff asked for payment before filing

Only include a field if it is currently null/empty. Skip fields that already have values.`;

        const resp = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0,
          response_format: { type: "json_object" },
        });
        return JSON.parse(resp.choices[0]?.message?.content || "{}") as Record<string, any>;
      } catch (err) {
        console.error("SC-100 AI field enrichment error:", err);
        return {} as Record<string, any>;
      }
    })() : Promise.resolve({} as Record<string, any>),

    generateSC100ClaimSummary(c),
  ]);

  return { ...c, ...filledFields, claimDescriptionForForm };
}

// ─── SC-100 shared builder (config-driven) ───────────────────────────────────
//
// All field coordinates, conditions, and rendering rules live in:
//   assets/forms/sc100.json
//
// To adjust a coordinate: edit sc100.json and restart — no TypeScript changes.
// To add a new form: create <formId>.json + a matching enrich function.
//
async function buildSC100Pdf(
  caseData: Record<string, any>,
  signaturePngBytes?: Buffer
): Promise<Buffer> {
  return buildSC100PlaywrightPdf(caseData, ASSET_DIR, signaturePngBytes);
}

// ─── SC-100 routes ────────────────────────────────────────────────────────────
router.get("/cases/:id/forms/sc100", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  try {
    const enriched = await aiEnrichForSC100(enrichForSC100(c as unknown as Record<string, any>));
    const pdfBytes = await buildSC100Pdf(enriched);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="SC100-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-100 PDF." });
  }
});

// ─── SC-100 signed (draw-to-sign) ─────────────────────────────────────────────
router.post("/cases/:id/forms/sc100/signed", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const { signatureDataUrl } = req.body as { signatureDataUrl?: string };
  let sigBytes: Buffer | undefined;
  if (signatureDataUrl) {
    const base64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    sigBytes = Buffer.from(base64, "base64");
  }
  try {
    const enriched = await aiEnrichForSC100(enrichForSC100(c as unknown as Record<string, any>));
    const pdfBytes = await buildSC100Pdf(enriched, sigBytes);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="SC100-Signed-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100 signed PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate signed SC-100 PDF." });
  }
});

// ─── SC-100 HTML coordinate viewer (no auth — dev calibration tool) ──────────
// GET /api/forms/sc100/coordinate-viewer
// Renders an HTML page showing all 4 SC-100 pages with form PNG as background
// and every field overlaid at its exact coordinate. Instant visual calibration.
router.get("/forms/sc100/coordinate-viewer", (_req, res): void => {
  const LIFT = SC100_CONFIG.lift ?? 4.5;
  const PH = 792;

  const SAMPLE: Record<string, any> = {
    // Primary plaintiff (individual)
    plaintiffName: "Jane A. Doe", plaintiffPhone: "(619) 555-0101",
    plaintiffAddress: "123 Main Street", plaintiffCity: "San Diego",
    plaintiffState: "CA", plaintiffZip: "92101", plaintiffEmail: "jane.doe@email.com",
    plaintiffMailingAddress: "P.O. Box 4400", plaintiffMailingCity: "San Diego",
    plaintiffMailingState: "CA", plaintiffMailingZip: "92112",
    // Second plaintiff (co-plaintiff — same household)
    secondPlaintiffName: "John B. Doe", secondPlaintiffPhone: "(619) 555-0202",
    secondPlaintiffAddress: "123 Main Street", secondPlaintiffCity: "San Diego",
    secondPlaintiffState: "CA", secondPlaintiffZip: "92101",
    secondPlaintiffEmail: "john.doe@email.com",
    // Defendant (business)
    defendantName: "ACME Auto Repair LLC", defendantPhone: "(619) 555-0303",
    defendantAddress: "456 Commerce Blvd", defendantCity: "Chula Vista",
    defendantState: "CA", defendantZip: "91911",
    defendantIsBusinessOrEntity: true, defendantAgentName: "Robert Smith",
    defendantAgentTitle: "Registered Agent", defendantAgentStreet: "789 Agent Row",
    defendantAgentCity: "Chula Vista", defendantAgentState: "CA", defendantAgentZip: "91911",
    claimAmount: 3750, claimDescription: "Defendant performed negligent brake repair on plaintiff's 2019 Honda Civic.",
    howAmountCalculated: "Tow: $225. Rental: $325. Re-repair: $3,200. Total: $3,750.",
    incidentDate: "01/15/2026", countyId: "san-diego",
    courthouseName: "South County Division – Chula Vista",
    courthouseAddress: "500 3rd Ave", courthouseCity: "Chula Vista", courthouseZip: "91910",
    caseNumber: "24SC012345", venueBasis: "where_defendant_lives",
    priorDemandMade: true, isAttyFeeDispute: false, isSuingPublicEntity: false,
    filedMoreThan12Claims: false, declarationDate: "04/13/2026",
  };
  const data = enrichForSC100(SAMPLE);

  // Build one <div> block per page
  const pageBlocks = [1, 2, 3, 4].map(pageNum => {
    const bgAsset = SC100_CONFIG.backgroundAssets[pageNum - 1];
    const fields = SC100_CONFIG.fields.filter(f => f.page === pageNum);

    const overlays = fields.map(f => {
      const liftedY = (f.y ?? 0) + LIFT;
      // PDF y=0 is bottom; CSS top=0 is top → invert
      const cssTop  = PH - liftedY;
      const cssLeft = f.x ?? 0;
      const size    = f.size ?? SC100_CONFIG.defaultSize ?? 9;

      let displayVal = "";
      let color = "#0033cc";

      if (f.type === "text" || f.type === "wrapText") {
        const src = f.source ?? "";
        displayVal = src.includes("{{")
          ? src.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(data[k] ?? ""))
          : String(data[src] ?? f.fallback ?? `[${src}]`);
        color = "#0033cc";
      } else if (f.type === "xmark") {
        displayVal = "✕";
        color = "#cc0000";
      } else if (f.type === "xmarkFromMap") {
        // Find the first map entry for display
        if (f.map) {
          const key = data[f.source ?? ""] ?? Object.keys(f.map)[0];
          const coords = f.map[String(key)];
          if (coords) {
            const [mx, my] = coords;
            const mCssTop  = PH - (my + LIFT);
            const mCssLeft = mx;
            return `<div style="position:absolute;left:${mCssLeft}px;top:${mCssTop}px;color:#cc0000;font-size:10px;font-weight:bold;z-index:10;" title="${f.id}">✕</div>
              <div style="position:absolute;left:${mCssLeft}px;top:${mCssTop - 8}px;color:#555;font-size:5px;z-index:10;">${f.id}</div>`;
          }
        }
        return "";
      }

      const truncated = displayVal.length > 35 ? displayVal.slice(0, 35) + "…" : displayVal;
      return `
        <div style="position:absolute;left:${cssLeft}px;top:${cssTop}px;color:${color};font-size:${size}px;font-family:Helvetica,Arial,sans-serif;white-space:nowrap;z-index:10;line-height:1;" title="${f.id}: ${displayVal}">${truncated}</div>
        <div style="position:absolute;left:${cssLeft}px;top:${cssTop - 7}px;color:#888;font-size:5px;z-index:10;white-space:nowrap;">${f.id}</div>
        <div style="position:absolute;left:${cssLeft - 3}px;top:${cssTop + size/2 - 1}px;width:6px;height:1px;background:#f00;z-index:11;"></div>
        <div style="position:absolute;left:${cssLeft - 0.5}px;top:${cssTop + size/2 - 3}px;width:1px;height:7px;background:#f00;z-index:11;"></div>`;
    }).join("");

    return `
      <div style="margin-bottom:40px;">
        <h2 style="font-size:14px;font-family:sans-serif;margin:0 0 4px;">Page ${pageNum}</h2>
        <div style="position:relative;width:612px;height:792px;border:1px solid #999;overflow:hidden;background:#fff;">
          <img src="/form-assets/${bgAsset}" style="position:absolute;top:0;left:0;width:612px;height:792px;" />
          ${overlays}
        </div>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>SC-100 Coordinate Viewer</title>
<style>
  body{margin:24px;background:#e8e8e8;font-family:sans-serif;}
  h1{font-size:18px;margin-bottom:4px;}
  p{font-size:12px;color:#555;margin-bottom:20px;}
</style>
</head><body>
<h1>SC-100 Live Coordinate Viewer</h1>
<p>Blue = text fields &nbsp;|&nbsp; Red ✕ = checkboxes &nbsp;|&nbsp; Red crosshair = exact anchor point &nbsp;|&nbsp; Grey micro-label = field ID<br>
Hover any element to see its field ID and value. Edit <code>assets/forms/sc100.json</code> and refresh to see changes instantly.</p>
${pageBlocks}
</body></html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ─── SC-100 custom-data debug preview (no auth — dev calibration only) ────────
router.post("/forms/sc100/debug-preview-custom", async (req, res): Promise<void> => {
  try {
    const caseData = req.body as Record<string, any>;
    const enriched = enrichForSC100(caseData);
    const pdfBytes = await buildSC100PlaywrightPdf(enriched, ASSET_DIR);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `inline; filename="SC100-custom.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("Custom debug preview error:", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

// ─── SC-100 debug preview (no auth — dev calibration tool) ───────────────────
// GET /forms/sc100/debug-preview?mode=debug|sample
// Generates a 4-page SC-100 with realistic sample data.
// mode=debug  → red crosshairs + blue labels at every field anchor
// mode=sample → clean PDF with sample data, no overlays
router.get("/forms/sc100/debug-preview", async (req, res): Promise<void> => {
  const debugMode = req.query.mode !== "sample";
  const SAMPLE: Record<string, any> = {
    // Plaintiff
    plaintiffName:          "Jane A. Doe",
    plaintiffPhone:         "(619) 555-0101",
    plaintiffAddress:       "123 Main Street",
    plaintiffCity:          "San Diego",
    plaintiffState:         "CA",
    plaintiffZip:           "92101",
    plaintiffEmail:         "jane.doe@email.com",
    plaintiffMailingAddress:"P.O. Box 4400",
    plaintiffMailingCity:   "San Diego",
    plaintiffMailingState:  "CA",
    plaintiffMailingZip:    "92112",
    // Second plaintiff / business rep
    secondPlaintiffName:    "John B. Doe",
    secondPlaintiffPhone:   "(619) 555-0202",
    secondPlaintiffAddress: "123 Main Street",
    secondPlaintiffCity:    "San Diego",
    secondPlaintiffState:   "CA",
    secondPlaintiffZip:     "92101",
    secondPlaintiffEmail:   "john.doe@email.com",
    secondPlaintiffMailingAddress: "P.O. Box 4400",
    secondPlaintiffMailingCity:    "San Diego",
    secondPlaintiffMailingState:   "CA",
    secondPlaintiffMailingZip:     "92112",
    plaintiffIsBusiness:    false,
    // Defendant
    defendantName:          "ACME Auto Repair LLC",
    defendantPhone:         "(619) 555-0303",
    defendantAddress:       "456 Commerce Blvd",
    defendantCity:          "Chula Vista",
    defendantState:         "CA",
    defendantZip:           "91911",
    defendantMailingAddress:"P.O. Box 9900",
    defendantMailingCity:   "Chula Vista",
    defendantMailingState:  "CA",
    defendantMailingZip:    "91912",
    defendantIsBusinessOrEntity: true,
    defendantAgentName:     "Robert Smith",
    defendantAgentTitle:    "Registered Agent",
    defendantAgentStreet:   "789 Agent Row",
    defendantAgentCity:     "Chula Vista",
    defendantAgentState:    "CA",
    defendantAgentZip:      "91911",
    // Claim
    claimAmount:            3750.00,
    claimDescription:       "Defendant performed negligent brake repair on plaintiff's 2019 Honda Civic on 01/15/2026. Brakes failed two weeks later causing $3,750 in damages including tow, rental car, and re-repair costs.",
    howAmountCalculated:    "Tow truck: $225. Rental car 5 days × $65/day: $325. Re-repair at certified shop: $3,200. Total: $3,750.",
    incidentDate:           "01/15/2026",
    // Court
    countyId:               "san-diego",
    courthouseName:         "South County Division – Chula Vista",
    courthouseAddress:      "500 3rd Ave",
    courthouseCity:         "Chula Vista",
    courthouseZip:          "91910",
    caseNumber:             "24SC012345",
    hearingDate:            "2026-06-15",
    hearingTime:            "09:00",
    hearingCourtroom:       "D23",
    // Venue / other flags
    venueBasis:             "where_defendant_lives",
    priorDemandMade:        true,
    priorDemandWhyNot:      "",
    isAttyFeeDispute:       false,
    hadArbitration:         false,
    isSuingPublicEntity:    false,
    filedMoreThan12Claims:  false,
    declarationDate:        "04/13/2026",
  };
  try {
    const enriched = enrichForSC100(SAMPLE);
    const pdfBytes = await buildSC100PlaywrightPdf(enriched, ASSET_DIR);
    const label = debugMode ? "DEBUG" : "SAMPLE";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `inline; filename="SC100-${label}-Preview.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100 preview error:", err?.message, err?.stack);
    res.status(500).json({ error: err?.message ?? "Preview failed" });
  }
});

// ─── SC-100 AI calibration (dev only — no auth) ──────────────────────────────
// POST /api/forms/sc100/calibrate
// Sends each form page PNG to GPT-4o vision, gets exact field coordinates,
// saves sc100-field-map.json, and hot-reloads the field map in memory.
// Run once after any form background image change. ~30 seconds to complete.
router.post("/forms/sc100/calibrate", async (_req, res): Promise<void> => {
  try {
    console.log("[calibrate] Starting SC-100 field map calibration...");
    const fieldMap = await calibrateSC100(ASSET_DIR);
    refreshFieldMap(ASSET_DIR);
    console.log("[calibrate] Calibration complete. Field map hot-reloaded.");
    res.json({
      ok: true,
      message: "Calibration complete. Field map saved and hot-reloaded.",
      summary: Object.fromEntries(
        Object.entries(fieldMap.pages).map(([page, fields]) => [
          `page${page}`,
          Object.keys(fields).length + " fields",
        ])
      ),
      fieldMap,
    });
  } catch (err: any) {
    console.error("[calibrate] Calibration error:", err?.message, err?.stack);
    res.status(500).json({ error: err?.message ?? "Calibration failed" });
  }
});

// ─── SC-100 verification pass (dev only — no auth) ────────────────────────────
// POST /api/forms/sc100/verify
// ─── SC-100 horizontal-only GPT-4o analysis (dev only) ───────────────────────
// Generates a filled PDF with realistic data (including long city names),
// converts to PNG, compares against blank form, reports horizontal issues only.
router.post("/forms/sc100/horiz-check", async (_req, res): Promise<void> => {
  const { execSync } = await import("child_process");
  const os = await import("os");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc100-horiz-"));
  try {
    const HORIZ_SAMPLE: Record<string, any> = {
      plaintiffName: "Paul Andrew", plaintiffPhone: "(650) 646-1925",
      plaintiffAddress: "3020 Bridgeway", plaintiffCity: "Sausalito",
      plaintiffState: "CA", plaintiffZip: "94965",
      plaintiffEmail: "Paul@innitstreetwear.com",
      defendantName: "ACME AUTO REPAIR INC", defendantPhone: "(555) 555-5555",
      defendantAddress: "18 Butler Avenue", defendantCity: "ORANGE COUNTY",
      defendantState: "CA", defendantZip: "94022",
      defendantIsBusinessOrEntity: true,
      defendantAgentName: "JOHN DOE", defendantAgentTitle: "OWNER",
      defendantAgentStreet: "18 Butler Avenue", defendantAgentCity: "ORANGE COUNTY",
      defendantAgentState: "CA", defendantAgentZip: "94022",
      claimAmount: 5000,
      claimDescription: "On April 1, 2026, defendant performed negligent engine work.",
      howAmountCalculated: "$1,542.42 from contract and cancelled check.",
      incidentDate: "04/01/2026",
      countyId: "merced", countyDisplay: "Merced",
      courthouseName: "Merced County Superior Court",
      courthouseAddress: "627 W 21st St",
      courthouseCity: "Merced", courthouseZip: "95340",
      caseNumber: "26SC001234",
      venueBasis: "where_defendant_lives",
      priorDemandMade: true, isAttyFeeDispute: false, isSuingPublicEntity: false,
      filedMoreThan12Claims: false, claimOver2500: true,
      declarationDate: "04/23/2026",
    };
    const enriched = enrichForSC100(HORIZ_SAMPLE);
    const pdfBytes = await buildSC100PlaywrightPdf(enriched, ASSET_DIR);
    const pdfPath = path.join(tmpDir, "filled.pdf");
    fs.writeFileSync(pdfPath, pdfBytes);

    execSync(`pdftoppm -r 200 -png "${pdfPath}" "${path.join(tmpDir, "page")}"`, { timeout: 30000 });

    const filledPngs = [1, 2, 3, 4].map((n) => {
      const p = path.join(tmpDir, `page-${n}.png`);
      return fs.existsSync(p) ? p : path.join(tmpDir, `page-0${n}.png`);
    });
    // Also save to /tmp for evaluate endpoint
    filledPngs.forEach((p, i) => {
      if (fs.existsSync(p)) fs.copyFileSync(p, `/tmp/horiz-page-${i + 1}.png`);
    });

    const blankPngs = [1, 2, 3, 4].map((n) => path.join(ASSET_DIR, `sc100_hq-${n}.png`));

    const buildImg = (p: string) => ({
      type: "image_url" as const,
      image_url: { url: `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`, detail: "high" as const },
    });

    const PROMPT = `You are a California court form expert performing HORIZONTAL alignment QA on this SC-100 small claims form.

I'm providing 8 images in order: blank-page-1, filled-page-1, blank-page-2, filled-page-2, blank-page-3, filled-page-3, blank-page-4, filled-page-4.

The plaintiff is "Paul Andrew", defendant is "ACME AUTO REPAIR INC", city is "Orange County" (a longer city name than typical).

Focus ONLY on horizontal (left-right, x-axis) alignment. Ignore vertical position — assume y-coords are acceptable.

For EACH filled page, list every text field and checkbox. For each:
1. Field name / section (e.g., "Plaintiff name", "Defendant city", "Venue checkbox A")
2. Is the LEFT EDGE of the typed text correctly aligned with where text should START on that blank line? (CORRECT | TOO FAR LEFT | TOO FAR RIGHT)
3. Does the typed text overflow (extend past the right edge of its designated box/column)? (NO OVERFLOW | OVERFLOWS INTO adjacent field | OVERFLOWS OFF PAGE)
4. For checkboxes: is the X mark centered within the checkbox square? (CENTERED | SHIFTED LEFT | SHIFTED RIGHT)

Pay special attention to:
- City / State / Zip columns (do they start in the right spot, does long city text overflow into state?)
- Phone number columns (right-side alignment)
- Header bar (plaintiff name / case number row at top of page 2+)
- Address rows (does street start after the label ends?)

End with:
HORIZONTAL ISSUES FOUND: list only the fields that need x-coordinate adjustment, with direction (move left N pt / move right N pt).
If no issues, say "ALL HORIZONTAL POSITIONS CORRECT".`;

    const images = [];
    for (let i = 0; i < 4; i++) {
      images.push(buildImg(blankPngs[i]));
      images.push(buildImg(filledPngs[i]));
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 4096,
      temperature: 0,
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, ...images] }],
    });

    res.json({ ok: true, analysis: response.choices[0].message.content });
  } catch (err: any) {
    console.error("[horiz-check]", err?.message, err?.stack);
    res.status(500).json({ error: err?.message });
  } finally {
    try { execSync(`rm -rf "${tmpDir}"`); } catch {}
  }
});

// Generates a sample filled PDF, converts to PNG, sends both blank + filled
// images to GPT-4o, gets per-field correction offsets, updates field map.
router.post("/forms/sc100/verify", async (_req, res): Promise<void> => {
  const { execSync } = await import("child_process");
  const os = await import("os");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc100-verify-"));

  try {
    // 1. Generate sample PDF with current calibrated coordinates
    console.log("[verify] Generating sample PDF...");
    const VERIFY_SAMPLE: Record<string, any> = {
      plaintiffName: "Jane A. Doe", plaintiffPhone: "(619) 555-0101",
      plaintiffAddress: "123 Main Street", plaintiffCity: "San Diego",
      plaintiffState: "CA", plaintiffZip: "92101", plaintiffEmail: "jane.doe@email.com",
      plaintiffMailingAddress: "P.O. Box 4400", plaintiffMailingCity: "San Diego",
      plaintiffMailingState: "CA", plaintiffMailingZip: "92112",
      secondPlaintiffName: "John B. Doe", secondPlaintiffPhone: "(619) 555-0202",
      secondPlaintiffAddress: "123 Main Street", secondPlaintiffCity: "San Diego",
      secondPlaintiffState: "CA", secondPlaintiffZip: "92101",
      secondPlaintiffEmail: "john.doe@email.com",
      defendantName: "ACME Auto Repair LLC", defendantPhone: "(619) 555-0303",
      defendantAddress: "456 Commerce Blvd", defendantCity: "Chula Vista",
      defendantState: "CA", defendantZip: "91911",
      defendantIsBusinessOrEntity: true, defendantAgentName: "Robert Smith",
      defendantAgentTitle: "Registered Agent", defendantAgentStreet: "789 Agent Row",
      defendantAgentCity: "Chula Vista", defendantAgentState: "CA", defendantAgentZip: "91911",
      claimAmount: 3750, claimDescription: "Defendant performed negligent brake repair.",
      howAmountCalculated: "Tow: $225. Rental: $325. Re-repair: $3,200. Total: $3,750.",
      incidentDate: "01/15/2026", countyId: "san-diego",
      courthouseName: "South County Division – Chula Vista",
      courthouseAddress: "500 3rd Ave", courthouseCity: "Chula Vista", courthouseZip: "91910",
      caseNumber: "24SC012345", venueBasis: "where_defendant_lives",
      priorDemandMade: true, isAttyFeeDispute: false, isSuingPublicEntity: false,
      filedMoreThan12Claims: false, declarationDate: "04/13/2026",
    };
    const enriched = enrichForSC100(VERIFY_SAMPLE);
    const pdfBytes = await buildSC100PlaywrightPdf(enriched, ASSET_DIR);
    const pdfPath = path.join(tmpDir, "filled.pdf");
    fs.writeFileSync(pdfPath, pdfBytes);

    // 2. Convert filled PDF → PNG pages at 200 dpi
    console.log("[verify] Converting PDF to PNGs...");
    execSync(`pdftoppm -r 200 -png "${pdfPath}" "${path.join(tmpDir, "page")}"`, { timeout: 30000 });

    const filledPngPaths = [1, 2, 3, 4].map((n) => {
      const p = path.join(tmpDir, `page-${n}.png`);
      return fs.existsSync(p) ? p : path.join(tmpDir, `page-0${n}.png`);
    });

    // 3. Run verification pass
    console.log("[verify] Running GPT-4o verification pass...");
    const updatedMap = await verifySC100(ASSET_DIR, filledPngPaths);
    refreshFieldMap(ASSET_DIR);
    console.log("[verify] Verification complete. Field map updated and hot-reloaded.");

    res.json({
      ok: true,
      message: "Verification complete. Corrected field map saved and hot-reloaded.",
      summary: Object.fromEntries(
        Object.entries(updatedMap.pages).map(([page, fields]) => [
          `page${page}`,
          Object.keys(fields).length + " fields",
        ])
      ),
    });
  } catch (err: any) {
    console.error("[verify] Error:", err?.message, err?.stack);
    res.status(500).json({ error: err?.message ?? "Verification failed" });
  } finally {
    try { execSync(`rm -rf "${tmpDir}"`); } catch {}
  }
});

// ─── SC-100 GPT-4o independent evaluation (dev only) ──────────────────────────
router.post("/forms/sc100/evaluate", async (_req, res): Promise<void> => {
  try {
    const pages = [1, 2, 3, 4].map((n) => {
      const candidates = [`/tmp/v7-page-${n}.png`, `/tmp/verified-page-${n}.png`];
      for (const p of candidates) if (fs.existsSync(p)) return { page: n, path: p };
      throw new Error(`No PNG found for page ${n}`);
    });

    const SAMPLE = `INTAKE DATA THAT SHOULD APPEAR IN THIS FORM:
Page 1 Court box: County=San Diego, Courthouse=South County Division – Chula Vista, Address=500 3rd Ave, City/State/Zip=Chula Vista CA 91910; Case Name=Jane A. Doe v. ACME Auto Repair LLC
Page 2 §1 Plaintiff 1: Jane A. Doe | (619) 555-0101 | 123 Main Street, San Diego CA 92101 | Mailing: PO Box 4400 San Diego CA 92112 | jane.doe@email.com
Page 2 §1 Plaintiff 2: John B. Doe | (619) 555-0202 | 123 Main Street, San Diego CA 92101 | Mailing: PO Box 4400 San Diego CA 92112 | john.doe@email.com
Page 2 §2 Defendant: ACME Auto Repair LLC | (619) 555-0303 | 456 Commerce Blvd, Chula Vista CA 91911 | Mailing: PO Box 9900, Chula Vista CA 91912
Page 2 §2 Agent: Robert Smith | Registered Agent | 789 Agent Row, Chula Vista CA 91911
Page 2 §3 Claim Amount: $3,750.00
Page 2 §3a Description: Defendant performed negligent brake repair on plaintiff's 2019 Honda Civic on 01/15/2026. Brakes failed causing $3,750 in damages.
Page 3 §3b Incident Date: 01/15/2026
Page 3 §3c Calculation: Tow truck: $225. Rental car 5 days x $65/day: $325. Re-repair at certified shop: $3,200. Total: $3,750.
Page 3 §4 Prior demand: YES checkbox should be marked
Page 3 §5 Venue: Option a (where defendant lives or does business) should be checked
Page 3 §6 Venue zip: 91911
Page 3 §7 Attorney fee dispute: NO checkbox should be marked
Page 3 §8 Suing public entity: NO checkbox should be marked
Page 4 §9 Filed 12+ claims: NO checkbox should be marked
Page 4 §10 Claim over $2,500: YES checkbox should be marked
Page 4 Declaration date: 04/13/2026 | Declarant printed name: Jane A. Doe`;

    const PROMPT = `You are a California superior court clerk and legal document QA expert. Evaluate this auto-filled SC-100 Small Claims form across all 4 pages.

${SAMPLE}

For EACH page (1 through 4), list every filled field visible and report:
- Field label / section number
- Value visible on the form
- CORRECT or WRONG or MISSING vs the intake data
- Position: GOOD (text on blank line/box) | SLIGHTLY OFF (minor overlap but readable) | MISALIGNED (hard to read overlap)

For every checkbox and X mark: state which option is marked, whether the mark is inside the checkbox square, and whether the correct option was selected per intake data.

End with:
PAGE GRADES: Page 1: A-F, Page 2: A-F, Page 3: A-F, Page 4: A-F
OVERALL GRADE: A-F
CRITICAL ISSUES: List anything a court clerk would flag, reject, or question.`;

    const imageContent = pages.map(({ path: p }) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`,
        detail: "high" as const,
      },
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 4096,
      temperature: 0,
      messages: [{
        role: "user",
        content: [{ type: "text", text: PROMPT }, ...imageContent],
      }],
    });

    res.json({ ok: true, evaluation: response.choices[0].message.content });
  } catch (err: any) {
    console.error("[evaluate]", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

// ─── SC-100 with field overrides (preview / download with edits) ───────────────
router.post("/cases/:id/forms/sc100/with-overrides", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const overrides = req.body as Record<string, any>;
  const { token: _t, signatureDataUrl, ...fields } = overrides;
  let sigBytes: Buffer | undefined;
  if (signatureDataUrl) {
    const base64 = (signatureDataUrl as string).replace(/^data:image\/\w+;base64,/, "");
    sigBytes = Buffer.from(base64, "base64");
  }
  const merged = { ...(c as unknown as Record<string, any>), ...fields };
  const isDownload = req.query.download === "1";
  try {
    const enriched = await aiEnrichForSC100(enrichForSC100(merged));
    const pdfBytes = await buildSC100Pdf(enriched, sigBytes);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", isDownload
      ? `attachment; filename="SC100-Case-${id}.pdf"`
      : `inline; filename="SC100-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100 override PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-100 PDF." });
  }
});

router.get("/cases/:id/forms/sc100/preview", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  res.json({
    plaintiffName: d.plaintiffName, plaintiffAddress: [d.plaintiffAddress, d.plaintiffCity, d.plaintiffState, d.plaintiffZip].filter(Boolean).join(", "),
    plaintiffPhone: d.plaintiffPhone, plaintiffEmail: d.plaintiffEmail,
    defendantName: d.defendantName, defendantAddress: [d.defendantAddress, d.defendantCity, d.defendantState, d.defendantZip].filter(Boolean).join(", "),
    defendantPhone: d.defendantPhone, defendantIsBusinessOrEntity: d.defendantIsBusinessOrEntity, defendantAgentName: d.defendantAgentName,
    claimAmount: d.claimAmount, claimType: d.claimType, claimDescription: d.claimDescription,
    incidentDate: d.incidentDate, howAmountCalculated: d.howAmountCalculated,
    priorDemandMade: d.priorDemandMade, priorDemandDescription: d.priorDemandDescription,
    venueBasis: d.venueBasis, venueReason: d.venueReason, countyId: d.countyId,
    isSuingPublicEntity: d.isSuingPublicEntity, publicEntityClaimFiledDate: d.publicEntityClaimFiledDate,
    isAttyFeeDispute: d.isAttyFeeDispute, filedMoreThan12Claims: d.filedMoreThan12Claims, claimOver2500: d.claimOver2500,
  });
});

// ─── MC-030 Declaration ───────────────────────────────────────────────────────
// Coordinates measured directly from court placeholder PDF using pdftotext -bbox.
// Formula: v_param_y = 792 - measuredY - 11.5  (converts top-left pts → pdf-lib baseline)
// LIFT = 4.5 is applied inside v() helper, so actual rendered y = v_param_y + LIFT.

// Strip wrapper lines (titles, headers, perjury closing, signature blocks) from a
// declaration body. The MC-030 form is pre-printed with a "DECLARATION" title at
// the top, an "I declare under penalty of perjury..." closing line near the
// bottom, and a signature line — so any of those typed in the body would be a
// duplicate. Only lines starting with "N." (a numbered paragraph) are kept;
// leading and trailing non-numbered lines are removed defensively.
export function stripMC030Wrappers(text: string): string {
  if (!text) return "";
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  while (lines.length > 0 && !/^\d+\./.test(lines[0])) {
    lines.shift();
  }
  while (lines.length > 0 && !/^\d+\./.test(lines[lines.length - 1])) {
    lines.pop();
  }
  return lines.join("\n");
}

async function generateMC030Declaration(d: Record<string, any>): Promise<{ declarationTitle: string; declarationText: string }> {
  const plaintiffName  = String(d.plaintiffName  || "Plaintiff");
  const defendantName  = String(d.defendantName  || "Defendant");
  const claimAmount    = d.claimAmount  ? `$${Number(d.claimAmount).toFixed(2)}` : "an amount to be determined";
  const claimDesc      = String(d.claimDescription || "");
  const incidentDate   = d.incidentDate ? formatDateDisplay(d.incidentDate) : "";

  const prompt = [
    `You are drafting a California small claims court MC-030 Declaration for ${plaintiffName} against ${defendantName}.`,
    ``,
    `Case facts:`,
    `- Plaintiff: ${plaintiffName}`,
    `- Defendant: ${defendantName}`,
    `- Claim amount: ${claimAmount}`,
    incidentDate ? `- Date of incident: ${incidentDate}` : "",
    claimDesc    ? `- Case description: ${claimDesc}` : "",
    ``,
    `Return a JSON object with exactly two fields:`,
    `1. "declarationTitle": All-caps title, max 80 characters. Specific to the case facts.`,
    `2. "declarationText": Exactly 8 numbered paragraphs separated by \\n. Each paragraph starts with its number and a period ("1. "). Each paragraph is ONE concise sentence, max 100 characters. Total length: 550-700 characters.`,
    `   STRICT RULES — violation will break the PDF form layout:`,
    `   - Plain text only. Absolutely NO asterisks, NO markdown, NO bold, NO brackets.`,
    `   - Separate paragraphs with \\n only (single newline, never double).`,
    `   - Do NOT include "I declare under penalty of perjury" — already printed on the form.`,
    `   - The form already has a printed signature block, date line, and printed name line at the bottom — NEVER add any of those to the text. Do not end with a name, a date, "Respectfully", "Sincerely", "Signed", or any closing statement whatsoever.`,
    `   - Paragraph 8 must end with the specific dollar amount requested and nothing else after it.`,
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
  // DOWN shifts the party/court header section down by ~half a line so text
  // lands on the printed form lines. Does NOT apply to the declaration or
  // signature area (those are positioned correctly already).
  const DOWN = 6;
  const v  = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT - DOWN, s);
  const vs = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s); // signature area — no DOWN

  const countyDisplay = String(d.countyId || "").split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const courtCityZip  = [d.courthouseCity, "CA", d.courthouseZip].filter(Boolean).join(" ");
  const cityLine      = [d.plaintiffCity, d.plaintiffState, d.plaintiffZip].filter(Boolean).join(" ");

  // ── Attorney / party block (top-left) ──────────────────────────────────────
  // Measured: name y=46.4 x=47.5 | street y=59.6 x=47.5 | city y=73.7 x=47.5
  v(b.declarantName  || d.plaintiffName,           48,  734);
  v(b.declarantAddress || d.plaintiffAddress || "", 48,  721);
  v(b.declarantCityLine || cityLine,                48,  707);
  // Phone: measured y=104.5 x=127.3
  v(b.declarantPhone || d.plaintiffPhone,          127, 676);
  // Email: measured y=115.9 x=127.3
  v(b.declarantEmail || d.plaintiffEmail,          127, 665);
  // Attorney for: measured y=129.1 x=127.3
  v("Self-Representing",                           127, 651);

  // ── Court block ────────────────────────────────────────────────────────────
  // County: measured y=144.3 x=238.1
  v(b.courtCounty || countyDisplay,                238, 636);
  // Street address: measured y=155.5 x=127.3
  v(b.courtStreet || d.courthouseAddress || "",    127, 625);
  // City/zip: measured y=178.6 x=127.3
  v(b.courtCityZip || courtCityZip,               127, 602);
  // Branch name: measured y=190.0 x=127.3
  v(b.branchName   || d.courthouseName || "Small Claims Division", 127, 591);

  // ── Parties ────────────────────────────────────────────────────────────────
  // Plaintiff/petitioner: measured y=207.9 x=153.9
  v(d.plaintiffName,  154, 573);
  // Defendant/respondent: measured y=224.4 x=153.9
  v(d.defendantName,  154, 556);
  // Case number (right col, above CASE NUMBER: label at measured y=247.3)
  v(d.caseNumber,     413, 544);

  // ── Declaration title — REMOVED ─────────────────────────────────────────────
  // The form is pre-printed with "DECLARATION" in the title box (top) and again
  // as a footer (bottom). Drawing an AI-generated title here created a visible
  // duplicate, so the title rendering has been removed and the body now starts
  // higher to fill the reclaimed space.
  void declarationTitle;

  // ── Declaration body — numbered paragraphs ──────────────────────────────────
  // 11pt Helvetica, 13pt leading, full-width margins matching the printed form lines.
  // Body start v_y=494 (reused old title baseline), must stop before the
  // pre-printed "I declare" text (~v_y=185).
  if (declarationText) {
    const paragraphs = declarationText.split(/\n/).map(p => p.trim()).filter(Boolean);
    let bodyY = 494 + LIFT;
    const bodyX    = 72;          // left margin: 1 inch (36pt extra inset from form's printed rule lines for readability)
    const bodyMaxW = 468;         // 612-72-72 = 468 — body width with 1 inch margins on each side
    const bodySize = 10;          // 10pt body font (1.3x leading via bodyLineH=13 stays comfortable)
    const bodyLineH = 13;         // 13pt leading kept from 11pt — gives roomier line spacing at 10pt
    const paraGap   = 3;
    const maxTotalLines = 26;     // 26 × 13pt = 338pt, fits between v_y=498.5 and "I declare" line (~185)
    let linesUsed = 0;

    for (let pi = 0; pi < paragraphs.length && linesUsed < maxTotalLines; pi++) {
      const words = paragraphs[pi].split(/\s+/);
      let line = "";

      for (const word of words) {
        const cand = line ? line + " " + word : word;
        if (font.widthOfTextAtSize(cand, bodySize) > bodyMaxW && line) {
          page.drawText(line, { x: bodyX, y: bodyY, size: bodySize, font, color: BLACK });
          bodyY -= bodyLineH;
          linesUsed++;
          line = word;
          if (linesUsed >= maxTotalLines) break;
        } else {
          line = cand;
        }
      }
      if (line && linesUsed < maxTotalLines) {
        page.drawText(line, { x: bodyX, y: bodyY, size: bodySize, font, color: BLACK });
        bodyY -= bodyLineH;
        linesUsed++;
      }
      // Gap between paragraphs (not after the last one)
      if (pi < paragraphs.length - 1 && linesUsed < maxTotalLines) {
        bodyY -= paraGap;
      }
    }
  }

  // ── Signature area ─────────────────────────────────────────────────────────
  // Date: measured y=624.1 → v_y=157  (uses vs — no DOWN)
  vs(b.signDate || today(), 77, 157);
  // NOTE: Printed name is already hard-printed on the form background — do NOT re-draw it.

  // ── Plaintiff checkbox ──────────────────────────────────────────────────────
  // Bottom row: "□ Attorney for  □ Plaintiff  □ Petitioner  □ Defendant"
  // Plaintiff checkbox center at pdf-lib x≈408, v_y≈80 (LIFT applied directly)
  xmark(page, 408, 80 + LIFT, 5);
}

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
    // Generate AI declaration if caller didn't supply one
    let { declarationTitle, declarationText } = b as { declarationTitle?: string; declarationText?: string };
    if (!declarationTitle || !declarationText) {
      const ai = await generateMC030Declaration(d);
      declarationTitle = declarationTitle || ai.declarationTitle;
      declarationText  = declarationText  || ai.declarationText;
    }
    // Always strip wrappers regardless of source (body, AI, or saved DB content) so
    // any title/header/perjury-closing/signature lines never reach the renderer.
    declarationText = stripMC030Wrappers(declarationText || "");

    // Persist the declaration title so SC-100 Section 3 can reference it exactly
    if (declarationTitle) {
      db.update(casesTable)
        .set({ mc030DeclarationTitle: declarationTitle })
        .where(eq(casesTable.id, id))
        .catch((e: any) => console.error("MC-030 title save error:", e));
    }

    const pdfDoc   = await PDFDocument.create();
    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bg       = await pdfDoc.embedPng(loadAsset("mc030_hq-1.png"));
    const page     = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

    drawMC030Page(page, font, fontBold, d, b, declarationTitle, declarationText);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="MC030-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("MC-030 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate MC-030 PDF." });
  }
});

// ─── MC-030 signed (draw-to-sign) ─────────────────────────────────────────────
// Accepts the same body as mc030 plus signatureDataUrl (PNG data URL from
// the signature canvas). Embeds the signature image at the declarant line.
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
  let sigBytes: Buffer | undefined;
  if (signatureDataUrl) {
    const base64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    sigBytes = Buffer.from(base64, "base64");
  }
  try {
    let { declarationTitle, declarationText } = b as { declarationTitle?: string; declarationText?: string };
    if (!declarationTitle || !declarationText) {
      const ai = await generateMC030Declaration(d);
      declarationTitle = declarationTitle || ai.declarationTitle;
      declarationText  = declarationText  || ai.declarationText;
    }
    // Always strip wrappers regardless of source.
    declarationText = stripMC030Wrappers(declarationText || "");

    // Persist the declaration title so SC-100 Section 3 can reference it exactly
    if (declarationTitle) {
      db.update(casesTable)
        .set({ mc030DeclarationTitle: declarationTitle })
        .where(eq(casesTable.id, id))
        .catch((e: any) => console.error("MC-030 title save error:", e));
    }

    const pdfDoc   = await PDFDocument.create();
    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bg       = await pdfDoc.embedPng(loadAsset("mc030_hq-1.png"));
    const page     = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

    drawMC030Page(page, font, fontBold, d, b, declarationTitle, declarationText);

    // Embed signature image at the SIGNATURE OF DECLARANT position
    // Measured: label "(SIGNATURE OF DECLARANT)" at y=682 x=392.9
    // Signature image sits just above this label: pdf-lib y≈112, x=370, max 190×42
    if (sigBytes) {
      const sigImg = await pdfDoc.embedPng(sigBytes);
      const { width: sw, height: sh } = sigImg.scale(1);
      const maxW = 190, maxH = 42;
      const scale = Math.min(maxW / sw, maxH / sh, 1);
      page.drawImage(sigImg, { x: 370, y: 112, width: sw * scale, height: sh * scale });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="MC030-Signed-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("MC-030 signed PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate signed MC-030 PDF." });
  }
});

// ─── MC-030 + Exhibits Filing Packet ─────────────────────────────────────────
// Generates MC-030 declaration and appends selected uploaded documents as
// labeled exhibit pages (Exhibit A, B, C…) into one combined PDF.
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
    const masterDoc = await PDFDocument.create();
    const font = await masterDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await masterDoc.embedFont(StandardFonts.HelveticaBold);

    // ── Generate AI declaration if not provided ───────────────────────────────
    let { declarationTitle, declarationText } = b as { declarationTitle?: string; declarationText?: string };
    if (!declarationTitle || !declarationText) {
      const ai = await generateMC030Declaration(d);
      declarationTitle = declarationTitle || ai.declarationTitle;
      declarationText  = declarationText  || ai.declarationText;
    }
    // Always strip wrappers regardless of source.
    declarationText = stripMC030Wrappers(declarationText || "");

    // Persist the declaration title so SC-100 Section 3 can reference it exactly
    if (declarationTitle) {
      db.update(casesTable)
        .set({ mc030DeclarationTitle: declarationTitle })
        .where(eq(casesTable.id, id))
        .catch((e: any) => console.error("MC-030 title save error:", e));
    }

    // ── MC-030 page ──────────────────────────────────────────────────────────
    const bg = await masterDoc.embedPng(loadAsset("mc030_hq-1.png"));
    const mc030Page = masterDoc.addPage([PW, PH]);
    mc030Page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    drawMC030Page(mc030Page, font, fontBold, d, b, declarationTitle, declarationText);

    // ── Exhibit pages ────────────────────────────────────────────────────────
    if (exhibitIds.length > 0) {
      const docs = await db.select().from(documentsTable).where(
        and(inArray(documentsTable.id, exhibitIds), eq(documentsTable.caseId, id))
      );
      const docMap = new Map(docs.map((doc) => [doc.id, doc]));
      const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      for (let i = 0; i < exhibitIds.length; i++) {
        const doc = docMap.get(exhibitIds[i]);
        if (!doc || !doc.storageObjectPath) continue;
        const letter = LETTERS[i] ?? String(i + 1);
        const label = `EXHIBIT ${letter}`;

        function stampExhibit(page: any) {
          const lw = fontBold.widthOfTextAtSize(label, 10);
          page.drawRectangle({ x: PW - lw - 22, y: 28, width: lw + 16, height: 18, color: rgb(1, 1, 1), borderColor: BLACK, borderWidth: 0.7 });
          page.drawText(label, { x: PW - lw - 14, y: 33, size: 10, font: fontBold, color: BLACK });
        }

        try {
          const file = await objectStorage.getObjectEntityFile(doc.storageObjectPath);
          const [fileBuffer] = await file.download() as [Buffer, unknown];
          const mime = doc.mimeType;

          if (mime === "application/pdf") {
            const extDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
            const copied = await masterDoc.copyPages(extDoc, extDoc.getPageIndices());
            copied.forEach((p, pi) => { masterDoc.addPage(p); if (pi === 0) stampExhibit(p); });
          } else if (mime === "image/png" || mime === "image/jpeg" || mime === "image/jpg") {
            const exPage = masterDoc.addPage([PW, PH]);
            const img = mime === "image/png" ? await masterDoc.embedPng(fileBuffer) : await masterDoc.embedJpg(fileBuffer);
            const { width: iw, height: ih } = img.scale(1);
            const scale = Math.min((PW - 72) / iw, (PH - 120) / ih, 1);
            const dw = iw * scale; const dh = ih * scale;
            exPage.drawImage(img, { x: (PW - dw) / 2, y: (PH - dh) / 2 + 20, width: dw, height: dh });
            exPage.drawText(`${doc.originalName} — ${label}`, { x: 54, y: PH - 36, size: 8, font, color: rgb(0.45, 0.45, 0.45) });
            stampExhibit(exPage);
          } else {
            // DOCX or other: placeholder page
            const ph = masterDoc.addPage([PW, PH]);
            ph.drawText(`${label}`, { x: 54, y: PH - 80, size: 16, font: fontBold, color: BLACK });
            ph.drawText(`Document: ${doc.originalName}`, { x: 54, y: PH - 110, size: 10, font, color: BLACK });
            ph.drawText(`(Word document — print and attach this file separately)`, { x: 54, y: PH - 130, size: 9, font, color: rgb(0.45, 0.45, 0.45) });
            stampExhibit(ph);
          }
        } catch (docErr) {
          console.error(`[MC-030 Exhibits] Failed to embed exhibit ${letter}:`, docErr);
        }
      }
    }

    const pdfBytes = await masterDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="MC030-Filing-Packet-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("MC-030 with-exhibits PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate filing packet." });
  }
});

// ─── SC-100A Other Plaintiffs or Defendants ───────────────────────────────────
// Coordinates calibrated from placeholder PDF via pdftotext -bbox (612×792pt page, LIFT=4.5).
// Party data is pulled directly from the case record; no extra fields needed in the request body.

async function buildSC100APdf(
  d: Record<string, any>,
  b: Record<string, any>,
  sig1Bytes?: Buffer,
  sig2Bytes?: Buffer
): Promise<Uint8Array> {
  // Party data is read directly from the case record (intake data) — no extra prompts needed.
  // SC-100A: "Other Plaintiff 1" = second plaintiff, "Other Plaintiff 2" = third plaintiff (none in DB),
  //          "Other Defendant" = second defendant (none in DB — primary is on SC-100).
  const p1 = d.secondPlaintiffName ? {
    name:         d.secondPlaintiffName,
    phone:        d.secondPlaintiffPhone        || "",
    street:       d.secondPlaintiffAddress      || "",
    city:         d.secondPlaintiffCity         || "",
    state:        d.secondPlaintiffState        || "CA",
    zip:          d.secondPlaintiffZip          || "",
    mailingStreet:d.secondPlaintiffMailingAddress || "",
    mailingCity:  d.secondPlaintiffMailingCity   || "",
    mailingState: d.secondPlaintiffMailingState  || "CA",
    mailingZip:   d.secondPlaintiffMailingZip    || "",
  } : null;
  // No third plaintiff or second defendant stored in DB — those sections left blank.
  const p2: null  = null;
  const def1: null = null;

  const pdfDoc   = await PDFDocument.create();
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bg       = await pdfDoc.embedPng(loadAsset("sc100a_hq-1.png"));
  const page     = pdfDoc.addPage([PW, PH]);
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

  const LIFT = 4.5;
  const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);

  // ── Header — case number (top-right box) ────────────────────────────────────
  // Placeholder: "Case number" at x=403, pdfY=743 → v_param=738.5≈739
  if (d.caseNumber) v(d.caseNumber, 403, 739);

  // ── Other Plaintiff 1 (= second plaintiff from intake) ──────────────────────
  // Coordinates calibrated from placeholder PDF (pdftotext bbox, 612×792pt):
  //   name  x=176, pdfY=668 → v=663  |  street x=131, pdfY=652 → v=647
  //   phone x=440, pdfY=652 → v=647  |  city x=74, pdfY=636 → v=631
  //   state x=299, pdfY=636 → v=631  |  zip x=372, pdfY=636 → v=631
  //   mailing addr x=195, pdfY=619 → v=614
  //   mailing city x=74, pdfY=602 → v=597  |  state x=299  |  zip x=371
  if (p1) {
    v(p1.name,               176, 663);
    v(p1.street,             131, 647);
    v(p1.phone,              440, 647);
    v(p1.city,                74, 631);
    v(p1.state  || "CA",     299, 631);
    v(p1.zip,                372, 631);
    if (p1.mailingStreet) {
      v(p1.mailingStreet,    195, 614);
      v(p1.mailingCity,       74, 597);
      v(p1.mailingState || "CA", 299, 597);
      v(p1.mailingZip,       371, 597);
    }
  }

  // ── Other Plaintiff 2 (third plaintiff — not collected in intake, left blank) ─
  // Placeholder: name x=168, pdfY=569 → v=564  |  street x=131, pdfY=553 → v=548
  //   phone x=440  |  city x=74, pdfY=538 → v=533  |  state x=299  |  zip x=371
  //   mailing addr x=195, pdfY=522 → v=517
  //   mailing city x=74, pdfY=505 → v=500
  if (p2) {
    // p2 is always null — placeholder block retained for future expansion
  }

  // ── Other Defendant (second defendant — not collected in intake, left blank) ─
  // Placeholder: name x=176, pdfY=425 → v=420  |  street x=131, pdfY=410 → v=405
  //   phone x=439  |  city x=74, pdfY=395 → v=390  |  state x=299  |  zip x=371
  //   mailing addr x=195, pdfY=380 → v=375
  //   mailing city x=74, pdfY=364 → v=359
  //   agent name x=97, pdfY=324 → v=319  |  agent title x=397
  //   agent street x=106, pdfY=307 → v=302
  //   agent city x=74, pdfY=293 → v=288  |  state x=299  |  zip x=371
  if (def1) {
    // def1 is always null — placeholder block retained for future expansion
  }

  // ── Date + printed names ────────────────────────────────────────────────────
  // Placeholder: date1 x=63, pdfY=159 → v=154  |  name1 x=37, pdfY=144 → v=139
  //              date2 x=63, pdfY=116 → v=111  |  name2 x=37, pdfY=101 → v=96
  const signDate = b.signDate || today();
  v(signDate,                           63, 154);
  v(p1?.name || d.plaintiffName || "",  37, 139);
  v(signDate,                           63, 111);
  v("",                                 37,  96);   // third plaintiff name (none)

  // ── Signature images ────────────────────────────────────────────────────────
  // Sig 1 sits just above the "Plaintiff signature" label at measured y=640.8
  // → pdf-lib baseline y=140; image top ≈ y=142+40=182 → fits between rows
  async function embedSig(bytes: Buffer, x: number, y: number) {
    const img = await pdfDoc.embedPng(bytes);
    const { width: sw, height: sh } = img.scale(1);
    const maxW = 185, maxH = 38;
    const scale = Math.min(maxW / sw, maxH / sh, 1);
    page.drawImage(img, { x, y, width: sw * scale, height: sh * scale });
  }
  if (sig1Bytes) await embedSig(sig1Bytes, 355, 142);   // sig 1: x=349.4+6, y=142
  if (sig2Bytes) await embedSig(sig2Bytes, 355,  98);   // sig 2: x=349.4+6, y=98

  return pdfDoc.save();
}

router.post("/cases/:id/forms/sc100a", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  try {
    const pdfBytes = await buildSC100APdf(d, b);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="SC100A-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100A PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-100A PDF." });
  }
});

// ─── SC-100A signed (draw-to-sign, two signature slots) ───────────────────────
router.post("/cases/:id/forms/sc100a/signed", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  const { signature1DataUrl, signature2DataUrl } = b as {
    signature1DataUrl?: string;
    signature2DataUrl?: string;
  };
  function toBytes(dataUrl: string | undefined): Buffer | undefined {
    if (!dataUrl) return undefined;
    return Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
  }
  try {
    const pdfBytes = await buildSC100APdf(d, b, toBytes(signature1DataUrl), toBytes(signature2DataUrl));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="SC100A-Signed-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100A signed PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate signed SC-100A PDF." });
  }
});

// ─── SC-103 Fictitious Business Name ─────────────────────────────────────────
router.post("/cases/:id/forms/sc103", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  // b.attachedTo: "sc100" | "sc120"
  // b.businessName, b.businessAddress, b.mailingAddress
  // b.businessType: "individual"|"association"|"partnership"|"corporation"|"llc"|"other"
  // b.businessTypeOther, b.fbnCounty, b.fbnNumber, b.fbnExpiry, b.signerName, b.signerTitle
  //
  // Coordinates calibrated from placeholder PDF (font 10pt, 612×792 pt page).
  // v(text, x, v_param)  → draws at pdf-lib y = v_param + LIFT (4.5)
  // xm(cx, cy)           → X-mark at pdf-lib y = cy + LIFT
  // All v_param = pdftotext_pdfY − 4.5  where pdfY = 792 − pdftotext_yMax
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc103_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

    // ── Case number (top-right box) ──────────────────────────────────────────
    // "Case Number:" label at pdfY≈745; value field is the box below it at pdfY≈734
    if (d.caseNumber) v(d.caseNumber, 404, 730);

    // ── Attached-to checkboxes ("This form is attached to: □ Form SC-100  □ Form SC-120")
    // Both checkboxes on pdfY≈701 line; box centers just left of each label
    if (b.attachedTo === "sc100") xm(193, 696);
    else if (b.attachedTo === "sc120") xm(287, 696);

    // ── Item 1 — Business information ─────────────────────────────────────────
    // "Business name of the person suing:" label at pdfY≈629; data right of label
    if (b.businessName)    v(b.businessName,    225, 626);
    // "Business address (not a P.O. Box):" label at pdfY≈612; data right of label
    if (b.businessAddress) v(b.businessAddress, 314, 609);
    // "Mailing address (if different):" label at pdfY≈595; data right of label
    if (b.mailingAddress)  v(b.mailingAddress,  207, 592);

    // ── Item 2 — Business-type checkboxes (check ONLY one) ────────────────────
    // Left column: individual (pdfY≈548), association (≈534), partnership (≈521)
    // Right column: corporation (≈548), llc (≈534), other (≈521)
    const typeMap: Record<string, [number, number]> = {
      individual:  [68, 543],  corporation: [237, 543],
      association: [68, 529],  llc:         [237, 529],
      partnership: [68, 516],  other:       [237, 516],
    };
    const sel = typeMap[b.businessType ?? ""];
    if (sel) xm(sel[0], sel[1]);
    // "other (specify):" free-text field — pdfY≈521, placeholder xMin=421
    if (b.businessType === "other" && b.businessTypeOther) v(b.businessTypeOther, 421, 516);

    // ── Item 3 — County ──────────────────────────────────────────────────────
    // Long label spans full width at pdfY≈453; data field on blank line below at pdfY≈443
    if (b.fbnCounty) v(b.fbnCounty, 66, 439);

    // ── Item 4 — FBN Statement number ────────────────────────────────────────
    // "Your Fictitious Business Name Statement number:" label at pdfY≈416; data right of label
    if (b.fbnNumber) v(b.fbnNumber, 365, 412);

    // ── Item 5 — FBN Statement expiration date ────────────────────────────────
    // "Date your FBN Statement expires:" label at pdfY≈386; data right of label
    if (b.fbnExpiry) v(b.fbnExpiry, 389, 383);

    // ── Item 6 — Declaration / signature area ─────────────────────────────────
    // "Date:" label at pdfY≈281; value immediately right of label
    v(b.signDate || today(), 91, 277);
    // Printed name line at pdfY≈251 (above "Type or print your name and title" instruction)
    v(b.signerName || d.plaintiffName, 67, 247);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC103-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-103 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-103 PDF." });
  }
});

// ─── SC-104 Proof of Service (2 pages) ───────────────────────────────────────
// All coordinates calibrated from placeholder PDF (pdftotext -bbox, 612×792pt, LIFT=4.5).
// v(text, x, v_param)  → draws at pdf-lib y = v_param + LIFT
// xm(cx, cy)           → X-mark at pdf-lib y = cy + LIFT
// Signature image placed at x=334, y=83 on page 2 ("Server signs here after serving").

async function buildSC104Pdf(
  d: Record<string, any>,
  b: Record<string, any>,
  sigBytes?: Buffer,
): Promise<Uint8Array> {
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  const docs: string[] = b.docsServed || [];

  const pdfDoc = await PDFDocument.create();
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const [bg1, bg2] = await Promise.all([
    pdfDoc.embedPng(loadAsset("sc104_hq-1.png")),
    pdfDoc.embedPng(loadAsset("sc104_hq-2.png")),
  ]);
  const LIFT = 4.5;

  // ── Page 1 ────────────────────────────────────────────────────────────────
  const p1 = pdfDoc.addPage([PW, PH]);
  p1.drawImage(bg1, { x: 0, y: 0, width: PW, height: PH });
  const v1  = (t: any, x: number, y: number, s = 9) => val(p1, font, t, x, y + LIFT, s);
  const xm1 = (cx: number, cy: number) => xmark(p1, cx, cy + LIFT, 5);

  // Right column — court info box
  // "Court name and street address" placeholder at x=407, pdfY=556 → v=552
  v1(b.courtStreet || d.courthouseAddress || "", 407, 552);
  // "Case Number:" label at pdfY=484; data 15pt below at pdfY≈469 → v=465
  if (d.caseNumber) v1(d.caseNumber, 399, 465);
  // "Case name" placeholder at x=407, pdfY=437 → v=433
  v1(caseName, 407, 433);
  // "Hearing Date:" label at pdfY=413; data inline at x=460 → v=409
  v1(b.hearingDate || formatDateDisplay(d.hearingDate) || "", 460, 409);
  // "Time:" label at pdfY=389 (x=399); "Dept.:" label at x=505; data inline → v=385
  v1(b.hearingTime || formatTimeDisplay(d.hearingTime) || "", 425, 385);
  v1(b.hearingDept || d.hearingCourtroom || "",              537, 385);

  // Item 1a — person served
  // "Person being served" placeholder at x=102, pdfY=442 → v=438
  v1(b.personServedName, 102, 438);

  // Item 1b — business/entity served
  // "Business or Agency Name" placeholder at x=80, pdfY=389 → v=385 (left column, same row as Time/Dept right column)
  v1(b.businessName,     80, 385);
  // "Person Authorized for Service" at x=80, pdfY=373 → v=369; "Job Title" at x=349, v=369
  v1(b.authorizedPerson, 80, 369);
  v1(b.authorizedTitle, 349, 369);

  // Item 3 — documents served checkboxes (placeholder did not mark these; positions kept from previous calibration)
  if (docs.includes("sc100")) xm1(53, 298);
  if (docs.includes("sc120")) xm1(53, 279);
  if (docs.includes("other")) { xm1(53, 108); v1(b.docsServedOther, 100, 108); }

  // ── Page 2 ────────────────────────────────────────────────────────────────
  const p2 = pdfDoc.addPage([PW, PH]);
  p2.drawImage(bg2, { x: 0, y: 0, width: PW, height: PH });
  const v2  = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y + LIFT, s);
  const xm2 = (cx: number, cy: number) => xmark(p2, cx, cy + LIFT, 5);

  // Page 2 header — "Case name: Case name" at x=106, pdfY=732 → v=728
  v2(caseName,      106, 728);
  // "Case Number:" label at pdfY=743 (right side); data inline → x=449, v=739
  if (d.caseNumber) v2(d.caseNumber, 449, 739);

  // Item 4a — Personal Service
  // "a." label at pdfY=682; checkbox left of it → xm2(53, 677)
  // "Date served" placeholder at x=142, pdfY=666 → v=662
  // "Time served" placeholder at x=342, pdfY=666 → v=662
  // "Service address" placeholder at x=160, pdfY=656 → v=652
  // "City State Zip" placeholders at pdfY=642 → v=638; x=115, 412, 490
  if (b.serviceMethod === "personal") {
    xm2(53, 677);
    v2(b.serviceDate, 142, 662);
    v2(b.serviceTime, 342, 662);
    v2(b.serviceAddress, 160, 652);
    v2(b.serviceCity,            115, 638);
    v2(b.serviceState || "CA",   412, 638);
    v2(b.serviceZip,             490, 638);
  }

  // Item 4b — Substituted Service
  // "b." label at pdfY=608; checkbox → xm2(53, 603)
  // "Date substituted service" at x=170, pdfY=526 → v=522
  // "Time" at x=370, pdfY=526 → v=522
  // "At this address:" label at pdfY=499; data inline → x=133, v=495
  // "City State Zip" at pdfY=457 → v=453; x=115, 408, 482
  // "Name or description..." label at pdfY=463; desc inline → x=80, v=459
  // "Mailing date" at x=235, pdfY=389 → v=385
  // "City, state mailed from" at x=425, pdfY=389 → v=385
  if (b.serviceMethod === "substituted") {
    xm2(53, 603);
    v2(b.serviceDate, 170, 522);
    v2(b.serviceTime, 370, 522);
    if (b.serviceAddress) v2(b.serviceAddress, 133, 495);
    v2(b.serviceCity,            115, 453);
    v2(b.serviceState || "CA",   408, 453);
    v2(b.serviceZip,             482, 453);
    if (b.subPersonDesc) v2(b.subPersonDesc, 80, 459);
    if (b.mailingDate) v2(b.mailingDate, 235, 385);
    if (b.mailingFrom) v2(b.mailingFrom, 425, 385);
  }

  // Item 5 — Server information
  // "Name:" at pdfY=254 → v=250; data at x=85.  "Phone:" at x=420 → data at x=450.
  v2(b.serverName,            85, 250);
  v2(b.serverPhone,          450, 250);
  // "Address:" at pdfY=235 → v=231; data at x=95.
  v2(b.serverAddress,         95, 231);
  // "City:" at pdfY=218 → v=214; "State:" at x=378; "Zip:" at x=447
  v2(b.serverCity,            95, 214);
  v2(b.serverState || "CA",  405, 214);
  v2(b.serverZip,            472, 214);
  // "Fee for service: $" at pdfY=199 → v=195; data after "$" at x=145
  if (b.serverFee) v2(b.serverFee, 145, 195);

  // Item 6 — Declaration / signature
  // "Date:" label at pdfY=109 → data at x=85, v=105
  v2(b.signDate || today(), 85, 105);
  // "Type or print server's name" at pdfY=77; printed name at x=63, v=73
  v2(b.serverName, 63, 73);
  // "Server signs here after serving" at x=334.1, pdfY=77 → embed signature image at x=334, y=83
  if (sigBytes) {
    const sigImg = await pdfDoc.embedPng(sigBytes);
    const { width: sw, height: sh } = sigImg.scale(1);
    const maxW = 200, maxH = 38;
    const scale = Math.min(maxW / sw, maxH / sh, 1);
    p2.drawImage(sigImg, { x: 334, y: 83, width: sw * scale, height: sh * scale });
  }

  return pdfDoc.save();
}

router.post("/cases/:id/forms/sc104", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  try {
    const pdfBytes = await buildSC104Pdf(d, b);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC104-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-104 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-104 PDF." });
  }
});

router.post("/cases/:id/forms/sc104/signed", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  const { signatureDataUrl } = b as { signatureDataUrl?: string };
  function toBytes(dataUrl: string | undefined): Buffer | undefined {
    if (!dataUrl) return undefined;
    return Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
  }
  try {
    const pdfBytes = await buildSC104Pdf(d, b, toBytes(signatureDataUrl));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="SC104-Signed-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-104 signed PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate signed SC-104 PDF." });
  }
});

// ─── SC-105 AI Draft ──────────────────────────────────────────────────────────
router.post("/cases/:id/forms/sc105/ai-draft", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;

  const plaintiffName  = String(d.plaintiffName  || "Plaintiff");
  const defendantName  = String(d.defendantName  || "Defendant");
  const claimAmount    = d.claimAmount ? `$${Number(d.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "an amount to be determined";
  const claimDesc      = String(d.claimDescription || "");
  const incidentDate   = d.incidentDate ? formatDateDisplay(d.incidentDate) : "";
  const hearingDate    = d.hearingDate  ? formatDateDisplay(d.hearingDate)  : "";

  const prompt = [
    `You are a California small claims court expert helping a self-represented litigant complete SC-105 (Request for Court Order and Answer).`,
    ``,
    `Case context:`,
    `- Plaintiff: ${plaintiffName}`,
    `- Defendant: ${defendantName}`,
    `- Claim amount: ${claimAmount}`,
    incidentDate ? `- Date of incident: ${incidentDate}` : "",
    hearingDate  ? `- Hearing date: ${hearingDate}`      : "",
    claimDesc    ? `- Case description: ${claimDesc}`    : "",
    ``,
    `Return a JSON object with exactly two fields:`,
    `1. "orderRequested": A single concise sentence (max 200 characters) stating the specific court order being requested. Use plain legal English. Start with an action verb (e.g. "Continue…", "Order…", "Allow…"). No markdown.`,
    `2. "orderReason": Two to four sentences (max 500 characters total) explaining the factual basis for the request. Reference the case facts. Plain text only, no markdown, no bullet points.`,
    ``,
    `Respond with only the JSON object.`,
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as { orderRequested?: string; orderReason?: string };
    res.json({
      orderRequested: (parsed.orderRequested || "").trim().replace(/^["']|["']$/g, ""),
      orderReason:    (parsed.orderReason    || "").trim().replace(/^["']|["']$/g, ""),
    });
  } catch (err: any) {
    console.error("SC-105 AI draft error:", err?.message);
    res.status(500).json({ error: "AI draft failed — please try again." });
  }
});

// ─── SC-105 Request for Court Order and Answer (AcroForm fill) ───────────────
router.post("/cases/:id/forms/sc105", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  // b.requestingPartyName, b.requestingPartyAddress, b.requestingPartyRole: "plaintiff"|"defendant"
  // b.noticeParties: [{name, address}]  (up to 3)
  // b.orderRequested: string
  // b.orderReason: string
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  // Build the multi-line court info block. The SC-105 form has these labels PRINTED on it:
  //   "Superior Court of California, County of ___"
  //   "Name of Court:" (if different)
  //   street/city/state/zip lines
  //   "Telephone Number:"
  // So the data must fill the BLANKS only — never repeat the printed labels.
  const county = CALIFORNIA_COUNTIES.find((cc) => cc.id === d.countyId);
  const courtInfoLines: string[] = [];
  if (county) {
    courtInfoLines.push(county.name);                                        // fills "County of ___"
    if (county.courthouseName) courtInfoLines.push(county.courthouseName);   // name of court line
    if (county.courthouseAddress) courtInfoLines.push(county.courthouseAddress); // street line
    const cityZip = [county.courthouseCity, county.courthouseZip ? `CA ${county.courthouseZip}` : null].filter(Boolean).join(", ");
    if (cityZip) courtInfoLines.push(cityZip);                               // city/state/zip line
    if (county.phone) courtInfoLines.push(county.phone);                     // phone line (no "Tel:" — label is printed)
  } else {
    if (d.courthouseName) courtInfoLines.push(d.courthouseName);
    if (d.courthouseAddress) courtInfoLines.push(d.courthouseAddress);
  }
  const courtInfo = courtInfoLines.join("\n") || b.courtStreet || "";
  const parties: any[] = b.noticeParties || [];

  function setField(form: any, name: string, value: string) {
    try {
      const f = form.getTextField(name);
      // The converted AcroForm uses octal-escaped DA strings (\057 for /, \056 for .)
      // which break pdf-lib's setFontSize regex. Overwrite DA directly with a clean
      // Helvetica 11 default appearance so text renders at the correct size.
      f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 11 Tf 0 g"));
      f.setText(value || "");
    } catch { /* field may not exist */ }
  }
  function checkBox(form: any, name: string, checked: boolean) {
    try { if (checked) form.getCheckBox(name).check(); else form.getCheckBox(name).uncheck(); } catch { /* field may not exist */ }
  }

  try {
    const acroBytes = loadAsset("forms/sc105_acroform.pdf");
    const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    // ── Page 1 — Request ──
    setField(form, "SC-105[0].Page1[0].RightCaption[0].CourtInfo[0]", courtInfo);
    setField(form, "SC-105[0].Page1[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
    setField(form, "SC-105[0].Page1[0].RightCaption[0].CaseName[0]", caseName);

    // Item 1 — who is asking
    setField(form, "SC-105[0].Page1[0].List1[0].Item[0].FullName3[0]", b.requestingPartyName || "");
    setField(form, "SC-105[0].Page1[0].List1[0].Item[0].FullName2[0]", b.requestingPartyAddress || "");
    checkBox(form, "SC-105[0].Page1[0].List1[0].Item[0].Level5[0]", b.requestingPartyRole === "defendant");
    checkBox(form, "SC-105[0].Page1[0].List1[0].Item[0].Level5[1]", b.requestingPartyRole === "plaintiff");

    // Item 2 — notice parties (up to 3)
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Make1_ft[0]", parties[0]?.name || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Model1_ft[0]", parties[0]?.address || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Make2_ft[0]", parties[1]?.name || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Model2_ft[0]", parties[1]?.address || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Make3_ft[0]", parties[2]?.name || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Model3_ft[0]", parties[2]?.address || "");

    // Item 3 — order requested
    setField(form, "SC-105[0].Page1[0].List3[0].item3[0].Specify[0].Disagree_ft1[0]", b.orderRequested || "");

    // Item 4 — reason / facts
    setField(form, "SC-105[0].Page1[0].List4[0].item4[0].Explain[0].Disagree_ft6[0]", b.orderReason || "");

    // Signature block
    setField(form, "SC-105[0].Page1[0].Sign[0].SigDate4[0]", b.signDate || today());
    setField(form, "SC-105[0].Page1[0].Sign[0].SigName[0]", b.requestingPartyName || "");

    // ── Page 2 — Answer (pre-fill header only; other party fills out the rest) ──
    setField(form, "SC-105[0].Page2[0].RightCaption[0].CourtInfo[0]", courtInfo);
    setField(form, "SC-105[0].Page2[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
    setField(form, "SC-105[0].Page2[0].RightCaption[0].CaseName[0]", caseName);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC105-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-105 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-105 PDF." });
  }
});

// ─── SC-112A Proof of Service by Mail (page 1 only; page 2 is instructions) ──
router.post("/cases/:id/forms/sc112a", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  // b.serverName, b.serverPhone, b.serverAddress, b.serverCity, b.serverState, b.serverZip
  // b.documentServed: "sc105"|"sc109"|"sc114"|"sc133"|"sc150"|"sc221"|"other"
  // b.documentServedOther: string
  // b.partiesServed: [{name, address}]  (up to 5)
  // b.mailingDate, b.mailingCity
  const parties: any[] = b.partiesServed || [];
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc112a_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

    const sc112aCaseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
    v(sc112aCaseName, 72, 756);
    v(d.caseNumber, 425, 756);
    if (d.courthouseName) v(d.courthouseName, 72, 742);
    if (d.courthouseAddress) v(d.courthouseAddress, 72, 730);

    // Item 1 — Server info
    v(b.serverName, 72, 696);
    v(b.serverPhone, 448, 696);
    v(b.serverAddress, 180, 679);
    v(b.serverCity, 72, 663); v(b.serverState || "CA", 390, 663); v(b.serverZip, 445, 663);

    // Item 2 — document served checkboxes
    const docMap: Record<string, [number, number]> = {
      sc105: [53, 627], sc109: [53, 612], sc114: [53, 596],
      sc133: [53, 581], sc150: [53, 565], sc221: [53, 549], other: [53, 534],
    };
    const docSel = docMap[b.documentServed ?? ""];
    if (docSel) xm(docSel[0], docSel[1]);
    if (b.documentServed === "other" && b.documentServedOther) v(b.documentServedOther, 120, 534);

    // Item 3 — parties served table
    const rowYs = [399, 376, 354, 331, 309];
    parties.slice(0, 5).forEach((party, i) => {
      v(party.name, 72, rowYs[i]);
      v(party.address, 265, rowYs[i]);
    });

    // Mailing date / city
    v(b.mailingDate, 187, 240);
    v(b.mailingCity, 453, 240);

    // Date + name
    v(b.signDate || today(), 72, 179);
    v(b.serverName, 45, 155);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC112A-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-112A PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-112A PDF." });
  }
});

// ─── SC-120 Defendant's Claim and ORDER (3 pages) ────────────────────────────
// Note: plaintiff in case = plaintiff in form item 1; defendant = person filing SC-120 (item 2)
router.post("/cases/:id/forms/sc120", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  // b.counterClaimAmount, b.counterClaimReason, b.counterClaimDate
  // b.priorDemand: boolean, b.attyFeeDispute: boolean, b.suingPublicEntity: boolean, b.moreThan12: boolean
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const [bg1, bg2, bg3] = await Promise.all([
      pdfDoc.embedPng(loadAsset("sc120_hq-1.png")),
      pdfDoc.embedPng(loadAsset("sc120_hq-2.png")),
      pdfDoc.embedPng(loadAsset("sc120_hq-3.png")),
    ]);

    // ── Page 1 — Notice/instructions: no data fields (include as background) ──
    pdfDoc.addPage([PW, PH]).drawImage(bg1, { x: 0, y: 0, width: PW, height: PH });

    // ── Page 2 — Parties + Claim ──
    const LIFT = 4.5;
    const p2 = pdfDoc.addPage([PW, PH]);
    p2.drawImage(bg2, { x: 0, y: 0, width: PW, height: PH });
    const v2 = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y + LIFT, s);

    v2(d.defendantName, 72, 754);
    v2(d.caseNumber, 425, 754);
    if (d.courthouseName) v2(d.courthouseName, 250, 754, 8);
    if (d.courthouseAddress) v2(d.courthouseAddress, 250, 742, 8);

    // Item 1 — Plaintiff info (the person who filed SC-100)
    v2(d.plaintiffName, 72, 688); v2(d.plaintiffPhone, 448, 688);
    v2(d.plaintiffAddress, 72, 670);
    v2(d.plaintiffCity, 283, 670); v2(d.plaintiffState || "CA", 445, 670); v2(d.plaintiffZip, 508, 670);
    if (d.plaintiffMailingAddress) {
      v2(d.plaintiffMailingAddress, 72, 647);
      v2(d.plaintiffMailingCity, 283, 647); v2(d.plaintiffMailingState || "CA", 445, 647); v2(d.plaintiffMailingZip, 508, 647);
    }

    // Item 2 — Defendant (person now filing SC-120)
    v2(d.defendantName, 72, 523); v2(d.defendantPhone, 448, 523);
    v2(d.defendantAddress, 72, 505);
    v2(d.defendantCity, 283, 505); v2(d.defendantState || "CA", 445, 505); v2(d.defendantZip, 508, 505);
    if (d.defendantMailingAddress) {
      v2(d.defendantMailingAddress, 72, 482);
      v2(d.defendantMailingCity, 283, 482); v2(d.defendantMailingState || "CA", 445, 482); v2(d.defendantMailingZip, 508, 482);
    }

    // Item 3 — Counter-claim
    if (b.counterClaimAmount) v2(Number(b.counterClaimAmount).toFixed(2), 385, 352);
    if (b.counterClaimReason) wrapVal(p2, font, b.counterClaimReason, 63, 320 + LIFT, 490, 9, 12, 5);
    v2(b.counterClaimDate || "", 345, 256);
    if (b.counterClaimReason) wrapVal(p2, font, b.counterClaimHowCalculated || "", 63, 225 + LIFT, 490, 9, 12, 4);

    // ── Page 3 — Questions + Declaration ──
    const p3 = pdfDoc.addPage([PW, PH]);
    p3.drawImage(bg3, { x: 0, y: 0, width: PW, height: PH });
    const v3 = (t: any, x: number, y: number, s = 9) => val(p3, font, t, x, y + LIFT, s);
    const xm3 = (cx: number, cy: number) => xmark(p3, cx, cy + LIFT, 5);

    v3(d.defendantName, 72, 754);
    v3(d.caseNumber, 425, 754);

    // Item 4 — Prior demand
    if (b.priorDemand === true || b.priorDemand === "true") xm3(185, 720); else xm3(211, 720);
    // Item 5 — Atty fee dispute
    if (b.attyFeeDispute === true || b.attyFeeDispute === "true") xm3(199, 672); else xm3(225, 672);
    // Item 6 — Public entity
    if (b.suingPublicEntity === true || b.suingPublicEntity === "true") xm3(160, 624); else xm3(186, 624);
    // Item 7 — More than 12 claims
    if (b.moreThan12 === true || b.moreThan12 === "true") xm3(48, 553); else xm3(74, 553);

    // Date + defendant name
    v3(b.signDate || today(), 72, 400);
    v3(d.defendantName, 200, 380);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC120-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-120 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-120 PDF." });
  }
});

// ─── SC-140 Notice of Appeal ──────────────────────────────────────────────────
router.post("/cases/:id/forms/sc140", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  // b.courtName (Name and Address of Court)
  // b.appellantRole: "plaintiff" | "defendant"
  // b.appealType: "judgment" | "motion_to_vacate"
  // b.appealFiledDate
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc140_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

    // Court name and address of court (auto-fill from case data)
    v(b.courtName || d.courthouseName || d.courthouseAddress || "", 285, 754);
    // Case number
    v(d.caseNumber, 900 * 0.24, 745);  // center area

    // Plaintiff/Defendant columns
    v(d.plaintiffName, 72, 725);
    v(d.plaintiffPhone, 72, 707);
    v(d.defendantName, 350, 725);
    v(d.defendantPhone, 350, 707);

    // Notice section — who is being notified (appellant)
    if (b.appellantRole === "plaintiff") xm(120, 554);
    if (b.appellantRole === "defendant") xm(120, 537);

    // Appeal type
    if (b.appealType === "judgment") xm(49, 460);
    if (b.appealType === "motion_to_vacate") xm(252, 460);

    // Date appeal filed
    v(b.appealFiledDate, 72, 430);

    // Appellant name
    v(b.appellantName || (b.appellantRole === "plaintiff" ? d.plaintiffName : d.defendantName), 72, 387);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC140-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-140 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-140 PDF." });
  }
});

// ─── SC-150 Request to Postpone Trial (page 1 only; page 2 is instructions) ──
router.post("/cases/:id/forms/sc150", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  // b.requestingPartyName, b.requestingPartyAddress, b.requestingPartyPhone
  // b.requestingPartyRole: "plaintiff" | "defendant"
  // b.currentTrialDate, b.postponeUntilDate
  // b.postponeReason, b.withinTenDaysReason (if trial within 10 days)
  // b.courtStreet
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc150_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

    // Right column — court + case (auto-fill from case data)
    v(b.courtStreet || d.courthouseAddress || d.courthouseName || "", 376, 606);
    v(d.caseNumber, 376, 549);
    v(caseName, 376, 505);

    // Item 1 — my name, address, phone, role
    v(b.requestingPartyName || d.plaintiffName, 180, 718);
    v(b.requestingPartyAddress, 180, 705);
    v(b.requestingPartyPhone, 180, 688);
    if (b.requestingPartyRole === "plaintiff") xm(140, 665);
    if (b.requestingPartyRole === "defendant") xm(176, 665);

    // Item 2 — current trial date
    v(b.currentTrialDate, 240, 643);
    // Item 3 — postpone until
    v(b.postponeUntilDate, 200, 619);
    // Item 4 — reason
    wrapVal(page, font, b.postponeReason, 63, 581, 490, 9, 13, 5);
    // Item 5 — within 10 days reason
    wrapVal(page, font, b.withinTenDaysReason, 63, 497, 490, 9, 13, 4);

    // Date + name
    v(b.signDate || today(), 72, 168);
    v(b.requestingPartyName || d.plaintiffName, 45, 147);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC150-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-150 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-150 PDF." });
  }
});

// ─── FW-001 Request to Waive Court Fees (2 pages) ────────────────────────────
router.post("/cases/:id/forms/fw001", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;

  // Determine signer name (individual's name for business filers)
  const signerName = d.plaintiffIsBusiness && d.secondPlaintiffName
    ? d.secondPlaintiffName : (d.plaintiffName || "");
  const signerTitle = d.plaintiffTitle || "";

  // County display
  const countyDisplay = String(d.countyId || "")
    .split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  // Case name
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");

  // Benefits text → determine which boxes to check
  const benefitsText = String(b.benefits || "").toLowerCase();
  const hasBenefit = (keywords: string[]) => keywords.some(k => benefitsText.includes(k));

  const basis = b.eligibilityBasis || "5a";  // "5a" | "5b" | "5c"
  const signDate = b.signDate || today();

  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ── PAGE 1 ──────────────────────────────────────────────────────────────
    const bg1 = await pdfDoc.embedPng(loadAsset("fw001_hq-1.png"));
    const LIFT = 4.5;
    const p1  = pdfDoc.addPage([PW, PH]);
    p1.drawImage(bg1, { x: 0, y: 0, width: PW, height: PH });
    const v1 = (t: any, x: number, y: number, s = 9) => val(p1, font, t, x, y + LIFT, s);
    const xm1 = (cx: number, cy: number, sz = 5) => xmark(p1, cx, cy + LIFT, sz);

    // ── Standard CA form header (court + case info) ──────────────────────
    // Left column — attorney/party block (we put plaintiff info here)
    v1(signerName + (signerTitle ? `, ${signerTitle}` : ""), 35, 755, 8);
    const addrLine = [d.plaintiffAddress, d.plaintiffCity, (d.plaintiffState || "CA"), d.plaintiffZip].filter(Boolean).join(", ");
    v1(addrLine, 35, 740, 8);
    v1(d.plaintiffPhone || "", 35, 717, 8);

    // Right column — court name, case number
    // "SUPERIOR COURT OF CALIFORNIA, COUNTY OF": county
    v1(countyDisplay, 385, 712, 8);
    // Court address
    if (d.courthouseAddress) v1(d.courthouseAddress, 285, 699, 8);
    if (d.courthouseCity || d.courthouseZip) {
      v1([d.courthouseCity, "CA", d.courthouseZip].filter(Boolean).join(" "), 285, 688, 8);
    }
    if (d.courthouseName) v1(d.courthouseName, 285, 678, 8);

    // Plaintiff / Defendant / Case number
    v1(d.plaintiffName || "", 285, 659, 8);
    v1(d.defendantName || "", 285, 645, 8);
    v1(d.caseNumber || "", 450, 659, 8);

    // ── Section 1: Your Information ──────────────────────────────────────
    v1(signerName, 110, 620, 9);
    v1(d.plaintiffAddress || "", 175, 605, 9);
    const city1 = d.plaintiffCity || "";
    const state1 = d.plaintiffState || "CA";
    const zip1 = d.plaintiffZip || "";
    v1(city1, 110, 591, 9);
    v1(state1, 350, 591, 9);
    v1(zip1, 395, 591, 9);
    v1(d.plaintiffPhone || "", 110, 578, 9);
    v1(signerTitle || "", 340, 578, 9);

    // ── Section 2: Employer ───────────────────────────────────────────────
    // (blank — user can fill by hand; we have no employer data in DB)
    v1(caseName, 340, 556, 8);

    // ── Section 3: Lawyer ────────────────────────────────────────────────
    // No lawyer — self-represented; nothing to fill

    // ── Section 4: Which court fees? ─────────────────────────────────────
    // Always mark Superior Court
    xm1(40, 536, 5);

    // ── Section 5: Eligibility basis ─────────────────────────────────────
    if (basis === "5a") xm1(40, 510, 5);
    if (basis === "5b") xm1(40, 460, 5);
    if (basis === "5c") xm1(40, 378, 5);

    // ── 5a: Public benefits sub-checkboxes ───────────────────────────────
    if (basis === "5a") {
      if (hasBenefit(["food", "calfresh", "snap", "ebt"]))              xm1(55,  496, 4);
      if (hasBenefit(["ssi", "supplemental security"]))                  xm1(113, 496, 4);
      if (hasBenefit(["ssp", "state supplementary"]))                    xm1(163, 496, 4);
      if (hasBenefit(["medi-cal", "medicaid", "medical"]))               xm1(207, 496, 4);
      if (hasBenefit(["county relief", "general assist", "ga ", "gr "])) xm1(263, 496, 4);
      if (hasBenefit(["ihss", "in-home"]))                               xm1(357, 496, 4);
      if (hasBenefit(["calworks", "tanf", "welfare"]))                   xm1(55,  483, 4);
      if (hasBenefit(["capi"]))                                          xm1(143, 483, 4);
      if (hasBenefit(["wic"]))                                           xm1(179, 483, 4);
      if (hasBenefit(["unemployment", "edd", "ui "]))                    xm1(215, 483, 4);
    }

    // ── 5b: Gross income vs threshold ─────────────────────────────────────
    if (basis === "5b" && b.grossMonthlyIncome) {
      v1(`$${Number(b.grossMonthlyIncome).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`, 270, 448, 8);
    }

    // ── 5c: Sub-options ───────────────────────────────────────────────────
    if (basis === "5c") {
      // Default: "waive all court fees"
      xm1(55, 366, 4);
    }

    // ── Section 6: Previous waiver ────────────────────────────────────────
    // Skip — user can check manually

    // ── Signature ─────────────────────────────────────────────────────────
    v1(signDate, 95, 276, 9);
    v1(signerName + (signerTitle ? `, ${signerTitle}` : ""), 75, 257, 9);
    // Mark "Plaintiff" role box
    xm1(207, 254, 4);

    // ── PAGE 2 ──────────────────────────────────────────────────────────────
    if (basis === "5b" || basis === "5c") {
      const bg2 = await pdfDoc.embedPng(loadAsset("fw001_hq-2.png"));
      const p2  = pdfDoc.addPage([PW, PH]);
      p2.drawImage(bg2, { x: 0, y: 0, width: PW, height: PH });
      const v2 = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y + LIFT, s);

      // Header: name and case number
      v2(signerName, 90, 762, 8);
      v2(d.caseNumber || "", 450, 762, 8);

      // Section 7: Gross Monthly Income
      if (b.grossMonthlyIncome) {
        v2("Employment / other income", 55, 718, 8);
        v2(`$${Number(b.grossMonthlyIncome).toFixed(2)}`, 390, 718, 8);
        v2(`$${Number(b.grossMonthlyIncome).toFixed(2)}`, 390, 680, 8); // Total
      }

      // Section 11: Monthly Deductions and Expenses
      const fmt$ = (v: any) => v ? `$${Number(v).toFixed(2)}` : "";
      if (b.monthlyRent)           v2(fmt$(b.monthlyRent),           430, 494, 8);
      if (b.monthlyFood)           v2(fmt$(b.monthlyFood),           430, 480, 8);
      if (b.monthlyUtilities)      v2(fmt$(b.monthlyUtilities),      430, 466, 8);
      if (b.monthlyTransportation) v2(fmt$(b.monthlyTransportation), 430, 410, 8);
      if (b.monthlyMedical)        v2(fmt$(b.monthlyMedical),        430, 397, 8);

      // Other expenses (free text) — wrap below the expenses section
      if (b.monthlyOther) {
        wrapVal(p2, font, String(b.monthlyOther), 285, 362, 290, 8, 11, 3);
      }

      // Total expenses
      const numFields = [b.monthlyRent, b.monthlyFood, b.monthlyUtilities, b.monthlyTransportation, b.monthlyMedical];
      const totalExp = numFields.reduce((sum, f) => sum + (f ? Number(f) : 0), 0);
      if (totalExp > 0) v2(`$${totalExp.toFixed(2)}`, 430, 175, 8);
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="FW001-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("FW-001 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate FW-001 PDF." });
  }
});

export default router;
