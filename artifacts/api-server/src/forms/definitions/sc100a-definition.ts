/**
 * SC-100A Other Plaintiffs or Defendants — overlay definition.
 *
 * Kept as overlay (PNG background + pdf-lib text/image drawing).
 * XFA fields use non-descriptive positional identifiers (T86/T96) and
 * the form requires dual-signature embedding that pdftk cannot express.
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition, CaseData, FormBody } from "../registry";
import { FormRegistry } from "../registry";
import { today } from "../enrichment";
import {
  PW, PH, loadAsset, val, xmark,
} from "../../routes/forms-common";
import { SC100A_LIFT, SC100A_COORDS } from "../field-names/sc100a-fields";

const C = SC100A_COORDS;

export async function buildSC100APdf(
  d: CaseData,
  b: FormBody,
  sig1Bytes?: Buffer,
  sig2Bytes?: Buffer
): Promise<Buffer> {
  const dbP1 = d.additionalPlaintiffName ? {
    name:          d.additionalPlaintiffName,
    phone:         d.secondPlaintiffPhone        || "",
    street:        d.secondPlaintiffAddress      || "",
    city:          d.secondPlaintiffCity         || "",
    state:         d.secondPlaintiffState        || "CA",
    zip:           d.secondPlaintiffZip          || "",
    mailingStreet: d.secondPlaintiffMailingAddress || "",
    mailingCity:   d.secondPlaintiffMailingCity   || "",
    mailingState:  d.secondPlaintiffMailingState  || "CA",
    mailingZip:    d.secondPlaintiffMailingZip    || "",
  } : null;
  const extraPlaintiff = (b.extraPlaintiff && b.extraPlaintiff.name) ? b.extraPlaintiff as {
    name: string; phone: string; street: string; city: string; state: string; zip: string;
  } : null;
  const p1  = dbP1 ?? extraPlaintiff;
  const p2  = dbP1 ? extraPlaintiff : null;
  const def1 = (b.extraDefendant && b.extraDefendant.name) ? b.extraDefendant as {
    name: string; phone: string; street: string; city: string; state: string; zip: string; agentName?: string;
  } : null;

  const pdfDoc   = await PDFDocument.create();
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bg       = await pdfDoc.embedPng(loadAsset("sc100a_hq-1.png"));
  const page     = pdfDoc.addPage([PW, PH]);
  page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });

  const LIFT = SC100A_LIFT;
  const v  = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
  const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

  if (d.caseNumber) v(d.caseNumber, C.text.caseNumber.x, C.text.caseNumber.y);
  xm(C.xmarks.topCheckbox.cx, C.xmarks.topCheckbox.cy);

  if (p1) {
    v(p1.name,               C.text.p1Name.x,    C.text.p1Name.y);
    v(p1.street,             C.text.p1Street.x,  C.text.p1Street.y);
    v(p1.phone,              C.text.p1Phone.x,   C.text.p1Phone.y);
    v(p1.city,               C.text.p1City.x,    C.text.p1City.y);
    v(p1.state  || "CA",     C.text.p1State.x,   C.text.p1State.y);
    v(p1.zip,                C.text.p1Zip.x,     C.text.p1Zip.y);
    if (dbP1?.mailingStreet) {
      v(dbP1.mailingStreet,    C.text.p1MailingStreet.x,  C.text.p1MailingStreet.y);
      v(dbP1.mailingCity,      C.text.p1MailingCity.x,    C.text.p1MailingCity.y);
      v(dbP1.mailingState || "CA", C.text.p1MailingState.x, C.text.p1MailingState.y);
      v(dbP1.mailingZip,       C.text.p1MailingZip.x,     C.text.p1MailingZip.y);
    }
    if (d.additionalPlaintiffIsFictitious) xm(C.xmarks.p1IsFictitious.cx,    C.xmarks.p1IsFictitious.cy);
    else                                   xm(C.xmarks.p1IsNotFictitious.cx, C.xmarks.p1IsNotFictitious.cy);
  }

  if (p2) {
    v(p2.name,             C.text.p2Name.x,   C.text.p2Name.y);
    v(p2.street,           C.text.p2Street.x, C.text.p2Street.y);
    v(p2.phone,            C.text.p2Phone.x,  C.text.p2Phone.y);
    v(p2.city,             C.text.p2City.x,   C.text.p2City.y);
    v(p2.state || "CA",    C.text.p2State.x,  C.text.p2State.y);
    v(p2.zip,              C.text.p2Zip.x,    C.text.p2Zip.y);
  }

  if (def1) {
    v(def1.name,              C.text.def1Name.x,   C.text.def1Name.y);
    v(def1.street,            C.text.def1Street.x, C.text.def1Street.y);
    v(def1.phone,             C.text.def1Phone.x,  C.text.def1Phone.y);
    v(def1.city,              C.text.def1City.x,   C.text.def1City.y);
    v(def1.state || "CA",     C.text.def1State.x,  C.text.def1State.y);
    v(def1.zip,               C.text.def1Zip.x,    C.text.def1Zip.y);
    if (def1.agentName) v(def1.agentName, C.text.def1AgentName.x, C.text.def1AgentName.y);
  }

  if (d.moreThanTwoDefendants) xm(C.xmarks.moreThanTwoDefendants.cx, C.xmarks.moreThanTwoDefendants.cy);
  if ((Number(d.claimAmount) || 0) > 2500) xm(C.xmarks.claimAmountOver2500.cx,  C.xmarks.claimAmountOver2500.cy);
  else                                      xm(C.xmarks.claimAmountUnder2500.cx, C.xmarks.claimAmountUnder2500.cy);

  const signDate = b.signDate || today();
  v(signDate,                           C.text.signDate1.x,   C.text.signDate1.y);
  v(p1?.name || d.plaintiffName || "",  C.text.signerName1.x, C.text.signerName1.y);
  v(signDate,                           C.text.signDate2.x,   C.text.signDate2.y);
  v(p2?.name || "",                     C.text.signerName2.x, C.text.signerName2.y);

  async function embedSig(bytes: Buffer, x: number, y: number) {
    const img = await pdfDoc.embedPng(bytes);
    const { width: sw, height: sh } = img.scale(1);
    const { maxW, maxH } = C.sigs;
    const scale = Math.min(maxW / sw, maxH / sh, 1);
    page.drawImage(img, { x, y, width: sw * scale, height: sh * scale });
  }
  if (sig1Bytes) await embedSig(sig1Bytes, C.sigs.sig1.x, C.sigs.sig1.y);
  if (sig2Bytes) await embedSig(sig2Bytes, C.sigs.sig2.x, C.sigs.sig2.y);

  return Buffer.from(await pdfDoc.save());
}

const sc100aDefinition: FormDefinition = {
  state: "CA",
  formId: "SC-100A",
  renderingTechnique: "png-overlay",
  async generate(d, b, opts) {
    function toBytes(s: string | undefined): Buffer | undefined {
      return s ? Buffer.from(s.replace(/^data:image\/\w+;base64,/, ""), "base64") : undefined;
    }
    const sig1 = opts?.signatureBytes ?? toBytes(b.signature1DataUrl as string | undefined);
    const sig2 = toBytes(b.signature2DataUrl as string | undefined);
    return buildSC100APdf(d, b, sig1, sig2);
  },
};

FormRegistry.register(sc100aDefinition);
