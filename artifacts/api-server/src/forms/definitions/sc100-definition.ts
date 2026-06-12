/**
 * SC-100 Plaintiff's Claim and ORDER — AcroForm definition.
 *
 * Wraps the existing buildSC100AcroformPdf + pdftkFlatten pipeline.
 * Enrichment (deterministic + AI) is applied inside generate().
 */

import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import { buildSC100AcroformPdf } from "../sc100-acroform";
import { pdftkFlatten } from "../acroform-filler";
import { today, formatDate, formatTime } from "../enrichment";
import { ASSET_DIR } from "../../routes/forms-common";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../../lib/logger";

// ─── Deterministic enrichment ─────────────────────────────────────────────────

export function enrichForSC100(c: Record<string, any>): Record<string, any> {
  const e = { ...c };

  if (e.hearingDate) e.hearingDate = formatDate(e.hearingDate);
  if (e.hearingTime) e.hearingTime = formatTime(e.hearingTime);

  if (e.incidentDate) {
    const parts = e.incidentDate.split(/[–\-]/).map((s: string) => s.trim()).filter(Boolean);
    e.incidentDate = parts[0] || e.incidentDate;
    if (parts.length >= 2 && parts[1] !== parts[0]) {
      e.dateStarted  = parts[0];
      e.dateThrough  = parts[1];
      e.hasDateRange = true;
    } else {
      e.dateStarted  = undefined;
      e.dateThrough  = undefined;
      e.hasDateRange = undefined;
    }
  }

  if (!e.venueZip) e.venueZip = e.defendantZip || e.courthouseZip || "";
  if (e.claimAmount != null) e.claimOver2500 = Number(e.claimAmount) > 2500;
  if (!e.venueBasis) e.venueBasis = "where_defendant_lives";
  if (e.priorDemandMade     == null) e.priorDemandMade     = false;
  if (e.filedMoreThan12Claims == null) e.filedMoreThan12Claims = false;
  if (e.isAttyFeeDispute    == null) e.isAttyFeeDispute    = false;
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
  e.venueBasisLetter     = VENUE_LETTER[e.venueBasis ?? ""] ?? "";
  e.isVenueOther         = e.venueBasisLetter === "e" ? true : undefined;
  e.hasAgent             = (e.defendantIsBusinessOrEntity && e.defendantAgentName) ? e.defendantAgentName : undefined;
  e.attyFeeAndArbitration = (e.isAttyFeeDispute === true && e.hadArbitration === true) || false;
  e.publicEntityHasDate  = (e.isSuingPublicEntity === true && !!e.publicEntityClaimFiledDate) || false;

  const declarantBase = (e.plaintiffIsBusiness && e.secondPlaintiffName)
    ? e.secondPlaintiffName
    : e.plaintiffName;
  e.declarantName      = declarantBase;
  e.declarantNameTitle = declarantBase + (e.plaintiffTitle ? `, ${e.plaintiffTitle}` : "");

  return e;
}

// ─── AI enrichment ────────────────────────────────────────────────────────────

async function generateSC100ClaimSummary(c: Record<string, any>): Promise<string> {
  const plaintiffName = String(c.plaintiffName || "Plaintiff");
  const defendantName = String(c.defendantName || "Defendant");
  const claimDesc     = String(c.claimDescription || "");
  const incidentDate  = c.incidentDate ? formatDate(c.incidentDate) : "";
  const claimAmount   = c.claimAmount
    ? `$${Number(c.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "an amount to be determined";
  const mc030Title    = c.mc030DeclarationTitle || `Declaration of ${plaintiffName} in Support of Claim`;

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

export async function aiEnrichForSC100(c: Record<string, any>): Promise<Record<string, any>> {
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

// ─── Definition ───────────────────────────────────────────────────────────────

const sc100Definition: FormDefinition = {
  state: "CA",
  formId: "SC-100",
  renderingTechnique: "png-overlay",
  async generate(data, body, opts) {
    const { token: _t, signatureDataUrl: _s, download: _d, ...overrideFields } = body;
    const merged = Object.keys(overrideFields).length > 0 ? { ...data, ...overrideFields } : data;
    const enriched = await aiEnrichForSC100(enrichForSC100(merged));
    enriched.needsMC031 =
      ((enriched.claimDescriptionForForm ?? "").length > 360) ||
      ((enriched.howAmountCalculated ?? "").length > 210);
    const pdfBytes = await buildSC100AcroformPdf(enriched, ASSET_DIR, opts?.signatureBytes);
    return pdftkFlatten(Buffer.from(pdfBytes));
  },
};

FormRegistry.register(sc100Definition);

export { sc100Definition };
