/**
 * VA DC-402 — Warrant in Debt (General District Court, Small Claims Division)
 *
 * Fills the official Virginia General District Court PDF (DC-402) using pdftk FDF.
 * The official form is a landscape AcroForm (page rotation = 90°) with fields in
 * the User.* namespace.
 *
 * Source PDF: https://www.vacourts.gov/forms/district/dc402.pdf
 * Fields confirmed via: pdftk dc-402.pdf dump_data_fields
 * Rendering technique: xfa-pdftk (pdftk FDF fill + optional pdf-lib signature overlay)
 *
 * Legal basis:
 *   Va. Code § 16.1-122.2 — Small claims limit: $5,000
 *   Va. Code § 16.1-79    — Warrant in Debt procedure
 *   Va. Code § 16.1-122.3 — Small Claims Division
 *
 * Field notes:
 *   User.RB2  — claim basis: "1"=Open Account, "2"=Contract, "3"=Note, "4"=Other
 *   User.RB3  — homestead exemption: "1"=YES, "2"=NO, "3"=cannot be demanded
 *   User.RB4  — filer type: "1"=PLAINTIFF, "2"=PLAINTIFF'S EMPLOYEE
 *   User.Date3 — date from which interest accrues (incident/debt date)
 *   User.Date4 — date warrant is signed (today)
 *   Date1/Time/Date2/RB1 — read-only; clerk fills hearing date and service result
 *   ReturnName1/ReturnAddress1/ReturnPhone1 — back-page service stub; prefilled
 *     with plaintiff info so the officer knows who to return to.
 *
 * Signature overlay (page 1, /Rotate 90):
 *   In pre-rotation pdf-lib space: pdf_x = visual_y_from_top, pdf_y = visual_x.
 *   The plaintiff signs on the line above the "[ ] PLAINTIFF [ ] PLAINTIFF'S
 *   EMPLOYEE" caption (pdftotext visual: "PLAINTIFF" x≈206, y≈340).
 *   Anchor pre-rotation: pdf_x = visual_y ≈ 339 (image bottom just above the
 *   caption), pdf_y = visual_x ≈ 200 (left start above the checkboxes).
 *   With rotate(degrees(90)) at anchor (x=339, y=200), width=155, height=22:
 *     width(155) extends in +pdf_y = RIGHT in visual (signature width) ✓
 *     height(22) extends in -pdf_x = UP in visual (above the caption line) ✓
 *
 * Filing fee: varies by locality — always defer to the county GDC clerk.
 */

import * as path from "path";
import { PDFDocument, degrees } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "va-forms", "dc-402.pdf");

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  const [y, m, d] = parts;
  return `${m}/${d}/${y}`;
}

function claimBasisRadio(claimType?: string | null): string {
  const map: Record<string, string> = {
    goods: "1",
    services: "1",
    loan: "1",
    account_stated: "1",
    security_deposit: "1",
    contract: "2",
    rent: "2",
    property_damage: "4",
    personal_injury: "4",
    other: "4",
  };
  return map[claimType ?? ""] ?? "4";
}

const vaDc402Definition: FormDefinition = {
  state: "VA",
  formId: "VA-DC-402",
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
    const courtName = [d.courthouseName, courtCity].filter(Boolean).join(" — ");
    const courtAddr = [
      d.courthouseAddress,
      courtCity,
      d.courthouseZip,
    ]
      .filter(Boolean)
      .join(" ");

    const pAddr2 = [d.plaintiffCity, "VA", d.plaintiffZip]
      .filter(Boolean)
      .join(", ");
    const dAddr2 = [
      d.defendantCity,
      d.defendantState ?? "VA",
      d.defendantZip,
    ]
      .filter(Boolean)
      .join(", ");

    const today = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    const filledBuf = await pdftk_fill_form(PDF_PATH, {
      text: {
        "User.CourtName": courtName,
        "User.CourtAddress": courtAddr,
        "User.PlaintiffName": pName,
        "User.PlaintiffAddress1": d.plaintiffAddress ?? "",
        "User.PlaintiffAddress2": pAddr2,
        "User.PlaintiffAddress3": d.plaintiffPhone ?? "",
        "User.DefendantName": d.defendantName ?? "",
        "User.DefendantAddress1": d.defendantAddress ?? "",
        "User.DefendantAddress2": dAddr2,
        "User.DefendantAddress3": d.defendantPhone ?? "",
        "User.Net": fmtAmount(d.claimAmount),
        "User.Date3": fmtDate(d.incidentDate),
        "User.Date4": today,
        "User.Other": d.claimDescription ?? "",
        "User.ReturnName1": pName,
        "User.ReturnAddress1": [d.plaintiffAddress, pAddr2]
          .filter(Boolean)
          .join(", "),
        "User.ReturnPhone1": d.plaintiffPhone ?? "",
      },
      checkboxes: {
        "User.RB2": claimBasisRadio((d as any).claimType),
        "User.RB3": "3",
        "User.RB4": "1",
      },
    });

    if (!opts?.signatureBytes) {
      return filledBuf;
    }

    const doc = await PDFDocument.load(filledBuf, { ignoreEncryption: true });
    const pages = doc.getPages();
    const sigPage = pages[0];

    try {
      const sigImg =
        (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
        (await doc.embedJpg(opts.signatureBytes).catch(() => null));
      if (sigImg) {
        sigPage.drawImage(sigImg, {
          x: 339,
          y: 200,
          width: 155,
          height: 22,
          rotate: degrees(90),
          opacity: 1,
        });
      }
    } catch { }

    return Buffer.from(
      await doc.save({ updateFieldAppearances: false, useObjectStreams: false }),
    );
  },
};

FormRegistry.register(vaDc402Definition);
export { vaDc402Definition };
