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

  sf(form, "SC-112A[0].Page1[0].Header[0].CaseNumber_ft[0]", d.caseNumber || "");

  sf(form, "SC-112A[0].Page1[0].List1[0].Item1[0].FillText01[0]", b.serverName    || "");
  sf(form, "SC-112A[0].Page1[0].List1[0].Item1[0].FillText02[0]", b.serverPhone   || "");
  sf(form, "SC-112A[0].Page1[0].List1[0].Item1[0].FillText03[0]", b.serverAddress || "");
  sf(form, "SC-112A[0].Page1[0].List1[0].Item1[0].FillText04[0]", b.serverCity    || "");
  sf(form, "SC-112A[0].Page1[0].List1[0].Item1[0].FillText05[0]", b.serverState   || "CA");
  sf(form, "SC-112A[0].Page1[0].List1[0].Item1[0].FillText06[0]", b.serverZip     || "");
  cb(form, "SC-112A[0].Page1[0].List1[0].Item1[0].CheckBox1[0]",  !!b.isRegisteredProcessServer);
  sf(form, "SC-112A[0].Page1[0].List1[0].Item1[0].FillText07[0]", b.registrationCounty  || "");
  sf(form, "SC-112A[0].Page1[0].List1[0].Item1[0].FillText08[0]", b.registrationNumber  || "");

  const docChecks: Record<string, string> = {
    sc105: "SC-112A[0].Page1[0].List2[0].Lia[0].CheckBox2[0]",
    sc109: "SC-112A[0].Page1[0].List2[0].Lib[0].CheckBox3[0]",
    sc114: "SC-112A[0].Page1[0].List2[0].Lic[0].CheckBox4[0]",
    sc133: "SC-112A[0].Page1[0].List2[0].Lid[0].CheckBox5[0]",
    sc150: "SC-112A[0].Page1[0].List2[0].Lie[0].CheckBox6[0]",
    sc221: "SC-112A[0].Page1[0].List2[0].Lif[0].CheckBox7[0]",
    other: "SC-112A[0].Page1[0].List2[0].Lig[0].CheckBox8[0]",
  };
  const docSel = b.documentServed as string | undefined;
  Object.entries(docChecks).forEach(([key, field]) => cb(form, field, key === docSel));
  if (docSel === "other") sf(form, "SC-112A[0].Page1[0].List2[0].Lig[0].FillText09[0]", b.documentServedOther || "");

  const partyNameFields = [
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.11[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.12[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.13[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.14[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.1[0]",
  ];
  const partyAddrFields = [
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.11[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.12[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.13[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.14[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.1[0]",
  ];
  partyNameFields.forEach(field => sf(form, field, ""));
  partyAddrFields.forEach(field => sf(form, field, ""));
  parties.slice(0, 5).forEach((party, i) => {
    sf(form, partyNameFields[i], party.name    || "");
    sf(form, partyAddrFields[i], party.address || "");
  });

  sf(form, "SC-112A[0].Page1[0].List3[0].Lic[0].FillText12[0]", b.mailingDate || "");
  sf(form, "SC-112A[0].Page1[0].List3[0].Lic[0].FillText13[0]", b.mailingCity || "");

  sf(form, "SC-112A[0].Page1[0].Sign[0].FillText14[0]", b.signDate    || today());
  sf(form, "SC-112A[0].Page1[0].Sign[0].FillText16[0]", b.serverName  || "");

  return Buffer.from(await pdfDoc.save());
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
