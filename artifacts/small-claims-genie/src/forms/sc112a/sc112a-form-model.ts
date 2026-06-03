// artifacts/small-claims-genie/src/forms/sc112a/sc112a-form-model.ts
// NEW FILE - SC-112A data model and field map for California Proof of Service by Mail.

export type SC112ADocumentServed =
  | "SC-105"
  | "SC-109"
  | "SC-114"
  | "SC-133"
  | "SC-150"
  | "SC-221"
  | "OTHER";

export interface SC112APartyServed {
  name: string;
  mailingAddress: string;
}

export interface SC112AFormData {
  caseNumber: string;
  server: {
    name: string;
    phone?: string;
    streetAddress: string;
    city: string;
    state: string;
    zip: string;
    isRegisteredProcessServer: boolean;
    registrationCounty?: string;
    registrationNumber?: string;
  };
  documentServed: {
    type: SC112ADocumentServed;
    otherDescription?: string;
    item2Attachment: boolean;
  };
  eligibility: {
    serverIs18OrOlder: boolean;
    serverIsNotParty: boolean;
    serverLivesOrWorksInMailingCounty: boolean;
  };
  partiesServed: SC112APartyServed[];
  item3Attachment: boolean;
  mailing: {
    dateOfMailing: string;
    cityStateOfMailing: string;
  };
  signature: {
    dateSigned: string;
    printedServerName: string;
    signatureText?: string;
  };
}

export const SC112A_FIELD_MAP = {
  caseNumber: "SC-112A[0].Page1[0].Header[0].CaseNumber_ft[0]",
  serverName: "SC-112A[0].Page1[0].List1[0].Item1[0].FillText01[0]",
  serverPhone: "SC-112A[0].Page1[0].List1[0].Item1[0].FillText02[0]",
  serverStreetAddress: "SC-112A[0].Page1[0].List1[0].Item1[0].FillText03[0]",
  serverCity: "SC-112A[0].Page1[0].List1[0].Item1[0].FillText04[0]",
  serverState: "SC-112A[0].Page1[0].List1[0].Item1[0].FillText05[0]",
  serverZip: "SC-112A[0].Page1[0].List1[0].Item1[0].FillText06[0]",
  registeredProcessServer: "SC-112A[0].Page1[0].List1[0].Item1[0].CheckBox1[0]",
  registrationCounty: "SC-112A[0].Page1[0].List1[0].Item1[0].FillText07[0]",
  registrationNumber: "SC-112A[0].Page1[0].List1[0].Item1[0].FillText08[0]",
  documentSC105: "SC-112A[0].Page1[0].List2[0].Lia[0].CheckBox2[0]",
  documentSC109: "SC-112A[0].Page1[0].List2[0].Lib[0].CheckBox3[0]",
  documentSC114: "SC-112A[0].Page1[0].List2[0].Lic[0].CheckBox4[0]",
  documentSC133: "SC-112A[0].Page1[0].List2[0].Lid[0].CheckBox5[0]",
  documentSC150: "SC-112A[0].Page1[0].List2[0].Lie[0].CheckBox6[0]",
  documentSC221: "SC-112A[0].Page1[0].List2[0].Lif[0].CheckBox7[0]",
  documentOther: "SC-112A[0].Page1[0].List2[0].Lig[0].CheckBox8[0]",
  item2Attachment: "SC-112A[0].Page1[0].List2[0].Lig[0].CheckBox9[0]",
  otherDescription: "SC-112A[0].Page1[0].List2[0].Lig[0].FillText09[0]",
  partyNames: [
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.11[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.12[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.13[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.14[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText10\\.1[0]",
  ],
  partyMailingAddresses: [
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.11[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.12[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.13[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.14[0]",
    "SC-112A[0].Page1[0].List3[0].Lib[0].Table[0].FillText11\\.1[0]",
  ],
  item3Attachment: "SC-112A[0].Page1[0].List3[0].Lib[0].CheckBox10[0]",
  dateOfMailing: "SC-112A[0].Page1[0].List3[0].Lic[0].FillText12[0]",
  cityStateOfMailing: "SC-112A[0].Page1[0].List3[0].Lic[0].FillText13[0]",
  dateSigned: "SC-112A[0].Page1[0].Sign[0].FillText14[0]",
  printedServerName: "SC-112A[0].Page1[0].Sign[0].FillText16[0]",
} as const;

export const SC112A_CHECKBOX_ON_VALUE = "/1" as const;

export function validateSC112AForFinalPdf(data: SC112AFormData): string[] {
  const errors: string[] = [];
  if (!data.caseNumber.trim()) errors.push("Case number is required.");
  if (!data.server.name.trim()) errors.push("Server name is required.");
  if (!data.server.streetAddress.trim()) errors.push("Server street address is required.");
  if (!data.server.city.trim() || !data.server.state.trim() || !data.server.zip.trim()) {
    errors.push("Server city, state, and ZIP are required.");
  }
  if (data.server.isRegisteredProcessServer && (!data.server.registrationCounty?.trim() || !data.server.registrationNumber?.trim())) {
    errors.push("Registered process server county and registration number are required.");
  }
  if (data.documentServed.type === "OTHER" && !data.documentServed.otherDescription?.trim()) {
    errors.push("Describe the other document served.");
  }
  if (!data.eligibility.serverIs18OrOlder) errors.push("Server must confirm they are 18 or older.");
  if (!data.eligibility.serverIsNotParty) errors.push("Server must confirm they are not a party.");
  if (!data.eligibility.serverLivesOrWorksInMailingCounty) {
    errors.push("Server must confirm they live or work in the county where mailing occurred.");
  }
  if (!data.partiesServed.length) errors.push("At least one served party is required.");
  data.partiesServed.forEach((party, index) => {
    if (!party.name.trim()) errors.push(`Party ${index + 1} name is required.`);
    if (!party.mailingAddress.trim()) errors.push(`Party ${index + 1} mailing address is required.`);
  });
  if (!data.mailing.dateOfMailing.trim()) errors.push("Date of mailing is required.");
  if (!data.mailing.cityStateOfMailing.trim()) errors.push("City and state of mailing are required.");
  if (!data.signature.dateSigned.trim()) errors.push("Date signed is required.");
  if (!data.signature.printedServerName.trim()) errors.push("Printed server name is required.");
  return errors;
}
