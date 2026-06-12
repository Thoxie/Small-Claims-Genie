/**
 * SC-112A Proof of Service by Mail — AcroForm definition.
 *
 * Moved from forms-sc112a.ts; PDF generation logic is unchanged.
 */

import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import type { FormDefinition, CaseData, FormBody } from "../registry";
import { FormRegistry } from "../registry";
import { today } from "../enrichment";
import { loadAsset } from "../../routes/forms-common";
import { pdftkFlatten } from "../acroform-filler";
import { SC112A_FIELDS } from "../field-names/sc112a-fields";

function sf(form: any, name: string, value: string) {
  try {
    const f = form.getTextField(name);
    f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 9 Tf 0 g"));
    f.setText(value || "");
  } catch { /* field absent — skip */ }
}

function cb(form: any, name: string, checked: boolean) {
  try {
    if (checked) form.getCheckBox(name).check();
    else form.getCheckBox(name).uncheck();
  } catch { /* skip */ }
}

export async function buildSC112APdf(
  d: CaseData,
  b: FormBody
): Promise<Buffer> {
  const parties: { name: string; address: string }[] = b.partiesServed || [];

  const acroBytes = loadAsset("forms/sc112a_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  const F = SC112A_FIELDS;

  sf(form, F.text.caseNumber, d.caseNumber || "");

  sf(form, F.text.serverName,         b.serverName    || "");
  sf(form, F.text.serverPhone,        b.serverPhone   || "");
  sf(form, F.text.serverAddress,      b.serverAddress || "");
  sf(form, F.text.serverCity,         b.serverCity    || "");
  sf(form, F.text.serverState,        b.serverState   || "CA");
  sf(form, F.text.serverZip,          b.serverZip     || "");
  cb(form, F.checkboxes.isRegisteredProcessServer, !!b.isRegisteredProcessServer);
  sf(form, F.text.registrationCounty, b.registrationCounty || "");
  sf(form, F.text.registrationNumber, b.registrationNumber || "");

  const docCheckboxMap: Record<string, string> = {
    sc105: F.checkboxes.docSC105,
    sc109: F.checkboxes.docSC109,
    sc114: F.checkboxes.docSC114,
    sc133: F.checkboxes.docSC133,
    sc150: F.checkboxes.docSC150,
    sc221: F.checkboxes.docSC221,
    other: F.checkboxes.docOther,
  };
  const docSel = b.documentServed as string | undefined;
  Object.entries(docCheckboxMap).forEach(([key, field]) => cb(form, field, key === docSel));
  if (docSel === "other") sf(form, F.text.documentServedOther, b.documentServedOther || "");

  const partyNameFields = [
    F.text.partyName1,
    F.text.partyName2,
    F.text.partyName3,
    F.text.partyName4,
    F.text.partyName5,
  ];
  const partyAddrFields = [
    F.text.partyAddr1,
    F.text.partyAddr2,
    F.text.partyAddr3,
    F.text.partyAddr4,
    F.text.partyAddr5,
  ];
  partyNameFields.forEach(field => sf(form, field, ""));
  partyAddrFields.forEach(field => sf(form, field, ""));
  parties.slice(0, 5).forEach((party, i) => {
    sf(form, partyNameFields[i], party.name    || "");
    sf(form, partyAddrFields[i], party.address || "");
  });

  sf(form, F.text.mailingDate, b.mailingDate || "");
  sf(form, F.text.mailingCity, b.mailingCity || "");

  sf(form, F.text.signDate,   b.signDate   || today());
  sf(form, F.text.signerName, b.serverName || "");

  return pdftkFlatten(Buffer.from(await pdfDoc.save()));
}

const sc112aDefinition: FormDefinition = {
  state: "CA",
  formId: "SC-112A",
  renderingTechnique: "acroform-pdflib",
  async generate(d, b) {
    return buildSC112APdf(d, b);
  },
};

FormRegistry.register(sc112aDefinition);
