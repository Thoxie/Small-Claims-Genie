/**
 * TX Small Claims Petition — Official OCA Statewide AcroForm (all 254 TX counties)
 *
 * Fills the official Texas OCA "Petition: Small Claims Case" AcroForm PDF
 * (3 pages, 57 fields) via pdf-lib AcroForm fill + flatten. A pdf-lib pass
 * overlays the signature image for the signed variant.
 *
 * Source PDF: assets/forms/tx-small-claims-petition-oca.pdf
 * Field names verified via: pdftk dump_data_fields
 *
 * Body params (from UI):
 *   claimType          — "damages" | "property" | "both" (default "damages")
 *   personalPropertyDesc  — description of personal property (when claimType includes "property")
 *   personalPropertyValue — estimated value in dollars
 *   interestPref       — "does" | "doesnot" (default "doesnot")
 *   juryPref           — "request" | "none" (default "none")
 *
 * Rendering technique:
 *   pdf-lib AcroForm fill + flatten, then pdf-lib signature overlay.
 *
 * Legal basis:
 *   Texas Rules of Civil Procedure, Part V — Rules of Practice in Justice Courts
 *   Tex. Gov't Code § 27.031 et seq.; OCA Form "Petition: Small Claims Case"
 *   Claim limit: $20,000 (exclusive of attorneys' fees, interest, and court costs)
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { FORMS_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(FORMS_DIR, "tx-small-claims-petition-oca.pdf");

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function deriveCountyName(countyId: string | null | undefined): string {
  if (!countyId) return "";
  return countyId
    .replace(/^tx-/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function wrapToFields(
  text: string | null | undefined,
  fieldNames: string[],
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!text) return out;
  const words = text.replace(/\r/g, "").split(/\s+/).filter(Boolean);
  let cur = "";
  let i = 0;
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(cand, size) > maxWidth && cur) {
      out[fieldNames[i]!] = cur;
      i++;
      if (i >= fieldNames.length) return out;
      cur = w;
    } else {
      cur = cand;
    }
  }
  if (cur && i < fieldNames.length) out[fieldNames[i]!] = cur;
  return out;
}

export async function buildTXPetitionOCA(
  d: CaseData,
  body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const claimType    = (body.claimType    as string | undefined) ?? "damages";
  const interestPref = (body.interestPref as string | undefined) ?? "doesnot";
  const juryPref     = (body.juryPref     as string | undefined) ?? "none";
  const propDesc     = (body.personalPropertyDesc  as string | undefined) ?? "";
  const propValue    = (body.personalPropertyValue as string | undefined) ?? "";

  const pdfBytes = fs.readFileSync(PDF_PATH);
  const pdfDoc   = await PDFDocument.load(pdfBytes);
  const form     = pdfDoc.getForm();
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const defIsBiz = !!d.defendantIsBusinessOrEntity;
  const defState = d.defendantState ?? "TX";
  const pltState = d.plaintiffState ?? "TX";
  const countyName = deriveCountyName(d.countyId);

  function setTextField(name: string, value: string | null | undefined, size = 9) {
    try {
      const f = form.getTextField(name);
      f.setFontSize(size);
      f.setText(value ?? "");
    } catch {  }
  }

  function setCheck(name: string, checked: boolean) {
    try {
      const f = form.getCheckBox(name);
      if (checked) f.check(); else f.uncheck();
    } catch {  }
  }

  setTextField("cause_no",      d.caseNumber ?? "");
  setTextField("plaintiff_name", d.plaintiffName ?? "");
  setTextField("county_name",   countyName);

  setTextField("defendant_name", d.defendantName ?? "");

  if (defIsBiz && d.defendantAgentName) {
    const agentLine = [
      `Registered Agent: ${d.defendantAgentName}`,
      d.defendantAgentStreet ?? d.defendantAddress ?? "",
    ].filter(Boolean).join(", ");
    setTextField("defendant_address_line1", agentLine.slice(0, 90));
    const csz = [d.defendantAgentCity ?? d.defendantCity, defState, d.defendantAgentZip ?? d.defendantZip]
      .filter(Boolean).join(", ");
    setTextField("defendant_address_line2", csz);
  } else {
    setTextField("defendant_address_line1", d.defendantAddress ?? "");
    const csz = [d.defendantCity, defState, d.defendantZip]
      .filter(Boolean).join(", ");
    setTextField("defendant_address_line2", csz);
  }

  setTextField("complaint_facts", d.claimDescription ?? "", 9);

  const seeksDamages  = claimType === "damages"  || claimType === "both";
  const seeksProperty = claimType === "property" || claimType === "both";

  setCheck("relief_damages_check",  seeksDamages);
  setCheck("relief_property_check", seeksProperty);

  if (seeksDamages) {
    setTextField("damages_amount", fmtAmount(d.claimAmount));
  }

  if (seeksProperty && propDesc) {
    const measureDoc  = await PDFDocument.create();
    const measureFont = await measureDoc.embedFont(StandardFonts.Helvetica);
    const propFields  = [
      "personal_property_description_line1",
      "personal_property_description_line2",
      "personal_property_description_cont",
    ];
    const wrapped = wrapToFields(propDesc, propFields, measureFont, 9, 430);
    for (const [fname, fval] of Object.entries(wrapped)) {
      setTextField(fname, fval);
    }
    if (propValue) {
      setTextField("personal_property_value", propValue);
    }
  }

  setCheck("service_certified_check", true);

  setCheck("interest_does_check",   interestPref === "does");
  setCheck("interest_doesnot_check", interestPref === "doesnot");

  setCheck("jury_request_check", juryPref === "request");
  setCheck("jury_none_check",    juryPref === "none");

  if (d.plaintiffEmail) {
    setCheck("email_yes_check", true);
    setTextField("email_address", d.plaintiffEmail);
  } else {
    setCheck("email_no_check", true);
  }

  setCheck("phone_yes_check", true);
  setCheck("video_yes_check", true);

  if (!opts?.signatureBytes) {
    setTextField("plaintiff_signature", d.plaintiffName ?? "");
  }
  setTextField("plaintiff_printed_name", d.plaintiffName ?? "");
  setTextField("plaintiff_address_line1", d.plaintiffAddress ?? "");
  const pltCSZ = [d.plaintiffCity, pltState, d.plaintiffZip]
    .filter(Boolean).join(", ");
  setTextField("plaintiff_address_line2", pltCSZ);
  setTextField("plaintiff_email",     d.plaintiffEmail     ?? "");
  setTextField("plaintiff_telephone", d.plaintiffPhone     ?? "");

  form.flatten();

  if (opts?.signatureBytes) {
    try {
      const pages  = pdfDoc.getPages();
      const page3  = pages[2];
      if (page3) {
        const sigImg =
          (await pdfDoc.embedPng(opts.signatureBytes).catch(() => null)) ??
          (await pdfDoc.embedJpg(opts.signatureBytes).catch(() => null));
        if (sigImg) {
          page3.drawImage(sigImg, { x: 68.8, y: 414, width: 221, height: 35 });
        }
        const font3 = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page3.drawText(d.plaintiffName ?? "", {
          x: 142, y: 365.9, size: 9, font: font3, color: rgb(0, 0, 0),
        });
      }
    } catch {  }
  }

  return Buffer.from(await pdfDoc.save({ updateFieldAppearances: false, useObjectStreams: false }));
}

const txPetitionOCADefinition: FormDefinition = {
  state: "TX",
  formId: "TX-PETITION-OCA",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdftk",

  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildTXPetitionOCA(d, b, opts);
  },
};

FormRegistry.register(txPetitionOCADefinition);
export { txPetitionOCADefinition };
