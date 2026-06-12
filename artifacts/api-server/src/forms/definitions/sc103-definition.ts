/**
 * SC-103 Fictitious Business Name — AcroForm definition.
 *
 * Migrated from PNG-overlay to the official California Judicial Council
 * AcroForm PDF.  Fields are filled via pdftk FDF fill (XFA form;
 * pdf-lib cannot enumerate these fields directly).
 *
 * Source PDF: assets/forms/sc103_acroform.pdf
 * Field names confirmed via: pdftk sc103_acroform.pdf dump_data_fields
 */

import * as path from "path";
import type { FormDefinition } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { today } from "../enrichment";
import { ASSET_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(ASSET_DIR, "forms", "sc103_acroform.pdf");

/**
 * XFA export values for business-type checkboxes confirmed via dump_data_fields.
 * These forms use custom numeric export values (1–6) not the AcroForm default "Yes".
 * Each entry: [field name, FDF export value when checked].
 */
const BIZ_TYPE_FIELDS: Record<string, { field: string; exportVal: string }> = {
  individual:  { field: "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[0]", exportVal: "1" },
  corporation: { field: "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[1]", exportVal: "2" },
  association: { field: "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[2]", exportVal: "3" },
  llc:         { field: "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[3]", exportVal: "4" },
  partnership: { field: "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[4]", exportVal: "5" },
  other:       { field: "SC-103[0].Page1[0].List2[0].item2[0].CheckBox6[5]", exportVal: "6" },
};

function bv(body: Record<string, any>, key: string, fallback: any): any {
  return (body[key] != null && body[key] !== "") ? body[key] : fallback;
}

// ─── Primary plaintiff (attached to SC-100 or SC-120) ─────────────────────────

const sc103Definition: FormDefinition = {
  state: "CA",
  formId: "SC-103",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d, body) {
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
    checkboxes["SC-103[0].Page1[0].Attachement[0].CheckBox1[0]"] = attachedTo !== "sc120" ? "1" : false;
    checkboxes["SC-103[0].Page1[0].Attachement[0].CheckBox2[0]"] = attachedTo === "sc120" ? "2" : false;
    for (const [key, { field, exportVal }] of Object.entries(BIZ_TYPE_FIELDS)) {
      checkboxes[field] = bizType === key ? exportVal : false;
    }

    return pdftk_fill_form(PDF_PATH, {
      text: {
        "SC-103[0].Page1[0].Header[0].case[0].CaseNumber_ft[0]":    String(d.caseNumber || ""),
        "SC-103[0].Page1[0].List1[0].item1[0].FillText1[0]":        bizName || "",
        "SC-103[0].Page1[0].List1[0].item1[0].FillText2[0]":        bizAddr,
        "SC-103[0].Page1[0].List1[0].item1[0].FillText3[0]":        mailingAddr,
        "SC-103[0].Page1[0].List2[0].item2[0].FillText4[0]":        bizType === "other" ? bizTypeOther : "",
        "SC-103[0].Page1[0].List3[0].item3[0].FillText5[0]":        fbnCounty,
        "SC-103[0].Page1[0].List4[0].item4[0].FillText6[0]":        String(fbnNumber),
        "SC-103[0].Page1[0].List5[0].item5[0].FillText7[0]":        String(fbnExpiry),
        "SC-103[0].Page1[0].List6[0].item6[0].FillText9[0]":        signDate,
        "SC-103[0].Page1[0].List6[0].item6[0].FillText10[0]":       signerLine,
      },
      checkboxes,
    });
  },
};

// ─── Secondary plaintiff ───────────────────────────────────────────────────────

const sc103SecondaryDefinition: FormDefinition = {
  state: "CA",
  formId: "SC-103-SECONDARY",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d, body) {
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
    checkboxes["SC-103[0].Page1[0].Attachement[0].CheckBox1[0]"] = attachedTo !== "sc120" ? "1" : false;
    checkboxes["SC-103[0].Page1[0].Attachement[0].CheckBox2[0]"] = attachedTo === "sc120" ? "2" : false;
    for (const [key, { field, exportVal }] of Object.entries(BIZ_TYPE_FIELDS)) {
      checkboxes[field] = bizType === key ? exportVal : false;
    }

    return pdftk_fill_form(PDF_PATH, {
      text: {
        "SC-103[0].Page1[0].Header[0].case[0].CaseNumber_ft[0]":    String(d.caseNumber || ""),
        "SC-103[0].Page1[0].List1[0].item1[0].FillText1[0]":        bizName,
        "SC-103[0].Page1[0].List1[0].item1[0].FillText2[0]":        bizAddr,
        "SC-103[0].Page1[0].List1[0].item1[0].FillText3[0]":        mailingAddr,
        "SC-103[0].Page1[0].List2[0].item2[0].FillText4[0]":        bizType === "other" ? bizTypeOther : "",
        "SC-103[0].Page1[0].List3[0].item3[0].FillText5[0]":        fbnCounty,
        "SC-103[0].Page1[0].List4[0].item4[0].FillText6[0]":        String(fbnNumber),
        "SC-103[0].Page1[0].List5[0].item5[0].FillText7[0]":        String(fbnExpiry),
        "SC-103[0].Page1[0].List6[0].item6[0].FillText9[0]":        signDate,
        "SC-103[0].Page1[0].List6[0].item6[0].FillText10[0]":       signerLine,
      },
      checkboxes,
    });
  },
};

FormRegistry.register(sc103Definition);
FormRegistry.register(sc103SecondaryDefinition);
