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

const fw001Definition: FormDefinition = {
  state: "CA",
  formId: "FW-001",
  renderingTechnique: "acroform-pdflib",
  async generate(d) {
    return buildFW001Pdf(d);
  },
};

FormRegistry.register(fw001Definition);
