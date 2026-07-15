/**
 * TX Small Claims Petition — Official OCA Statewide AcroForm (all 254 TX counties)
 *
 * Fills the official Texas OCA "Petition: Small Claims Case" AcroForm PDF
 * (3 pages, 53 fields) via pdftk FDF fill + flatten, then overlays the
 * signature image with pdf-lib for the signed variant.
 *
 * Source PDF: assets/forms/tx-small-claims-petition-oca.pdf
 * Field names verified via: pdftk dump_data_fields
 *
 * Root cause of pdf-lib failure: 36/53 fields lack a Tf operator in their
 * DA string → pdf-lib's setFontSize throws "No Tf operator found for DA";
 * the silent catch leaves everything blank. pdftk handles these fields fine.
 *
 * Body params (from UI):
 *   claimType             — "damages" | "property" | "both" (default "damages")
 *   personalPropertyDesc  — description of personal property
 *   personalPropertyValue — estimated value in dollars
 *   interestPref          — "does" | "doesnot" (default "doesnot")
 *   juryPref              — "request" | "none" (default "none")
 *
 * Rendering technique:
 *   pdftk FDF fill + flatten, then pdf-lib signature image overlay.
 *
 * Legal basis:
 *   Texas Rules of Civil Procedure, Part V — Rules of Practice in Justice Courts
 *   Tex. Gov't Code § 27.031 et seq.; OCA Form "Petition: Small Claims Case"
 *   Claim limit: $20,000 (exclusive of attorneys' fees, interest, and court costs)
 */

import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { FORMS_DIR } from "../../routes/forms-common";
import { pdftk_fill_form } from "../pdftk-fdf";

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

export async function buildTXPetitionOCA(
  d: CaseData,
  body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const claimType    = body.claimType    ?? "damages";
  const interestPref = body.interestPref ?? "doesnot";
  const juryPref     = body.juryPref     ?? "none";
  const propDesc     = body.personalPropertyDesc  ?? "";
  const propValue    = body.personalPropertyValue ?? "";

  const defIsBiz   = !!d.defendantIsBusinessOrEntity;
  const defState   = d.defendantState ?? "TX";
  const pltState   = d.plaintiffState ?? "TX";
  const countyName = deriveCountyName(d.countyId);

  const seeksDamages  = claimType === "damages"  || claimType === "both";
  const seeksProperty = claimType === "property" || claimType === "both";

  let defAddressLine1 = d.defendantAddress ?? "";
  let defAddressLine2 = [d.defendantCity, defState, d.defendantZip].filter(Boolean).join(", ");

  if (defIsBiz && d.defendantAgentName) {
    defAddressLine1 = [
      `Registered Agent: ${d.defendantAgentName}`,
      d.defendantAgentStreet ?? d.defendantAddress ?? "",
    ].filter(Boolean).join(", ").slice(0, 90);
    defAddressLine2 = [
      d.defendantAgentCity ?? d.defendantCity,
      defState,
      d.defendantAgentZip ?? d.defendantZip,
    ].filter(Boolean).join(", ");
  }

  const pltAddressLine2 = [d.plaintiffCity, pltState, d.plaintiffZip].filter(Boolean).join(", ");

  // ── pdftk FDF fill + flatten ───────────────────────────────────────────────
  const filled = await pdftk_fill_form(PDF_PATH, {
    text: {
      cause_no:       d.caseNumber ?? "",
      plaintiff_name: d.plaintiffName ?? "",
      precinct_no:    "",
      defendant_name: d.defendantName ?? "",
      county_name:    countyName,

      defendant_address_line1: defAddressLine1,
      defendant_address_line2: defAddressLine2,

      complaint_facts: d.claimDescription ?? "",

      damages_amount:                      seeksDamages  ? fmtAmount(d.claimAmount) : "",
      personal_property_description_line1: seeksProperty ? propDesc.slice(0, 80)   : "",
      personal_property_description_line2: seeksProperty && propDesc.length > 80  ? propDesc.slice(80, 160) : "",
      personal_property_description_cont:  seeksProperty && propDesc.length > 160 ? propDesc.slice(160)     : "",
      personal_property_value:             seeksProperty ? propValue : "",

      email_address: d.plaintiffEmail ?? "",

      plaintiff_signature:    opts?.signatureBytes ? "" : (d.plaintiffName ?? ""),
      plaintiff_printed_name: d.plaintiffName    ?? "",
      plaintiff_address_line1: d.plaintiffAddress ?? "",
      plaintiff_address_line2: pltAddressLine2,
      plaintiff_email:       d.plaintiffEmail   ?? "",
      plaintiff_telephone:   d.plaintiffPhone   ?? "",
    },
    checkboxes: {
      relief_damages_check:  seeksDamages,
      relief_property_check: seeksProperty,

      service_certified_check: true,

      interest_does_check:    interestPref === "does",
      interest_doesnot_check: interestPref === "doesnot",

      jury_request_check: juryPref === "request",
      jury_none_check:    juryPref === "none",

      email_yes_check: !!d.plaintiffEmail,
      email_no_check:  !d.plaintiffEmail,

      phone_yes_check: true,
      video_yes_check: true,
    },
  });

  // ── Signature overlay (pdf-lib) ────────────────────────────────────────────
  if (!opts?.signatureBytes) {
    return filled;
  }

  const pdfDoc = await PDFDocument.load(filled);
  const pages  = pdfDoc.getPages();
  const page3  = pages[2];
  if (page3 && opts.signatureBytes) {
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
