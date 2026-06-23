/**
 * forms-unified.ts
 *
 * Single Express router that serves every court-form endpoint.
 * All form download routes dispatch through FormRegistry via makeFormHandler.
 *
 * Architecture:
 *  - All download routes: makeFormHandler() — registry dispatch, zero boilerplate.
 *  - SC-100 with-overrides: uses { downloadParam: "download" } so callers can
 *    pass ?download=1 for attachment vs no param for inline (browser preview).
 *  - MC-030 all variants: single registry entry; mc030Definition.generate() routes
 *    internally to basic / signed / with-exhibits based on opts and body.
 *  - SC-104 data PATCH, SC-105 AI draft: non-download auxiliary endpoints kept
 *    as inline handlers (no PDF generation involved).
 *
 * To add a new form see ADDING_A_FORM.md.
 */

import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

import { getOwnedCase, getUserId } from "../lib/owned-case";
import { checkAiRateLimit } from "../lib/rate-limiter";
import { openai } from "@workspace/integrations-openai-ai-server";
import { makeFormHandler } from "../forms/generic-handler";
import { formatDateDisplay } from "./forms-common";

// ─── Side-effect: register every form definition with FormRegistry ─────────────
import "../forms/definitions/index";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// SC-100 — Plaintiff's Claim (AI enrichment + optional signature)
// Enrichment runs inside sc100Definition.generate() so all variants dispatch
// through the registry via makeFormHandler.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/cases/:id/forms/sc100",
  makeFormHandler("SC-100", (id) => `SC100-Case-${id}.pdf`)
);

router.post("/cases/:id/forms/sc100/signed",
  makeFormHandler("SC-100", (id) => `SC100-Signed-Case-${id}.pdf`, { signed: true })
);

// ?download=1 → attachment; no param → inline (browser preview)
router.post("/cases/:id/forms/sc100/with-overrides",
  makeFormHandler("SC-100", (id) => `SC100-Case-${id}.pdf`, { downloadParam: "download" })
);

router.get("/cases/:id/forms/sc100/preview", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  res.json({
    plaintiffName: d.plaintiffName,
    plaintiffAddress: [d.plaintiffAddress, d.plaintiffCity, d.plaintiffState, d.plaintiffZip].filter(Boolean).join(", "),
    plaintiffPhone: d.plaintiffPhone, plaintiffEmail: d.plaintiffEmail,
    defendantName: d.defendantName,
    defendantAddress: [d.defendantAddress, d.defendantCity, d.defendantState, d.defendantZip].filter(Boolean).join(", "),
    defendantPhone: d.defendantPhone, defendantIsBusinessOrEntity: d.defendantIsBusinessOrEntity, defendantAgentName: d.defendantAgentName,
    claimAmount: d.claimAmount, claimType: d.claimType, claimDescription: d.claimDescription,
    incidentDate: d.incidentDate, howAmountCalculated: d.howAmountCalculated,
    priorDemandMade: d.priorDemandMade, priorDemandDescription: d.priorDemandDescription,
    venueBasis: d.venueBasis, venueReason: d.venueReason, countyId: d.countyId,
    isSuingPublicEntity: d.isSuingPublicEntity, publicEntityClaimFiledDate: d.publicEntityClaimFiledDate,
    isAttyFeeDispute: d.isAttyFeeDispute, filedMoreThan12Claims: d.filedMoreThan12Claims, claimOver2500: d.claimOver2500,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MC-030 — Declaration (all 3 variants through one registry entry)
// mc030Definition.generate() routes internally: signed | with-exhibits | basic.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/mc030",
  makeFormHandler("MC-030", (id) => `MC030-Case-${id}.pdf`)
);

router.post("/cases/:id/forms/mc030/signed",
  makeFormHandler("MC-030", (id) => `MC030-Signed-Case-${id}.pdf`, { signed: true })
);

router.post("/cases/:id/forms/mc030-with-exhibits",
  makeFormHandler("MC-030", (id) => `MC030-Filing-Packet-Case-${id}.pdf`)
);

// ─────────────────────────────────────────────────────────────────────────────
// SC-100A — Other Plaintiffs or Defendants (overlay, dual-signature)
// generate() decodes both signature1DataUrl and signature2DataUrl from body.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/sc100a",        makeFormHandler("SC-100A", (id) => `SC100A-Case-${id}.pdf`));
router.post("/cases/:id/forms/sc100a/signed", makeFormHandler("SC-100A", (id) => `SC100A-Signed-Case-${id}.pdf`));

// ─────────────────────────────────────────────────────────────────────────────
// SC-103 — Fictitious Business Name (XFA via pdftk)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/sc103",           makeFormHandler("SC-103",           (id) => `SC103-Case-${id}.pdf`,  { signed: true }));
router.post("/cases/:id/forms/sc103-secondary", makeFormHandler("SC-103-SECONDARY", (id) => `SC103B-Case-${id}.pdf`, { signed: true }));

// ─────────────────────────────────────────────────────────────────────────────
// SC-104 — Proof of Service
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/sc104",        makeFormHandler("SC-104", (_id) => `SC-104_Proof_of_Service_prefilled.pdf`));
router.post("/cases/:id/forms/sc104/signed", makeFormHandler("SC-104", (_id) => `SC-104_Proof_of_Service_prefilled-signed.pdf`, { signed: true }));

router.patch("/cases/:id/forms/sc104-data", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  try {
    await db.update(casesTable).set({ sc104Data: req.body }).where(eq(casesTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    req.log.error({ err }, "SC-104 save data error");
    res.status(500).json({ error: "Failed to save SC-104 data." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-105 — Request for Court Order and Answer
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/sc105/ai-draft", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  const rateCheck = await checkAiRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({
      error: `You've used your AI allowance for this hour. Try again in ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes.`,
      code: "RATE_LIMITED",
    });
    return;
  }

  const d = c as unknown as Record<string, any>;
  const plaintiffName = String(d.plaintiffName  || "Plaintiff");
  const defendantName = String(d.defendantName  || "Defendant");
  const claimAmount   = d.claimAmount ? `$${Number(d.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "an amount to be determined";
  const claimDesc     = String(d.claimDescription || "");
  const incidentDate  = d.incidentDate ? formatDateDisplay(d.incidentDate) : "";
  const hearingDate   = d.hearingDate  ? formatDateDisplay(d.hearingDate)  : "";

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
    req.log.error({ err }, "SC-105 AI draft error");
    res.status(500).json({ error: "AI draft failed — please try again." });
  }
});

router.post("/cases/:id/forms/sc105", makeFormHandler("SC-105", (id) => `SC105-Case-${id}.pdf`));

// ─────────────────────────────────────────────────────────────────────────────
// SC-112A — Proof of Service by Mail
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/sc112a", makeFormHandler("SC-112A", (id) => `SC112A-Case-${id}.pdf`));

// ─────────────────────────────────────────────────────────────────────────────
// SC-120 — Defendant's Claim (XFA via pdftk)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/sc120", makeFormHandler("SC-120", (id) => `SC120-Case-${id}.pdf`));

// ─────────────────────────────────────────────────────────────────────────────
// SC-140 — Notice of Appeal (overlay — no usable AcroForm fields in PDF)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/sc140", makeFormHandler("SC-140", (id) => `SC140-Case-${id}.pdf`));

// ─────────────────────────────────────────────────────────────────────────────
// SC-150 — Request to Postpone Trial (XFA via pdftk)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/sc150", makeFormHandler("SC-150", (id) => `SC150-Case-${id}.pdf`));

// ─────────────────────────────────────────────────────────────────────────────
// FW-001 — Request to Waive Court Fees
// ─────────────────────────────────────────────────────────────────────────────

router.post("/cases/:id/forms/fw001", makeFormHandler("FW-001", (id) => `FW001-Case-${id}.pdf`, { inline: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Florida forms — programmatic pdf-lib generation (no template PDF required)
// ─────────────────────────────────────────────────────────────────────────────

// Statewide FL Statement of Claim — works for all 67 FL counties
router.post(
  "/cases/:id/forms/fl/statement-of-claim",
  makeFormHandler("FL-STATEMENT-OF-CLAIM", (id) => `Florida-Statement-of-Claim-Case-${id}.pdf`),
);

// Miami-Dade County — CLK/CT. 333 Statement of Claim (official county PDF)
router.post(
  "/cases/:id/forms/fl/clkct333",
  makeFormHandler("CLK-CT-333", (id) => `Statement-of-Claim-Miami-Dade-Case-${id}.pdf`),
);

// Miami-Dade County — CLK/CT. 423 Summons/Notice to Appear (official county PDF)
router.post(
  "/cases/:id/forms/fl/clkct423",
  makeFormHandler("CLK-CT-423", (id) => `Summons-Miami-Dade-Case-${id}.pdf`),
);

// Volusia County — CL-219 Statement of Claim (county-specific header + filing address)
router.post(
  "/cases/:id/forms/fl/cl219-volusia",
  makeFormHandler("CL-219-VOLUSIA", (id) => `Statement-of-Claim-Volusia-Case-${id}.pdf`),
);

// Volusia County — CL-219 Statement of Claim (alternate: actual county PDF)
router.post(
  "/cases/:id/forms/fl/cl219-volusia-pdf",
  makeFormHandler("CL-219-VOLUSIA-PDF", (id) => `Statement-of-Claim-Volusia-Case-${id}.pdf`),
);

// Broward County — Statement of Claim (county-specific header + filing address)
router.post(
  "/cases/:id/forms/fl/broward",
  makeFormHandler("FL-BROWARD-SOC", (id) => `Statement-of-Claim-Broward-Case-${id}.pdf`),
);

// Orange County — Statement of Claim (county-specific header + filing address)
router.post(
  "/cases/:id/forms/fl/orange",
  makeFormHandler("FL-ORANGE-SOC", (id) => `Statement-of-Claim-Orange-Case-${id}.pdf`),
);

// Hillsborough County — Statement of Claim (county-specific header + filing address)
router.post(
  "/cases/:id/forms/fl/hillsborough",
  makeFormHandler("FL-HILLSBOROUGH-SOC", (id) => `Statement-of-Claim-Hillsborough-Case-${id}.pdf`),
);

// Palm Beach County — Statement of Claim (county-specific header + filing address)
router.post(
  "/cases/:id/forms/fl/palm-beach",
  makeFormHandler("FL-PALM-BEACH-SOC", (id) => `Statement-of-Claim-Palm-Beach-Case-${id}.pdf`),
);

// Orange County — Plain Statement of Claim (alternate: actual county PDF)
router.post(
  "/cases/:id/forms/fl/plain-soc-orange",
  makeFormHandler("PLAIN-SOC-ORANGE", (id) => `Statement-of-Claim-Orange-Case-${id}.pdf`),
);

// Hillsborough County — Statement of Claim (alternate: actual county PDF)
router.post(
  "/cases/:id/forms/fl/soc-hillsborough",
  makeFormHandler("SOC-HILLSBOROUGH", (id) => `Statement-of-Claim-Hillsborough-Case-${id}.pdf`),
);

// ─────────────────────────────────────────────────────────────────────────────
// Florida summons — Form 7.322 (programmatic, all counties)
// ─────────────────────────────────────────────────────────────────────────────

// Volusia County — Form 7.322 Summons
router.post(
  "/cases/:id/forms/fl/volusia-summons",
  makeFormHandler("FL-VOLUSIA-SUMMONS", (id) => `Summons-Volusia-Case-${id}.pdf`),
);

// Broward County — Form 7.322 Summons
router.post(
  "/cases/:id/forms/fl/broward-summons",
  makeFormHandler("FL-BROWARD-SUMMONS", (id) => `Summons-Broward-Case-${id}.pdf`),
);

// Orange County — Form 7.322 Summons
router.post(
  "/cases/:id/forms/fl/orange-summons",
  makeFormHandler("FL-ORANGE-SUMMONS", (id) => `Summons-Orange-Case-${id}.pdf`),
);

// Hillsborough County — Form 7.322 Summons
router.post(
  "/cases/:id/forms/fl/hillsborough-summons",
  makeFormHandler("FL-HILLSBOROUGH-SUMMONS", (id) => `Summons-Hillsborough-Case-${id}.pdf`),
);

// Palm Beach County — Form 7.322 Summons
router.post(
  "/cases/:id/forms/fl/palm-beach-summons",
  makeFormHandler("FL-PALM-BEACH-SUMMONS", (id) => `Summons-Palm-Beach-Case-${id}.pdf`),
);

// Statewide FL Summons — for other FL counties not listed above
router.post(
  "/cases/:id/forms/fl/summons",
  makeFormHandler("FL-SUMMONS", (id) => `Florida-Summons-Case-${id}.pdf`),
);

// ─────────────────────────────────────────────────────────────────────────────
// Florida — Signed variants (signature image embedded via pdf-lib overlay)
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/cases/:id/forms/fl/statement-of-claim/signed",
  makeFormHandler("FL-STATEMENT-OF-CLAIM", (id) => `Florida-Statement-of-Claim-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/clkct333/signed",
  makeFormHandler("CLK-CT-333", (id) => `Statement-of-Claim-Miami-Dade-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/clkct423/signed",
  makeFormHandler("CLK-CT-423", (id) => `Summons-Miami-Dade-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/cl219-volusia/signed",
  makeFormHandler("CL-219-VOLUSIA", (id) => `Statement-of-Claim-Volusia-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/cl219-volusia-pdf/signed",
  makeFormHandler("CL-219-VOLUSIA-PDF", (id) => `Statement-of-Claim-Volusia-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/broward/signed",
  makeFormHandler("FL-BROWARD-SOC", (id) => `Statement-of-Claim-Broward-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/orange/signed",
  makeFormHandler("FL-ORANGE-SOC", (id) => `Statement-of-Claim-Orange-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/hillsborough/signed",
  makeFormHandler("FL-HILLSBOROUGH-SOC", (id) => `Statement-of-Claim-Hillsborough-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/palm-beach/signed",
  makeFormHandler("FL-PALM-BEACH-SOC", (id) => `Statement-of-Claim-Palm-Beach-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/plain-soc-orange/signed",
  makeFormHandler("PLAIN-SOC-ORANGE", (id) => `Statement-of-Claim-Orange-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/soc-hillsborough/signed",
  makeFormHandler("SOC-HILLSBOROUGH", (id) => `Statement-of-Claim-Hillsborough-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/volusia-summons/signed",
  makeFormHandler("FL-VOLUSIA-SUMMONS", (id) => `Summons-Volusia-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/broward-summons/signed",
  makeFormHandler("FL-BROWARD-SUMMONS", (id) => `Summons-Broward-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/orange-summons/signed",
  makeFormHandler("FL-ORANGE-SUMMONS", (id) => `Summons-Orange-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/hillsborough-summons/signed",
  makeFormHandler("FL-HILLSBOROUGH-SUMMONS", (id) => `Summons-Hillsborough-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/palm-beach-summons/signed",
  makeFormHandler("FL-PALM-BEACH-SUMMONS", (id) => `Summons-Palm-Beach-Case-${id}-signed.pdf`, { signed: true }),
);

router.post(
  "/cases/:id/forms/fl/summons/signed",
  makeFormHandler("FL-SUMMONS", (id) => `Florida-Summons-Case-${id}-signed.pdf`, { signed: true }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Texas forms — programmatic pdf-lib generation (no template PDF required)
// ─────────────────────────────────────────────────────────────────────────────

// TX Small Claims Petition — works for all 254 TX counties
router.post(
  "/cases/:id/forms/tx/petition",
  makeFormHandler("TX-PETITION", (id) => `TX-Small-Claims-Petition-Case-${id}.pdf`),
);

router.post(
  "/cases/:id/forms/tx/petition/signed",
  makeFormHandler("TX-PETITION", (id) => `TX-Small-Claims-Petition-Case-${id}-signed.pdf`, { signed: true }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Illinois forms — statewide, all 102 counties
// ─────────────────────────────────────────────────────────────────────────────

// IL Small Claims Complaint (pdftk FDF fill)
router.post(
  "/cases/:id/forms/il/smc-complaint",
  makeFormHandler("IL-SMC-COMPLAINT", (id) => `IL-Small-Claims-Complaint-Case-${id}.pdf`),
);

// IL Small Claims Summons (programmatic pdf-lib)
// Summons is issued and stamped by the circuit court clerk — no user-signed variant.
router.post(
  "/cases/:id/forms/il/summons",
  makeFormHandler("IL-SUMMONS", (id) => `IL-Small-Claims-Summons-Case-${id}.pdf`),
);

// IL Proof of Service (programmatic pdf-lib)
router.post(
  "/cases/:id/forms/il/proof-of-service",
  makeFormHandler("IL-PROOF-OF-SERVICE", (id) => `IL-Proof-of-Service-Case-${id}.pdf`),
);

router.post(
  "/cases/:id/forms/il/proof-of-service/signed",
  makeFormHandler("IL-PROOF-OF-SERVICE", (id) => `IL-Proof-of-Service-Case-${id}-signed.pdf`, { signed: true }),
);

// IL Application for Waiver of Court Fees (programmatic pdf-lib)
router.post(
  "/cases/:id/forms/il/fee-waiver",
  makeFormHandler("IL-FEE-WAIVER", (id) => `IL-Fee-Waiver-Case-${id}.pdf`),
);

router.post(
  "/cases/:id/forms/il/fee-waiver/signed",
  makeFormHandler("IL-FEE-WAIVER", (id) => `IL-Fee-Waiver-Case-${id}-signed.pdf`, { signed: true }),
);

export default router;
