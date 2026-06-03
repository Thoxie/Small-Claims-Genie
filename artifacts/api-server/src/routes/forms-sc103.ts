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
  try {
    const body = (req.body ?? {}) as Record<string, any>;
    // Body params from "Edit Fields" modal override case-record values
    const bv = (bodyKey: string, fallback: any) => (body[bodyKey] != null && body[bodyKey] !== "") ? body[bodyKey] : fallback;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc103_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const XLIFT = 14;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + XLIFT, 5);

    if (d.caseNumber) v(d.caseNumber, 404, 730);

    // Attached to — SC-100 (x=193) or SC-120 (x=363)
    const attachedTo = bv("attachedTo", "sc100");
    xm(attachedTo === "sc120" ? 363 : 193, 696);

    // Section 1 — business info (body overrides case record)
    const bizName = bv("businessName", d.plaintiffDbaName || d.plaintiffName);
    const bizAddrParts = [d.plaintiffDbaAddress, d.plaintiffDbaCity, d.plaintiffDbaState, d.plaintiffDbaZip].filter(Boolean);
    const bizAddr = bv("businessAddress", bizAddrParts.join(", "));
    const mailingAddr = bv("mailingAddress", d.plaintiffDbaMailingAddress);
    if (bizName) v(bizName, 225, 626);
    if (bizAddr) v(bizAddr, 314, 609);
    if (mailingAddr) v(mailingAddr, 207, 592);

    // Section 2 — business type
    const typeMap: Record<string, [number, number]> = {
      individual:  [68, 543],  corporation: [237, 543],
      association: [68, 529],  llc:         [237, 529],
      partnership: [68, 516],  other:       [237, 516],
    };
    const bizType = bv("businessType", d.plaintiffBusinessType ?? "");
    const sel = typeMap[bizType];
    if (sel) xm(sel[0], sel[1]);
    const bizTypeOther = bv("businessTypeOther", d.plaintiffBusinessTypeOther);
    if (bizType === "other" && bizTypeOther) v(bizTypeOther, 421, 516);

    // Sections 4–5 — FBN statement details
    const fbnCounty = bv("fbnCounty", d.plaintiffFbnCounty || "");
    const fbnNumber = bv("fbnNumber", d.plaintiffFbnNumber);
    const fbnExpiry = bv("fbnExpiry", d.plaintiffFbnExpiry);
    if (fbnCounty) v(fbnCounty, 65, 450);
    if (fbnNumber) v(fbnNumber, 365, 412);
    if (fbnExpiry) v(fbnExpiry, 389, 383);

    // Section 6 — signature
    const signDate = bv("signDate", d.plaintiffFbnSignDate || today());
    const signerName = bv("signerName",
      d.plaintiffIsBusiness ? (d.secondPlaintiffName || d.plaintiffName) : d.plaintiffName
    );
    const signerLine = [signerName, d.plaintiffTitle].filter(Boolean).join(", ");
    v(signDate, 91, 277);
    v(signerLine || d.plaintiffName, 67, 247);

    // Handwritten signature image (optional)
    const sig1DataUrl = body.signature1DataUrl as string | undefined;
    if (sig1DataUrl) {
      try {
        const sigBytes = Buffer.from(sig1DataUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
        const sigImg = await pdfDoc.embedPng(sigBytes);
        const { width: sw, height: sh } = sigImg.size();
        const scale = Math.min(200 / sw, 30 / sh);
        page.drawImage(sigImg, { x: 350, y: 260, width: sw * scale, height: sh * scale });
      } catch { /* ignore signature draw errors */ }
    }

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

// ─── SC-103 Fictitious Business Name — Plaintiff 2 (Secondary/Additional Plaintiff) ──
router.post("/cases/:id/forms/sc103-secondary", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  try {
    const body = (req.body ?? {}) as Record<string, any>;
    const bv = (bodyKey: string, fallback: any) => (body[bodyKey] != null && body[bodyKey] !== "") ? body[bodyKey] : fallback;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bg = await pdfDoc.embedPng(loadAsset("sc103_hq-1.png"));
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    const LIFT = 4.5;
    const XLIFT = 14;
    const v = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
    const xm = (cx: number, cy: number) => xmark(page, cx, cy + XLIFT, 5);

    if (d.caseNumber) v(d.caseNumber, 404, 730);

    // Attached to — SC-100 (x=193) or SC-120 (x=363)
    const attachedTo = bv("attachedTo", "sc100");
    xm(attachedTo === "sc120" ? 363 : 193, 696);

    // Section 1 — secondary plaintiff business info
    const bizName = bv("businessName", d.secondPlaintiffDbaName);
    const bizAddrParts = [d.secondPlaintiffDbaAddress, d.secondPlaintiffDbaCity, d.secondPlaintiffDbaState, d.secondPlaintiffDbaZip].filter(Boolean);
    const bizAddr = bv("businessAddress", bizAddrParts.join(", "));
    const mailingAddr = bv("mailingAddress", d.secondPlaintiffDbaMailingAddress);
    if (bizName) v(bizName, 225, 626);
    if (bizAddr) v(bizAddr, 314, 609);
    if (mailingAddr) v(mailingAddr, 207, 592);

    // Section 2 — business type
    const typeMap: Record<string, [number, number]> = {
      individual:  [68, 543],  corporation: [237, 543],
      association: [68, 529],  llc:         [237, 529],
      partnership: [68, 516],  other:       [237, 516],
    };
    const bizType = bv("businessType", d.secondPlaintiffBusinessType ?? "");
    const sel = typeMap[bizType];
    if (sel) xm(sel[0], sel[1]);
    const bizTypeOther = bv("businessTypeOther", d.secondPlaintiffBusinessTypeOther);
    if (bizType === "other" && bizTypeOther) v(bizTypeOther, 421, 516);

    // Sections 4–5 — FBN statement details
    const fbnCounty = bv("fbnCounty", d.secondPlaintiffFbnCounty || "");
    const fbnNumber = bv("fbnNumber", d.secondPlaintiffFbnNumber);
    const fbnExpiry = bv("fbnExpiry", d.secondPlaintiffFbnExpiry);
    if (fbnCounty) v(fbnCounty, 65, 450);
    if (fbnNumber) v(fbnNumber, 365, 412);
    if (fbnExpiry) v(fbnExpiry, 389, 383);

    // Section 6 — signature (signer = the additional plaintiff individual)
    const signDate = bv("signDate", d.secondPlaintiffFbnSignDate || today());
    const signerName = bv("signerName", d.additionalPlaintiffName);
    const signerLine = [signerName, d.secondPlaintiffTitle].filter(Boolean).join(", ");
    v(signDate, 91, 277);
    v(signerLine || d.additionalPlaintiffName, 67, 247);

    // Handwritten signature image (optional)
    const sig1DataUrl = body.signature1DataUrl as string | undefined;
    if (sig1DataUrl) {
      try {
        const sigBytes = Buffer.from(sig1DataUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
        const sigImg = await pdfDoc.embedPng(sigBytes);
        const { width: sw, height: sh } = sigImg.size();
        const scale = Math.min(200 / sw, 30 / sh);
        page.drawImage(sigImg, { x: 350, y: 260, width: sw * scale, height: sh * scale });
      } catch { /* ignore signature draw errors */ }
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC103B-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "SC-103 secondary PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-103 PDF." });
  }
});

export default router;
