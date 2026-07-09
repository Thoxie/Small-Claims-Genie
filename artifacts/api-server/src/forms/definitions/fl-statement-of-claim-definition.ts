/**
 * FL Statement of Claim — official-PDF-backed statewide form.
 *
 * Renders the official Florida Small Claims Rule 7.340 PDF
 * (fl-soc-form7340.pdf — page 2 of the 5-page packet, extracted via pdftk
 * because pdf-lib cannot reliably parse the pypdf-generated parent PDF's
 * page tree) with case data drawn directly on page index 0.
 *
 * Rendering technique — coordinate overlay on the official form:
 *   PDFDocument.load() on the single-page Form 7.340 PDF → get page index 0 →
 *   drawText/drawImage.
 *   The case caption is drawn in the blank header region above the form content
 *   (Form 7.340 content begins at pdftotext y=99.636, pdf-lib y≈677; the
 *   ~115-point blank header above it occupies pdf-lib y=677–792).
 *   Plaintiff and defendant names are drawn at the calibrated fill-in blanks in
 *   the Form 7.340 narrative "Plaintiff, [blank], sues defendant, [blank]":
 *     "Plaintiff," xMax=157.2, blank until "," xMin=216, yMax=115.356
 *     → pdf-lib y = 792 − 115.356 ≈ 677; fill at x=158, y=677 (plaintiff)
 *     "defendant," xMax=316.8, blank until "," xMin=360, same y
 *     → fill at x=317, y=677 (defendant)
 *   Amount blank: after "$" xMax=379.92, yMax=131.556 → pdf-lib y≈660
 *     → fill at x=381, y=660
 *   Description: word-wrapped in item-list blank area (pdf-lib y=640–608).
 *   Signature block: drawn only in signed variant at bottom of page.
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

// fl-soc-form7340.pdf is page 2 of the 5-page fl-soc-7340.pdf packet,
// extracted via `pdftk fl-soc-7340.pdf cat 2 output fl-soc-form7340.pdf`.
// The extraction is necessary because pdf-lib cannot reliably parse the
// pypdf-generated parent PDF's page tree (it only sees 1 page at runtime).
const FL_SOC_PDF_PATH = path.join(FORMS_DIR, "fl-soc-form7340.pdf");

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
  // Draw case data on page index 1 (Form 7.340 — general Statement of Claim).
  // The form title lives at pdftotext y≈99 (pdf-lib y≈692); the ~115-point
  // blank header above it (pdf-lib y=677–792) is used for the legal caption.
  const socPdfBytes = fs.readFileSync(FL_SOC_PDF_PATH);
  const doc = await PDFDocument.load(socPdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // fl-soc-form7340.pdf is a single-page PDF (Form 7.340 extracted by pdftk).
  const page = doc.getPages()[0]!;
  const countyName = countyOverride ?? countyDisplay((d as any).countyId);

  // Collapses vertical whitespace (line breaks, tabs, form feeds) to a single
  // space. The overlay draws with a StandardFonts (WinAnsi) font, whose
  // widthOfTextAtSize/drawText throw "WinAnsi cannot encode \n" on any line
  // break. User claim descriptions and addresses can contain newlines, so every
  // drawn or measured string is normalized to one line first. This is a no-op
  // for values that contain no vertical whitespace, so existing output is
  // unchanged for all currently-working cases.
  function oneLine(s: string): string {
    return s.replace(/[\r\n\t\f\v]+/g, " ");
  }

  function t(
    text: string | null | undefined,
    x: number,
    y: number,
    size = 9,
    f = font,
  ) {
    if (!text) return;
    page.drawText(oneLine(String(text)), { x, y, size, font: f, color: BLACK });
  }

  function truncate(text: string, maxPt: number, sz = 8): string {
    text = oneLine(text);
    if (font.widthOfTextAtSize(text, sz) <= maxPt) return text;
    let s = text;
    while (s.length > 0 && font.widthOfTextAtSize(s + "…", sz) > maxPt)
      s = s.slice(0, -1);
    return s + "…";
  }

  // ── Legal caption in the blank header above Form 7.340 ───────────────────
  // pdftotext -bbox-layout (page index 1): Form 7.340 content starts at
  // pdftotext yMin=99.636 → pdf-lib y≈692. The region pdf-lib y=692–792
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

  // ── Overlay party names at Form 7.340 narrative fill-in blanks ─────────────
  // Form 7.340 (page index 1): "Plaintiff, [blank], sues defendant, [blank], and alleges:"
  // Calibrated via pdftotext -bbox-layout (page index 1 of fl-soc-7340.pdf):
  //   "Plaintiff," xMax=157.2, blank until "," xMin=216, yMax=115.356
  //   "defendant," xMax=316.8, blank until "," xMin=360, yMax=115.356
  //   pdf-lib y = 792 − 115.356 ≈ 677
  t(truncate(d.plaintiffName ?? "", 55, 8), 158, 677, 8);
  t(truncate(d.defendantName ?? "", 40, 8), 317, 677, 8);

  // ── Amount: "due, owing, and unpaid from defendant to plaintiff $[blank]" ──
  // pdftotext: "$" xMax=379.92, yMax=131.556 → pdf-lib y = 792 − 131.556 ≈ 660
  const amtNarr = fmtAmount(d.claimAmount);
  if (amtNarr) t(amtNarr.replace(/^\$/, ""), 381, 660, 8);

  // ── Claim description — word-wrapped into the Form 7.340 item-list area ───
  // pdftotext (page index 1): item-list blank runs between the date-range line
  // (yMax=163.956 → pdf-lib y=628) and the "(list time and materials)" note
  // (yMin=178.416 → pdf-lib y=614). Three lines at 7pt fit in this 33pt gap.
  const claimDesc = oneLine(d.claimDescription ?? "");
  if (claimDesc) {
    const descSize = 7;
    const descLineH = 9;
    const descMaxW = MR - ML; // 504pt
    let descY = 638;           // first baseline — just below date-range line (y≈628)
    const descWords = claimDesc.split(" ");
    let descLine = "";
    for (const w of descWords) {
      const test = descLine ? `${descLine} ${w}` : w;
      if (font.widthOfTextAtSize(test, descSize) > descMaxW) {
        if (descY < 610) break; // no more room before "(list...)" note at y=614
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
    if (descLine && descY >= 610) {
      page.drawText(descLine, { x: ML, y: descY, size: descSize, font, color: BLACK });
    }
  }

  // ── Signature block (signed variant only) ─────────────────────────────────
  // Placed at the plaintiff signature area near the bottom of page index 1.
  // Unsigned download leaves this area blank — user signs the paper form before
  // filing. Typed name, date, address, and phone accompany the image signature.
  if (opts?.signed) {
    const todaySig = new Date().toLocaleDateString("en-US", {
      month: "2-digit", day: "2-digit", year: "numeric",
    });
    t(`/${d.plaintiffName ?? ""}/`, ML, 97, 7);
    t(todaySig, ML + 265, 97, 7);
    if (d.plaintiffAddress) t(d.plaintiffAddress, ML, 87, 7);
    if (d.plaintiffPhone) t(d.plaintiffPhone, ML + 265, 87, 7);

    if (opts.signatureBytes) {
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
