/**
 * AZ Proof of Service by Registered or Certified Mail — LJSC00003F (Small Claims)
 *
 * Fills the official Arizona Justice Court "Proof of Service by Registered or
 * Certified Mail (Small Claims)" (LJSC00003F-010120) via pdf-lib coordinate overlay.
 *
 * Source PDF: assets/forms/az-ljsc00003f-proof-of-service.pdf
 * No AcroForm fields (pdftk dump_data_fields returns nothing).
 *
 * Same two-column form structure as LJSC00002F (Summons) but the body
 * content differs and the party-box section is shifted ~15 pts higher.
 *
 * Coordinate reference (pdftotext -bbox-layout, y from top of 792pt page):
 *   pdf-lib y = 792 − pdftotext_yMax
 *
 * "Person Filing:" section (top-left):
 *   Same positions as AZ Summons (identical header layout).
 *
 * Plaintiff party box (left column, x=77–282):
 *   Name    : x=77,  y=587  (paren row yMax=390.712 → section starts ~15pts higher)
 *   Address : x=77,  y=570
 *   CSZ     : x=77,  y=554
 *   Phone   : x=95,  y=401  (paren row yMax=390.712)
 *
 * Defendant party box (right column, x=365–571, below form title):
 *   Name    : x=365, y=450  (just above "vs." at y=356)
 *   Address : x=365, y=436
 *   Phone   : x=400, y=401
 *
 * Legal basis:
 *   A.R.S. § 22-513 — Proof of Service
 *   Arizona Rules of Small Claims Procedure (ARSCP) 5(b)
 *   Filed by plaintiff to prove defendant was served.
 */

import * as fs from "fs";
import * as path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(FORMS_DIR, "az-ljsc00003f-proof-of-service.pdf");
const BLACK = rgb(0, 0, 0);

function csz(
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  if (state && zip) parts.push(`${state} ${zip}`);
  else if (state) parts.push(state);
  else if (zip) parts.push(zip);
  return parts.join(", ");
}

export async function buildAZProofOfService(
  d: CaseData,
  _body: FormBody,
  opts?: GenerateOptions,
): Promise<Buffer> {
  const pdfBytes = fs.readFileSync(PDF_PATH);
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPages()[0]!;

  const t = (
    text: string | null | undefined,
    x: number,
    y: number,
    size = 8.5,
  ) => {
    if (!text) return;
    page.drawText(String(text), { x, y, size, font, color: BLACK });
  };

  const pltCSZ = csz(d.plaintiffCity, d.plaintiffState ?? "AZ", d.plaintiffZip);
  const defCSZ = csz(d.defendantCity, d.defendantState ?? "AZ", d.defendantZip);

  // ── Person Filing (top-left section) ─────────────────────────────────────────
  t(d.plaintiffName ?? "", 200, 706);
  t(d.plaintiffAddress ?? "", 200, 689);
  t(pltCSZ, 200, 672);
  t(d.plaintiffPhone ?? "", 145, 654);
  t(d.plaintiffEmail ?? "", 160, 637);

  // ── Plaintiff party box (left column, ~15pt higher than Summons) ─────────────
  t(d.plaintiffName ?? "", 77, 587);
  t(d.plaintiffAddress ?? "", 77, 570);
  t(pltCSZ, 77, 554);
  t(d.plaintiffPhone ?? "", 95, 401);

  // ── Defendant party box (right column, below form title) ─────────────────────
  t(d.defendantName ?? "", 365, 450);
  t(d.defendantAddress ?? "", 365, 436);
  t(defCSZ, 365, 422);
  t(d.defendantPhone ?? "", 400, 401);

  // ── Signature block (plaintiff affirms service) ──────────────────────────────
  // LJSC00003F has no pre-printed signature line; the area below the
  // "date of service" checkboxes (pdf-lib y≈45–125) is blank. Draw the
  // signature/date block there (it previously overlapped the checkboxes at y≈153).
  const sigLineY = 96;
  page.drawLine({ start: { x: 72, y: sigLineY }, end: { x: 268, y: sigLineY }, thickness: 0.6, color: BLACK });
  t("Signature of Person Filing", 72, sigLineY - 11, 7);
  page.drawLine({ start: { x: 320, y: sigLineY }, end: { x: 470, y: sigLineY }, thickness: 0.6, color: BLACK });
  t("Date", 320, sigLineY - 11, 7);

  let sigDrawn = false;
  if (opts?.signatureBytes) {
    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        page.drawImage(sigImg, { x: 74, y: sigLineY + 2, width: 190, height: 24, opacity: 1 });
        sigDrawn = true;
      }
    } catch { /* ignore */ }
  }
  if (!sigDrawn && opts?.signed && d.plaintiffName) {
    t(`/s/ ${d.plaintiffName}`, 74, sigLineY + 3, 10);
  }
  if (opts?.signed) {
    const today = new Date().toLocaleDateString("en-US", {
      month: "2-digit", day: "2-digit", year: "numeric",
    });
    t(today, 322, sigLineY + 3, 9);
  }

  return Buffer.from(await doc.save());
}

const azProofOfServiceDefinition: FormDefinition = {
  state: "AZ",
  formId: "AZ-PROOF-OF-SERVICE",
  renderingTechnique: "pdf-overlay",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildAZProofOfService(d, b, opts);
  },
};

FormRegistry.register(azProofOfServiceDefinition);
export { azProofOfServiceDefinition };
