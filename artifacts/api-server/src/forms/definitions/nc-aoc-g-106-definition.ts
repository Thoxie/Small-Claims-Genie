/**
 * NC AOC-G-106 — Petition to Proceed as Indigent (Fee Waiver)
 *
 * Uses the official NC Administrative Office of the Courts form PDF
 * provided by the user (nccourts.gov blocks automated downloads via
 * Cloudflare WAF / HTTP 403).
 *
 * Technique: acroform-pdftk (pdftk FDF fill + flatten) + pdf-lib overlay
 *   for petitioner's printed name/address and optional signature image.
 *
 * AcroForm fields verified via: pdftk nc-aoc-g-106.pdf dump_data_fields
 *
 * Legal basis:
 *   N.C. Gen. Stat. § 1-110 — Petition to Sue as Indigent
 *   N.C. Gen. Stat. § 7A-228 — Small Claims Court filing fees
 *   If granted: $96 filing fee + $30 sheriff service fee waived.
 *
 * Signature layout (pdftotext -bbox-layout, page 1, pdf-lib coords):
 *   "Date"      at y≈219, x≈38   — left of oath row
 *   "Signature" at y≈219, x≈317  — petitioner's signature area (right half)
 *   "Name And Address Of Petitioner" at y≈195, x≈38 — printed name block
 *
 * Notes:
 *   - SueCbx checked: "Petition To Assert Claims" (filing a new small claim).
 *   - FinanciallyUnableCbx checked: general financial inability (catch-all).
 *   - DistrictCourtDivisionCbx checked: small claims is District Court.
 *   - SWORN/AFFIRMED section (PersonTitle, CommisionExpiredDate) is left
 *     blank — the clerk/notary administers the oath at the window.
 */

import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";
import { pdftk_fill_form } from "../pdftk-fdf";
import { FORMS_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(FORMS_DIR, "nc-aoc-g-106.pdf");

// Signature overlay coords (pdf-lib, portrait page, h=792)
// "Signature" label is at pdf-lib y≈219; we place the image just above
// the rule, spanning from the "Signature" label rightward.
const SIG_X = 355;
const SIG_Y = 210;
const SIG_W = 190;
const SIG_H = 35;

// Petitioner printed name/address coords (below the "Name And Address" label)
const ADDR_X = 38;
const ADDR_Y = 178;

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^nc-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function today(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export async function buildNCAocG106(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const countyName = countyDisplay((d as any).countyId);

  const textFields: Record<string, string> = {
    FileNumber:    (d as any).caseNumber ?? "",
    CountyName:    countyName,
    PlaintiffName: d.plaintiffName ?? "",
    DefendantName: d.defendantName ?? "",
    SignatureDate: today(),
  };

  const checkboxes: Record<string, boolean> = {
    DistrictCourtDivisionCbx: true,   // small claims = district court
    SuperiorCourtDivisionCbx: false,
    SueCbx:               true,        // Petition To Assert Claims
    InmateCbx:            false,
    FileMotionsCbx:       false,
    AppealCbx:            false,
    ExpunctionPetitionCbx: false,
    RecipientOfCbx:       false,
    SNAPCbx:              false,
    TANFCbx:              false,
    SSICbx:               false,
    LegalServicesCbx:     false,
    FinanciallyUnableCbx: true,        // general financial inability (catch-all)
  };

  const filled = await pdftk_fill_form(PDF_PATH, { text: textFields, checkboxes });

  // pdf-lib overlay: add petitioner's printed name/address + optional signature
  const pdfDoc = await PDFDocument.load(filled);
  const page   = pdfDoc.getPages()[0];
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const BLACK  = rgb(0, 0, 0);

  // Petitioner's printed name and address (write-in area below the label)
  const pName = d.plaintiffName ?? "";
  const pAddr = [
    d.plaintiffAddress,
    d.plaintiffCity,
    `${(d as any).plaintiffState ?? "NC"} ${d.plaintiffZip ?? ""}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  if (pName) {
    page.drawText(pName, { x: ADDR_X, y: ADDR_Y, size: 8, font, color: BLACK });
  }
  if (pAddr) {
    page.drawText(pAddr, { x: ADDR_X, y: ADDR_Y - 11, size: 8, font, color: BLACK });
  }

  // Optional signature image overlay on the petitioner's signature line
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await pdfDoc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await pdfDoc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, {
          x: SIG_X,
          y: SIG_Y,
          width: SIG_W,
          height: SIG_H,
        });
      }
    } catch { /* ignore invalid image data */ }
  }

  return Buffer.from(
    await pdfDoc.save({ updateFieldAppearances: false, useObjectStreams: false }),
  );
}

const ncAocG106Definition: FormDefinition = {
  state: "NC",
  formId: "NC-AOC-G-106",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdftk",
  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildNCAocG106(d, body, opts);
  },
};

FormRegistry.register(ncAocG106Definition);
export { ncAocG106Definition };
