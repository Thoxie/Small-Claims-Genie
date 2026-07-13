/**
 * NJ Motor Vehicle Complaint — CN 10532 packet (CN 10148)
 *
 * Used when the claim arises from a motor-vehicle accident (property damage or
 * personal injury). NJ courts file this under the CN 10148 "How to Sue for Up
 * to $5,000 in Small Claims Court: Motor Vehicle Case" packet, but the
 * underlying complaint form is the same CN 10532 template as the standard
 * complaint — filled here via a user-supplied AcroForm PDF with clean,
 * descriptive field names.
 *
 * AcroForm fields (from pdf-lib dump):
 *   filing_name, attorney_id, filing_address1, filing_address2,
 *   filing_email, filing_phone, county (text), docket,
 *   plaintiff_name, plaintiff_address1, plaintiff_address2,
 *   plaintiff_email, plaintiff_phone,
 *   defendant_name, defendant_address1, defendant_address2,
 *   defendant_email, defendant_phone,
 *   claim_contract, claim_security, claim_rent, claim_tort (checkboxes),
 *   demand, reason1–reason8, date, signature, printed_name
 *
 * Signature field rect (page 2 / index 1): x=330, y=435, w=244, h=14
 */

import { PDFDocument, PDFName, PDFString, StandardFonts } from "pdf-lib";
import type { FormDefinition, CaseData, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { loadAsset } from "../../routes/forms-common";
import { pdftkFlatten } from "../acroform-filler";

// Signature widget bounding box on page 2 (index 1) of this form.
const SIG_X = 330.0;
const SIG_Y = 435.0;
const SIG_W = 244.0;
const SIG_H = 14.0;

const NJ_COUNTY_NAMES: Record<string, string> = {
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

function setTextField(form: any, name: string, value: string) {
  try {
    const f = form.getTextField(name);
    f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 10 Tf 0 g"));
    f.setText(value || "");
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

function fmtCsz(city?: string | null, state?: string | null, zip?: string | null): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  const sz = [state, zip].filter(Boolean).join(" ");
  if (sz) parts.push(sz);
  return parts.join(", ");
}

/**
 * Word-wrap `text` into at most `maxLines` strings, each at most
 * `maxChars` characters wide. The last line absorbs all remaining content.
 */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (lines.length >= maxLines) break;
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  return lines;
}

export async function buildNJMVComplaint(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const acroBytes = loadAsset("forms/nj_mv_complaint_acroform.pdf");
  const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  const countyId: string = (d as any).countyId ?? "";
  const countyName = NJ_COUNTY_NAMES[countyId] ?? "";

  const plaintiffName = d.plaintiffName ?? "";
  const plaintiffAddr1 = d.plaintiffAddress ?? "";
  const plaintiffAddr2 = fmtCsz(d.plaintiffCity, "NJ", d.plaintiffZip);

  const defName = d.defendantIsBusinessOrEntity && (d as any).defendantAgentName
    ? `${d.defendantName ?? ""} (c/o ${(d as any).defendantAgentName})`
    : (d.defendantName ?? "");

  const defAddr1 = d.defendantIsBusinessOrEntity && (d as any).defendantAgentStreet
    ? ((d as any).defendantAgentStreet as string)
    : (d.defendantAddress ?? "");

  const defAddr2 = d.defendantIsBusinessOrEntity && (d as any).defendantAgentCity
    ? fmtCsz(
        (d as any).defendantAgentCity,
        (d as any).defendantAgentState ?? "NJ",
        (d as any).defendantAgentZip,
      )
    : fmtCsz(d.defendantCity, d.defendantState ?? "NJ", d.defendantZip);

  // ── Plaintiff / filing attorney section ──────────────────────────────────
  setTextField(form, "filing_name",     plaintiffName);
  setTextField(form, "attorney_id",     "N/A - Self-Represented");
  setTextField(form, "filing_address1", plaintiffAddr1);
  setTextField(form, "filing_address2", plaintiffAddr2);
  setTextField(form, "filing_email",    d.plaintiffEmail ?? "");
  setTextField(form, "filing_phone",    d.plaintiffPhone ?? "");

  // ── Court info ───────────────────────────────────────────────────────────
  setTextField(form, "county", countyName);
  setTextField(form, "docket", "");

  // ── Plaintiff section ─────────────────────────────────────────────────────
  setTextField(form, "plaintiff_name",     plaintiffName);
  setTextField(form, "plaintiff_address1", plaintiffAddr1);
  setTextField(form, "plaintiff_address2", plaintiffAddr2);
  setTextField(form, "plaintiff_email",    d.plaintiffEmail ?? "");
  setTextField(form, "plaintiff_phone",    d.plaintiffPhone ?? "");

  // ── Defendant section ─────────────────────────────────────────────────────
  setTextField(form, "defendant_name",     defName);
  setTextField(form, "defendant_address1", defAddr1);
  setTextField(form, "defendant_address2", defAddr2);
  setTextField(form, "defendant_email",    d.defendantEmail ?? "");
  setTextField(form, "defendant_phone",    d.defendantPhone ?? "");

  // ── Demand ────────────────────────────────────────────────────────────────
  setTextField(form, "demand", fmtAmount(d.claimAmount as number | null));

  // ── Claim description — split across reason1–reason8 ─────────────────────
  const fullDesc = [d.claimDescription, (d as any).howAmountCalculated]
    .filter(Boolean)
    .join("  ");
  const reasonLines = wrapText(fullDesc, 85, 8);
  for (let i = 1; i <= 8; i++) {
    setTextField(form, `reason${i}`, reasonLines[i - 1] ?? "");
  }

  // ── Signature page ────────────────────────────────────────────────────────
  setTextField(form, "date",          fmtDate(null));
  setTextField(form, "signature",     opts?.signatureBytes ? "" : `/s/ ${plaintiffName}`);
  setTextField(form, "printed_name",  plaintiffName);

  const filled    = Buffer.from(await pdfDoc.save());
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
      const page = pdfDoc.getPages()[1] ?? pdfDoc.getPages()[0];
      if (page) {
        const scale = Math.min(SIG_W / sigImg.width, SIG_H / sigImg.height);
        const w = sigImg.width * scale;
        const h = sigImg.height * scale;
        page.drawImage(sigImg, { x: SIG_X, y: SIG_Y, width: w, height: h });
      }
    }
    return Buffer.from(await pdfDoc.save());
  } catch {
    return flattenedBuf;
  }
}

const njMVComplaintDefinition: FormDefinition = {
  state: "NJ",
  formId: "NJ-MV-COMPLAINT",
  renderingTechnique: "acroform-pdflib",
  assetPath: "forms/nj_mv_complaint_acroform.pdf",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildNJMVComplaint(d, b, opts);
  },
};

FormRegistry.register(njMVComplaintDefinition);
export { njMVComplaintDefinition };
