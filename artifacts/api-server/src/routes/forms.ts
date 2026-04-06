import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getOwnedCase, getUserId } from "../lib/owned-case";
import { redeemDownloadToken } from "../lib/download-tokens";
import type { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

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

// Count how many lines a block of text would need at given width/size
function countWrapLines(font: any, text: string, maxW: number, size: number): number {
  if (!text) return 0;
  const words = text.split(/\s+/);
  let line = "";
  let count = 1;
  for (const word of words) {
    const cand = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(cand, size) > maxW && line) {
      count++;
      line = word;
    } else {
      line = cand;
    }
  }
  return count;
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

// ─── SC-100 Page drawing functions ────────────────────────────────────────────

function drawPage1(page: any, bg: any) {
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
}

function drawPage2(page: any, font: any, c: Record<string, any>, bg: any) {
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
  const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y, s);

  // ── Court / courthouse info (top header section) ────────────────────────
  // "SUPERIOR COURT OF CALIFORNIA, COUNTY OF ___" → county name
  if (c.countyId) {
    const countyDisplay = String(c.countyId)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
    v(countyDisplay, 166, 779);
  }
  // Courthouse name (e.g. "Stanley Mosk Courthouse")
  if (c.courthouseName) v(c.courthouseName, 60, 765);
  // Courthouse street address
  if (c.courthouseAddress) v(c.courthouseAddress, 60, 752);
  // Courthouse city + zip (only if it won't conflict — keep it tight)
  if (c.courthouseCity || c.courthouseZip) {
    const cityZip = [c.courthouseCity, "CA", c.courthouseZip].filter(Boolean).join(" ");
    v(cityZip, 60, 739);
  }

  // ── Case caption ────────────────────────────────────────────────────────
  v(c.plaintiffName, 132, 725);
  v(c.caseNumber, 515, 725);

  // ── Plaintiff section ───────────────────────────────────────────────────
  v(c.plaintiffName, 95, 674);
  v(c.plaintiffPhone, 455, 674);
  v(c.plaintiffAddress, 133, 655);
  v(c.plaintiffCity, 373, 655);
  v(c.plaintiffState || "CA", 476, 655);
  v(c.plaintiffZip, 503, 655);
  if (c.plaintiffMailingAddress) {
    v(c.plaintiffMailingAddress, 197, 626);
    v(c.plaintiffMailingCity, 373, 626);
    v(c.plaintiffMailingState || "CA", 476, 626);
    v(c.plaintiffMailingZip, 503, 626);
  }
  v(c.plaintiffEmail, 191, 600);

  // ── Defendant section ───────────────────────────────────────────────────
  v(c.defendantName, 95, 390);
  v(c.defendantPhone, 455, 390);
  v(c.defendantAddress, 133, 371);
  v(c.defendantCity, 372, 371);
  v(c.defendantState || "CA", 473, 371);
  v(c.defendantZip, 500, 371);
  if (c.defendantMailingAddress) {
    v(c.defendantMailingAddress, 215, 343);
    v(c.defendantMailingCity, 372, 343);
    v(c.defendantMailingState || "CA", 473, 343);
    v(c.defendantMailingZip, 500, 343);
  }
  if (c.defendantIsBusinessOrEntity && c.defendantAgentName) {
    v(c.defendantAgentName, 95, 283);
    v(c.defendantAgentTitle || "", 413, 283);
    v(c.defendantAgentStreet || "", 124, 261);
    v(c.defendantAgentCity || "", 341, 261);
    v(c.defendantAgentState || "CA", 441, 261);
    v(c.defendantAgentZip || "", 469, 261);
  }

  // ── Claim amount ────────────────────────────────────────────────────────
  if (c.claimAmount) {
    v(`${Number(c.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 300, 194);
  }

  // ── Claim description — detect overflow, stamp MC-030 note if needed ───
  const DESC_MAX_LINES = 8;
  const DESC_OVERFLOW_LINES = 7; // leave line 8 for the reference note
  const desc = String(c.claimDescription || "").trim();
  if (desc) {
    const linesNeeded = countWrapLines(font, desc, 490, 9);
    if (linesNeeded > DESC_MAX_LINES) {
      // Draw 7 lines then stamp overflow note on line 8
      wrapVal(page, font, desc, 63, 163, 490, 9, 12, DESC_OVERFLOW_LINES);
      const noteY = 163 - DESC_OVERFLOW_LINES * 12;
      val(page, font, "(Continued — see attached MC-030 Declaration for full statement)", 63, noteY, 8);
    } else {
      wrapVal(page, font, desc, 63, 163, 490, 9, 12, DESC_MAX_LINES);
    }
  }
}

function drawPage3(page: any, font: any, c: Record<string, any>, bg: any) {
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
  const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y, s);
  const xm = (cx: number, cy: number) => xmark(page, cx, cy, 5);
  v(c.plaintiffName, 132, 745);
  v(c.caseNumber, 515, 745);
  v(c.incidentDate, 217, 690);
  v(c.dateStarted, 320, 674);
  v(c.dateThrough, 465, 674);
  if (c.howAmountCalculated) wrapVal(page, font, c.howAmountCalculated, 63, 642, 480, 9, 12, 5);
  if (c.priorDemandMade === true) xm(70, 492);
  if (c.priorDemandMade === false) xm(125, 492);
  const venueBasisMap: Record<string, string> = {
    where_defendant_lives: "a1", where_damage_happened: "a2", where_plaintiff_injured: "a3",
    where_contract_made_broken: "a4", buyer_household_goods: "b", retail_installment: "c",
    vehicle_finance: "d", other: "e",
  };
  const venueCheckboxes: Record<string, [number, number]> = {
    a1: [90, 374], a2: [90, 361], a3: [90, 348], a4: [321, 374],
    b: [67, 319], c: [67, 278], d: [67, 250], e: [67, 223],
  };
  const vSel = venueBasisMap[c.venueBasis ?? ""];
  if (vSel && venueCheckboxes[vSel]) { const [cx, cy] = venueCheckboxes[vSel]; xm(cx, cy); }
  if (vSel === "e" && c.venueReason) v(c.venueReason, 167, 218);
  v(c.venueZip, 415, 180);
  if (c.isAttyFeeDispute === true) xm(364, 151);
  if (c.isAttyFeeDispute === false || !c.isAttyFeeDispute) xm(417, 151);
  if (c.isAttyFeeDispute && c.hadArbitration) xm(503, 137);
  if (c.isSuingPublicEntity === true) xm(250, 117);
  if (c.isSuingPublicEntity !== true) xm(303, 117);
  if (c.isSuingPublicEntity && c.publicEntityClaimFiledDate) v(c.publicEntityClaimFiledDate, 453, 102);
}

function drawPage4(page: any, font: any, c: Record<string, any>, bg: any) {
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
  const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y, s);
  const xm = (cx: number, cy: number) => xmark(page, cx, cy, 5);
  v(c.plaintiffName, 132, 745);
  v(c.caseNumber, 515, 745);
  if (c.filedMoreThan12Claims === true) xm(71, 673);
  if (c.filedMoreThan12Claims !== true) xm(122, 673);
  if (c.claimOver2500 === true) xm(284, 650);
  if (c.claimOver2500 !== true) xm(331, 650);
  const declDate = c.declarationDate || today();
  v(declDate, 65, 501);
  v(c.plaintiffName, 36, 476);
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
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const caseData = c as unknown as Record<string, any>;
    const assetDir = path.join(__dirname, "..", "assets");
    const bgImages = await Promise.all([1, 2, 3, 4].map(async (i) => {
      const bytes = fs.readFileSync(path.join(assetDir, `sc100_hq-${i}.png`));
      return pdfDoc.embedPng(bytes);
    }));
    drawPage1(pdfDoc.addPage([PW, PH]), bgImages[0]);
    drawPage2(pdfDoc.addPage([PW, PH]), font, caseData, bgImages[1]);
    drawPage3(pdfDoc.addPage([PW, PH]), font, caseData, bgImages[2]);
    drawPage4(pdfDoc.addPage([PW, PH]), font, caseData, bgImages[3]);
    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC100-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100 PDF error:", err?.message, err?.stack);
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
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y, s);

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
    v(d.countyName || b.countyName || "", 200, 560); // county name after "COUNTY OF"
    v(b.courtStreet || "", 200, 544);
    v(b.courtMailingAddress || "", 200, 529);
    v(b.courtCityZip || "", 200, 514);
    v(b.branchName || "", 200, 499);
    // Parties
    v(d.plaintiffName, 215, 464);
    v(d.defendantName, 215, 441);
    // Case number (right column)
    v(d.caseNumber, 430, 471);

    // Declaration title centered in box (optional)
    if (b.declarationTitle) {
      const titleWidth = fontBold.widthOfTextAtSize(b.declarationTitle, 10);
      const titleX = (PW - titleWidth) / 2;
      (page as any).drawText(b.declarationTitle, { x: titleX, y: 416, size: 10, font: fontBold, color: BLACK });
    }

    // Declaration body text — word-wrapped into the large blank area
    if (b.declarationText) {
      wrapVal(page, font, b.declarationText, 54, 395, 510, 9, 13, 22);
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
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy, 5);

    // Case Number top right
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
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy, 5);

    v(d.caseNumber, 425, 756);

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
    const p1 = pdfDoc.addPage([PW, PH]);
    p1.drawImage(bg1, { x: 0, y: 0, width: PW, height: PH });
    const v1 = (t: any, x: number, y: number, s = 9) => val(p1, font, t, x, y, s);
    const xm1 = (cx: number, cy: number) => xmark(p1, cx, cy, 5);

    // Right column — court info
    v1(b.courtStreet || "", 376, 612);  // court street address in the box
    v1(d.caseNumber, 376, 550);
    v1(caseName, 376, 507);
    v1(b.hearingDate, 376, 463);
    v1(b.hearingTime, 376, 435);
    v1(b.hearingDept, 490, 435);

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
    const v2 = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y, s);
    const xm2 = (cx: number, cy: number) => xmark(p2, cx, cy, 5);

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
    const p1 = pdfDoc.addPage([PW, PH]);
    p1.drawImage(bg1, { x: 0, y: 0, width: PW, height: PH });
    const v1 = (t: any, x: number, y: number, s = 9) => val(p1, font, t, x, y, s);
    const xm1 = (cx: number, cy: number) => xmark(p1, cx, cy, 5);

    // Right column — court + case
    v1(b.courtStreet || "", 376, 606);
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
    wrapVal(p1, font, b.orderRequested, 63, 291, 490, 9, 13, 5);

    // Item 4 — reason
    wrapVal(p1, font, b.orderReason, 63, 218, 490, 9, 13, 5);

    // Date + name
    v1(b.signDate || today(), 72, 129);
    v1(b.requestingPartyName, 45, 107);

    // ── Page 2 — Answer (pre-fill header only; other party fills) ──
    const p2 = pdfDoc.addPage([PW, PH]);
    p2.drawImage(bg2, { x: 0, y: 0, width: PW, height: PH });
    const v2 = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y, s);
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
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy, 5);

    v(d.caseNumber, 425, 756);

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
    const p2 = pdfDoc.addPage([PW, PH]);
    p2.drawImage(bg2, { x: 0, y: 0, width: PW, height: PH });
    const v2 = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y, s);

    v2(d.defendantName, 72, 754);  // "Defendant (list names):" header
    v2(d.caseNumber, 425, 754);

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
    if (b.counterClaimReason) wrapVal(p2, font, b.counterClaimReason, 63, 320, 490, 9, 12, 5);
    v2(b.counterClaimDate || "", 345, 256);
    if (b.counterClaimReason) wrapVal(p2, font, b.counterClaimHowCalculated || "", 63, 225, 490, 9, 12, 4);

    // ── Page 3 — Questions + Declaration ──
    const p3 = pdfDoc.addPage([PW, PH]);
    p3.drawImage(bg3, { x: 0, y: 0, width: PW, height: PH });
    const v3 = (t: any, x: number, y: number, s = 9) => val(p3, font, t, x, y, s);
    const xm3 = (cx: number, cy: number) => xmark(p3, cx, cy, 5);

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
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy, 5);

    // Court name and address of court
    v(b.courtName || "", 285, 754);
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
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy, 5);

    // Right column — court + case
    v(b.courtStreet || "", 376, 606);
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

export default router;
