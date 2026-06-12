/**
 * SC-105 Request for Court Order and Answer — AcroForm definition.
 *
 * Moved from forms-sc105.ts; PDF generation logic is unchanged.
 * AI draft endpoint (ai-draft) remains in the route layer.
 */

import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import { buildCourtInfo, today } from "../enrichment";
import { loadAsset } from "../../routes/forms-common";

function setField(form: any, name: string, value: string) {
  try {
    const f = form.getTextField(name);
    f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 11 Tf 0 g"));
    f.setText(value || "");
  } catch { /* field may not exist */ }
}

function checkBox(form: any, name: string, checked: boolean) {
  try {
    if (checked) form.getCheckBox(name).check();
    else form.getCheckBox(name).uncheck();
  } catch { /* field may not exist */ }
}

export async function buildSC105Pdf(
  d: Record<string, any>,
  b: Record<string, any>
): Promise<Buffer> {
  const caseName  = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  const courtInfo = buildCourtInfo(d);
  const parties: any[] = b.noticeParties || [];

  const acroBytes = loadAsset("forms/sc105_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  setField(form, "SC-105[0].Page1[0].RightCaption[0].CourtInfo[0]",  courtInfo);
  setField(form, "SC-105[0].Page1[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
  setField(form, "SC-105[0].Page1[0].RightCaption[0].CaseName[0]",   caseName);

  setField(form, "SC-105[0].Page1[0].List1[0].Item[0].FullName3[0]",  b.requestingPartyName    || "");
  setField(form, "SC-105[0].Page1[0].List1[0].Item[0].FullName2[0]",  b.requestingPartyAddress || "");
  checkBox(form, "SC-105[0].Page1[0].List1[0].Item[0].Level5[0]",     b.requestingPartyRole === "defendant");
  checkBox(form, "SC-105[0].Page1[0].List1[0].Item[0].Level5[1]",     b.requestingPartyRole === "plaintiff");

  setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Make1_ft[0]",  parties[0]?.name    || "");
  setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Model1_ft[0]", parties[0]?.address || "");
  setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Make2_ft[0]",  parties[1]?.name    || "");
  setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Model2_ft[0]", parties[1]?.address || "");
  setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Make3_ft[0]",  parties[2]?.name    || "");
  setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Model3_ft[0]", parties[2]?.address || "");

  setField(form, "SC-105[0].Page1[0].List3[0].item3[0].Specify[0].Disagree_ft1[0]",   b.orderRequested || "");
  setField(form, "SC-105[0].Page1[0].List4[0].item4[0].Explain[0].Disagree_ft6[0]",   b.orderReason    || "");

  setField(form, "SC-105[0].Page1[0].Sign[0].SigDate4[0]", b.signDate || today());
  setField(form, "SC-105[0].Page1[0].Sign[0].SigName[0]",  b.requestingPartyName || "");

  setField(form, "SC-105[0].Page2[0].RightCaption[0].CourtInfo[0]",  courtInfo);
  setField(form, "SC-105[0].Page2[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
  setField(form, "SC-105[0].Page2[0].RightCaption[0].CaseName[0]",   caseName);

  return Buffer.from(await pdfDoc.save());
}

const sc105Definition: FormDefinition = {
  state: "CA",
  formId: "SC-105",
  renderingTechnique: "acroform-pdflib",
  async generate(d, b) {
    return buildSC105Pdf(d, b);
  },
};

FormRegistry.register(sc105Definition);
