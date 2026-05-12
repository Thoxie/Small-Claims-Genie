import { Router, type IRouter } from "express";
import * as fs from "fs";
import * as path from "path";
import { getOwnedCase } from "../lib/owned-case";
import { logger } from "../lib/logger";
import { openai } from "@workspace/integrations-openai-ai-server";
import { type FormConfig } from "../forms/form-renderer";
import { buildSC100AcroformPdf } from "../forms/sc100-acroform";
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
  // ── AcroForm path (active) ──────────────────────────────────────────────────
  return buildSC100AcroformPdf(caseData, ASSET_DIR, signaturePngBytes);

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
    enriched.needsMC031 =
      ((enriched.claimDescriptionForForm ?? "").length > 360) ||
      ((enriched.howAmountCalculated ?? "").length > 210);
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
    enriched.needsMC031 =
      ((enriched.claimDescriptionForForm ?? "").length > 360) ||
      ((enriched.howAmountCalculated ?? "").length > 210);
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
