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
import { SC140_LIFT, SC140_COORDS } from "../field-names/sc140-fields";

const C = SC140_COORDS;

export async function buildSC140Pdf(
  d: CaseData,
  b: FormBody
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bg = await pdfDoc.embedPng(loadAsset("sc140_hq-1.png"));
  const page = pdfDoc.addPage([PW, PH]);
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

  const LIFT = SC140_LIFT;
  const v  = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
  const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

  v(b.courtName || d.courthouseName || d.courthouseAddress || "", C.text.courtName.x, C.text.courtName.y);
  v(d.caseNumber, C.text.caseNumber.x, C.text.caseNumber.y);

  v(d.plaintiffName,  C.text.plaintiffName.x,  C.text.plaintiffName.y);
  v(d.plaintiffPhone, C.text.plaintiffPhone.x, C.text.plaintiffPhone.y);
  v(d.defendantName,  C.text.defendantName.x,  C.text.defendantName.y);
  v(d.defendantPhone, C.text.defendantPhone.x, C.text.defendantPhone.y);

  if (b.appellantRole === "plaintiff") xm(C.xmarks.appellantRolePlaintiff.cx,   C.xmarks.appellantRolePlaintiff.cy);
  if (b.appellantRole === "defendant") xm(C.xmarks.appellantRoleDefendant.cx,   C.xmarks.appellantRoleDefendant.cy);

  if (b.appealType === "judgment")         xm(C.xmarks.appealTypeJudgment.cx,       C.xmarks.appealTypeJudgment.cy);
  if (b.appealType === "motion_to_vacate") xm(C.xmarks.appealTypeMotionToVacate.cx, C.xmarks.appealTypeMotionToVacate.cy);

  v(b.appealFiledDate, C.text.appealFiledDate.x, C.text.appealFiledDate.y);
  v(b.appellantName || (b.appellantRole === "plaintiff" ? d.plaintiffName : d.defendantName), C.text.appellantName.x, C.text.appellantName.y);

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
