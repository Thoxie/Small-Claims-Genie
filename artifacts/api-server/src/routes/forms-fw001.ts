import { Router, type IRouter } from "express";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { getOwnedCase } from "../lib/owned-case";
import { CALIFORNIA_COUNTIES } from "./counties";
import {
  loadAsset,
  resolveDownloadUser,
} from "./forms-common";

const router: IRouter = Router();

// ─── FW-001 Request to Waive Court Fees (AcroForm fill) ──────────────────────

function setField(form: any, name: string, value: string) {
  try {
    const f = form.getTextField(name);
    f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 9 Tf 0 g"));
    f.setText(value || "");
  } catch { /* field not found — skip */ }
}

function checkBox(form: any, name: string, checked: boolean) {
  try {
    if (checked) form.getCheckBox(name).check();
    else form.getCheckBox(name).uncheck();
  } catch { /* skip */ }
}


router.post("/cases/:id/forms/fw001", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  const d = c as unknown as Record<string, any>;

  const signerName = (d.plaintiffIsBusiness && d.secondPlaintiffName)
    ? d.secondPlaintiffName
    : (d.plaintiffName || "");
  const signerTitle = d.plaintiffTitle || "";
  const fullSignerName = signerName + (signerTitle ? `, ${signerTitle}` : "");

  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");

  const county = CALIFORNIA_COUNTIES.find((cc: any) => cc.id === d.countyId);
  const courtInfoLines: string[] = [];
  if (county) {
    courtInfoLines.push(`Superior Court of California, County of ${county.name}`);
    if (county.courthouseName)    courtInfoLines.push(county.courthouseName);
    if (county.courthouseAddress) courtInfoLines.push(county.courthouseAddress);
    const cityZip = [county.courthouseCity, county.courthouseZip ? `CA ${county.courthouseZip}` : null].filter(Boolean).join(", ");
    if (cityZip) courtInfoLines.push(cityZip);
  } else {
    if (d.courthouseName)    courtInfoLines.push(d.courthouseName);
    if (d.courthouseAddress) courtInfoLines.push(d.courthouseAddress);
    if (d.courthouseCity)    courtInfoLines.push([d.courthouseCity, "CA", d.courthouseZip].filter(Boolean).join(" "));
  }
  const courtInfo = courtInfoLines.join("\n");

  try {
    const acroBytes = loadAsset("forms/fw001_acroform.pdf");
    const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    // ── Page 1 caption ────────────────────────────────────────────────────────
    setField(form, "FW-001[0].Page1[0].RightCaption[0].CourtInfo[0]",  courtInfo);
    setField(form, "FW-001[0].Page1[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
    setField(form, "FW-001[0].Page1[0].RightCaption[0].CaseName[0]",   caseName);

    // ── Item 1 — petitioner info ──────────────────────────────────────────────
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerName1[0]",      signerName);
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerStrAddress[0]", d.plaintiffAddress || "");
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerCity[0]",       d.plaintiffCity    || "");
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerState[0]",      d.plaintiffState   || "CA");
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerZip[0]",        d.plaintiffZip     || "");
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerTel[0]",        d.plaintiffPhone   || "");

    // ── Item 2 — job info (if available from intake) ──────────────────────────
    if (d.plaintiffOccupation) setField(form, "FW-001[0].Page1[0].List2[0].item2[0].ApplicantJob[0]", d.plaintiffOccupation);
    if (d.plaintiffEmployer)   setField(form, "FW-001[0].Page1[0].List2[0].item2[0].EmployerName[0]", d.plaintiffEmployer);

    // ── Item 4 — Superior Court checkbox (always true for small claims) ───────
    checkBox(form, "FW-001[0].Page1[0].List4[0].item4[0].WaiveSuperiorCrtFee[0]", true);

    // ── Signature — print name only; user dates and signs when filing ─────────
    setField(form, "FW-001[0].Page1[0].Sign[0].PetitionerName[0]", fullSignerName);

    // ── Page 2 header — name and case number pre-filled for convenience ───────
    setField(form, "FW-001[0].Page2[0].pXCaption[0].PetitionerName1[0]", signerName);
    setField(form, "FW-001[0].Page2[0].pXCaption[0].CaseNumber[0]",      d.caseNumber || "");

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="FW001-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "FW-001 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate FW-001 PDF." });
  }
});

export default router;
