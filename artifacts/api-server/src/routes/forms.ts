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
  if (queryToken) {
    const userId = await redeemDownloadToken(queryToken, caseId);
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

/**
 * Draw a typed value on a form background.
 * size defaults to 9pt — same weight as typed form data.
 */
function val(
  page: ReturnType<PDFDocument["addPage"]>,
  font: ReturnType<PDFDocument["embedFont"]> extends Promise<infer F> ? F : never,
  text: string | null | undefined,
  x: number,
  y: number,
  size = 9
) {
  if (!text) return;
  (page as any).drawText(String(text), { x, y, size, font, color: BLACK });
}

/**
 * Draw wrapped text on a form background.
 * Returns the y after the last rendered line.
 */
function wrapVal(
  page: ReturnType<PDFDocument["addPage"]>,
  font: any,
  text: string | null | undefined,
  x: number,
  startY: number,
  maxW: number,
  size: number,
  lineH: number,
  maxLines: number
): number {
  if (!text) return startY;
  const words = text.split(/\s+/);
  let line = "";
  let y = startY;
  let count = 0;
  for (const word of words) {
    const cand = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(cand, size) > maxW && line) {
      (page as any).drawText(line, { x, y, size, font, color: BLACK });
      y -= lineH;
      count++;
      line = word;
      if (count >= maxLines) break;
    } else {
      line = cand;
    }
  }
  if (line && count < maxLines) {
    (page as any).drawText(line, { x, y, size, font, color: BLACK });
    y -= lineH;
  }
  return y;
}

/**
 * Draw an X checkmark centred at (cx, cy).
 * Used to mark checkboxes that are already printed in the PNG background.
 */
function xmark(
  page: ReturnType<PDFDocument["addPage"]>,
  cx: number,
  cy: number,
  size = 5
) {
  const h = size / 2;
  (page as any).drawLine({ start: { x: cx - h, y: cy - h }, end: { x: cx + h, y: cy + h }, thickness: 1, color: BLACK });
  (page as any).drawLine({ start: { x: cx + h, y: cy - h }, end: { x: cx - h, y: cy + h }, thickness: 1, color: BLACK });
}

// ─── Page drawing functions ───────────────────────────────────────────────────

/**
 * Page 1 — Official SC-100 cover / instructions (PNG background, no data fields).
 */
function drawPage1(page: ReturnType<PDFDocument["addPage"]>, bg: any) {
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
}

/**
 * Page 2 — Items 1 (Plaintiff), 2 (Defendant), 3a (Claim amount + why owed).
 * All coordinates derived from official SC-100 bbox analysis (200 DPI render).
 * Conversion: pdf_y = 792 - bbox_yMax  (bottom-left origin used by pdf-lib).
 */
function drawPage2(
  page: ReturnType<PDFDocument["addPage"]>,
  font: any,
  c: Record<string, any>,
  bg: any
) {
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

  const v = (text: string | null | undefined, x: number, y: number, size = 9) =>
    val(page as any, font, text, x, y, size);

  // ── Page header bar (plaintiff name + case number repeated top of every page) ─
  // "Plaintiff (list names):" label xMax=130.094, yMax=47.433 → pdf_y=744.6
  v(c.plaintiffName, 132, 745);
  // "Case Number:" label xMax=459.891, yMax=46.829 → pdf_y=745.2
  v(c.caseNumber, 462, 745);

  // ── Item 1 — Plaintiff ────────────────────────────────────────────────────
  // "Name:" label xMax=92.326, yMax=117.763 → pdf_y=674
  v(c.plaintiffName, 95, 674);
  // "Phone:" label xMax=419.899, yMax=118.069 → pdf_y=674
  v(c.plaintiffPhone, 422, 674);

  // Primary address — "Street" sub-label yMin=140.958 → data at pdf_y=792-140.958=651
  v(c.plaintiffAddress, 133, 651);
  v(c.plaintiffCity,    373, 651);
  v(c.plaintiffState || "CA", 476, 651);
  v(c.plaintiffZip,    503, 651);

  // Mailing address — "Street" sub-label yMin=169.793 → pdf_y=622
  if (c.plaintiffMailingAddress) {
    v(c.plaintiffMailingAddress,        197, 622);
    v(c.plaintiffMailingCity,           373, 622);
    v(c.plaintiffMailingState || "CA",  476, 622);
    v(c.plaintiffMailingZip,            503, 622);
  }

  // Email — "Email address (if available):" xMax≈188, yMax=192.207 → pdf_y=600
  v(c.plaintiffEmail, 191, 600);

  // ── Item 2 — Defendant ───────────────────────────────────────────────────
  // "Name:" xMax=92.323, yMax=402.305 → pdf_y=390
  v(c.defendantName, 95, 390);
  // "Phone:" xMax=417.087, yMax=402.614 → pdf_y=390
  v(c.defendantPhone, 420, 390);

  // Primary address — "Street" sub-label yMin=424.905 → pdf_y=367
  v(c.defendantAddress,        133, 367);
  v(c.defendantCity,           372, 367);
  v(c.defendantState || "CA",  473, 367);
  v(c.defendantZip,            500, 367);

  // Mailing address — "Street" sub-label yMin=453.144 → pdf_y=339
  if (c.defendantMailingAddress) {
    v(c.defendantMailingAddress,       215, 339);
    v(c.defendantMailingCity,          372, 339);
    v(c.defendantMailingState || "CA", 473, 339);
    v(c.defendantMailingZip,           500, 339);
  }

  // Agent for service (corporation / LLC / public entity)
  if (c.defendantIsBusinessOrEntity && c.defendantAgentName) {
    // "Name:" xMax=92.323, yMax=508.615 → pdf_y=283
    v(c.defendantAgentName,  95,  283);
    // "Job title, if known:" xMax≈412, yMax=508.921 → pdf_y=283
    v(c.defendantAgentTitle, 413, 283);
    // Agent address street sub-label yMin=531.215 → pdf_y=261
    v(c.defendantAgentStreet,        124, 261);
    v(c.defendantAgentCity,          341, 261);
    v(c.defendantAgentState || "CA", 441, 261);
    v(c.defendantAgentZip,           469, 261);
  }

  // ── Item 3a — Claim amount ────────────────────────────────────────────────
  // "$" at xMin=290.385, yMax=598.050 → pdf_y=194 — amount value just after "$"
  if (c.claimAmount) {
    v(`${Number(c.claimAmount).toFixed(2)}`, 300, 194, 9);
  }

  // 3a.a — Why does the defendant owe? text area
  // "a. Why does the defendant owe..." label yMax=616.121 → pdf_y=176
  // Description lines start below label at pdf_y=163, line height 12, max 8 lines
  if (c.claimDescription) {
    wrapVal(page as any, font, c.claimDescription, 63, 163, 490, 9, 12, 8);
  }
}

/**
 * Page 3 — Items 3b (date), 3c (calculation), 4 (prior demand),
 *           5 (venue), 6 (zip), 7 (atty fee), 8 (public entity).
 */
function drawPage3(
  page: ReturnType<PDFDocument["addPage"]>,
  font: any,
  c: Record<string, any>,
  bg: any
) {
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

  const v = (text: string | null | undefined, x: number, y: number, size = 9) =>
    val(page as any, font, text, x, y, size);
  const xm = (cx: number, cy: number) => xmark(page as any, cx, cy, 5);

  // Page header bar
  v(c.plaintiffName, 132, 745);
  v(c.caseNumber,    462, 745);

  // ── Item 3b — When did this happen? ──────────────────────────────────────
  // "(Date):" xMax=214.716, yMax=101.797 → pdf_y=690
  v(c.incidentDate, 217, 690);
  // "Date started:" xMax≈318.905, yMax=117.947 → pdf_y=674
  v(c.dateStarted, 320, 674);
  // "Through:" xMax=462.965, yMax=117.947 → pdf_y=674
  v(c.dateThrough, 465, 674);

  // ── Item 3c — How did you calculate? ─────────────────────────────────────
  // "c. How did you calculate..." yMax=137.888 → pdf_y=654; text area from pdf_y=642
  if (c.howAmountCalculated) {
    wrapVal(page as any, font, c.howAmountCalculated, 63, 642, 480, 9, 12, 5);
  }

  // ── Item 4 — Prior demand ────────────────────────────────────────────────
  // "Yes" xMin=76.975, yMax=305.229 → pdf_y=487; checkbox center ≈ (70, 492)
  // "No"  xMin=131.518, yMax=305.255 → pdf_y=487; checkbox center ≈ (125, 492)
  if (c.priorDemandMade === true)  xm(70,  492);
  if (c.priorDemandMade === false) xm(125, 492);

  // ── Item 5 — Venue ────────────────────────────────────────────────────────
  const venueBasisMap: Record<string, string> = {
    where_defendant_lives:      "a1",
    where_damage_happened:      "a2",
    where_plaintiff_injured:    "a3",
    where_contract_made_broken: "a4",
    buyer_household_goods:      "b",
    retail_installment:         "c",
    vehicle_finance:            "d",
    other:                      "e",
  };
  // Checkbox centres derived from bbox yMin/yMax midpoints and x positions
  // (1) left col row 1: yMin=412.806, yMax=422.706 → cy=792-417.756=374; cx=90
  // (2) left col row 2: yMin=426.006, yMax=435.906 → cy=792-430.956=361; cx=90
  // (3) left col row 3: yMin=439.206, yMax=449.106 → cy=792-444.156=348; cx=90
  // (4) right col row 1 (same y as 1): xMin=327.927 → cx=321; cy=374
  // b: yMin=468.575, yMax=478.475 → cy=792-473.525=319; cx=67
  // c: yMin=509.136, yMax=519.036 → cy=792-514.086=278; cx=67
  // d: yMin=536.819, yMax=546.719 → cy=792-541.769=250; cx=67
  // e: yMin=564.318, yMax=574.218 → cy=792-569.268=223; cx=67
  const venueCheckboxes: Record<string, [number, number]> = {
    a1: [90,  374],
    a2: [90,  361],
    a3: [90,  348],
    a4: [321, 374],
    b:  [67,  319],
    c:  [67,  278],
    d:  [67,  250],
    e:  [67,  223],
  };
  const vSel = venueBasisMap[c.venueBasis ?? ""];
  if (vSel && venueCheckboxes[vSel]) {
    const [cx, cy] = venueCheckboxes[vSel];
    xm(cx, cy);
  }
  // "Other (specify):" text — "specify):" xMax=165.480, yMax=574.278 → pdf_y=218
  if (vSel === "e" && c.venueReason) {
    v(c.venueReason, 167, 218);
  }

  // ── Item 6 — Venue zip code ───────────────────────────────────────────────
  // After "know):" xMax=410.422, yMax=612.276 → pdf_y=180
  v(c.venueZip, 415, 180);

  // ── Item 7 — Attorney-client fee dispute ──────────────────────────────────
  // "Yes" xMin=370.865, yMax=641.606 → pdf_y=150; checkbox center x=364
  // "No"  xMin=423.584, yMax=641.631 → pdf_y=150; checkbox center x=417
  if (c.isAttyFeeDispute === true)  xm(364, 151);
  if (c.isAttyFeeDispute === false || !c.isAttyFeeDispute) xm(417, 151);
  // Arbitration "check here:" xMax=494.739, yMax=655.989 → pdf_y=136; center x=503
  if (c.isAttyFeeDispute && c.hadArbitration) xm(503, 137);

  // ── Item 8 — Public entity ────────────────────────────────────────────────
  // "Yes" xMin=256.458, yMax=675.837 → pdf_y=116; checkbox center x=250
  // "No"  xMin=309.214, yMax=675.862 → pdf_y=116; checkbox center x=303
  if (c.isSuingPublicEntity === true)  xm(250, 117);
  if (c.isSuingPublicEntity !== true)  xm(303, 117);
  // "A claim was filed on (date):" xMin=420.704, yMax=689.981 → pdf_y=102
  if (c.isSuingPublicEntity && c.publicEntityClaimFiledDate) {
    v(c.publicEntityClaimFiledDate, 453, 102);
  }
}

/**
 * Page 4 — Items 9, 10, 11 + declaration + signature.
 */
function drawPage4(
  page: ReturnType<PDFDocument["addPage"]>,
  font: any,
  c: Record<string, any>,
  bg: any
) {
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

  const v = (text: string | null | undefined, x: number, y: number, size = 9) =>
    val(page as any, font, text, x, y, size);
  const xm = (cx: number, cy: number) => xmark(page as any, cx, cy, 5);

  // Page header bar
  v(c.plaintiffName, 132, 745);
  v(c.caseNumber,    462, 745);

  // ── Item 9 — Filed more than 12 small claims in past 12 months? ──────────
  // "Yes" xMin=77.902, yMax=119.540 → pdf_y=672.5; checkbox center x=71
  // "No"  xMin=128.081, yMax=119.565 → pdf_y=672.4; checkbox center x=122
  if (c.filedMoreThan12Claims === true)  xm(71,  673);
  if (c.filedMoreThan12Claims !== true)  xm(122, 673);

  // ── Item 10 — Claim for more than $2,500? ────────────────────────────────
  // "Yes" xMin=290.058, yMax=142.073 → pdf_y=650; checkbox center x=284
  // "No"  xMin=337.320, yMax=142.099 → pdf_y=650; checkbox center x=331
  if (c.claimOver2500 === true)  xm(284, 650);
  if (c.claimOver2500 !== true)  xm(331, 650);

  // ── Declaration date ──────────────────────────────────────────────────────
  // "Date:" xMax=59.826, yMax=290.934 → pdf_y=501
  const declDate = c.declarationDate
    || new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  v(declDate, 65, 501);

  // ── Plaintiff printed name (on underline above "types or prints" label) ───
  // "Plaintiff types or prints name here" yMin=319.281 → label top pdf_y=473
  // Name goes on the underline slightly above, at approximately pdf_y=476
  v(c.plaintiffName, 36, 476);
}

// ─── Main route ───────────────────────────────────────────────────────────────
router.get("/cases/:id/forms/sc100", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;

  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  try {
    const pdfDoc = await PDFDocument.create();
    const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const caseData = c as unknown as Record<string, any>;

    // Load official SC-100 PNG backgrounds (200 DPI renders of pages 1-4)
    const assetDir = path.join(__dirname, "..", "assets");
    const bgImages = await Promise.all(
      [1, 2, 3, 4].map(async (i) => {
        const bytes = fs.readFileSync(path.join(assetDir, `sc100_hq-${i}.png`));
        return pdfDoc.embedPng(bytes);
      })
    );

    // Page 1 — cover / instructions (pure PNG, no data)
    const p1 = pdfDoc.addPage([PW, PH]);
    drawPage1(p1, bgImages[0]);

    // Page 2 — items 1, 2, 3a
    const p2 = pdfDoc.addPage([PW, PH]);
    drawPage2(p2, font, caseData, bgImages[1]);

    // Page 3 — items 3b-8
    const p3 = pdfDoc.addPage([PW, PH]);
    drawPage3(p3, font, caseData, bgImages[2]);

    // Page 4 — items 9-11, declaration, signature
    const p4 = pdfDoc.addPage([PW, PH]);
    drawPage4(p4, font, caseData, bgImages[3]);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC100-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100 PDF generation error:", err?.message ?? err, err?.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate SC-100 PDF. Please try again." });
    }
  }
});

// ─── Preview / data endpoint ──────────────────────────────────────────────────
router.get("/cases/:id/forms/sc100/preview", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;

  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  const caseData = c as unknown as Record<string, any>;
  res.json({
    plaintiffName:              caseData.plaintiffName,
    plaintiffAddress:           [caseData.plaintiffAddress, caseData.plaintiffCity, caseData.plaintiffState, caseData.plaintiffZip].filter(Boolean).join(", "),
    plaintiffPhone:             caseData.plaintiffPhone,
    plaintiffEmail:             caseData.plaintiffEmail,
    defendantName:              caseData.defendantName,
    defendantAddress:           [caseData.defendantAddress, caseData.defendantCity, caseData.defendantState, caseData.defendantZip].filter(Boolean).join(", "),
    defendantPhone:             caseData.defendantPhone,
    defendantIsBusinessOrEntity: caseData.defendantIsBusinessOrEntity,
    defendantAgentName:         caseData.defendantAgentName,
    claimAmount:                caseData.claimAmount,
    claimType:                  caseData.claimType,
    claimDescription:           caseData.claimDescription,
    incidentDate:               caseData.incidentDate,
    howAmountCalculated:        caseData.howAmountCalculated,
    priorDemandMade:            caseData.priorDemandMade,
    priorDemandDescription:     caseData.priorDemandDescription,
    venueBasis:                 caseData.venueBasis,
    venueReason:                caseData.venueReason,
    countyId:                   caseData.countyId,
    isSuingPublicEntity:        caseData.isSuingPublicEntity,
    publicEntityClaimFiledDate: caseData.publicEntityClaimFiledDate,
    isAttyFeeDispute:           caseData.isAttyFeeDispute,
    filedMoreThan12Claims:      caseData.filedMoreThan12Claims,
    claimOver2500:              caseData.claimOver2500,
  });
});

export default router;
