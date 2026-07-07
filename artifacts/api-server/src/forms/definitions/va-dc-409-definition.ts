/**
 * VA DC-409 — Petition and Order to Proceed In Forma Pauperis
 *
 * Fills the official Virginia General District Court PDF (DC-409) using pdftk FDF.
 * The official form is a 2-page portrait AcroForm.
 *
 * Source PDF: https://www.vacourts.gov/forms/district/dc409.pdf
 * Fields confirmed via: pdftk dc-409.pdf dump_data_fields
 * Rendering technique: xfa-pdftk (pdftk FDF fill)
 *
 * Legal basis: Va. Code §§ 16.1-69.48:4; 17.1-606
 *
 * Field notes:
 *   DC409Plantif — typo in official field name (Plantif not Plaintiff)
 *   DC409ChkNoPublicAssitance — typo in official field name (Assitance)
 *   Financial fields (income, expenses, assets) are intentionally left blank —
 *     CaseData does not collect income/household data; the user completes these
 *     sections by hand before filing, exactly as FL-FEE-WAIVER does.
 *   CB02 — General District Court checkbox (small claims is always GDC)
 *   Signature placed on page 2 above the "SIGNATURE – PETITIONER" label.
 *     Coordinates derived from pdftotext -bbox-layout output:
 *       label yMin=106.51 → pdf-lib y_bottom = 792 − 116.21 = 675.8
 *       signature image placed at y=686 (just above label), height=24.
 */

import * as path from "path";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "va-forms", "dc-409.pdf");

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  const [y, m, d] = parts;
  return `${m}/${d}/${y}`;
}

const vaDc409Definition: FormDefinition = {
  state: "VA",
  formId: "VA-DC-409",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(
    d: CaseData,
    _body: FormBody,
    opts?: GenerateOptions,
  ): Promise<Buffer> {
    const pName = (d as any).plaintiffDbaName
      ? `${d.plaintiffName} d/b/a ${(d as any).plaintiffDbaName}`
      : (d.plaintiffName ?? "");

    const courtCity = d.courthouseCity ? `${d.courthouseCity}, VA` : "";
    const courtName = [d.courthouseName, courtCity].filter(Boolean).join(", ");

    const pAddr = [
      d.plaintiffAddress,
      d.plaintiffCity,
      d.plaintiffState ?? "VA",
      d.plaintiffZip,
    ]
      .filter(Boolean)
      .join(", ");

    const today = new Date().toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });

    const filledBuf = await pdftk_fill_form(PDF_PATH, {
      text: {
        DC409CaseNumber: d.caseNumber ?? "",
        DC409CourtName: courtName,
        DC409Plantif: pName,
        DC409Defendant: d.defendantName ?? "",
        DC409AcknowName: pName,
        DC409AcknowAddress: pAddr,
        DC409AcknowDate: today,
      },
      checkboxes: {
        CB02: "1",
      },
    });

    if (!opts?.signatureBytes) {
      return filledBuf;
    }

    const doc = await PDFDocument.load(filledBuf, { ignoreEncryption: true });
    const pages = doc.getPages();
    const sigPage = pages.length > 1 ? pages[1] : pages[0];

    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        sigPage.drawImage(sigImg, {
          x: 208,
          y: 686,
          width: 200,
          height: 24,
          opacity: 1,
        });
      }
    } catch { }

    return Buffer.from(
      await doc.save({ updateFieldAppearances: false, useObjectStreams: false }),
    );
  },
};

FormRegistry.register(vaDc409Definition);
export { vaDc409Definition };
