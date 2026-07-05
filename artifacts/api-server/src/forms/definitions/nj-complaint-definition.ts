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

import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import type { FormDefinition, CaseData, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { loadAsset } from "../../routes/forms-common";
import { pdftkFlatten } from "../acroform-filler";

const NJ_COUNTY_CODES: Record<string, string> = {
  "nj-atlantic": "atl",
  "nj-bergen": "ber",
  "nj-burlington": "bur",
  "nj-camden": "cam",
  "nj-cape-may": "cap",
  "nj-cumberland": "cum",
  "nj-essex": "ess",
  "nj-gloucester": "glo",
  "nj-hudson": "hud",
  "nj-hunterdon": "hun",
  "nj-mercer": "mer",
  "nj-middlesex": "mid",
  "nj-monmouth": "mon",
  "nj-morris": "mor",
  "nj-ocean": "oce",
  "nj-passaic": "pas",
  "nj-salem": "sal",
  "nj-somerset": "som",
  "nj-sussex": "sus",
  "nj-union": "uni",
  "nj-warren": "war",
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
  setField(form, "demandDesc", desc);

  setField(form, "sigDtA", fmtDate(null));
  setField(form, "plaSigA", opts?.signatureBytes ? "s/" : "s/");
  setField(form, "plaA", d.plaintiffName ?? "");

  const filled = Buffer.from(await pdfDoc.save());
  return pdftkFlatten(filled);
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
