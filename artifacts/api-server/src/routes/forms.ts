import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getOwnedCase, getUserId } from "../lib/owned-case";
import { redeemDownloadToken } from "../lib/download-tokens";
import type { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { inArray, and, eq } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";
import { openai } from "@workspace/integrations-openai-ai-server";
import { buildFormPdf, type FormConfig } from "../forms/form-renderer";

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
    const parts = e.incidentDate.split("–").map((s: string) => s.trim()).filter(Boolean);
    e.dateStarted = parts[0] || e.incidentDate;
    e.dateThrough = parts[1] || parts[0] || e.incidentDate;
    e.incidentDate = parts[0] || e.incidentDate;
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

  // Second plaintiff name + optional title (e.g. business rep)
  if (e.secondPlaintiffName) {
    e.p2NameTitle = e.plaintiffTitle
      ? `${e.secondPlaintiffName}, ${e.plaintiffTitle}`
      : e.secondPlaintiffName;
  }

  // Claim amount formatted as currency
  if (e.claimAmount != null) {
    e.claimAmountFormatted = Number(e.claimAmount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Description for §3a — always has content (description + MC-030 note, or fallback)
  const desc = e.claimDescription || "";
  if (desc) {
    e.claimDescriptionForForm = desc + " (See attached MC-030 Declaration for full details.)";
  } else {
    const signer = e.secondPlaintiffName || e.plaintiffName || "";
    e.claimDescriptionForForm = `See attached MC-030 Declaration of ${signer}.`;
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
async function aiEnrichForSC100(c: Record<string, any>): Promise<Record<string, any>> {
  const needsFill = !c.howAmountCalculated || !c.venueBasis || c.isAttyFeeDispute == null || c.isSuingPublicEntity == null;
  if (!needsFill) return c;

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
    const raw = resp.choices[0]?.message?.content || "{}";
    const filled = JSON.parse(raw);
    return { ...c, ...filled };
  } catch (err) {
    console.error("SC-100 AI enrichment error:", err);
    return c;
  }
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
): Promise<Uint8Array> {
  return buildFormPdf(
    SC100_CONFIG,
    caseData,
    ASSET_DIR,
    // Extra rendering not expressible in JSON: embed drawn signature on page 4
    signaturePngBytes
      ? async (pages, pdfDoc) => {
          const sigImg = await pdfDoc.embedPng(signaturePngBytes);
          // Signature sits between declaration date (y≈506) and print name (y≈488)
          pages[3].drawImage(sigImg, {
            x: 248, y: 558 + 4.5,
            width: 240, height: 30,
          });
        }
      : undefined
  );
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
    res.setHeader("Content-Disposition", `attachment; filename="SC100-Signed-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100 signed PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate signed SC-100 PDF." });
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
// All coords: pdf_x = png_x * 0.24, pdf_y = 792 − png_y * 0.24
// PNG background: 2550×3300 @300 DPI. PDF page: 612×792 pts.
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
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bg = await pdfDoc.embedPng(loadAsset("mc030_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);

    // Compute county display name from countyId (e.g. "los-angeles" → "Los Angeles")
    const countyDisplay = String(d.countyId || "").split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const courtCityZip = [d.courthouseCity, "CA", d.courthouseZip].filter(Boolean).join(" ");

    // Attorney / party block (top left)
    v(b.declarantName || d.plaintiffName, 175, 733);
    v(b.declarantAddress || d.plaintiffAddress || "", 175, 720);
    const cityLine = [d.plaintiffCity, d.plaintiffState, d.plaintiffZip].filter(Boolean).join(" ");
    v(b.declarantCityLine || cityLine, 175, 707);
    v(b.declarantPhone || d.plaintiffPhone, 200, 630);
    v(b.declarantEmail || d.plaintiffEmail, 200, 613);
    // Attorney FOR (party represented)
    v(b.declarantName || d.plaintiffName, 200, 596);
    // Court (Superior Court of California, County of __)
    v(countyDisplay, 200, 560);
    v(b.courtStreet || d.courthouseAddress || "", 200, 544);
    // Mailing address — same as street if not separately provided
    v(b.courtMailingAddress || "", 200, 529);
    v(b.courtCityZip || courtCityZip, 200, 514);
    v(b.branchName || d.courthouseName || "", 200, 499);
    // Parties
    v(d.plaintiffName, 215, 464);
    v(d.defendantName, 215, 441);
    // Case number (right column)
    v(d.caseNumber, 430, 471);

    // Declaration title centered in box (optional)
    if (b.declarationTitle) {
      const titleWidth = fontBold.widthOfTextAtSize(b.declarationTitle, 10);
      const titleX = (PW - titleWidth) / 2;
      (page as any).drawText(b.declarationTitle, { x: titleX, y: 416 + LIFT, size: 10, font: fontBold, color: BLACK });
    }

    // Declaration body text — word-wrapped into the large blank area
    if (b.declarationText) {
      wrapVal(page, font, b.declarationText, 54, 395 + LIFT, 510, 9, 13, 22);
    }

    // Date + signature area
    v(b.signDate || today(), 65, 121);
    v(b.declarantName || d.plaintiffName, 45, 78);

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

    // ── MC-030 page ──────────────────────────────────────────────────────────
    const bg = await masterDoc.embedPng(loadAsset("mc030_hq-1.png"));
    const mc030Page = masterDoc.addPage([PW, PH]);
    mc030Page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(mc030Page, font, t, x, y + LIFT, s);

    const countyDisplay = String(d.countyId || "").split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const courtCityZip = [d.courthouseCity, "CA", d.courthouseZip].filter(Boolean).join(" ");

    v(b.declarantName || d.plaintiffName, 175, 733);
    v(b.declarantAddress || d.plaintiffAddress || "", 175, 720);
    const cityLine = [d.plaintiffCity, d.plaintiffState, d.plaintiffZip].filter(Boolean).join(" ");
    v(b.declarantCityLine || cityLine, 175, 707);
    v(b.declarantPhone || d.plaintiffPhone, 200, 630);
    v(b.declarantEmail || d.plaintiffEmail, 200, 613);
    v(b.declarantName || d.plaintiffName, 200, 596);
    v(countyDisplay, 200, 560);
    v(b.courtStreet || d.courthouseAddress || "", 200, 544);
    v(b.courtMailingAddress || "", 200, 529);
    v(b.courtCityZip || courtCityZip, 200, 514);
    v(b.branchName || d.courthouseName || "", 200, 499);
    v(d.plaintiffName, 215, 464);
    v(d.defendantName, 215, 441);
    v(d.caseNumber, 430, 471);

    if (b.declarationTitle) {
      const tw = fontBold.widthOfTextAtSize(b.declarationTitle, 10);
      mc030Page.drawText(b.declarationTitle, { x: (PW - tw) / 2, y: 416 + LIFT, size: 10, font: fontBold, color: BLACK });
    }
    if (b.declarationText) wrapVal(mc030Page, font, b.declarationText, 54, 395 + LIFT, 510, 9, 13, 22);
    v(b.signDate || today(), 65, 121);
    v(b.declarantName || d.plaintiffName, 45, 78);

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
router.post("/cases/:id/forms/sc100a", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  // b.additionalPlaintiffs: [{name,phone,street,city,state,zip,mailingStreet,mailingCity,mailingState,mailingZip}]
  // b.additionalDefendants: [{name,phone,street,city,state,zip,mailingStreet,mailingCity,mailingState,mailingZip,agentName,agentTitle,agentStreet,agentCity,agentState,agentZip}]
  const addPl: any[] = b.additionalPlaintiffs || [];
  const addDef: any[] = b.additionalDefendants || [];
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc100a_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

    // Header — case caption + case number
    const sc100aCaseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
    v(sc100aCaseName, 72, 756);
    v(d.caseNumber, 425, 756);

    // Item 1 — Additional Plaintiffs (slots for 2)
    const p1 = addPl[0];
    if (p1) {
      v(p1.name, 220, 683);
      v(p1.phone, 443, 683);
      v(p1.street, 165, 669);
      v(p1.city, 86, 653); v(p1.state || "CA", 338, 653); v(p1.zip, 390, 653);
      if (p1.mailingStreet) {
        v(p1.mailingStreet, 185, 638);
        v(p1.mailingCity, 86, 623); v(p1.mailingState || "CA", 338, 623); v(p1.mailingZip, 390, 623);
      }
    }
    const p2 = addPl[1];
    if (p2) {
      v(p2.name, 220, 575);
      v(p2.phone, 443, 575);
      v(p2.street, 165, 561);
      v(p2.city, 86, 546); v(p2.state || "CA", 338, 546); v(p2.zip, 390, 546);
      if (p2.mailingStreet) {
        v(p2.mailingStreet, 185, 531);
        v(p2.mailingCity, 86, 516); v(p2.mailingState || "CA", 338, 516); v(p2.mailingZip, 390, 516);
      }
    }

    // Item 2 — Additional Defendants (slot for 1)
    const def1 = addDef[0];
    if (def1) {
      v(def1.name, 220, 479);
      v(def1.phone, 443, 479);
      v(def1.street, 165, 465);
      v(def1.city, 86, 450); v(def1.state || "CA", 338, 450); v(def1.zip, 390, 450);
      if (def1.mailingStreet) {
        v(def1.mailingStreet, 185, 435);
        v(def1.mailingCity, 86, 420); v(def1.mailingState || "CA", 338, 420); v(def1.mailingZip, 390, 420);
      }
      if (def1.agentName) {
        v(def1.agentName, 100, 399);
        v(def1.agentTitle, 285, 399);
        v(def1.agentStreet, 100, 385);
        v(def1.agentCity, 86, 370); v(def1.agentState || "CA", 338, 370); v(def1.agentZip, 390, 370);
      }
    }

    // Item 3 — Claim over $2500
    if (d.claimOver2500 === true) xm(176, 349);
    else xm(204, 349);

    // Date + signatures
    v(b.signDate || today(), 65, 234);
    v(addPl[0]?.name || "", 45, 218);
    v(b.signDate || today(), 65, 191);
    v(addPl[1]?.name || "", 45, 175);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC100A-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100A PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-100A PDF." });
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
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc103_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

    const sc103CaseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
    v(sc103CaseName, 72, 756);
    v(d.caseNumber, 425, 756);
    if (d.courthouseName) v(d.courthouseName, 72, 742);
    if (d.courthouseAddress) v(d.courthouseAddress, 72, 730);

    // Attached to
    if (b.attachedTo === "sc100") xm(156, 736);
    else if (b.attachedTo === "sc120") xm(234, 736);

    // Item 1 — Business info
    v(b.businessName, 150, 666);
    v(b.businessAddress, 192, 649);
    v(b.mailingAddress, 150, 634);

    // Item 2 — Business type checkboxes
    const typeMap: Record<string, [number, number]> = {
      individual:   [56, 590], association: [56, 575], partnership: [56, 560],
      corporation:  [255, 590], llc:        [255, 575], other:       [255, 560],
    };
    const sel = typeMap[b.businessType ?? ""];
    if (sel) xm(sel[0], sel[1]);
    if (b.businessType === "other" && b.businessTypeOther) v(b.businessTypeOther, 312, 560);

    // Item 3 — County
    v(b.fbnCounty, 72, 476);
    // Item 4 — FBN number
    v(b.fbnNumber, 300, 440);
    // Item 5 — Expiry
    v(b.fbnExpiry, 280, 404);

    // Date + signature
    v(b.signDate || today(), 72, 255);
    v(b.signerName || d.plaintiffName, 72, 225);

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
router.post("/cases/:id/forms/sc104", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  // b.courtStreet (court address to type in box), b.hearingDate, b.hearingTime, b.hearingDept
  // b.personServedName (if serving person), b.businessName, b.authorizedPerson, b.authorizedTitle
  // b.docsServed: string[] — "sc100", "sc120", "other"
  // b.docsServedOther: string
  // b.serviceMethod: "personal" | "substituted"
  // b.serviceDate, b.serviceTime (am/pm), b.serviceAddress, b.serviceCity, b.serviceState, b.serviceZip
  // b.subPersonDesc (if substituted — who received)
  // b.serverName, b.serverPhone, b.serverAddress, b.serverCity, b.serverState, b.serverZip, b.serverFee
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  const docs: string[] = b.docsServed || [];
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const [bg1, bg2] = await Promise.all([
      pdfDoc.embedPng(loadAsset("sc104_hq-1.png")),
      pdfDoc.embedPng(loadAsset("sc104_hq-2.png")),
    ]);

    // ── Page 1 ──
    const LIFT = 4.5;
    const p1 = pdfDoc.addPage([PW, PH]);
    p1.drawImage(bg1, { x: 0, y: 0, width: PW, height: PH });
    const v1 = (t: any, x: number, y: number, s = 9) => val(p1, font, t, x, y + LIFT, s);
    const xm1 = (cx: number, cy: number) => xmark(p1, cx, cy + LIFT, 5);

    // Right column — court info (body params override case data)
    v1(b.courtStreet || d.courthouseAddress || d.courthouseName || "", 376, 612);
    v1(d.caseNumber, 376, 550);
    v1(caseName, 376, 507);
    v1(b.hearingDate || formatDateDisplay(d.hearingDate) || "", 376, 463);
    v1(b.hearingTime || formatTimeDisplay(d.hearingTime) || "", 376, 435);
    v1(b.hearingDept || d.hearingCourtroom || "", 490, 435);

    // Item 1a — person served
    v1(b.personServedName, 100, 440);
    // Item 1b — business served
    v1(b.businessName, 72, 398);
    v1(b.authorizedPerson, 175, 384);
    v1(b.authorizedTitle, 370, 384);

    // Item 3 — documents served checkboxes
    if (docs.includes("sc100")) xm1(53, 298);
    if (docs.includes("sc120")) xm1(53, 279);
    if (docs.includes("other")) { xm1(53, 108); v1(b.docsServedOther, 100, 108); }

    // ── Page 2 ──
    const p2 = pdfDoc.addPage([PW, PH]);
    p2.drawImage(bg2, { x: 0, y: 0, width: PW, height: PH });
    const v2 = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y + LIFT, s);
    const xm2 = (cx: number, cy: number) => xmark(p2, cx, cy + LIFT, 5);

    v2(caseName, 72, 754);
    v2(d.caseNumber, 425, 754);

    if (b.serviceMethod === "personal") {
      xm2(60, 700);
      v2(b.serviceDate, 172, 700);
      v2(b.serviceTime, 374, 700);
      v2(b.serviceAddress, 72, 680);
      v2(b.serviceCity, 72, 661); v2(b.serviceState || "CA", 335, 661); v2(b.serviceZip, 415, 661);
    } else if (b.serviceMethod === "substituted") {
      xm2(60, 577);
      v2(b.serviceDate, 172, 433);
      v2(b.serviceTime, 374, 433);
      v2(b.serviceAddress, 72, 412);
      v2(b.serviceCity, 72, 393); v2(b.serviceState || "CA", 335, 393); v2(b.serviceZip, 415, 393);
      v2(b.subPersonDesc, 72, 360);
    }

    // Item 5 — Server info
    v2(b.serverName, 72, 198);
    v2(b.serverPhone, 395, 198);
    v2(b.serverAddress, 72, 181);
    v2(b.serverCity, 72, 163); v2(b.serverState || "CA", 335, 163); v2(b.serverZip, 415, 163);
    if (b.serverFee) v2(`$${b.serverFee}`, 72, 147);

    // Item 6 — Date + name
    v2(b.signDate || today(), 72, 103);
    v2(b.serverName, 72, 77);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC104-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-104 PDF error:", err?.message, err?.stack);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-104 PDF." });
  }
});

// ─── SC-105 Request for Court Order and Answer (2 pages) ─────────────────────
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
  const parties: any[] = b.noticeParties || [];
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const [bg1, bg2] = await Promise.all([
      pdfDoc.embedPng(loadAsset("sc105_hq-1.png")),
      pdfDoc.embedPng(loadAsset("sc105_hq-2.png")),
    ]);

    // ── Page 1 — Request ──
    const LIFT = 4.5;
    const p1 = pdfDoc.addPage([PW, PH]);
    p1.drawImage(bg1, { x: 0, y: 0, width: PW, height: PH });
    const v1 = (t: any, x: number, y: number, s = 9) => val(p1, font, t, x, y + LIFT, s);
    const xm1 = (cx: number, cy: number) => xmark(p1, cx, cy + LIFT, 5);

    // Right column — court + case (auto-fill from case data)
    v1(b.courtStreet || d.courthouseAddress || d.courthouseName || "", 376, 606);
    v1(d.caseNumber, 376, 549);
    v1(caseName, 376, 505);

    // Item 1 — who is asking
    v1(b.requestingPartyName, 100, 474);
    v1(b.requestingPartyAddress, 100, 460);
    if (b.requestingPartyRole === "defendant") xm1(156, 437);
    if (b.requestingPartyRole === "plaintiff") xm1(218, 437);

    // Item 2 — notice parties
    if (parties[0]) { v1(parties[0].name, 100, 386); v1(parties[0].address, 295, 386); }
    if (parties[1]) { v1(parties[1].name, 100, 369); v1(parties[1].address, 295, 369); }
    if (parties[2]) { v1(parties[2].name, 100, 351); v1(parties[2].address, 295, 351); }

    // Item 3 — order requested
    wrapVal(p1, font, b.orderRequested, 63, 291 + LIFT, 490, 9, 13, 5);

    // Item 4 — reason
    wrapVal(p1, font, b.orderReason, 63, 218 + LIFT, 490, 9, 13, 5);

    // Date + name
    v1(b.signDate || today(), 72, 129);
    v1(b.requestingPartyName, 45, 107);

    // ── Page 2 — Answer (pre-fill header only; other party fills) ──
    const p2 = pdfDoc.addPage([PW, PH]);
    p2.drawImage(bg2, { x: 0, y: 0, width: PW, height: PH });
    const v2 = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y + LIFT, s);
    v2(b.courtStreet || "", 376, 606);
    v2(d.caseNumber, 376, 549);
    v2(caseName, 376, 505);

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
