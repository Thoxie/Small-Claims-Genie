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

export async function buildFW001Pdf(d: CaseData): Promise<Buffer> {
  const signerName  = (d.plaintiffIsBusiness && d.secondPlaintiffName)
    ? d.secondPlaintiffName
    : (d.plaintiffName || "");
  const signerTitle = d.plaintiffTitle || "";
  const fullSignerName = signerName + (signerTitle ? `, ${signerTitle}` : "");
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  const courtInfo = buildCourtInfoFormal(d);

  const acroBytes = loadAsset("forms/fw001_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  setField(form, "FW-001[0].Page1[0].RightCaption[0].CourtInfo[0]",  courtInfo);
  setField(form, "FW-001[0].Page1[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
  setField(form, "FW-001[0].Page1[0].RightCaption[0].CaseName[0]",   caseName);

  setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerName1[0]",      signerName);
  setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerStrAddress[0]", d.plaintiffAddress || "");
  setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerCity[0]",       d.plaintiffCity    || "");
  setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerState[0]",      d.plaintiffState   || "CA");
  setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerZip[0]",        d.plaintiffZip     || "");
  setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerTel[0]",        d.plaintiffPhone   || "");

  if (d.plaintiffOccupation) setField(form, "FW-001[0].Page1[0].List2[0].item2[0].ApplicantJob[0]",  d.plaintiffOccupation);
  if (d.plaintiffEmployer)   setField(form, "FW-001[0].Page1[0].List2[0].item2[0].EmployerName[0]",  d.plaintiffEmployer);

  checkBox(form, "FW-001[0].Page1[0].List4[0].item4[0].WaiveSuperiorCrtFee[0]", true);

  setField(form, "FW-001[0].Page1[0].Sign[0].PetitionerName[0]", fullSignerName);

  setField(form, "FW-001[0].Page2[0].pXCaption[0].PetitionerName1[0]", signerName);
  setField(form, "FW-001[0].Page2[0].pXCaption[0].CaseNumber[0]",      d.caseNumber || "");

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
