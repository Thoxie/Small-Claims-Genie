/**
 * TX Denton County Request for Service of Process / Citation
 *
 * Official Denton County Justice Court form for requesting constable, sheriff,
 * or process server service of a citation in a small claims / civil case.
 *
 * Template PDF: assets/tx-forms/denton-citation-request.pdf
 * Source: https://www.dentoncounty.gov/DocumentCenter/View/4919/Citation-Request-PDF
 *
 * Key AcroForm fields (pdftk dump_data_fields confirmed):
 *   "Sheriff"                                  Checkbox — checked for sheriff service
 *   "county name"                              Text — "Denton"
 *   "constable/sheriff name"                   Text — sheriff's office name
 *   "constable/sheriff mailing address"        Text — sheriff's office street address
 *   "constable/sheriff city, state, and zip"   Text — city/state/zip
 *   "Plaintiff/Agent Name"                     Text — plaintiff name
 *   "Date"                                     Text — today's date
 *   "Phone"                                    Text — plaintiff phone
 *   "Mailing Address"                          Text — plaintiff street address
 *   "City, State, Zip"                         Text — plaintiff city/state/zip
 *   "J4"                                       Text — JP court precinct # (left blank, user fills)
 *   "constableprecinctnumber"                  Text — constable precinct # (left blank for sheriff use)
 *
 * Rendering: xfa-pdftk with flatten: false so user can enter JP precinct # before filing.
 * Legal basis: Tex. R. Civ. P. 501.2 (service by sheriff or constable)
 */

import * as path from "path";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import type { CaseData } from "../types";

const PDF_PATH = path.join(ASSET_DIR, "tx-forms", "denton-citation-request.pdf");

// Denton County Sheriff's Office civil process address
const DENTON_SHERIFF_NAME    = "Denton County Sheriff's Office";
const DENTON_SHERIFF_ADDR    = "127 N Woodrow Lane";
const DENTON_SHERIFF_CSZ     = "Denton, TX 76205";

export async function buildDentonCitationRequest(
  d: CaseData,
  _body: FormBody,
  _opts?: GenerateOptions,
): Promise<Buffer> {
  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const cityStateZip = [d.plaintiffCity, d.plaintiffState ?? "TX", d.plaintiffZip]
    .filter(Boolean)
    .join(", ");

  return pdftk_fill_form(PDF_PATH, {
    text: {
      // Service destination — Denton County Sheriff's Office
      "county name":                              "Denton",
      "constable/sheriff name":                   DENTON_SHERIFF_NAME,
      "constable/sheriff mailing address":        DENTON_SHERIFF_ADDR,
      "constable/sheriff city, state, and zip":   DENTON_SHERIFF_CSZ,

      // Plaintiff contact block
      "Plaintiff/Agent Name":  d.plaintiffName ?? "",
      "Date":                  today,
      "Phone":                 d.plaintiffPhone ?? "",
      "Mailing Address":       d.plaintiffAddress ?? "",
      "City, State, Zip":      cityStateZip,

      // J4 (JP court precinct number) and constableprecinctnumber are left blank —
      // the user must enter their specific JP court precinct after opening the form.
    },
    checkboxes: {
      // Check "Sheriff" service method
      "Sheriff": "Yes",
    },
  }, { flatten: false });
}

const dentonCitationRequestDefinition: FormDefinition = {
  state: "TX",
  formId: "TX-DENTON-CITATION-REQUEST",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",
  async generate(d: CaseData, b: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    return buildDentonCitationRequest(d, b, opts);
  },
};

FormRegistry.register(dentonCitationRequestDefinition);
export { dentonCitationRequestDefinition };
