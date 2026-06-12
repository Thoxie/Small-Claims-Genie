/**
 * SC-104 Proof of Service — AcroForm definition.
 *
 * Moved from forms-sc104.ts; the PDF generation logic is unchanged.
 */

import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import { pdftkFlatten } from "../acroform-filler";
import { buildCourtInfo, formatDate, formatTime } from "../enrichment";
import { loadAsset } from "../../routes/forms-common";

function setField(form: any, name: string, value: string) {
  try {
    const f = form.getTextField(name);
    f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 9 Tf 0 g"));
    f.setText(value || "");
  } catch { /* field not found — skip silently */ }
}

function checkBox(form: any, name: string, checked: boolean) {
  try {
    if (checked) form.getCheckBox(name).check();
    else form.getCheckBox(name).uncheck();
  } catch { /* skip */ }
}

export async function buildSC104Pdf(
  d: Record<string, any>,
  b: Record<string, any>,
  sigBytes?: Buffer
): Promise<Buffer> {
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  const courtInfo = buildCourtInfo(d);

  const serviceStreet = d.defendantAddress || "";
  const serviceCity   = d.defendantCity    || "";
  const serviceState  = d.defendantState   || "CA";
  const serviceZip    = d.defendantZip     || "";

  const acroBytes = loadAsset("forms/sc104_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  setField(form, "SC-104[0].Page1[0].RightCaption[0].CourtInfo[0]",  courtInfo);
  setField(form, "SC-104[0].Page1[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
  setField(form, "SC-104[0].Page1[0].RightCaption[0].CaseName[0]",   caseName);
  setField(form, "SC-104[0].Page1[0].RightCaption[0].Hearindate[0]", formatDate(d.hearingDate) || "");
  setField(form, "SC-104[0].Page1[0].RightCaption[0].Time[0]",       formatTime(d.hearingTime) || "");
  setField(form, "SC-104[0].Page1[0].RightCaption[0].Dept[0]",       d.hearingCourtroom || "");

  const isBusiness = !!d.defendantIsBusinessOrEntity;
  if (isBusiness) {
    setField(form, "SC-104[0].Page1[0].List1[0].Lia[0].FullName[0]",  "");
    setField(form, "SC-104[0].Page1[0].List1[0].Lib[0].FullName1[0]", d.defendantName || "");
    setField(form, "SC-104[0].Page1[0].List1[0].Lib[0].FullName2[0]", "");
  } else {
    setField(form, "SC-104[0].Page1[0].List1[0].Lia[0].FullName[0]",  d.defendantName || "");
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

  return pdftkFlatten(Buffer.from(await pdfDoc.save()));
}

const sc104Definition: FormDefinition = {
  state: "CA",
  formId: "SC-104",
  renderingTechnique: "acroform-pdflib",
  async generate(d, b, opts) {
    return buildSC104Pdf(d, b, opts?.signatureBytes);
  },
};

FormRegistry.register(sc104Definition);
