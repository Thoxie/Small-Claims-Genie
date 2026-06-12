/**
 * SC-103 Fictitious Business Name — AcroForm definition.
 *
 * Migrated from PNG-overlay to the official California Judicial Council
 * AcroForm PDF.  Fields are filled via pdftk FDF fill (XFA form;
 * pdf-lib cannot enumerate these fields directly).
 *
 * Source PDF: assets/forms/sc103_acroform.pdf
 * Field names confirmed via: pdftk sc103_acroform.pdf dump_data_fields
 *
 * Field name strings live in `forms/field-names/sc103-fields.ts` as typed
 * constants — use those instead of raw strings so TypeScript catches typos
 * at compile time and editors provide autocomplete.
 */

import * as path from "path";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { today } from "../enrichment";
import { ASSET_DIR } from "../../routes/forms-common";
import { SC103_FIELDS } from "../field-names/sc103-fields";

// SC-103 signature area coordinates (612×792 pt page, bottom-left origin).
// The "I declare…" section occupies the bottom ~160pt of the page.
// Signature PNG sits on the right side of the declaration line, above
// "Type or print your name and title" (FillText10).
const SIG_X = 315;
const SIG_Y = 145;    // from page bottom
const SIG_W = 230;
const SIG_H = 28;

/** Overlay a signature PNG onto an already-pdftk-filled SC-103 buffer. */
async function embedSignature(filledBuf: Buffer, sigBytes: Buffer): Promise<Buffer> {
  const pdfDoc  = await PDFDocument.load(filledBuf, { ignoreEncryption: true });
  const sigImg  = await pdfDoc.embedPng(sigBytes);
  const pages   = pdfDoc.getPages();
  if (pages[0]) {
    pages[0].drawImage(sigImg, { x: SIG_X, y: SIG_Y, width: SIG_W, height: SIG_H });
  }
  return Buffer.from(await pdfDoc.save());
}

const PDF_PATH = path.join(ASSET_DIR, "forms", "sc103_acroform.pdf");

/**
 * XFA export values for business-type checkboxes confirmed via dump_data_fields.
 * These forms use custom numeric export values (1–6) not the AcroForm default "Yes".
 * Each entry: [field name constant, FDF export value when checked].
 */
const BIZ_TYPE_CHECKBOX_MAP: Record<string, { field: string; exportVal: string }> = {
  individual:  { field: SC103_FIELDS.checkboxes.bizTypeIndividual,  exportVal: "1" },
  corporation: { field: SC103_FIELDS.checkboxes.bizTypeCorporation, exportVal: "2" },
  association: { field: SC103_FIELDS.checkboxes.bizTypeAssociation, exportVal: "3" },
  llc:         { field: SC103_FIELDS.checkboxes.bizTypeLLC,         exportVal: "4" },
  partnership: { field: SC103_FIELDS.checkboxes.bizTypePartnership, exportVal: "5" },
  other:       { field: SC103_FIELDS.checkboxes.bizTypeOther,       exportVal: "6" },
};

function bv(body: FormBody, key: keyof FormBody, fallback: string | null | undefined): string {
  const val = body[key];
  return (val != null && val !== "") ? String(val) : (fallback ?? "");
}

// ─── Primary plaintiff (attached to SC-100 or SC-120) ─────────────────────────

const sc103Definition: FormDefinition = {
  state: "CA",
  formId: "SC-103",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d, body, opts?: GenerateOptions) {
    const attachedTo = bv(body, "attachedTo", "sc100");
    const bizName    = bv(body, "businessName",    d.plaintiffDbaName || d.plaintiffName);
    const bizAddrParts = [d.plaintiffDbaAddress, d.plaintiffDbaCity, d.plaintiffDbaState, d.plaintiffDbaZip].filter(Boolean);
    const bizAddr    = bv(body, "businessAddress",  bizAddrParts.join(", "));
    const mailingAddr = bv(body, "mailingAddress",  d.plaintiffDbaMailingAddress || "");
    const bizType    = bv(body, "businessType",     d.plaintiffBusinessType ?? "");
    const bizTypeOther = bv(body, "businessTypeOther", d.plaintiffBusinessTypeOther ?? "");
    const fbnCounty  = bv(body, "fbnCounty",  d.plaintiffFbnCounty || "");
    const fbnNumber  = bv(body, "fbnNumber",  d.plaintiffFbnNumber ?? "");
    const fbnExpiry  = bv(body, "fbnExpiry",  d.plaintiffFbnExpiry ?? "");
    const signDate   = bv(body, "signDate",   d.plaintiffFbnSignDate || today());
    const signerName = bv(body, "signerName",
      d.plaintiffIsBusiness ? (d.secondPlaintiffName || d.plaintiffName) : d.plaintiffName
    );
    const signerLine = [signerName, d.plaintiffTitle].filter(Boolean).join(", ") || String(d.plaintiffName || "");

    // Attachment checkboxes: XFA export values are "1" (SC-100) and "2" (SC-120), not "Yes".
    const checkboxes: Record<string, string | boolean> = {};
    checkboxes[SC103_FIELDS.checkboxes.attachedToSC100] = attachedTo !== "sc120" ? "1" : false;
    checkboxes[SC103_FIELDS.checkboxes.attachedToSC120] = attachedTo === "sc120" ? "2" : false;
    for (const [key, { field, exportVal }] of Object.entries(BIZ_TYPE_CHECKBOX_MAP)) {
      checkboxes[field] = bizType === key ? exportVal : false;
    }

    const filled = await pdftk_fill_form(PDF_PATH, {
      text: {
        [SC103_FIELDS.text.caseNumber]:       String(d.caseNumber || ""),
        [SC103_FIELDS.text.bizName]:          bizName || "",
        [SC103_FIELDS.text.bizAddress]:       bizAddr,
        [SC103_FIELDS.text.mailingAddress]:   mailingAddr,
        [SC103_FIELDS.text.bizTypeOtherDesc]: bizType === "other" ? bizTypeOther : "",
        [SC103_FIELDS.text.fbnCounty]:        fbnCounty,
        [SC103_FIELDS.text.fbnNumber]:        String(fbnNumber),
        [SC103_FIELDS.text.fbnExpiry]:        String(fbnExpiry),
        [SC103_FIELDS.text.signDate]:         signDate,
        [SC103_FIELDS.text.signerLine]:       signerLine,
      },
      checkboxes,
    });
    return opts?.signatureBytes ? embedSignature(filled, opts.signatureBytes) : filled;
  },
};

// ─── Secondary plaintiff ───────────────────────────────────────────────────────

const sc103SecondaryDefinition: FormDefinition = {
  state: "CA",
  formId: "SC-103-SECONDARY",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d, body, opts?: GenerateOptions) {
    const attachedTo = bv(body, "attachedTo", "sc100");
    const bizName    = bv(body, "businessName",    d.secondPlaintiffDbaName || "");
    const bizAddrParts = [d.secondPlaintiffDbaAddress, d.secondPlaintiffDbaCity, d.secondPlaintiffDbaState, d.secondPlaintiffDbaZip].filter(Boolean);
    const bizAddr    = bv(body, "businessAddress",  bizAddrParts.join(", "));
    const mailingAddr = bv(body, "mailingAddress",  d.secondPlaintiffDbaMailingAddress || "");
    const bizType    = bv(body, "businessType",     d.secondPlaintiffBusinessType ?? "");
    const bizTypeOther = bv(body, "businessTypeOther", d.secondPlaintiffBusinessTypeOther ?? "");
    const fbnCounty  = bv(body, "fbnCounty",  d.secondPlaintiffFbnCounty || "");
    const fbnNumber  = bv(body, "fbnNumber",  d.secondPlaintiffFbnNumber ?? "");
    const fbnExpiry  = bv(body, "fbnExpiry",  d.secondPlaintiffFbnExpiry ?? "");
    const signDate   = bv(body, "signDate",   d.secondPlaintiffFbnSignDate || today());
    const signerName = bv(body, "signerName", d.additionalPlaintiffName || "");
    const signerLine = [signerName, d.secondPlaintiffTitle].filter(Boolean).join(", ") || signerName;

    // Attachment checkboxes: XFA export values are "1" (SC-100) and "2" (SC-120), not "Yes".
    const checkboxes: Record<string, string | boolean> = {};
    checkboxes[SC103_FIELDS.checkboxes.attachedToSC100] = attachedTo !== "sc120" ? "1" : false;
    checkboxes[SC103_FIELDS.checkboxes.attachedToSC120] = attachedTo === "sc120" ? "2" : false;
    for (const [key, { field, exportVal }] of Object.entries(BIZ_TYPE_CHECKBOX_MAP)) {
      checkboxes[field] = bizType === key ? exportVal : false;
    }

    const filled = await pdftk_fill_form(PDF_PATH, {
      text: {
        [SC103_FIELDS.text.caseNumber]:       String(d.caseNumber || ""),
        [SC103_FIELDS.text.bizName]:          bizName,
        [SC103_FIELDS.text.bizAddress]:       bizAddr,
        [SC103_FIELDS.text.mailingAddress]:   mailingAddr,
        [SC103_FIELDS.text.bizTypeOtherDesc]: bizType === "other" ? bizTypeOther : "",
        [SC103_FIELDS.text.fbnCounty]:        fbnCounty,
        [SC103_FIELDS.text.fbnNumber]:        String(fbnNumber),
        [SC103_FIELDS.text.fbnExpiry]:        String(fbnExpiry),
        [SC103_FIELDS.text.signDate]:         signDate,
        [SC103_FIELDS.text.signerLine]:       signerLine,
      },
      checkboxes,
    });
    return opts?.signatureBytes ? embedSignature(filled, opts.signatureBytes) : filled;
  },
};

FormRegistry.register(sc103Definition);
FormRegistry.register(sc103SecondaryDefinition);
