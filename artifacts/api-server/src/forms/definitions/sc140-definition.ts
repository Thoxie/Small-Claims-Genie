/**
 * SC-140 Notice of Appeal — overlay definition.
 *
 * Kept as overlay (PNG background + pdf-lib drawing).
 * No usable AcroForm fields were detected by either pdftk or pdf-lib.
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, CaseData, FormBody } from "../registry";
import { FormRegistry } from "../registry";
import {
  PW, PH, loadAsset, val, xmark,
} from "../../routes/forms-common";

export async function buildSC140Pdf(
  d: CaseData,
  b: FormBody
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bg = await pdfDoc.embedPng(loadAsset("sc140_hq-1.png"));
  const page = pdfDoc.addPage([PW, PH]);
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

  const LIFT = 4.5;
  const v  = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
  const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

  v(b.courtName || d.courthouseName || d.courthouseAddress || "", 285, 754);
  v(d.caseNumber, 900 * 0.24, 745);

  v(d.plaintiffName,  72, 725);
  v(d.plaintiffPhone, 72, 707);
  v(d.defendantName, 350, 725);
  v(d.defendantPhone, 350, 707);

  if (b.appellantRole === "plaintiff") xm(120, 554);
  if (b.appellantRole === "defendant") xm(120, 537);

  if (b.appealType === "judgment")         xm(49,  460);
  if (b.appealType === "motion_to_vacate") xm(252, 460);

  v(b.appealFiledDate, 72, 430);
  v(b.appellantName || (b.appellantRole === "plaintiff" ? d.plaintiffName : d.defendantName), 72, 387);

  return Buffer.from(await pdfDoc.save());
}

const sc140Definition: FormDefinition = {
  state: "CA",
  formId: "SC-140",
  renderingTechnique: "png-overlay",
  async generate(d, b) {
    return buildSC140Pdf(d, b);
  },
};

FormRegistry.register(sc140Definition);
