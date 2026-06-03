import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getOwnedCase } from "../lib/owned-case";
import {
  PW, PH,
  loadAsset, today,
  resolveDownloadUser, val, xmark, wrapVal,
} from "./forms-common";

const router: IRouter = Router();

// ─── SC-150 Request to Postpone Trial ────────────────────────────────────────
router.post("/cases/:id/forms/sc150", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
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

    v(b.courtStreet || d.courthouseAddress || d.courthouseName || "", 376, 606);
    v(d.caseNumber, 376, 549);
    v(caseName, 376, 505);

    v(b.requestingPartyName || d.plaintiffName, 180, 718);
    v(b.requestingPartyAddress, 180, 705);
    v(b.requestingPartyPhone, 180, 688);
    if (b.requestingPartyRole === "plaintiff") xm(140, 665);
    if (b.requestingPartyRole === "defendant") xm(176, 665);

    v(b.currentTrialDate, 240, 643);
    v(b.postponeUntilDate, 200, 619);
    wrapVal(page, font, b.postponeReason, 63, 581, 490, 9, 13, 5);
    wrapVal(page, font, b.withinTenDaysReason, 63, 497, 490, 9, 13, 4);

    v(b.signDate || today(), 72, 168);
    v(b.requestingPartyName || d.plaintiffName, 45, 147);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC150-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "SC-150 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-150 PDF." });
  }
});

export default router;
