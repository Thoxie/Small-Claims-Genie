import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getOwnedCase } from "../lib/owned-case";
import {
  PW, PH,
  loadAsset, today,
  resolveDownloadUser, val, xmark,
} from "./forms-common";

const router: IRouter = Router();

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
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc103_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

    if (d.caseNumber) v(d.caseNumber, 404, 730);

    if (b.attachedTo === "sc100") xm(193, 696);
    else if (b.attachedTo === "sc120") xm(287, 696);

    if (b.businessName)    v(b.businessName,    225, 626);
    if (b.businessAddress) v(b.businessAddress, 314, 609);
    if (b.mailingAddress)  v(b.mailingAddress,  207, 592);

    const typeMap: Record<string, [number, number]> = {
      individual:  [68, 543],  corporation: [237, 543],
      association: [68, 529],  llc:         [237, 529],
      partnership: [68, 516],  other:       [237, 516],
    };
    const sel = typeMap[b.businessType ?? ""];
    if (sel) xm(sel[0], sel[1]);
    if (b.businessType === "other" && b.businessTypeOther) v(b.businessTypeOther, 421, 516);

    if (b.fbnCounty) v(b.fbnCounty, 66, 439);
    if (b.fbnNumber) v(b.fbnNumber, 365, 412);
    if (b.fbnExpiry) v(b.fbnExpiry, 389, 383);

    v(b.signDate || today(), 91, 277);
    v(b.signerName || d.plaintiffName, 67, 247);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC103-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "SC-103 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-103 PDF." });
  }
});

export default router;
