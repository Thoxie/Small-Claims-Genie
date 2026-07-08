/**
 * NC AOC-CVM-200 — Complaint for Money Owed (Small Claims)
 *
 * Uses the official NC Administrative Office of the Courts form PDF obtained from:
 *   https://www.nccourts.gov/assets/documents/forms/cvm200-en.pdf
 *
 * Technique: acroform-pdftk (pdftk FDF fill + flatten) + optional pdf-lib
 *   signature image overlay for the signed variant.
 *
 * AcroForm fields verified via: pdftk nc-aoc-cvm-200.pdf dump_data_fields
 *
 * Legal basis:
 *   N.C. Gen. Stat. § 7A-210 et seq. — Small Claims Court (District Court Division)
 *   Heard by a magistrate; claim limit $10,000 (exclusive of interest and costs)
 *   Filing fee: $96 flat rate (G.S. 7A-311) + $30 sheriff service fee per defendant
 *
 * Form AOC-CVM-200, Rev. 7/24 — page dimensions: 792 × 612 pts (landscape)
 *
 * Signature line coords (pdf-lib, landscape page height = 612):
 *   "Signature Of Plaintiff Or Attorney" — same position as prior revision.
 *   SIG_X=578, SIG_Y=87 (verified against Rev. 9/13; re-verify if layout shifts)
 *
 * Field mapping (Rev. 7/24 field names — confirmed via pdftk dump_data_fields):
 *   Text fields:
 *     FileNumber                        — case/file number
 *     CountyName                        — county name (single field in Rev. 7/24)
 *     PlaintiffName                     — plaintiff full name
 *     PlaintiffAddr1                    — plaintiff street address
 *     PlaintiffAddr2                    — plaintiff mailing address (same as Addr1)
 *     PlaintiffCity / PlaintiffState / PlaintiffZip
 *     PlaintiffCounty                   — plaintiff county
 *     PlaintiffTelephone                — plaintiff phone
 *     Defendant1Name                    — primary defendant
 *     Defendant1Addr1 / Addr2 / City / State / Zip / County / Telephone
 *     Defendant2Name / Addr1-2 / City / State / Zip / County / Telephone (2nd def.)
 *     ReasonTextField                   — claim description / reason
 *     PrincipalAmountOwed               — claim principal amount
 *     TotalAmountOwed                   — same as principal (no interest)
 *     InterestOwed                      — interest amount (usually blank)
 *     SignedByPlaintiffOrAttorneyDate   — date signed
 *     SigningPlaintiffOrAttorneyName    — plaintiff name at signature line
 *     PlaintiffsAttorneyName / Addr1-2 / City / State / Zip  — attorney (blank pro se)
 *     AttorneyBarNumber                 — bar no. (blank pro se)
 *     OtherTextField                    — "Other" description
 *     ForConversionPropertyDescription  — property description for conversion claims
 *     YesInterpreterNeededExplanationField — interpreter language if needed
 *   Checkboxes:
 *     OnAnAccountCkBox / ForGoodsSoldCkBox / ForMoneyLentCkBox
 *     OnAPromissoryNoteCkBox / ForAWorthlessCheckCkBox / ForConversionCkBox
 *     Defendant1IndividualCkBox / Defendant1CorporationCkBox
 *     Defendant2IndividualCkBox / Defendant2CorporationCkBox
 *     NoInterpreterNotNeededCkBox / YesInterpreterNeededCkBox
 */

import * as path from "path";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(ASSET_DIR, "nc-forms", "nc-aoc-cvm-200.pdf");

// Landscape page: 792 × 612 pts.
// Signature area: same relative position as prior revision.
const SIG_X = 578;
const SIG_Y = 87;
const SIG_W = 170;
const SIG_H = 30;

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^nc-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Maps our internal claimType values to the NC AcroForm checkbox field names.
 * Rev. 7/24 uses descriptive field names instead of CkBox_NNN.
 *
 *   OnAnAccountCkBox        — On An Account (most generic — default fallback)
 *   ForGoodsSoldCkBox       — For Goods Sold And Delivered Between [dates]
 *   ForMoneyLentCkBox       — For Money Lent
 *   OnAPromissoryNoteCkBox  — On A Promissory Note
 *   ForAWorthlessCheckCkBox — For a Worthless Check
 *   ForConversionCkBox      — For conversion (describe property)
 */
function claimCheckbox(claimType?: string | null): string {
  const MAP: Record<string, string> = {
    // snake_case values (legacy / direct API calls)
    account_stated:   "OnAnAccountCkBox",
    goods:            "ForGoodsSoldCkBox",
    loan:             "ForMoneyLentCkBox",
    check:            "ForAWorthlessCheckCkBox",
    property_damage:  "ForConversionCkBox",
    services:         "OnAnAccountCkBox",
    contract:         "OnAnAccountCkBox",
    rent:             "OnAnAccountCkBox",
    security_deposit: "OnAnAccountCkBox",
    other:            "OnAnAccountCkBox",
    // Title-case values from intake UI (new.tsx / intake-step-2.tsx)
    "Money Owed":                          "OnAnAccountCkBox",
    "Unpaid Debt":                         "OnAnAccountCkBox",
    "Security Deposit":                    "OnAnAccountCkBox",
    "Property Damage":                     "ForConversionCkBox",
    "Vehicle Damage/Accident":             "ForConversionCkBox",
    "Landlord/Tenant Dispute":             "OnAnAccountCkBox",
    "Online Purchase/Marketplace Dispute": "ForGoodsSoldCkBox",
    "Unpaid Wages/Employment":             "OnAnAccountCkBox",
    "Contract Dispute":                    "OnAnAccountCkBox",
    "Fraud":                               "OnAnAccountCkBox",
    "Other":                               "OnAnAccountCkBox",
  };
  return claimType ? (MAP[claimType] ?? "OnAnAccountCkBox") : "OnAnAccountCkBox";
}

export async function buildNCAocCvm200(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const countyName = countyDisplay((d as any).countyId);
  const claimAmt   = Number(d.claimAmount ?? 0);
  const today      = new Date().toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });

  const pName = (d as any).plaintiffDbaName
    ? `${d.plaintiffName ?? ""} d/b/a ${(d as any).plaintiffDbaName}`
    : (d.plaintiffName ?? "");

  const checkedBox = claimCheckbox((d as any).claimType);

  // Rev. 7/24 field names (completely renamed from Rev. 9/13)
  const textFields: Record<string, string> = {
    FileNumber:                     (d as any).caseNumber ?? "",
    CountyName:                     countyName,
    PlaintiffName:                  pName,
    PlaintiffAddr1:                 d.plaintiffAddress ?? "",
    PlaintiffAddr2:                 d.plaintiffAddress ?? "",
    PlaintiffCity:                  d.plaintiffCity ?? "",
    PlaintiffState:                 (d as any).plaintiffState ?? "NC",
    PlaintiffZip:                   d.plaintiffZip ?? "",
    PlaintiffCounty:                countyName,
    PlaintiffTelephone:             d.plaintiffPhone ?? "",
    Defendant1Name:                 d.defendantName ?? "",
    Defendant1Addr1:                d.defendantAddress ?? "",
    Defendant1Addr2:                d.defendantAddress ?? "",
    Defendant1City:                 d.defendantCity ?? "",
    Defendant1State:                d.defendantState ?? "NC",
    Defendant1Zip:                  d.defendantZip ?? "",
    Defendant1Telephone:            d.defendantPhone ?? "",
    Defendant2Name:                 "",
    ReasonTextField:                d.claimDescription ?? "",
    PrincipalAmountOwed:            fmtAmount(claimAmt),
    TotalAmountOwed:                fmtAmount(claimAmt),
    InterestOwed:                   "",
    SignedByPlaintiffOrAttorneyDate: today,
    SigningPlaintiffOrAttorneyName: pName,
    PlaintiffsAttorneyName:         "",
    AttorneyBarNumber:              "",
  };

  // For goods sold between dates, fill the beginning date field.
  if (
    ((d as any).claimType === "goods" ||
      (d as any).claimType === "Online Purchase/Marketplace Dispute") &&
    d.incidentDate
  ) {
    textFields.ForGoodsSoldBeginningDate = fmtDate(d.incidentDate);
  }

  const allCheckboxes = [
    "OnAnAccountCkBox", "ForGoodsSoldCkBox", "ForMoneyLentCkBox",
    "OnAPromissoryNoteCkBox", "ForAWorthlessCheckCkBox", "ForConversionCkBox",
  ];
  const checkboxes: Record<string, boolean | string> = {
    // Defendant type checkboxes (Rev. 7/24 removed plaintiff individual/corp boxes)
    Defendant1IndividualCkBox:  !(d as any).defendantIsBusinessOrEntity,
    Defendant1CorporationCkBox: !!(d as any).defendantIsBusinessOrEntity,
    Defendant2IndividualCkBox:  false,
    Defendant2CorporationCkBox: false,
    // Interpreter: assume not needed
    NoInterpreterNotNeededCkBox: true,
    YesInterpreterNeededCkBox:   false,
  };
  // Claim type: set the matching box, clear all others
  for (const box of allCheckboxes) {
    checkboxes[box] = box === checkedBox;
  }

  const filled = await pdftk_fill_form(PDF_PATH, { text: textFields, checkboxes });

  // Always run through pdf-lib (both unsigned and signed) so both variants share
  // the same compressed baseline. This guarantees the signed PDF is reliably
  // larger than the unsigned one (image bytes > compression delta).
  const pdfDoc = await PDFDocument.load(filled);
  const page   = pdfDoc.getPages()[0];

  if (opts?.signatureBytes) {
    // Signature overlay: draw at the "Signed By Plaintiff Or Attorney" line.
    try {
      const sigImg =
        (await pdfDoc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await pdfDoc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: SIG_X, y: SIG_Y, width: SIG_W, height: SIG_H });
      }
    } catch { /* ignore invalid image data */ }
  }

  return Buffer.from(await pdfDoc.save({ updateFieldAppearances: false, useObjectStreams: false }));
}

const ncAocCvm200Definition: FormDefinition = {
  state: "NC",
  formId: "NC-AOC-CVM-200",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdftk",
  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildNCAocCvm200(d, body, opts);
  },
};

FormRegistry.register(ncAocCvm200Definition);
export { ncAocCvm200Definition };
