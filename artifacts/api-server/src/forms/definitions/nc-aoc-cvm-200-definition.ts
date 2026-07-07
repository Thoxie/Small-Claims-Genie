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
 * Form AOC-CVM-200, Rev. 9/13 — page dimensions: 792 × 612 pts (landscape)
 *
 * Signature line coords (pdf-lib, landscape page height = 612):
 *   "Signature Of Plaintiff Or Attorney" label at pdftotext bbox
 *   [578.80, 516.11-525.37] → pdf_lib_y = 612 − 525.37 ≈ 87
 *
 * Checkbox field mapping (CkBox_001 – CkBox_006):
 *   001 = On An Account
 *   002 = For Goods Sold And Delivered Between
 *   003 = For Money Lent On a Promissory Note
 *   004 = Date From Which Interest Due (generic)
 *   005 = For a Worthless Check
 *   006 = For conversion (describe property)
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
// "Signature Of Plaintiff Or Attorney" label bbox in pdftotext (y from top):
//   yMin=516.11, yMax=525.37 → pdf_lib_y = 612 − yMax = 86.6
// Draw signature image starting at that y so it sits on the signature line.
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
 * CkBox_001: On An Account (most generic — used as fallback)
 * CkBox_002: For Goods Sold And Delivered Between [dates]
 * CkBox_003: For Money Lent On a Promissory Note
 * CkBox_004: Date From Which Interest Due (general interest-bearing claim)
 * CkBox_005: For a Worthless Check
 * CkBox_006: For conversion (describe property)
 */
function claimCheckbox(claimType?: string | null): string {
  const MAP: Record<string, string> = {
    // snake_case values (legacy / direct API calls)
    account_stated:   "CkBox_001",
    goods:            "CkBox_002",
    loan:             "CkBox_003",
    check:            "CkBox_005",
    property_damage:  "CkBox_006",
    services:         "CkBox_001",
    contract:         "CkBox_001",
    rent:             "CkBox_001",
    security_deposit: "CkBox_001",
    other:            "CkBox_004",
    // Title-case values from intake UI (new.tsx / intake-step-2.tsx)
    "Money Owed":                          "CkBox_001",
    "Unpaid Debt":                         "CkBox_001",
    "Security Deposit":                    "CkBox_001",
    "Property Damage":                     "CkBox_006",
    "Vehicle Damage/Accident":             "CkBox_006",
    "Landlord/Tenant Dispute":             "CkBox_001",
    "Online Purchase/Marketplace Dispute": "CkBox_002",
    "Unpaid Wages/Employment":             "CkBox_001",
    "Contract Dispute":                    "CkBox_001",
    "Fraud":                               "CkBox_004",
    "Other":                               "CkBox_004",
  };
  return claimType ? (MAP[claimType] ?? "CkBox_004") : "CkBox_004";
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

  const textFields: Record<string, string> = {
    FileNo:         (d as any).caseNumber ?? "",
    County1:        countyName,
    County2:        countyName,
    County3:        countyName,
    NamPltf:        pName,
    PltfStreetAddr: d.plaintiffAddress ?? "",
    PltfMailAddr:   d.plaintiffAddress ?? "",
    PltfCity:       d.plaintiffCity ?? "",
    PltfState:      (d as any).plaintiffState ?? "NC",
    PltfZip:        d.plaintiffZip ?? "",
    TeleNo1:        d.plaintiffPhone ?? "",
    NameDef:        d.defendantName ?? "",
    DefStreetAddr:  d.defendantAddress ?? "",
    DefMailAddr:    d.defendantAddress ?? "",
    DefCity:        d.defendantCity ?? "",
    DefState:       d.defendantState ?? "NC",
    DefZip:         d.defendantZip ?? "",
    TeleNo2:        d.defendantPhone ?? "",
    Reason:         d.claimDescription ?? "",
    AmtOwed:        fmtAmount(claimAmt),
    IntrstOwed:     "",
    Date5:          today,
    NamPltfAtty:    "",
    NameDef2:       "",
  };

  // For goods sold between dates, fill the beginning date field.
  if ((d as any).claimType === "goods" && d.incidentDate) {
    textFields.BeginDate = fmtDate(d.incidentDate);
  }

  const checkboxes: Record<string, boolean | string> = {
    // Plaintiff type: default individual; flip to Corp if business entity.
    Ind_01: !(d as any).plaintiffIsBusinessOrEntity,
    Corp_01: !!(d as any).plaintiffIsBusinessOrEntity,
    // Defendant type: default individual; flip to Corp if business entity.
    Ind_02: !(d as any).defendantIsBusinessOrEntity,
    Corp_02: !!(d as any).defendantIsBusinessOrEntity,
    // Check the appropriate claim type box.
    [checkedBox]: true,
  };

  const filled = await pdftk_fill_form(PDF_PATH, { text: textFields, checkboxes });

  // Always run through pdf-lib (both unsigned and signed) so both variants share
  // the same compressed baseline. This guarantees the signed PDF is reliably
  // larger than the unsigned one (image bytes > compression delta).
  const pdfDoc = await PDFDocument.load(filled);
  const page   = pdfDoc.getPages()[0];

  if (opts?.signatureBytes) {
    // Signature overlay: draw at the "Signature Of Plaintiff Or Attorney" line.
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
