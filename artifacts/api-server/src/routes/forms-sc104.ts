import { Router, type IRouter } from "express";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { getOwnedCase, getUserId } from "../lib/owned-case";
import { requireAuth } from "../middlewares/auth";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CALIFORNIA_COUNTIES } from "./counties";
import {
  loadAsset,
  formatDateDisplay, formatTimeDisplay,
  resolveDownloadUser,
} from "./forms-common";

const router: IRouter = Router();

// ─── SC-104 Proof of Service (AcroForm fill) ─────────────────────────────────
async function buildSC104Pdf(
  d: Record<string, any>,
  b: Record<string, any>,
  sigBytes?: Buffer,
): Promise<Uint8Array> {
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");

  const county = CALIFORNIA_COUNTIES.find((cc: any) => cc.id === d.countyId);
  const courtInfoLines: string[] = [];
  if (county) {
    courtInfoLines.push(county.name);
    if (county.courthouseName)    courtInfoLines.push(county.courthouseName);
    if (county.courthouseAddress) courtInfoLines.push(county.courthouseAddress);
    const cityZip = [county.courthouseCity, county.courthouseZip ? `CA ${county.courthouseZip}` : null].filter(Boolean).join(", ");
    if (cityZip) courtInfoLines.push(cityZip);
  } else {
    if (d.courthouseName)    courtInfoLines.push(d.courthouseName);
    if (d.courthouseAddress) courtInfoLines.push(d.courthouseAddress);
  }
  const courtInfo = courtInfoLines.join("\n");

  const serviceStreet = d.defendantAddress || "";
  const serviceCity   = d.defendantCity    || "";
  const serviceState  = d.defendantState   || "CA";
  const serviceZip    = d.defendantZip     || "";

  function setField(form: any, name: string, value: string) {
    try {
      const f = form.getTextField(name);
      f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 9 Tf 0 g"));
      f.setText(value || "");
    } catch { /* field not found — skip silently */ }
  }
  function checkBox(form: any, name: string, checked: boolean) {
    try { if (checked) form.getCheckBox(name).check(); else form.getCheckBox(name).uncheck(); } catch { /* skip */ }
  }

  const acroBytes = loadAsset("forms/sc104_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  setField(form, "SC-104[0].Page1[0].RightCaption[0].CourtInfo[0]",  courtInfo);
  setField(form, "SC-104[0].Page1[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
  setField(form, "SC-104[0].Page1[0].RightCaption[0].CaseName[0]",   caseName);
  setField(form, "SC-104[0].Page1[0].RightCaption[0].Hearindate[0]", formatDateDisplay(d.hearingDate) || "");
  setField(form, "SC-104[0].Page1[0].RightCaption[0].Time[0]",       formatTimeDisplay(d.hearingTime) || "");
  setField(form, "SC-104[0].Page1[0].RightCaption[0].Dept[0]",       d.hearingCourtroom || "");

  const isBusiness = !!d.defendantIsBusinessOrEntity;
  if (isBusiness) {
    setField(form, "SC-104[0].Page1[0].List1[0].Lia[0].FullName[0]", "");
    setField(form, "SC-104[0].Page1[0].List1[0].Lib[0].FullName1[0]", d.defendantName || "");
    setField(form, "SC-104[0].Page1[0].List1[0].Lib[0].FullName2[0]", "");
  } else {
    setField(form, "SC-104[0].Page1[0].List1[0].Lia[0].FullName[0]", d.defendantName || "");
    setField(form, "SC-104[0].Page1[0].List1[0].Lib[0].FullName1[0]", "");
    setField(form, "SC-104[0].Page1[0].List1[0].Lib[0].FullName2[0]", "");
  }

  checkBox(form, "SC-104[0].Page1[0].List3[0].Lia[0].Filed_cb[0]", true);
  const otherDocs: string[] = [];
  if (d.mc030DeclarationTitle) otherDocs.push("MC-030, Declaration");
  if (otherDocs.length > 0) {
    checkBox(form, "SC-104[0].Page1[0].List3[0].Lid[0].NotYet_cb[0]", true);
    setField(form, "SC-104[0].Page1[0].List3[0].Lid[0].T1865[0]", otherDocs.join("; "));
  }

  setField(form, "SC-104[0].Page2[0].PxCaption[0].CaseName[0]",   caseName);
  setField(form, "SC-104[0].Page2[0].PxCaption[0].CaseNumber[0]", d.caseNumber || "");

  if (serviceStreet) {
    setField(form, "SC-104[0].Page2[0].List4[0].Lia[0].RestrainedStreet_ft2[0]", serviceStreet);
    setField(form, "SC-104[0].Page2[0].List4[0].Lia[0].RestrainedCity_ft2[0]",   serviceCity);
    setField(form, "SC-104[0].Page2[0].List4[0].Lia[0].RestrainedState_ft2[0]",  serviceState);
    setField(form, "SC-104[0].Page2[0].List4[0].Lia[0].RestrainedZip_ft2[0]",    serviceZip);
  }

  if (sigBytes) {
    const pages = pdfDoc.getPages();
    const p2 = pages[1];
    if (p2) {
      const sigImg = await pdfDoc.embedPng(sigBytes);
      const { width: sw, height: sh } = sigImg.scale(1);
      const maxW = 200, maxH = 38;
      const scale = Math.min(maxW / sw, maxH / sh, 1);
      p2.drawImage(sigImg, { x: 334, y: 83, width: sw * scale, height: sh * scale });
    }
  }

  return pdfDoc.save();
}

router.post("/cases/:id/forms/sc104", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  try {
    const pdfBytes = await buildSC104Pdf(d, b);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC-104_Proof_of_Service_prefilled.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "SC-104 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-104 PDF." });
  }
});

router.post("/cases/:id/forms/sc104/signed", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  const { signatureDataUrl } = b as { signatureDataUrl?: string };
  function toBytes(dataUrl: string | undefined): Buffer | undefined {
    if (!dataUrl) return undefined;
    return Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
  }
  try {
    const pdfBytes = await buildSC104Pdf(d, b, toBytes(signatureDataUrl));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="SC-104_Proof_of_Service_prefilled-signed.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "SC-104 signed PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate signed SC-104 PDF." });
  }
});

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

export default router;
