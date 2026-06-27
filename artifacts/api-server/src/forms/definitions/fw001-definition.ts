/**
 * FW-001 Request to Waive Court Fees — AcroForm definition.
 *
 * Moved from forms-fw001.ts; PDF generation logic is unchanged.
 */

import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import type { FormDefinition, CaseData } from "../registry";
import { FormRegistry } from "../registry";
import { pdftkFlatten } from "../acroform-filler";
import { buildCourtInfoFormal } from "../enrichment";
import { loadAsset } from "../../routes/forms-common";
import { FW001_FIELDS } from "../field-names/fw001-fields";

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

function fillIntakeFields(form: any, d: CaseData): void {
  const F = FW001_FIELDS;
  const signerName  = (d.plaintiffIsBusiness && d.secondPlaintiffName)
    ? d.secondPlaintiffName
    : (d.plaintiffName || "");
  const signerTitle = d.plaintiffTitle || "";
  const fullSignerName = signerName + (signerTitle ? `, ${signerTitle}` : "");
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  const courtInfo = buildCourtInfoFormal(d);

  setField(form, F.text.courtInfo,  courtInfo);
  setField(form, F.text.caseNumber, d.caseNumber || "");
  setField(form, F.text.caseName,   caseName);

  setField(form, F.text.petitionerName,    signerName);
  setField(form, F.text.petitionerAddress, d.plaintiffAddress || "");
  setField(form, F.text.petitionerCity,    d.plaintiffCity    || "");
  setField(form, F.text.petitionerState,   d.plaintiffState   || "CA");
  setField(form, F.text.petitionerZip,     d.plaintiffZip     || "");
  setField(form, F.text.petitionerPhone,   d.plaintiffPhone   || "");

  if (d.plaintiffOccupation) setField(form, F.text.petitionerJobTitle,     d.plaintiffOccupation);
  if (d.plaintiffEmployer)   setField(form, F.text.petitionerEmployerName,  d.plaintiffEmployer);

  checkBox(form, F.checkboxes.waiveSuperiorCourtFee, true);

  setField(form, F.text.signerName, fullSignerName);
  setField(form, F.text.page2PetitionerName, signerName);
  setField(form, F.text.page2CaseNumber,     d.caseNumber || "");
}

export async function buildFW001Pdf(d: CaseData): Promise<Buffer> {
  const acroBytes = loadAsset("forms/fw001_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  fillIntakeFields(pdfDoc.getForm(), d);
  return pdftkFlatten(Buffer.from(await pdfDoc.save()));
}

/**
 * Returns the FW-001 with intake fields pre-filled but NOT flattened.
 * All AcroForm fields remain interactive — the user fills the rest in
 * the browser's native PDF viewer.
 */
export async function buildFW001PdfInteractive(d: CaseData): Promise<Buffer> {
  const acroBytes = loadAsset("forms/fw001_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  fillIntakeFields(pdfDoc.getForm(), d);
  return Buffer.from(await pdfDoc.save());
}

/**
 * Same as buildFW001PdfInteractive but embeds the user's handwritten
 * signature image at the signature line on page 1 (above the printed
 * name / date fields).  The form is still NOT flattened — all AcroForm
 * fields remain editable in the browser's PDF viewer.
 *
 * Signature placement (page 1, PDF coordinates):
 *   x=336, y=97, max 220×26 pt
 *   x=336 is the right half of the form — the "Sign here" area.
 *   SigDate (date input) occupies the LEFT side (x=66–247, y=97–110);
 *   the Sign here line is on the RIGHT side (x≈330–575, same y row).
 *   y=97 = bottom of the widget row; image extends upward to y≈123.
 * Reference widget positions (from pdf-lib widget walk, page 1):
 *   SigDate:          x1=66  y1=97  x2=247 y2=110
 *   PetitionerName:   x1=36  y1=85  x2=324 y2=96
 */
export async function buildFW001PdfInteractiveSigned(d: CaseData, signatureDataUrl: string): Promise<Buffer> {
  const acroBytes = loadAsset("forms/fw001_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  fillIntakeFields(pdfDoc.getForm(), d);

  const pngBytes = Buffer.from(
    signatureDataUrl.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );
  const img = await pdfDoc.embedPng(pngBytes);
  const { width: iw, height: ih } = img.scale(1);
  const MAX_W = 220;
  const MAX_H = 26;
  const scale = Math.min(MAX_W / iw, MAX_H / ih, 1);
  const page = pdfDoc.getPages()[0];
  page.drawImage(img, { x: 336, y: 97, width: iw * scale, height: ih * scale });

  // Flatten so the signature image and field appearances merge into static content.
  // Without this, macOS Preview renders AcroForm widget appearances independently
  // from the drawn image, causing the signature to appear misaligned on Mac.
  return pdftkFlatten(Buffer.from(await pdfDoc.save()));
}

const fw001Definition: FormDefinition = {
  state: "CA",
  formId: "FW-001",
  renderingTechnique: "acroform-pdflib",
  async generate(d) {
    return buildFW001Pdf(d);
  },
};

FormRegistry.register(fw001Definition);
