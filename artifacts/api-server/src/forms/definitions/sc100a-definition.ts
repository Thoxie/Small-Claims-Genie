/**
 * SC-100A Other Plaintiffs or Defendants — overlay definition.
 *
 * Kept as overlay (PNG background + pdf-lib text/image drawing).
 * XFA fields use non-descriptive positional identifiers (T86/T96) and
 * the form requires dual-signature embedding that pdftk cannot express.
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import { today } from "../enrichment";
import {
  PW, PH, loadAsset, val, xmark,
} from "../../routes/forms-common";

export async function buildSC100APdf(
  d: Record<string, any>,
  b: Record<string, any>,
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

  const LIFT = 4.5;
  const v  = (t: any, x: number, y: number, s = 9) => val(page, font, t, x, y + LIFT, s);
  const xm = (cx: number, cy: number) => xmark(page, cx, cy + LIFT, 5);

  if (d.caseNumber) v(d.caseNumber, 403, 739);
  xm(66, 708);

  if (p1) {
    v(p1.name,               176, 663);
    v(p1.street,             131, 647);
    v(p1.phone,              440, 647);
    v(p1.city,                96, 631);
    v(p1.state  || "CA",     299, 631);
    v(p1.zip,                372, 631);
    if ("mailingStreet" in p1 && p1.mailingStreet) {
      v(p1.mailingStreet,    195, 614);
      v(p1.mailingCity,       96, 597);
      v(p1.mailingState || "CA", 299, 597);
      v(p1.mailingZip,       371, 597);
    }
    if (d.additionalPlaintiffIsFictitious) xm(313, 586);
    else xm(352, 586);
  }

  if (p2) {
    v(p2.name,             168, 564);
    v(p2.street,           131, 548);
    v(p2.phone,            440, 548);
    v(p2.city,              96, 533);
    v(p2.state || "CA",    299, 533);
    v(p2.zip,              371, 533);
  }

  if (def1) {
    v(def1.name,              176, 420);
    v(def1.street,            131, 405);
    v(def1.phone,             439, 405);
    v(def1.city,               96, 390);
    v(def1.state || "CA",     299, 390);
    v(def1.zip,               371, 390);
    if (def1.agentName) v(def1.agentName, 97, 319);
  }

  if (d.moreThanTwoDefendants) xm(66, 278);
  if ((Number(d.claimAmount) || 0) > 2500) xm(285, 260);
  else xm(337, 260);

  const signDate = b.signDate || today();
  v(signDate,                           63, 154);
  v(p1?.name || d.plaintiffName || "",  37, 139);
  v(signDate,                           63, 111);
  v(p2?.name || "",                     37,  96);

  async function embedSig(bytes: Buffer, x: number, y: number) {
    const img = await pdfDoc.embedPng(bytes);
    const { width: sw, height: sh } = img.scale(1);
    const maxW = 185, maxH = 38;
    const scale = Math.min(maxW / sw, maxH / sh, 1);
    page.drawImage(img, { x, y, width: sw * scale, height: sh * scale });
  }
  if (sig1Bytes) await embedSig(sig1Bytes, 355, 142);
  if (sig2Bytes) await embedSig(sig2Bytes, 355,  98);

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
