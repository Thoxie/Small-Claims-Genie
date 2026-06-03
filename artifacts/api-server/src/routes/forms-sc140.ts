import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getOwnedCase } from "../lib/owned-case";
import {
  PW, PH,
  loadAsset,
  resolveDownloadUser, val, xmark,
} from "./forms-common";

const router: IRouter = Router();

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
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc140_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

    v(b.courtName || d.courthouseName || d.courthouseAddress || "", 285, 754);
    v(d.caseNumber, 900 * 0.24, 745);

    v(d.plaintiffName, 72, 725);
    v(d.plaintiffPhone, 72, 707);
    v(d.defendantName, 350, 725);
    v(d.defendantPhone, 350, 707);

    if (b.appellantRole === "plaintiff") xm(120, 554);
    if (b.appellantRole === "defendant") xm(120, 537);

    if (b.appealType === "judgment") xm(49, 460);
    if (b.appealType === "motion_to_vacate") xm(252, 460);

    v(b.appealFiledDate, 72, 430);
    v(b.appellantName || (b.appellantRole === "plaintiff" ? d.plaintiffName : d.defendantName), 72, 387);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC140-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "SC-140 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-140 PDF." });
  }
});

export default router;
