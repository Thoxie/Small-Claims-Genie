/**
 * FL Summons/Notice to Appear for Pretrial Conference — Form 7.322.
 *
 * Renders the official Florida Form 7.322 (fl-summons-7322.pdf, 4 pages) with
 * case data drawn directly on page 1 (index 1 = Form 7.322 — Summons/Notice
 * to Appear for Pretrial Conference) without inserting any synthetic pages.
 *
 * Rendering technique — coordinate overlay on the official form:
 *   PDFDocument.load() on fl-summons-7322.pdf → get page index 1 → drawText.
 *   The case caption is drawn in the blank header above the form's first
 *   content line (pdftotext y < 71.436 → pdf-lib y > 720); hearing date, time,
 *   and court address are drawn at the form's calibrated fill-in blanks.
 *
 *   pdftotext -bbox-layout coordinate anchors (page 2 = index 1):
 *     Blank header (above form content): pdftotext y < 71 → pdf-lib y > 721
 *     "…..(Defendant's Names(s) and addresses(es))…..":
 *         pdftotext y=71–87 → pdf-lib y≈705 (draw defendant address here)
 *     "located at ....................,":
 *         pdftotext y=120–135, x≈363 → pdf-lib y≈656 (court address blank)
 *     ".....(date).....":
 *         pdftotext y=136–151, x=72 → pdf-lib y≈640 (hearing date blank)
 *     ".....(time)…..":
 *         pdftotext y=136–151, x=165 → pdf-lib y≈640 (hearing time blank)
 *
 * IMPORTANT — NO plaintiff signature field: Form 7.322 is a court-issued
 * summons.  The only signature on the form is the Deputy Clerk's, applied at
 * filing.  The /signed route is accepted but does not embed a plaintiff
 * signature.
 *
 * One definition file covers all FL counties. County-specific definitions
 * simply override the county name and clerk filing address.
 *
 * Legal basis: Fla. Sm. Cl. R. 7.060; Form 7.322 (eff. January 1, 2026).
 * Required for all FL small claims filings.
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { FORMS_DIR } from "../../routes/forms-common";

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";

const FL_SUMMONS_PDF_PATH = path.join(FORMS_DIR, "fl-summons-7322.pdf");

const PW = 612;
const BLACK = rgb(0, 0, 0);
const ML = 54;
const MR = PW - 54;

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^fl-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function buildFLSummons(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
  countyOverride?: string,
  clerkAddressOverride?: string,
): Promise<Buffer> {
  // Load official FL Summons PDF (Forms 7.316 + 7.322, 4 pages).
  // Draw case data directly on page index 1 (= Form 7.322, Summons/Notice
  // to Appear) — no synthetic pages are inserted.
  const summonsPdfBytes = fs.readFileSync(FL_SUMMONS_PDF_PATH);
  const doc = await PDFDocument.load(summonsPdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Index 1 = page 2 in human terms = Form 7.322 (the Summons).
  const page = doc.getPages()[1]!;
  const countyName = countyOverride ?? countyDisplay((d as any).countyId);
  const clerkAddr = clerkAddressOverride ?? "";

  function t(
    text: string | null | undefined,
    x: number,
    y: number,
    size = 9,
    f = font,
  ) {
    if (!text) return;
    page.drawText(String(text), { x, y, size, font: f, color: BLACK });
  }

  function truncate(text: string, maxPt: number, sz = 7.5): string {
    if (font.widthOfTextAtSize(text, sz) <= maxPt) return text;
    let s = text;
    while (s.length > 0 && font.widthOfTextAtSize(s + "…", sz) > maxPt)
      s = s.slice(0, -1);
    return s + "…";
  }

  // ── Legal caption in the blank header above the form title ─────────────────
  // Confirmed via pdftotext -bbox-layout (page 2 of fl-summons-7322.pdf):
  // the first form content appears at pdftotext yMin=71.436 (pdf-lib y≈721).
  // The 71-point blank header above it occupies pdf-lib y=721–792.
  const courtTitle = countyName
    ? `IN THE COUNTY COURT, ${countyName.toUpperCase()} COUNTY, FLORIDA`
    : "IN THE COUNTY COURT, _____________ COUNTY, FLORIDA";
  t(
    courtTitle,
    (PW - bold.widthOfTextAtSize(courtTitle, 9)) / 2,
    784,
    9,
    bold,
  );
  t(
    "SMALL CLAIMS DIVISION",
    (PW - bold.widthOfTextAtSize("SMALL CLAIMS DIVISION", 9)) / 2,
    772,
    9,
    bold,
  );
  if (clerkAddr) {
    t(clerkAddr, (PW - font.widthOfTextAtSize(clerkAddr, 7.5)) / 2, 761, 7.5);
  }
  page.drawLine({
    start: { x: ML, y: 753 },
    end: { x: MR, y: 753 },
    thickness: 0.8,
    color: BLACK,
  });

  const pNameFull = (d as any).plaintiffDbaName
    ? `${d.plaintiffName ?? ""} d/b/a ${(d as any).plaintiffDbaName}`
    : (d.plaintiffName ?? "________________");
  t(pNameFull, ML, 742, 9, bold);

  // ── Plaintiff address and contact info ────────────────────────────────────
  const pSummonsAddrLine = [d.plaintiffAddress, d.plaintiffCity, d.plaintiffState ?? "FL"]
    .filter(Boolean)
    .join(", ");
  if (pSummonsAddrLine) t(pSummonsAddrLine, ML, 731, 7.5);
  t("Plaintiff(s),", ML, 721, 8.5);

  t("Case No.:", MR - 165, 742, 8.5, bold);
  t(d.caseNumber ?? "", MR - 110, 742, 8.5);
  if (d.plaintiffPhone) t(d.plaintiffPhone, MR - 165, 731, 7.5);

  // ── Defendant block — white-out the placeholder zone then draw cleanly ─────
  // The template's "…..(Defendant's Names(s) and addresses(es))….." sits at
  // pdftotext y=71–87 (pdf-lib y≈704–720). Covering it with a white rectangle
  // prevents the template guidance text from showing through our overlay.
  // The form body "YOU ARE HEREBY NOTIFIED" begins at pdftotext yMin=103.836
  // (pdf-lib y≈688); the white zone stops at y=690 to leave a clean gap.
  //
  // Drawing order — top to bottom (decreasing pdf-lib y):
  //   y=721 "Plaintiff(s),"  [drawn above, in header]
  //   y=711 "vs."
  //   y=702 defendant name   (9pt bold)
  //   y=692 defendant address (7.5pt)
  //   [y≈688 form body "YOU ARE HEREBY NOTIFIED" — untouched]
  page.drawRectangle({
    x: ML - 2,
    y: 690,
    width: MR - ML + 4,
    height: 31,
    color: rgb(1, 1, 1),
  });

  t("vs.", ML, 711, 8.5);
  t(d.defendantName ?? "________________", ML, 702, 9, bold);

  const defAddrParts: string[] = [];
  if (d.defendantAddress) defAddrParts.push(d.defendantAddress);
  const defCSZ = [
    d.defendantCity,
    d.defendantState ?? "FL",
    d.defendantZip,
  ]
    .filter(Boolean)
    .join(", ");
  if (defCSZ) defAddrParts.push(defCSZ);
  if (defAddrParts.length > 0) {
    t(defAddrParts.join(", "), ML, 692, 7.5);
  }

  // ── Hearing date at ".....(date)....." blank ──────────────────────────────
  // pdftotext y=136–151, x=72 → pdf-lib y = 792 − 151.956 ≈ 640
  const hearingDateStr = d.hearingDateFormatted ?? d.hearingDate ?? "";
  t(hearingDateStr, 72, 640, 8.5);

  // ── Hearing time at ".....(time)….." blank ────────────────────────────────
  // pdftotext y=136–151, x=165 → pdf-lib y≈640 (same line as date)
  const hearingTimeStr = d.hearingTimeFormatted ?? d.hearingTime ?? "";
  t(hearingTimeStr, 165, 640, 8.5);

  // ── Court address at "located at .........." blank ────────────────────────
  // pdftotext y=120–135, x=363.36–443.94 → pdf-lib y = 792 − 135.756 ≈ 656
  // Usable blank width = 443.94 − 363.36 ≈ 80pt.
  // Using 6.5pt font to fit as many characters as possible within the blank.
  if (clerkAddr) {
    t(truncate(clerkAddr, 80, 6.5), 363, 656, 6.5);
  }

  // ── No plaintiff signature ─────────────────────────────────────────────────
  // Form 7.322 is a court-issued summons; the plaintiff does not sign it.
  // The Deputy Clerk signs at the form's own clerk-signature line at filing.
  void opts;

  return Buffer.from(await doc.save());
}

// ─── Form Definitions ─────────────────────────────────────────────────────────

const flSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-SUMMONS",
  renderingTechnique: "pdf-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(d, body, opts);
  },
};

const flVolusiaSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-VOLUSIA-SUMMONS",
  renderingTechnique: "pdf-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(d, body, opts, "Volusia", "101 N. Alabama Ave., DeLand");
  },
};

const flBrowardSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-BROWARD-SUMMONS",
  renderingTechnique: "pdf-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(
      d,
      body,
      opts,
      "Broward",
      "201 SE 6th St., Rm. 01250, Fort Lauderdale",
    );
  },
};

const flOrangeSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-ORANGE-SUMMONS",
  renderingTechnique: "pdf-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(
      d,
      body,
      opts,
      "Orange",
      "425 N. Orange Ave., Ste. 100, Orlando",
    );
  },
};

const flHillsboroughSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-HILLSBOROUGH-SUMMONS",
  renderingTechnique: "pdf-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(
      d,
      body,
      opts,
      "Hillsborough",
      "800 E. Twiggs St., Tampa",
    );
  },
};

const flPalmBeachSummonsDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-PALM-BEACH-SUMMONS",
  renderingTechnique: "pdf-overlay",
  async generate(d, body, opts) {
    return buildFLSummons(
      d,
      body,
      opts,
      "Palm Beach",
      "205 N. Dixie Hwy., West Palm Beach",
    );
  },
};

FormRegistry.register(flSummonsDefinition);
FormRegistry.register(flVolusiaSummonsDefinition);
FormRegistry.register(flBrowardSummonsDefinition);
FormRegistry.register(flOrangeSummonsDefinition);
FormRegistry.register(flHillsboroughSummonsDefinition);
FormRegistry.register(flPalmBeachSummonsDefinition);

export {
  flSummonsDefinition,
  flVolusiaSummonsDefinition,
  flBrowardSummonsDefinition,
  flOrangeSummonsDefinition,
  flHillsboroughSummonsDefinition,
  flPalmBeachSummonsDefinition,
};
