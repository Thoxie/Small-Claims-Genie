import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getOwnedCase } from "../lib/owned-case";
import {
  PW, PH,
  loadAsset, today,
  resolveDownloadUser, val, xmark, wrapVal,
} from "./forms-common";

const router: IRouter = Router();

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

  const signerName = d.plaintiffIsBusiness && d.secondPlaintiffName
    ? d.secondPlaintiffName : (d.plaintiffName || "");
  const signerTitle = d.plaintiffTitle || "";

  const countyDisplay = String(d.countyId || "")
    .split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");

  const benefitsText = String(b.benefits || "").toLowerCase();
  const hasBenefit = (keywords: string[]) => keywords.some(k => benefitsText.includes(k));

  const basis = b.eligibilityBasis || "5a";
  const signDate = b.signDate || today();

  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const bg1 = await pdfDoc.embedPng(loadAsset("fw001_hq-1.png"));
    const LIFT = 4.5;
    const p1  = pdfDoc.addPage([PW, PH]);
    p1.drawImage(bg1, { x: 0, y: 0, width: PW, height: PH });
    const v1 = (t: any, x: number, y: number, s = 9) => val(p1, font, t, x, y + LIFT, s);
    const xm1 = (cx: number, cy: number, sz = 5) => xmark(p1, cx, cy + LIFT, sz);

    v1(signerName + (signerTitle ? `, ${signerTitle}` : ""), 35, 755, 8);
    const addrLine = [d.plaintiffAddress, d.plaintiffCity, (d.plaintiffState || "CA"), d.plaintiffZip].filter(Boolean).join(", ");
    v1(addrLine, 35, 740, 8);
    v1(d.plaintiffPhone || "", 35, 717, 8);

    v1(countyDisplay, 385, 712, 8);
    if (d.courthouseAddress) v1(d.courthouseAddress, 285, 699, 8);
    if (d.courthouseCity || d.courthouseZip) {
      v1([d.courthouseCity, "CA", d.courthouseZip].filter(Boolean).join(" "), 285, 688, 8);
    }
    if (d.courthouseName) v1(d.courthouseName, 285, 678, 8);

    v1(d.plaintiffName || "", 285, 659, 8);
    v1(d.defendantName || "", 285, 645, 8);
    v1(d.caseNumber || "", 450, 659, 8);

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

    v1(caseName, 340, 556, 8);

    xm1(40, 536, 5);

    if (basis === "5a") xm1(40, 510, 5);
    if (basis === "5b") xm1(40, 460, 5);
    if (basis === "5c") xm1(40, 378, 5);

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

    if (basis === "5b" && b.grossMonthlyIncome) {
      v1(`$${Number(b.grossMonthlyIncome).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`, 270, 448, 8);
    }

    if (basis === "5c") {
      xm1(55, 366, 4);
    }

    v1(signDate, 95, 276, 9);
    v1(signerName + (signerTitle ? `, ${signerTitle}` : ""), 75, 257, 9);
    xm1(207, 254, 4);

    if (basis === "5b" || basis === "5c") {
      const bg2 = await pdfDoc.embedPng(loadAsset("fw001_hq-2.png"));
      const p2  = pdfDoc.addPage([PW, PH]);
      p2.drawImage(bg2, { x: 0, y: 0, width: PW, height: PH });
      const v2 = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y + LIFT, s);

      v2(signerName, 90, 762, 8);
      v2(d.caseNumber || "", 450, 762, 8);

      if (b.grossMonthlyIncome) {
        v2("Employment / other income", 55, 718, 8);
        v2(`$${Number(b.grossMonthlyIncome).toFixed(2)}`, 390, 718, 8);
        v2(`$${Number(b.grossMonthlyIncome).toFixed(2)}`, 390, 680, 8);
      }

      const fmt$ = (v: any) => v ? `$${Number(v).toFixed(2)}` : "";
      if (b.monthlyRent)           v2(fmt$(b.monthlyRent),           430, 494, 8);
      if (b.monthlyFood)           v2(fmt$(b.monthlyFood),           430, 480, 8);
      if (b.monthlyUtilities)      v2(fmt$(b.monthlyUtilities),      430, 466, 8);
      if (b.monthlyTransportation) v2(fmt$(b.monthlyTransportation), 430, 410, 8);
      if (b.monthlyMedical)        v2(fmt$(b.monthlyMedical),        430, 397, 8);

      if (b.monthlyOther) {
        wrapVal(p2, font, String(b.monthlyOther), 285, 362, 290, 8, 11, 3);
      }

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
    req.log.error({ err }, "FW-001 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate FW-001 PDF." });
  }
});

export default router;
