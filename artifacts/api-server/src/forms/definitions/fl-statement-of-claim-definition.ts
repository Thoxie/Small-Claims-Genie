/**
 * FL Statement of Claim — official-PDF-backed statewide form.
 *
 * Renders the official Florida Small Claims Rule 7.330–7.336 multi-form PDF
 * (fl-soc-7340.pdf, 5 pages) with case data drawn directly on page 0
 * (Form 7.330 — Statement of Claim, Auto Negligence) without inserting any
 * synthetic pages.
 *
 * Rendering technique — coordinate overlay on the official form:
 *   PDFDocument.load() on the official PDF → get page 0 → drawText/drawImage.
 *   The case caption is drawn in the blank header region above the form title
 *   (form title begins at pdftotext y=103, pdf-lib y≈689; the 103-point blank
 *   header above it occupies pdf-lib y=689–792).
 *   Plaintiff and defendant names are also drawn at the calibrated fill-in
 *   blanks in the Form 7.330 narrative text (pdftotext y=193–209 → pdf-lib
 *   y≈583; confirmed via pdftotext -bbox-layout).
 *   No AcroForm fields exist in the source PDF (confirmed via pdftk
 *   dump_data_fields); all data is placed via pdf-lib drawText/drawImage.
 *
 * Used for all FL counties that do not have a county-specific definition.
 * County-specific forms override the county name and clerk address via the
 * countyOverride/clerkAddressOverride parameters.
 *
 * Legal basis:
 *   Fla. Sm. Cl. R. 7.010 et seq.; statewide small claims procedure.
 *   Claim limit: $8,000 (exclusive of costs, interest, and attorney's fees).
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { FORMS_DIR } from "../../routes/forms-common";

import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";

const FL_SOC_PDF_PATH = path.join(FORMS_DIR, "fl-soc-7340.pdf");

const PW = 612;
const BLACK = rgb(0, 0, 0);
const ML = 54;
const MR = PW - 54;

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^fl-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function buildFLStatementOfClaim(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
  countyOverride?: string,
  _clerkAddressOverride?: string,
): Promise<Buffer> {
  // Load official FL SOC PDF (Forms 7.330–7.336, 5 pages).
  // Draw case data directly on page 0 (Form 7.330) — no synthetic pages
  // are inserted.  The form title lives at pdftotext y=103 (pdf-lib y≈689);
  // the 103-point blank header above it is used for the legal caption.
  const socPdfBytes = fs.readFileSync(FL_SOC_PDF_PATH);
  const doc = await PDFDocument.load(socPdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.getPages()[0]!;
  const countyName = countyOverride ?? countyDisplay((d as any).countyId);

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

  function truncate(text: string, maxPt: number, sz = 8): string {
    if (font.widthOfTextAtSize(text, sz) <= maxPt) return text;
    let s = text;
    while (s.length > 0 && font.widthOfTextAtSize(s + "…", sz) > maxPt)
      s = s.slice(0, -1);
    return s + "…";
  }

  // ── Legal caption in the blank header above the form title ────────────────
  // Confirmed via pdftotext -bbox-layout (page 0): the region pdf-lib y=689–792
  // contains no printed form content — safe for overlay.
  const courtTitle = countyName
    ? `IN THE COUNTY COURT, ${countyName.toUpperCase()} COUNTY, FLORIDA`
    : "IN THE COUNTY COURT, _____________ COUNTY, FLORIDA";
  t(
    courtTitle,
    (PW - bold.widthOfTextAtSize(courtTitle, 9)) / 2,
    779,
    9,
    bold,
  );
  t(
    "SMALL CLAIMS DIVISION",
    (PW - bold.widthOfTextAtSize("SMALL CLAIMS DIVISION", 9)) / 2,
    766,
    9,
    bold,
  );
  page.drawLine({
    start: { x: ML, y: 758 },
    end: { x: MR, y: 758 },
    thickness: 0.8,
    color: BLACK,
  });

  const pNameFull = (d as any).plaintiffDbaName
    ? `${d.plaintiffName ?? ""} d/b/a ${(d as any).plaintiffDbaName}`
    : (d.plaintiffName ?? "________________");

  // ── Legal caption — plaintiff block ───────────────────────────────────────
  t(pNameFull, ML, 747, 9, bold);
  const pAddrLine = [d.plaintiffAddress, d.plaintiffCity].filter(Boolean).join(", ");
  if (pAddrLine) t(pAddrLine, ML, 736, 7.5);
  t("Plaintiff,", ML, 725, 8.5);

  t("Case No.:", MR - 165, 747, 8.5, bold);
  t(d.caseNumber ?? "", MR - 110, 747, 8.5);
  const amtStr = fmtAmount(d.claimAmount);
  if (amtStr) {
    t("Amount:", MR - 165, 736, 8, bold);
    t(amtStr, MR - 117, 736, 8);
  }

  // ── Legal caption — defendant block ───────────────────────────────────────
  t("vs.", ML, 714, 8.5);
  t(d.defendantName ?? "________________", ML, 703, 9, bold);
  const dAddrLine = [d.defendantAddress, d.defendantCity].filter(Boolean).join(", ");
  if (dAddrLine) t(dAddrLine, ML, 692, 7.5);
  t("Defendant.", MR - 60, 692, 8);
  page.drawLine({
    start: { x: ML, y: 691 },
    end: { x: MR, y: 691 },
    thickness: 0.5,
    color: BLACK,
  });

  // ── Overlay party names at the form's own fill-in blanks ──────────────────
  // Form 7.330 narrative (page 0): "The plaintiff, [blank], sues the defendant, [blank], and alleges:"
  // Calibrated via pdftotext -bbox-layout (page 0 of fl-soc-7340.pdf):
  //   "plaintiff," xMax=182.640, next token "," at xMin=252.000, yMax=209.376
  //   "defendant," xMax=375.360, next token "," at xMin=432.000, yMax=209.376
  //   pdf-lib y = 792 − pdftotext_yMax = 792 − 209.376 ≈ 583
  t(truncate(d.plaintiffName ?? "", 65, 8), 183, 583, 8);
  t(truncate(d.defendantName ?? "", 51, 8), 376, 583, 8);

  // ── Claim description — word-wrapped into the gap below WHEREFORE ──────────
  // pdftotext -bbox-layout (page 0): WHEREFORE "." at pdf-lib y=439; Form 7.331
  // title ("FORM 7.331. ...") starts at y=405.8 — leaving ~33pt of blank space
  // confirmed empty on the official form.  Three lines at 7pt fill this area.
  const claimDesc = d.claimDescription ?? "";
  if (claimDesc) {
    const descSize = 7;
    const descLineH = 9;
    const descMaxW = MR - ML; // 450pt
    let descY = 434;           // first baseline — just below WHEREFORE "." (y=439)
    const descWords = claimDesc.split(" ");
    let descLine = "";
    for (const w of descWords) {
      const test = descLine ? `${descLine} ${w}` : w;
      if (font.widthOfTextAtSize(test, descSize) > descMaxW) {
        if (descY < 408) break; // no more room before Form 7.331 at y=405.8
        if (descLine) {
          page.drawText(descLine, { x: ML, y: descY, size: descSize, font, color: BLACK });
          descY -= descLineH;
          descLine = w;
        } else {
          page.drawText(w, { x: ML, y: descY, size: descSize, font, color: BLACK });
          descY -= descLineH;
        }
      } else {
        descLine = test;
      }
    }
    if (descLine && descY >= 408) {
      page.drawText(descLine, { x: ML, y: descY, size: descSize, font, color: BLACK });
    }
  }

  // ── Signature image overlay (signed variant only) ──────────────────────────
  // Placed at the plaintiff signature line near the bottom of the form.
  // pdftotext -bbox-layout (page 0): signature blank at pdf-lib x=378, y=68.
  // Unsigned download leaves the signature area blank — user signs before filing.
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, {
          x: 378,
          y: 68,
          width: 150,
          height: 28,
          opacity: 1,
        });
      }
    } catch {
      /* ignore invalid image data */
    }
  }

  return Buffer.from(await doc.save());
}

// ─── Form Definition ──────────────────────────────────────────────────────────

const flStatementOfClaimDefinition: FormDefinition = {
  state: "FL",
  formId: "FL-STATEMENT-OF-CLAIM",
  renderingTechnique: "pdf-overlay",

  async generate(
    d: CaseData,
    body: FormBody,
    opts?: GenerateOptions,
  ): Promise<Buffer> {
    return buildFLStatementOfClaim(d, body, opts);
  },
};

FormRegistry.register(flStatementOfClaimDefinition);
export { flStatementOfClaimDefinition };
