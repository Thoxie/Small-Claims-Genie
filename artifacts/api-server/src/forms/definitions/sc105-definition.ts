/**
 * SC-105 Request for Court Order and Answer — AcroForm definition.
 *
 * Moved from forms-sc105.ts; PDF generation logic is unchanged.
 * AI draft endpoint (ai-draft) remains in the route layer.
 */

import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import type { FormDefinition, CaseData, FormBody } from "../registry";
import { FormRegistry } from "../registry";
import { buildCourtInfo, today } from "../enrichment";
import { loadAsset } from "../../routes/forms-common";
import { pdftkFlatten } from "../acroform-filler";
import { SC105_FIELDS } from "../field-names/sc105-fields";

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
  d: CaseData,
  b: FormBody
): Promise<Buffer> {
  const caseName  = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  const courtInfo = buildCourtInfo(d);
  const parties: any[] = b.noticeParties || [];

  const acroBytes = loadAsset("forms/sc105_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  const F = SC105_FIELDS;

  setField(form, F.text.courtInfo,  courtInfo);
  setField(form, F.text.caseNumber, d.caseNumber || "");
  setField(form, F.text.caseName,   caseName);

  setField(form, F.text.requestingPartyName,    b.requestingPartyName    || "");
  setField(form, F.text.requestingPartyAddress, b.requestingPartyAddress || "");
  checkBox(form, F.checkboxes.roleIsDefendant,  b.requestingPartyRole === "defendant");
  checkBox(form, F.checkboxes.roleIsPlaintiff,  b.requestingPartyRole === "plaintiff");

  setField(form, F.text.party1Name,    parties[0]?.name    || "");
  setField(form, F.text.party1Address, parties[0]?.address || "");
  setField(form, F.text.party2Name,    parties[1]?.name    || "");
  setField(form, F.text.party2Address, parties[1]?.address || "");
  setField(form, F.text.party3Name,    parties[2]?.name    || "");
  setField(form, F.text.party3Address, parties[2]?.address || "");

  setField(form, F.text.orderRequested, b.orderRequested || "");
  setField(form, F.text.orderReason,    b.orderReason    || "");

  setField(form, F.text.signDate,   b.signDate || today());
  setField(form, F.text.signerName, b.requestingPartyName || "");

  setField(form, F.text.page2CourtInfo,  courtInfo);
  setField(form, F.text.page2CaseNumber, d.caseNumber || "");
  setField(form, F.text.page2CaseName,   caseName);

  return pdftkFlatten(Buffer.from(await pdfDoc.save()));
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
