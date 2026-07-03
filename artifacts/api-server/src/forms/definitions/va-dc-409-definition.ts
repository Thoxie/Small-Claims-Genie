/**
 * VA DC-409 — Petition and Order to Proceed In Forma Pauperis
 *
 * Programmatically generated with pdf-lib (no template PDF required). No official
 * DC-409 PDF asset was available to overlay, so this is built as a plain document —
 * same approach as the NC AOC-CVM-200/AOC-G-106 precedent.
 *
 * Legal basis: Va. Code § 17.1-606 (proceeding without payment of fees or costs).
 *
 * CaseData has no income/household/public-assistance fields (see forms/types.ts),
 * so — following the FL fee waiver's minimal-prefill pattern — only identity and case
 * caption fields are pre-filled here. All financial/eligibility content (income,
 * household size, public assistance program, etc.) is left blank for the user to
 * complete by hand before filing, exactly as FL-FEE-WAIVER does for Florida's Form 1.998.
 */

import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import type { CaseData } from "../types";

const PW = 612;
const PH = 792;
const BLUE = rgb(0.1, 0.25, 0.55);
const GRAY = rgb(0.5, 0.5, 0.5);

const ML = 54;
const MR = PW - 54;

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 0.5, color = rgb(0, 0, 0)) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function txt(page: PDFPage, font: PDFFont, text: string | null | undefined, x: number, y: number, size = 9, color = BLUE) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function wrapText(page: PDFPage, font: PDFFont, text: string, x: number, y: number, maxWidth: number, size = 9, lineGap = 4, color = rgb(0, 0, 0)): number {
  const words = text.replace(/\r/g, "").split(/\s+/);
  let line = "";
  let curY = y;
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      page.drawText(line, { x, y: curY, size, font, color });
      curY -= size + lineGap;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) { page.drawText(line, { x, y: curY, size, font, color }); curY -= size + lineGap; }
  return curY;
}

function countyDisplay(countyId?: string | null): string {
  if (!countyId) return "";
  return countyId
    .replace(/^va-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function buildVADc409(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const BLACK = rgb(0, 0, 0);

  const page = doc.addPage([PW, PH]);
  const countyName = countyDisplay((d as any).countyId);

  let y = PH - 40;

  const hdr1 = "COMMONWEALTH OF VIRGINIA";
  const hdr2 = `${countyName ? countyName.toUpperCase() + " " : ""}GENERAL DISTRICT COURT`;
  const hdr3 = "PETITION AND ORDER TO PROCEED IN FORMA PAUPERIS";

  for (const [text, sz, bd] of [[hdr1, 9, false], [hdr2, 10, true], [hdr3, 11, true]] as [string, number, boolean][]) {
    const useFont = bd ? bold : font;
    const w = useFont.widthOfTextAtSize(text, sz);
    page.drawText(text, { x: (PW - w) / 2, y, size: sz, font: useFont, color: BLACK });
    y -= sz + 6;
  }

  const formNote = "DC-409 | Va. Code § 17.1-606";
  const fnw = font.widthOfTextAtSize(formNote, 7);
  page.drawText(formNote, { x: (PW - fnw) / 2, y, size: 7, font, color: GRAY });
  y -= 14;

  drawLine(page, ML, y, MR, y, 1.2);
  y -= 16;

  // Case caption
  page.drawText("Case No.:", { x: ML, y, size: 9, font: bold, color: BLACK });
  txt(page, font, d.caseNumber ?? "", ML + 58, y, 9);
  y -= 16;

  page.drawText("Plaintiff/Petitioner:", { x: ML, y, size: 9, font: bold, color: BLACK });
  txt(page, font, d.plaintiffName ?? "", ML + 118, y, 9);
  y -= 14;

  const addr = (d.plaintiffAddress ?? "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const cityStateZip = [d.plaintiffCity, d.plaintiffState ?? "VA", d.plaintiffZip].filter(Boolean).join(", ");
  page.drawText("Address:", { x: ML, y, size: 9, font: bold, color: BLACK });
  txt(page, font, [addr, cityStateZip].filter(Boolean).join(", "), ML + 58, y, 9);
  y -= 14;

  page.drawText("Phone:", { x: ML, y, size: 9, font: bold, color: BLACK });
  txt(page, font, d.plaintiffPhone ?? "", ML + 46, y, 9);
  page.drawText("Email:", { x: ML + 260, y, size: 9, font: bold, color: BLACK });
  txt(page, font, d.plaintiffEmail ?? "", ML + 300, y, 9);
  y -= 14;

  page.drawText("v.", { x: ML, y, size: 9, font: bold, color: BLACK });
  y -= 14;

  page.drawText("Defendant/Respondent:", { x: ML, y, size: 9, font: bold, color: BLACK });
  txt(page, font, d.defendantName ?? "", ML + 132, y, 9, BLACK);
  y -= 20;

  drawLine(page, ML, y, MR, y, 0.6);
  y -= 16;

  // Petition body
  const petitionText =
    `I, the undersigned Petitioner, being first duly sworn, state that I am unable to prepay the fees, costs, or ` +
    `security required to bring this civil action in the ${countyName ? countyName + " " : ""}General District Court, ` +
    `and I request leave of the court to proceed without payment of fees and costs pursuant to Va. Code § 17.1-606.`;
  y = wrapText(page, font, petitionText, ML, y, MR - ML, 9.5, 4, BLACK);
  y -= 10;

  // Blank fields for the user to complete by hand — CaseData has no income/household data.
  const fields: [string, number][] = [
    ["Monthly gross household income: $", 200],
    ["Number of persons in household:", 200],
    ["I receive public assistance (TANF, SSI, Medicaid, SNAP, etc.):  [ ] Yes   [ ] No", 0],
    ["If yes, program name:", 200],
    ["Monthly expenses (rent/mortgage, utilities, food, etc.): $", 200],
  ];
  for (const [label, blankWidth] of fields) {
    page.drawText(label, { x: ML, y, size: 9, font: bold, color: BLACK });
    if (blankWidth > 0) {
      const labelW = bold.widthOfTextAtSize(label, 9);
      drawLine(page, ML + labelW + 6, y - 1, ML + labelW + 6 + blankWidth, y - 1, 0.6, GRAY);
    }
    y -= 18;
  }

  y -= 8;
  page.drawText(
    "NOTE: The fields above must be completed by hand (or typed before printing) with your current financial " +
    "information. Small Claims Genie does not collect income or household data and cannot pre-fill this section.",
    { x: ML, y, size: 7.5, font, color: GRAY }
  );
  y -= 10;
  y = wrapText(
    page, font,
    "",
    ML, y, MR - ML, 7.5, 3, GRAY
  );

  y -= 20;
  drawLine(page, ML, y, MR, y, 0.6);
  y -= 16;

  page.drawText("VERIFICATION", { x: ML, y, size: 9.5, font: bold, color: BLACK });
  y -= 14;
  const verifyText =
    "I swear or affirm, under penalty of law, that the foregoing statements are true and accurate to the best of my knowledge.";
  y = wrapText(page, font, verifyText, ML, y, MR - ML, 8.5, 3, BLACK);
  y -= 12;

  const sigLineY = y;
  drawLine(page, ML, y, ML + 220, y, 0.6);
  page.drawText(
    `Date: ${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}`,
    { x: ML + 236, y: y + 2, size: 9, font, color: BLACK }
  );
  y -= 12;
  page.drawText("Petitioner Signature", { x: ML, y, size: 7.5, font, color: GRAY });
  y -= 24;

  drawLine(page, ML, y, MR, y, 0.6);
  y -= 16;
  page.drawText("FOR COURT USE ONLY", { x: ML, y, size: 9, font: bold, color: BLACK });
  y -= 16;
  page.drawText("[ ] GRANTED    [ ] DENIED", { x: ML, y, size: 9, font, color: BLACK });
  y -= 20;
  drawLine(page, ML, y, ML + 220, y, 0.6);
  page.drawText("Judge / Clerk Signature", { x: ML, y: y - 10, size: 7.5, font, color: GRAY });

  // Footer
  const footerY = 40;
  const footer = "DC-409 — Virginia Petition to Proceed In Forma Pauperis (Va. Code § 17.1-606) — filing fee determination is county-specific";
  const fw = font.widthOfTextAtSize(footer, 6.5);
  page.drawText(footer, { x: (PW - fw) / 2, y: footerY, size: 6.5, font, color: GRAY });

  if (opts?.signatureBytes && sigLineY > 0) {
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: ML, y: sigLineY, width: 180, height: 32, opacity: 1 });
      }
    } catch { /* ignore invalid image data */ }
  }

  return Buffer.from(await doc.save({ updateFieldAppearances: false }));
}

const vaDc409Definition: FormDefinition = {
  state: "VA",
  formId: "VA-DC-409",
  renderingTechnique: "png-overlay",
  async generate(d: CaseData, body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildVADc409(d, body, opts);
  },
};

FormRegistry.register(vaDc409Definition);
export { vaDc409Definition };
