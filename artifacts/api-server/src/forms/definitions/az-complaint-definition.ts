/**
 * AZ Small Claims Complaint — LJSC00001F
 *
 * Fills the official Arizona Justice Court "Complaint in Small Claims Court"
 * (LJSC00001F) AcroForm PDF using pdf-lib.
 *
 * Source PDF: assets/forms/az-ljsc00001f-complaint.pdf
 *
 * AcroForm fields filled:
 *   "Name of person filing" / "Address of person filing" / "Address City/State/Zip"
 *   "Person filing phone number" / "Person filing email address"
 *   "Plaintiff Name" / "Plaintiff Mailing Address" / "Plaintiff Address City/State/Zip"
 *   "Plaintiff Phone Number" / "Plaintiff Email Address"
 *   "Defendant Name" / "Defendant Mailing Address" / "Defendant Address City/State/Zip"
 *   "Defendant Phone number" / "Defendant Email address"
 *   "Claim Amount" / "is the total amount owed to me by the defendant because 1"
 *   "Case Number" / "Date17_af_date"
 *   "Dropdown1" (court) — the source PDF is Pinal County's copy of LJSC00001F,
 *     so its built-in dropdown options list only Pinal County precincts. To
 *     avoid showing wrong courts to users in other counties, the dropdown is
 *     bypassed: its options are replaced programmatically with the user's own
 *     court (from case venue data or the AZ court directory) and that value is
 *     selected before flattening. When no court can be determined the
 *     placeholder text is cleared so the flattened PDF shows a blank line.
 *
 * Fields left blank for filer/court to complete:
 *   "1_4" (overflow description, page 2)
 *   "Check Box18" / "Language Needed"
 *
 * Legal basis:
 *   A.R.S. § 22-501 through § 22-524 — Small Claims Division, Justice Court
 *   Claim limit: $5,000 (A.R.S. § 22-503)
 *   Attorneys prohibited unless all parties stipulate (A.R.S. § 22-512)
 *   No appeal from a small claims judgment (A.R.S. § 22-519)
 */

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { FORMS_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";
import { pdftkFlatten } from "../acroform-filler";
import { FORM_SIGNATURE_PLACEMENTS } from "@workspace/form-signatures";
import { ARIZONA_COUNTIES } from "../../data/counties-az";

const PDF_PATH = path.join(FORMS_DIR, "az-ljsc00001f-complaint.pdf");

function safeSetText(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string,
): void {
  try {
    form.getTextField(name).setText(value || "");
  } catch {
    /* field absent or mistyped */
  }
}

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return (
    "$" +
    Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function cityStateZip(
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


/**
 * Resolve the court text to print on the "Dropdown1" court line.
 * Preference order:
 *   1. Case venue data (courthouseName + address/city/zip/phone)
 *   2. AZ court directory lookup by courthouseId, then countyId
 *   3. Generic "<County> County Justice Court" when only a county is known
 *   4. null — no court determinable; the dropdown placeholder is cleared
 */
export function resolveAzCourtLine(d: CaseData): string | null {
  const compose = (
    name: string,
    addr?: string | null,
    city?: string | null,
    zip?: string | null,
    phone?: string | null,
  ): string => {
    let out = name;
    const loc = [addr, city ? `${city}, AZ${zip ? ` ${zip}` : ""}` : ""]
      .filter(Boolean)
      .join(", ");
    if (loc) out += ` - ${loc}`;
    if (phone) out += ` ${phone}`;
    return out;
  };

  if (d.courthouseName) {
    return compose(
      d.courthouseName,
      d.courthouseAddress,
      d.courthouseCity,
      d.courthouseZip,
      d.courthousePhone,
    );
  }

  const rec =
    ARIZONA_COUNTIES.find((c) => c.id === d.courthouseId) ??
    ARIZONA_COUNTIES.find((c) => c.id === d.countyId);
  if (rec) {
    return compose(
      rec.courthouseName,
      rec.courthouseAddress,
      rec.courthouseCity,
      rec.courthouseZip,
      rec.phone || null,
    );
  }

  const countyName = resolveAzCountyName(d);
  if (countyName) return `${countyName} County Justice Court`;

  return null;
}

/**
 * Resolve the user's AZ county name ("Maricopa", "Pinal", ...) from case data,
 * or null when it cannot be determined.
 */
export function resolveAzCountyName(d: CaseData): string | null {
  const rec =
    ARIZONA_COUNTIES.find((c) => c.id === d.courthouseId) ??
    ARIZONA_COUNTIES.find((c) => c.id === d.countyId);
  if (rec) return rec.name;
  const m = (d.courthouseName ?? "").match(/^([A-Za-z ]+?) County\b/);
  if (m) return m[1].trim();
  // countyId may be a county-level slug like "az-maricopa" or "az-santa-cruz"
  // rather than a precinct record id — match it against known county names.
  const slug = (d.countyId ?? "").toLowerCase();
  if (slug.startsWith("az-")) {
    const seen = new Set<string>();
    for (const c of ARIZONA_COUNTIES) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      const countySlug = `az-${c.name.toLowerCase().replace(/\s+/g, "-")}`;
      if (slug === countySlug || slug.startsWith(`${countySlug}-`)) {
        return c.name;
      }
    }
  }
  return null;
}

const azComplaintDefinition: FormDefinition = {
  state: "AZ",
  formId: "AZ-COMPLAINT",
  assetPath: PDF_PATH,
  renderingTechnique: "acroform-pdflib",

  async generate(
    d: CaseData,
    _body: FormBody,
    opts?: GenerateOptions,
  ): Promise<Buffer> {
    const pdfBytes = fs.readFileSync(PDF_PATH);
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();

    const pltCSZ = cityStateZip(
      d.plaintiffCity,
      d.plaintiffState ?? "AZ",
      d.plaintiffZip,
    );
    const defCSZ = cityStateZip(
      d.defendantCity,
      d.defendantState ?? "AZ",
      d.defendantZip,
    );
    const claimAmt = formatAmount(d.claimAmount);
    const todayStr = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    // ── Person filing (same as plaintiff) ──────────────────────────────────────
    safeSetText(form, "Name of person filing", d.plaintiffName ?? "");
    safeSetText(form, "Address of person filing", d.plaintiffAddress ?? "");
    safeSetText(form, "Address City/State/Zip", pltCSZ);
    safeSetText(form, "Person filing phone number", d.plaintiffPhone ?? "");
    safeSetText(form, "Person filing email address", d.plaintiffEmail ?? "");

    // ── Plaintiff block ────────────────────────────────────────────────────────
    safeSetText(form, "Plaintiff Name", d.plaintiffName ?? "");
    safeSetText(form, "Plaintiff Mailing Address", d.plaintiffAddress ?? "");
    safeSetText(form, "Plaintiff Address City/State/Zip", pltCSZ);
    safeSetText(form, "Plaintiff Phone Number", d.plaintiffPhone ?? "");
    safeSetText(form, "Plaintiff Email Address", d.plaintiffEmail ?? "");

    // ── Defendant block ────────────────────────────────────────────────────────
    safeSetText(form, "Defendant Name", d.defendantName ?? "");
    safeSetText(form, "Defendant Mailing Address", d.defendantAddress ?? "");
    safeSetText(form, "Defendant Address City/State/Zip", defCSZ);
    safeSetText(form, "Defendant Phone number", d.defendantPhone ?? "");
    // "Defendant Email address" — not collected in intake; left blank

    // ── Court line ("Dropdown1") ───────────────────────────────────────────────
    // The stock PDF's dropdown lists only Pinal County precincts; bypass it by
    // replacing the options with the user's actual court and selecting it (or a
    // blank when no court is known, so the "SELECT A COURT..." placeholder
    // never prints on the flattened output).
    try {
      const dd = form.getDropdown("Dropdown1");
      const courtLine = resolveAzCourtLine(d) ?? "";
      dd.setOptions([courtLine]);
      dd.select(courtLine);
      dd.setFontSize(7);
    } catch {
      /* field absent */
    }

    // ── Claim details ──────────────────────────────────────────────────────────
    safeSetText(form, "Claim Amount", claimAmt);
    safeSetText(form, "Case Number", d.caseNumber ?? "");
    safeSetText(form, "Date17_af_date", todayStr);

    // ── Claim description — primary field (page 1) ────────────────────────────
    // Split at DESCRIPTION_SPLIT characters: the primary field receives the
    // first portion, and "1_4" (page 2 continuation) receives the overflow.
    // If the description fits entirely in the primary field, "1_4" is left blank.
    const DESCRIPTION_SPLIT = 500;
    const fullDesc = d.claimDescription ?? "";
    // Word-boundary split: find the last space at or before DESCRIPTION_SPLIT so
    // the primary field ends on a complete word (no mid-word truncation at char 500).
    let splitPos = DESCRIPTION_SPLIT;
    if (fullDesc.length > DESCRIPTION_SPLIT) {
      const boundary = fullDesc.lastIndexOf(" ", DESCRIPTION_SPLIT);
      splitPos = boundary > 0 ? boundary : DESCRIPTION_SPLIT;
    }
    const primaryDesc = fullDesc.slice(0, splitPos);
    const overflowDesc = splitPos < fullDesc.length ? fullDesc.slice(splitPos).trimStart() : "";

    try {
      const tf = form.getTextField(
        "is the total amount owed to me by the defendant because 1",
      );
      tf.enableMultiline();
      tf.setFontSize(9);
      tf.setText(primaryDesc);
    } catch {
      /* field absent */
    }

    // ── Page 2 overflow description field ──────────────────────────────────────
    // "1_4" receives only the overflow portion; left blank when description fits
    // entirely in the primary field above.
    if (overflowDesc) {
      safeSetText(form, "1_4", overflowDesc);
    }

    // ── Page 1 header ("Pinal County Justice Courts, State of Arizona") ───────
    // The stock PDF is Pinal County's copy, with a static Pinal header printed
    // on page 1 (pdftotext bbox: x 196.9–469.5, y 44.3–56.9). For users in any
    // other county — or when the county is unknown — cover it with a white
    // rectangle and print the correct heading in its place.
    const azCountyName = resolveAzCountyName(d);
    if (azCountyName?.toLowerCase() !== "pinal") {
      try {
        const page1 = doc.getPages()[0];
        const pageH = page1.getHeight(); // 792
        page1.drawRectangle({
          x: 188,
          y: pageH - 58.5, // covers y 44.3–56.9 from top
          width: 292,
          height: 16,
          color: rgb(1, 1, 1),
        });
        // Also cover the Pinal County seal image at the top-left of the header
        // (circular seal reading "THE SEAL OF PINAL COUNTY ARIZONA",
        // approx. x 84–166pt, y 7–91pt from the top of the page).
        page1.drawRectangle({
          x: 78,
          y: pageH - 95,
          width: 96,
          height: 92,
          color: rgb(1, 1, 1),
        });
        const heading = azCountyName
          ? `${azCountyName} County Justice Courts, State of Arizona`
          : "Justice Courts, State of Arizona";
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);
        const size = 12;
        const w = bold.widthOfTextAtSize(heading, size);
        page1.drawText(heading, {
          x: 333.2 - w / 2, // center of the original header block
          y: pageH - 56, // baseline aligned with original text
          size,
          font: bold,
          color: rgb(0, 0, 0),
        });
      } catch {
        /* header replacement is best-effort */
      }
    }

    // ── Signature overlay (plaintiff signs Page 2 of the form) ──────────────
    // The "Plaintiff Signature" line on page 2 sits just above its label
    // (pdftotext label yMin=281.96 → pdf-lib y≈510; line at ~y=513, x≈324).
    // If a signature image is provided it is drawn on that line; otherwise a
    // typed-name "/s/ [Plaintiff Name]" fallback is drawn there instead. The
    // signature date is already supplied by the Date17_af_date AcroForm field.
    const azSigPages = doc.getPages();
    const azSigPage  = azSigPages[1] ?? azSigPages[0];
    if (opts?.signatureBytes) {
      try {
        const sigImg =
          (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
          (await doc.embedJpg(opts.signatureBytes).catch(() => null));
        if (sigImg) {
          const { x, y, width, height } =
            FORM_SIGNATURE_PLACEMENTS["az-complaint"].draw;
          azSigPage.drawImage(sigImg, { x, y, width, height, opacity: 1 });
        }
      } catch {
        /* ignore invalid signature data */
      }
    } else if (opts?.signed && d.plaintiffName) {
      // Typed-name signature fallback for signed variants when no image is supplied.
      try {
        const oblique  = await doc.embedFont(StandardFonts.HelveticaOblique);
        azSigPage.drawText(`/s/ ${d.plaintiffName}`, {
          x: 326,
          y: 516,
          size: 11,
          font: oblique,
          color: rgb(0, 0, 0.55),
        });
      } catch {
        /* ignore font/draw errors */
      }
    }

    let saved: Uint8Array;
    try {
      saved = await doc.save({ updateFieldAppearances: true });
    } catch {
      saved = await doc.save({ updateFieldAppearances: false });
    }
    // Flatten interactive AcroForm fields so the output is non-editable and
    // renders identically in all PDF viewers (same pattern as other acroform-pdftk forms).
    return pdftkFlatten(Buffer.from(saved));
  },
};

FormRegistry.register(azComplaintDefinition);
export { azComplaintDefinition };
