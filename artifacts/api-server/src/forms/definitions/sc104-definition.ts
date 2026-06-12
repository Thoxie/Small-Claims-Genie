/**
 * SC-104 Proof of Service — AcroForm definition.
 *
 * Moved from forms-sc104.ts; the PDF generation logic is unchanged.
 */

import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import type { FormDefinition, CaseData, FormBody } from "../registry";
import { FormRegistry } from "../registry";
import { pdftkFlatten } from "../acroform-filler";
import { buildCourtInfo, formatDate, formatTime } from "../enrichment";
import { loadAsset } from "../../routes/forms-common";
import { SC104_FIELDS } from "../field-names/sc104-fields";

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
  d: CaseData,
  b: FormBody,
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

  const F = SC104_FIELDS;

  setField(form, F.text.courtInfo,   courtInfo);
  setField(form, F.text.caseNumber,  d.caseNumber || "");
  setField(form, F.text.caseName,    caseName);
  setField(form, F.text.hearingDate, formatDate(d.hearingDate) || "");
  setField(form, F.text.hearingTime, formatTime(d.hearingTime) || "");
  setField(form, F.text.dept,        d.hearingCourtroom || "");

  const isBusiness = !!d.defendantIsBusinessOrEntity;
  if (isBusiness) {
    setField(form, F.text.servedIndividualName, "");
    setField(form, F.text.servedBusinessName,   d.defendantName || "");
    setField(form, F.text.servedBusinessRep,    "");
  } else {
    setField(form, F.text.servedIndividualName, d.defendantName || "");
    setField(form, F.text.servedBusinessName,   "");
    setField(form, F.text.servedBusinessRep,    "");
  }

  checkBox(form, F.checkboxes.filedAtSameTime, true);
  const otherDocs: string[] = [];
  if (d.mc030DeclarationTitle) otherDocs.push("MC-030, Declaration");
  if (otherDocs.length > 0) {
    checkBox(form, F.checkboxes.otherDocsIncluded, true);
    setField(form, F.text.otherDocsList, otherDocs.join("; "));
  }

  setField(form, F.text.page2CaseName,   caseName);
  setField(form, F.text.page2CaseNumber, d.caseNumber || "");

  if (serviceStreet) {
    setField(form, F.text.serviceStreet, serviceStreet);
    setField(form, F.text.serviceCity,   serviceCity);
    setField(form, F.text.serviceState,  serviceState);
    setField(form, F.text.serviceZip,    serviceZip);
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
