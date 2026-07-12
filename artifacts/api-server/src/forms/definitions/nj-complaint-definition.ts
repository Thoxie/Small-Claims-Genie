/**
 * NJ CN 10532 (Appendix XI-C) — Small Claims Complaint (Contract, Security Deposit,
 * Rent, or Personal Injury/Property Damage other than motor vehicle)
 *
 * AcroForm via pdf-lib — the official njcourts.gov PDF has real fillable text/choice/
 * radio fields (verified via `pdftk dump_data_fields`), so this follows the SC-104/
 * SC-105/FW-001 acroform-pdflib pattern rather than a programmatic build.
 *
 * Legal basis:
 *   N.J. Ct. R. 6:11 — Special Civil Part, Small Claims Section
 *   Claim limit: $5,000 (security deposit cases) / $3,000 (all other small claims)
 *   Form CN 10532, Revised 07/01/2022
 *
 * Source PDF retrieved from the Internet Archive Wayback Machine snapshot of
 * njcourts.gov (direct download is blocked by Incapsula bot protection).
 */

import { PDFDocument, PDFName, PDFString, StandardFonts, layoutMultilineText } from "pdf-lib";
import type { FormDefinition, CaseData, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { loadAsset } from "../../routes/forms-common";
import { pdftkFlatten } from "../acroform-filler";

// plaSigA widget rect (from the source AcroForm; see buildNJComplaint below).
const SIG_X = 324.902;
const SIG_Y = 432.861;
const SIG_W = 229.694;
const SIG_H = 19.031;

const NJ_COUNTY_CODES: Record<string, string> = {
  "nj-atlantic":    "Atlantic",
  "nj-bergen":      "Bergen",
  "nj-burlington":  "Burlington",
  "nj-camden":      "Camden",
  "nj-cape-may":    "Cape May",
  "nj-cumberland":  "Cumberland",
  "nj-essex":       "Essex",
  "nj-gloucester":  "Gloucester",
  "nj-hudson":      "Hudson",
  "nj-hunterdon":   "Hunterdon",
  "nj-mercer":      "Mercer",
  "nj-middlesex":   "Middlesex",
  "nj-monmouth":    "Monmouth",
  "nj-morris":      "Morris",
  "nj-ocean":       "Ocean",
  "nj-passaic":     "Passaic",
  "nj-salem":       "Salem",
  "nj-somerset":    "Somerset",
  "nj-sussex":      "Sussex",
  "nj-union":       "Union",
  "nj-warren":      "Warren",
};

const CLAIM_TYPE_TO_RADIO: Record<string, string> = {
  contract: "1",
  goods: "1",
  services: "1",
  loan: "1",
  account_stated: "1",
  other: "1",
  security_deposit: "2",
  rent: "3",
  personal_injury: "4",
  property_damage: "4",
};

function setField(form: any, name: string, value: string) {
  try {
    const f = form.getTextField(name);
    f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 10 Tf 0 g"));
    f.setText(value || "");
  } catch { /* field may not exist */ }
}

/**
 * Fills a multiline text field, shrinking the font size as needed so the
 * wrapped text fits within the field's own box height. Falls back to the
 * smallest size and truncates with an ellipsis if it still doesn't fit
 * (rather than letting pdf-lib overflow the text past the box, which used
 * to print into the page footer for long AI-generated claim descriptions).
 */
async function setFittedMultilineField(
  pdfDoc: PDFDocument,
  form: any,
  name: string,
  value: string,
  opts?: { maxFontSize?: number; minFontSize?: number },
): Promise<void> {
  const text = value || "";
  let field: any;
  try {
    field = form.getTextField(name);
  } catch {
    return;
  }

  const widgets = field.acroField.getWidgets();
  const rect = widgets[0]?.getRectangle();
  // Leave a small margin inside the visible box so wrapped text never
  // touches the field border.
  const boxWidth = rect ? Math.max(20, rect.width - 8) : 500;
  const boxHeight = rect ? Math.max(20, rect.height - 6) : 180;

  const helvFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const maxFontSize = opts?.maxFontSize ?? 10;
  const minFontSize = opts?.minFontSize ?? 6;

  for (let size = maxFontSize; size >= minFontSize; size -= 0.5) {
    const layout = layoutMultilineText(text, {
      alignment: 0,
      fontSize: size,
      font: helvFont,
      bounds: { x: 0, y: 0, width: boxWidth, height: boxHeight },
    });
    const lineHeight = size * 1.15;
    const neededHeight = layout.lines.length * lineHeight;
    if (neededHeight <= boxHeight) {
      field.acroField.dict.set(PDFName.of("DA"), PDFString.of(`/Helv ${size} Tf 0 g`));
      field.setText(text);
      return;
    }
  }

  // Nothing fit even at minFontSize — truncate to the max number of lines
  // that fit, keeping whole words, and append an ellipsis.
  const layout = layoutMultilineText(text, {
    alignment: 0,
    fontSize: minFontSize,
    font: helvFont,
    bounds: { x: 0, y: 0, width: boxWidth, height: boxHeight },
  });
  const lineHeight = minFontSize * 1.15;
  const maxLines = Math.max(1, Math.floor(boxHeight / lineHeight));
  const kept = layout.lines.slice(0, maxLines).map((l) => l.text);
  if (kept.length > 0) {
    kept[kept.length - 1] = kept[kept.length - 1].replace(/[\s.]*$/, "") + "…";
  }
  field.acroField.dict.set(PDFName.of("DA"), PDFString.of(`/Helv ${minFontSize} Tf 0 g`));
  field.setText(kept.join("\n"));
}

function setChoice(form: any, name: string, value: string) {
  try {
    form.getDropdown(name).select(value);
  } catch { /* field may not exist */ }
}

function setRadio(form: any, name: string, value: string) {
  try {
    form.getRadioGroup(name).select(value);
  } catch { /* field may not exist */ }
}

function fmtAmount(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return Number(v).toFixed(2);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const [y, m, d] = iso.split("-");
  return (m && d && y) ? `${m}/${d}/${y}` : iso;
}

export async function buildNJComplaint(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const acroBytes = loadAsset("forms/nj_complaint_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  const plaName = (d as any).plaintiffDbaName
    ? `${d.plaintiffName ?? ""} d/b/a ${(d as any).plaintiffDbaName}`
    : (d.plaintiffName ?? "");
  const plaAddr = [d.plaintiffAddress, d.plaintiffCity, `NJ ${d.plaintiffZip ?? ""}`.trim()]
    .filter(Boolean).join(", ");

  setField(form, "plaNameA", plaName);
  setField(form, "plaAddrA", plaAddr);
  setField(form, "plaEmailA", d.plaintiffEmail ?? "");
  setField(form, "plaPhA", d.plaintiffPhone ?? "");

  const countyId: string = (d as any).countyId ?? "";
  const countyCode = NJ_COUNTY_CODES[countyId] ?? "";
  if (countyCode) setChoice(form, "typeCtyA", countyCode);

  const defName = d.defendantIsBusinessOrEntity && (d as any).defendantAgentName
    ? `${d.defendantName ?? ""} (c/o ${(d as any).defendantAgentName})`
    : (d.defendantName ?? "");
  const defAddr = d.defendantIsBusinessOrEntity && (d as any).defendantAgentStreet
    ? [
        (d as any).defendantAgentStreet,
        (d as any).defendantAgentCity,
        `${(d as any).defendantAgentState ?? "NJ"} ${(d as any).defendantAgentZip ?? ""}`.trim(),
      ].filter(Boolean).join(", ")
    : [d.defendantAddress, d.defendantCity, `${d.defendantState ?? "NJ"} ${d.defendantZip ?? ""}`.trim()]
        .filter(Boolean).join(", ");

  setField(form, "defNameA", defName);
  setField(form, "defAddrA", defAddr);
  setField(form, "defPhA", d.defendantPhone ?? "");

  const radioValue = CLAIM_TYPE_TO_RADIO[(d as any).claimType ?? ""] ?? "1";
  setRadio(form, "ComplaintType", radioValue);

  setField(form, "demandAmt", fmtAmount(d.claimAmount as number | null));

  const desc = [d.claimDescription, (d as any).howAmountCalculated]
    .filter(Boolean).join("  ");
  await setFittedMultilineField(pdfDoc, form, "demandDesc", desc);

  setField(form, "sigDtA", fmtDate(null));
  // Leave plaSigA blank when we have an actual signature image (drawn on the
  // page below); otherwise fall back to a typed "/s/ Name" e-signature line.
  setField(form, "plaSigA", opts?.signatureBytes ? "" : `/s/ ${d.plaintiffName ?? ""}`);
  setField(form, "plaA", d.plaintiffName ?? "");

  const filled = Buffer.from(await pdfDoc.save());
  const flattened = await pdftkFlatten(filled);

  if (opts?.signatureBytes) {
    return embedSignatureImage(flattened, opts.signatureBytes);
  }
  return flattened;
}

/** Overlay the plaintiff's drawn signature image onto the flattened PDF. */
async function embedSignatureImage(flattenedBuf: Buffer, sigBytes: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(flattenedBuf, { ignoreEncryption: true });
    const sigImg = await pdfDoc.embedPng(sigBytes).catch(() => null)
      ?? await pdfDoc.embedJpg(sigBytes).catch(() => null);
    if (sigImg) {
      // The plaSigA widget lives on page 2 (index 1) of this form, not page 1.
      const page = pdfDoc.getPages()[1] ?? pdfDoc.getPages()[0];
      if (page) {
        // Preserve the image's aspect ratio within the field's box.
        const scale = Math.min(SIG_W / sigImg.width, SIG_H / sigImg.height);
        const w = sigImg.width * scale;
        const h = sigImg.height * scale;
        page.drawImage(sigImg, { x: SIG_X, y: SIG_Y, width: w, height: h });
      }
    }
    return Buffer.from(await pdfDoc.save());
  } catch {
    // If signature embedding fails for any reason, still return the
    // otherwise-valid flattened PDF rather than failing the download.
    return flattenedBuf;
  }
}

const njComplaintDefinition: FormDefinition = {
  state: "NJ",
  formId: "NJ-CN10532",
  renderingTechnique: "acroform-pdflib",
  assetPath: "forms/nj_complaint_acroform.pdf",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildNJComplaint(d, b, opts);
  },
};

FormRegistry.register(njComplaintDefinition);
export { njComplaintDefinition };
