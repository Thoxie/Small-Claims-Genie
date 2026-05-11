import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getOwnedCase } from "../lib/owned-case";
import {
  PW, PH,
  loadAsset, today,
  resolveDownloadUser, val, xmark, wrapVal,
} from "./forms-common";

const router: IRouter = Router();

// ─── SC-120 Defendant's Claim and ORDER (3 pages) ─────────────────────────────
router.post("/cases/:id/forms/sc120", async (req, res): Promise<void> => {
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
    const [bg1, bg2, bg3] = await Promise.all([
      pdfDoc.embedPng(loadAsset("sc120_hq-1.png")),
      pdfDoc.embedPng(loadAsset("sc120_hq-2.png")),
      pdfDoc.embedPng(loadAsset("sc120_hq-3.png")),
    ]);

    pdfDoc.addPage([PW, PH]).drawImage(bg1, { x: 0, y: 0, width: PW, height: PH });

    const LIFT = 4.5;
    const p2 = pdfDoc.addPage([PW, PH]);
    p2.drawImage(bg2, { x: 0, y: 0, width: PW, height: PH });
    const v2 = (t: any, x: number, y: number, s = 9) => val(p2, font, t, x, y + LIFT, s);

    v2(d.defendantName, 72, 754);
    v2(d.caseNumber, 425, 754);
    if (d.courthouseName) v2(d.courthouseName, 250, 754, 8);
    if (d.courthouseAddress) v2(d.courthouseAddress, 250, 742, 8);

    v2(d.plaintiffName, 72, 688); v2(d.plaintiffPhone, 448, 688);
    v2(d.plaintiffAddress, 72, 670);
    v2(d.plaintiffCity, 283, 670); v2(d.plaintiffState || "CA", 445, 670); v2(d.plaintiffZip, 508, 670);
    if (d.plaintiffMailingAddress) {
      v2(d.plaintiffMailingAddress, 72, 647);
      v2(d.plaintiffMailingCity, 283, 647); v2(d.plaintiffMailingState || "CA", 445, 647); v2(d.plaintiffMailingZip, 508, 647);
    }

    v2(d.defendantName, 72, 523); v2(d.defendantPhone, 448, 523);
    v2(d.defendantAddress, 72, 505);
    v2(d.defendantCity, 283, 505); v2(d.defendantState || "CA", 445, 505); v2(d.defendantZip, 508, 505);
    if (d.defendantMailingAddress) {
      v2(d.defendantMailingAddress, 72, 482);
      v2(d.defendantMailingCity, 283, 482); v2(d.defendantMailingState || "CA", 445, 482); v2(d.defendantMailingZip, 508, 482);
    }

    if (b.counterClaimAmount) v2(Number(b.counterClaimAmount).toFixed(2), 385, 352);
    if (b.counterClaimReason) wrapVal(p2, font, b.counterClaimReason, 63, 320 + LIFT, 490, 9, 12, 5);
    v2(b.counterClaimDate || "", 345, 256);
    if (b.counterClaimReason) wrapVal(p2, font, b.counterClaimHowCalculated || "", 63, 225 + LIFT, 490, 9, 12, 4);

    const p3 = pdfDoc.addPage([PW, PH]);
    p3.drawImage(bg3, { x: 0, y: 0, width: PW, height: PH });
    const v3 = (t: any, x: number, y: number, s = 9) => val(p3, font, t, x, y + LIFT, s);
    const xm3 = (cx: number, cy: number) => xmark(p3, cx, cy + LIFT, 5);

    v3(d.defendantName, 72, 754);
    v3(d.caseNumber, 425, 754);

    if (b.priorDemand === true || b.priorDemand === "true") xm3(185, 720); else xm3(211, 720);
    if (b.attyFeeDispute === true || b.attyFeeDispute === "true") xm3(199, 672); else xm3(225, 672);
    if (b.suingPublicEntity === true || b.suingPublicEntity === "true") xm3(160, 624); else xm3(186, 624);
    if (b.moreThan12 === true || b.moreThan12 === "true") xm3(48, 553); else xm3(74, 553);

    v3(b.signDate || today(), 72, 400);
    v3(d.defendantName, 200, 380);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC120-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "SC-120 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-120 PDF." });
  }
});

export default router;
