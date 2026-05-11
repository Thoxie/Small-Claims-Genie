import { Router, type IRouter } from "express";
import * as fs from "fs";
import * as path from "path";
import { getOwnedCase } from "../lib/owned-case";
import { logger } from "../lib/logger";
import { openai } from "@workspace/integrations-openai-ai-server";
import { type FormConfig } from "../forms/form-renderer";
import { buildSC100Pdf as buildSC100PlaywrightPdf, refreshFieldMap } from "../forms/sc100-playwright";
import { calibrateSC100, verifySC100 } from "../forms/sc100-calibrate";
import {
  ASSET_DIR, devOnly, resolveDownloadUser,
  today, formatDateDisplay, formatTimeDisplay,
} from "./forms-common";

const FORMS_DIR = path.join(ASSET_DIR, "forms");
function loadFormConfig(filename: string): FormConfig {
  return JSON.parse(fs.readFileSync(path.join(FORMS_DIR, filename), "utf8")) as FormConfig;
}
const SC100_CONFIG = loadFormConfig("sc100.json");

const router: IRouter = Router();

// ─── SC-100 deterministic enrichment ─────────────────────────────────────────
function enrichForSC100(c: Record<string, any>): Record<string, any> {
  const e = { ...c };

  if (e.hearingDate) e.hearingDate = formatDateDisplay(e.hearingDate);
  if (e.hearingTime) e.hearingTime = formatTimeDisplay(e.hearingTime);

  if (e.incidentDate) {
    const parts = e.incidentDate.split(/[–\-]/).map((s: string) => s.trim()).filter(Boolean);
    e.incidentDate = parts[0] || e.incidentDate;
    if (parts.length >= 2 && parts[1] !== parts[0]) {
      e.dateStarted   = parts[0];
      e.dateThrough   = parts[1];
      e.hasDateRange  = true;
    } else {
      e.dateStarted  = undefined;
      e.dateThrough  = undefined;
      e.hasDateRange = undefined;
    }
  }

  if (!e.venueZip) e.venueZip = e.defendantZip || e.courthouseZip || "";
  if (e.claimAmount != null) e.claimOver2500 = Number(e.claimAmount) > 2500;
  if (!e.venueBasis) e.venueBasis = "where_defendant_lives";
  if (e.priorDemandMade    == null) e.priorDemandMade    = false;
  if (e.filedMoreThan12Claims == null) e.filedMoreThan12Claims = false;
  if (e.isAttyFeeDispute   == null) e.isAttyFeeDispute   = false;
  if (e.isSuingPublicEntity == null) e.isSuingPublicEntity = false;
  if (e.hadArbitration      == null) e.hadArbitration      = false;

  if (e.defendantIsBusinessOrEntity) {
    if (!e.defendantAgentStreet) e.defendantAgentStreet = e.defendantAddress || "";
    if (!e.defendantAgentCity)   e.defendantAgentCity   = e.defendantCity    || "";
    if (!e.defendantAgentState)  e.defendantAgentState  = e.defendantState   || "CA";
    if (!e.defendantAgentZip)    e.defendantAgentZip    = e.defendantZip     || "";
  }

  if (!e.declarationDate) e.declarationDate = today();

  if (e.countyId) {
    e.countyDisplay = String(e.countyId)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  if (e.plaintiffName && e.defendantName) {
    e.caseNameDisplay = `${e.plaintiffName} v. ${e.defendantName}`;
  }

  if (e.courthouseCity || e.courthouseZip) {
    e.courthouseLocation = [e.courthouseCity, "CA", e.courthouseZip]
      .filter(Boolean).join(" ");
  }

  if (e.secondPlaintiffName) {
    const p2Title = e.secondPlaintiffTitle || "";
    e.p2NameTitle = p2Title
      ? `${e.secondPlaintiffName}, ${p2Title}`
      : e.secondPlaintiffName;
  }

  if (e.claimAmount != null) {
    e.claimAmountFormatted = Number(e.claimAmount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const MAX_DESC_CHARS = 360;
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

  const MAX_HOW_CHARS = 210;
  const howText = e.howAmountCalculated || "";
  if (howText.length > MAX_HOW_CHARS) {
    e.needsMC031 = true;
  }

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
  e.isVenueOther = e.venueBasisLetter === "e" ? true : undefined;
  e.hasAgent = (e.defendantIsBusinessOrEntity && e.defendantAgentName)
    ? e.defendantAgentName
    : undefined;
  e.attyFeeAndArbitration = (e.isAttyFeeDispute === true && e.hadArbitration === true) || false;
  e.publicEntityHasDate = (e.isSuingPublicEntity === true && !!e.publicEntityClaimFiledDate) || false;

  const declarantBase = (e.plaintiffIsBusiness && e.secondPlaintiffName)
    ? e.secondPlaintiffName
    : e.plaintiffName;
  e.declarantName      = declarantBase;
  e.declarantNameTitle = declarantBase + (e.plaintiffTitle ? `, ${e.plaintiffTitle}` : "");

  return e;
}

// ─── SC-100 AI enrichment ─────────────────────────────────────────────────────
async function generateSC100ClaimSummary(c: Record<string, any>): Promise<string> {
  const plaintiffName = String(c.plaintiffName || "Plaintiff");
  const defendantName = String(c.defendantName || "Defendant");
  const claimDesc     = String(c.claimDescription || "");
  const incidentDate  = c.incidentDate ? formatDateDisplay(c.incidentDate) : "";
  const claimAmount   = c.claimAmount
    ? `$${Number(c.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "an amount to be determined";

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

    if (summary.length > 300) {
      summary = summary.slice(0, 300).trimEnd();
      const lastPeriod = summary.lastIndexOf(".");
      if (lastPeriod > 80) summary = summary.slice(0, lastPeriod + 1);
    }

    return `${summary} (see MC-030 Declaration: ${mc030Title})`;
  } catch {
    const fallback = claimDesc.length > 300 ? claimDesc.slice(0, 300).trimEnd() + "…" : claimDesc;
    return fallback
      ? `${fallback} (see MC-030 Declaration: ${mc030Title})`
      : `See attached MC-030 Declaration: ${mc030Title}.`;
  }
}

async function aiEnrichForSC100(c: Record<string, any>): Promise<Record<string, any>> {
  const needsFill = !c.howAmountCalculated || !c.venueBasis || c.isAttyFeeDispute == null || c.isSuingPublicEntity == null;

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
        logger.error({ err }, "SC-100 AI field enrichment error");
        return {} as Record<string, any>;
      }
    })() : Promise.resolve({} as Record<string, any>),

    generateSC100ClaimSummary(c),
  ]);

  return { ...c, ...filledFields, claimDescriptionForForm };
}

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
    req.log.error({ err }, "SC-100 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-100 PDF." });
  }
});

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
    req.log.error({ err }, "SC-100 signed PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate signed SC-100 PDF." });
  }
});

router.get("/forms/sc100/coordinate-viewer", devOnly, (_req, res): void => {
  const LIFT = SC100_CONFIG.lift ?? 4.5;
  const PH = 792;

  const SAMPLE: Record<string, any> = {
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

  const pageBlocks = [1, 2, 3, 4].map(pageNum => {
    const bgAsset = SC100_CONFIG.backgroundAssets[pageNum - 1];
    const fields = SC100_CONFIG.fields.filter(f => f.page === pageNum);

    const overlays = fields.map(f => {
      const liftedY = (f.y ?? 0) + LIFT;
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

router.post("/forms/sc100/debug-preview-custom", devOnly, async (req, res): Promise<void> => {
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
    req.log.error({ err }, "Custom debug preview error");
    res.status(500).json({ error: err?.message });
  }
});

router.get("/forms/sc100/debug-preview", devOnly, async (req, res): Promise<void> => {
  const debugMode = req.query.mode !== "sample";
  const SAMPLE: Record<string, any> = {
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
    claimAmount:            3750.00,
    claimDescription:       "Defendant performed negligent brake repair on plaintiff's 2019 Honda Civic on 01/15/2026. Brakes failed two weeks later causing $3,750 in damages including tow, rental car, and re-repair costs.",
    howAmountCalculated:    "Tow truck: $225. Rental car 5 days × $65/day: $325. Re-repair at certified shop: $3,200. Total: $3,750.",
    incidentDate:           "01/15/2026",
    countyId:               "san-diego",
    courthouseName:         "South County Division – Chula Vista",
    courthouseAddress:      "500 3rd Ave",
    courthouseCity:         "Chula Vista",
    courthouseZip:          "91910",
    caseNumber:             "24SC012345",
    hearingDate:            "2026-06-15",
    hearingTime:            "09:00",
    hearingCourtroom:       "D23",
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
    req.log.error({ err }, "SC-100 preview error");
    res.status(500).json({ error: err?.message ?? "Preview failed" });
  }
});

router.post("/forms/sc100/calibrate", devOnly, async (_req, res): Promise<void> => {
  try {
    logger.info("[calibrate] Starting SC-100 field map calibration...");
    const fieldMap = await calibrateSC100(ASSET_DIR);
    refreshFieldMap(ASSET_DIR);
    logger.info("[calibrate] Calibration complete. Field map hot-reloaded.");
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
    logger.error({ err }, "[calibrate] Calibration error");
    res.status(500).json({ error: err?.message ?? "Calibration failed" });
  }
});

router.post("/forms/sc100/horiz-check", devOnly, async (_req, res): Promise<void> => {
  const { execSync } = await import("child_process");
  const os = await import("os");
  const fs2 = await import("fs");
  const tmpDir = fs2.mkdtempSync(path.join(os.tmpdir(), "sc100-horiz-"));
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
    fs2.writeFileSync(pdfPath, pdfBytes);

    execSync(`pdftoppm -r 200 -png "${pdfPath}" "${path.join(tmpDir, "page")}"`, { timeout: 30000 });

    const filledPngs = [1, 2, 3, 4].map((n) => {
      const p = path.join(tmpDir, `page-${n}.png`);
      return fs2.existsSync(p) ? p : path.join(tmpDir, `page-0${n}.png`);
    });
    filledPngs.forEach((p, i) => {
      if (fs2.existsSync(p)) fs2.copyFileSync(p, `/tmp/horiz-page-${i + 1}.png`);
    });

    const blankPngs = [1, 2, 3, 4].map((n) => path.join(ASSET_DIR, `sc100_hq-${n}.png`));
    const buildImg = (p: string) => ({
      type: "image_url" as const,
      image_url: { url: `data:image/png;base64,${fs2.readFileSync(p).toString("base64")}`, detail: "high" as const },
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
    logger.error({ err }, "[horiz-check]");
    res.status(500).json({ error: err?.message });
  } finally {
    try { (await import("child_process")).execSync(`rm -rf "${tmpDir}"`); } catch {}
  }
});

router.post("/forms/sc100/verify", devOnly, async (_req, res): Promise<void> => {
  const { execSync } = await import("child_process");
  const os = await import("os");
  const fs2 = await import("fs");
  const tmpDir = fs2.mkdtempSync(path.join(os.tmpdir(), "sc100-verify-"));

  try {
    logger.info("[verify] Generating sample PDF...");
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
    fs2.writeFileSync(pdfPath, pdfBytes);

    logger.info("[verify] Converting PDF to PNGs...");
    execSync(`pdftoppm -r 200 -png "${pdfPath}" "${path.join(tmpDir, "page")}"`, { timeout: 30000 });

    const filledPngPaths = [1, 2, 3, 4].map((n) => {
      const p = path.join(tmpDir, `page-${n}.png`);
      return fs2.existsSync(p) ? p : path.join(tmpDir, `page-0${n}.png`);
    });

    logger.info("[verify] Running GPT-4o verification pass...");
    const updatedMap = await verifySC100(ASSET_DIR, filledPngPaths);
    refreshFieldMap(ASSET_DIR);
    logger.info("[verify] Verification complete. Field map updated and hot-reloaded.");

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
    logger.error({ err }, "[verify] Error");
    res.status(500).json({ error: err?.message ?? "Verification failed" });
  } finally {
    try { (await import("child_process")).execSync(`rm -rf "${tmpDir}"`); } catch {}
  }
});

router.post("/forms/sc100/evaluate", devOnly, async (_req, res): Promise<void> => {
  const fs2 = await import("fs");
  try {
    const pages = [1, 2, 3, 4].map((n) => {
      const candidates = [`/tmp/v7-page-${n}.png`, `/tmp/verified-page-${n}.png`];
      for (const p of candidates) if (fs2.existsSync(p)) return { page: n, path: p };
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
        url: `data:image/png;base64,${fs2.readFileSync(p).toString("base64")}`,
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
    logger.error({ err }, "[evaluate]");
    res.status(500).json({ error: err?.message });
  }
});

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
    req.log.error({ err }, "SC-100 override PDF error");
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

export default router;
