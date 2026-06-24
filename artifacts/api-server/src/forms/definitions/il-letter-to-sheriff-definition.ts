/**
 * IL Letter to the Sheriff (Serving a Small Claims Summons and Small Claims Complaint)
 * Illinois Supreme Court form CS-L 706.1 (08/20)
 *
 * Source: https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/
 *   f340e85a-088a-40f6-8c2c-44b997a9c5de/SMC%20Letter%20to%20Sheriff.pdf
 *
 * Fields confirmed via: pdftk il-letter-to-sheriff.pdf dump_data_fields
 *
 * Technique: xfa-pdftk (pdftk FDF fill).
 * The County field is a dropdown — must match exactly one of the 102 county
 * names in the form's FieldStateOption list (same map as il-smc-complaint).
 *
 * The plaintiff signature is typed text per the form instructions
 * ("If you are completing this form on a computer, sign your name by typing it").
 * No image signature is embedded — the Signature field is pre-filled with
 * the plaintiff's name as a typed signature.
 *
 * The fee waiver checkbox (Checkboxes field) is left unset (Off) so the
 * plaintiff can check the appropriate box after downloading.
 */

import * as path from "path";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import { getIlSheriffAddress } from "../../routes/counties";

const PDF_PATH = path.join(ASSET_DIR, "forms", "il-letter-to-sheriff.pdf");

// Maps our internal county IDs to the exact dropdown value the IL PDF expects.
// Identical list to il-smc-complaint-definition.ts.
const COUNTY_ID_TO_FORM_VALUE: Record<string, string> = {
  "il-adams":       "Adams",
  "il-alexander":   "Alexander",
  "il-bond":        "Bond",
  "il-boone":       "Boone",
  "il-brown":       "Brown",
  "il-bureau":      "Bureau",
  "il-calhoun":     "Calhoun",
  "il-carroll":     "Carroll",
  "il-cass":        "Cass",
  "il-champaign":   "Champaign",
  "il-christian":   "Christian",
  "il-clark":       "Clark",
  "il-clay":        "Clay",
  "il-clinton":     "Clinton",
  "il-coles":       "Coles",
  "il-cook":        "Cook",
  "il-crawford":    "Crawford",
  "il-cumberland":  "Cumberland",
  "il-dekalb":      "DeKalb",
  "il-dupage":      "DuPage",
  "il-edgar":       "Edgar",
  "il-edwards":     "Edwards",
  "il-effingham":   "Effingham",
  "il-fayette":     "Fayette",
  "il-ford":        "Ford",
  "il-franklin":    "Franklin",
  "il-fulton":      "Fulton",
  "il-gallatin":    "Gallatin",
  "il-greene":      "Greene",
  "il-grundy":      "Grundy",
  "il-hamilton":    "Hamilton",
  "il-hancock":     "Hancock",
  "il-hardin":      "Hardin",
  "il-henderson":   "Henderson",
  "il-henry":       "Henry",
  "il-iroquois":    "Iroquois",
  "il-jackson":     "Jackson",
  "il-jasper":      "Jasper",
  "il-jefferson":   "Jefferson",
  "il-jersey":      "Jersey",
  "il-jo-daviess":  "Jo Daviess",
  "il-johnson":     "Johnson",
  "il-kane":        "Kane",
  "il-kankakee":    "Kankakee",
  "il-kendall":     "Kendall",
  "il-knox":        "Knox",
  "il-lake":        "Lake",
  "il-lasalle":     "LaSalle",
  "il-lawrence":    "Lawrence",
  "il-lee":         "Lee",
  "il-livingston":  "Livingston",
  "il-logan":       "Logan",
  "il-macon":       "Macon",
  "il-macoupin":    "Macoupin",
  "il-madison":     "Madison",
  "il-marion":      "Marion",
  "il-marshall":    "Marshall",
  "il-mason":       "Mason",
  "il-massac":      "Massac",
  "il-mcdonough":   "McDonough",
  "il-mchenry":     "McHenry",
  "il-mclean":      "McLean",
  "il-menard":      "Menard",
  "il-mercer":      "Mercer",
  "il-monroe":      "Monroe",
  "il-montgomery":  "Montgomery",
  "il-morgan":      "Morgan",
  "il-moultrie":    "Moultrie",
  "il-ogle":        "Ogle",
  "il-peoria":      "Peoria",
  "il-perry":       "Perry",
  "il-piatt":       "Piatt",
  "il-pike":        "Pike",
  "il-pope":        "Pope",
  "il-pulaski":     "Pulaski",
  "il-putnam":      "Putnam",
  "il-randolph":    "Randolph",
  "il-richland":    "Richland",
  "il-rock-island": "Rock Island",
  "il-saline":      "Saline",
  "il-sangamon":    "Sangamon",
  "il-schuyler":    "Schuyler",
  "il-scott":       "Scott",
  "il-shelby":      "Shelby",
  "il-st-clair":    "St. Clair",
  "il-stark":       "Stark",
  "il-stephenson":  "Stephenson",
  "il-tazewell":    "Tazewell",
  "il-union":       "Union",
  "il-vermilion":   "Vermilion",
  "il-wabash":      "Wabash",
  "il-warren":      "Warren",
  "il-washington":  "Washington",
  "il-wayne":       "Wayne",
  "il-white":       "White",
  "il-whiteside":   "Whiteside",
  "il-will":        "Will",
  "il-williamson":  "Williamson",
  "il-winnebago":   "Winnebago",
  "il-woodford":    "Woodford",
};

function fmtDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${m}/${dd}/${yyyy}`;
}

const ilLetterToSheriffDefinition: FormDefinition = {
  state: "IL",
  formId: "IL-LETTER-TO-SHERIFF",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: import("../types").CaseData, _body: FormBody, _opts?: GenerateOptions): Promise<Buffer> {
    const countyId = (d as any).countyId as string | null | undefined;
    const countyVal = countyId ? (COUNTY_ID_TO_FORM_VALUE[countyId] ?? "") : "";

    // Sheriff office address — pre-filled when known, blank otherwise
    const sheriffAddr = getIlSheriffAddress(countyId);
    const sheriffLine1 = sheriffAddr?.line1 ?? "";
    const sheriffLine2 = sheriffAddr?.line2 ?? "";

    const plaintiffName   = d.plaintiffName ?? "";
    const defendantName   = d.defendantName ?? "";
    const caseNumber      = (d as any).caseNumber ?? "";
    const plaintiffAddr   = d.plaintiffAddress ?? "";
    const plaintiffCsz    = [d.plaintiffCity, d.plaintiffState, d.plaintiffZip].filter(Boolean).join(", ");
    const plaintiffPhone  = d.plaintiffPhone ?? "";
    const plaintiffEmail  = d.plaintiffEmail ?? "";

    const textFields: Record<string, string> = {
      "1 - Date":                         fmtDate(new Date()),
      "3 - Address of Sheriff":            sheriffLine1,
      "4 - Address of Sheriff":            sheriffLine2,
      "5 - Address of Sheriff":            "",
      "6 - Plaintiff":                     plaintiffName,
      "7 - Defendant":                     defendantName,
      "8 - Case Number":                   caseNumber,
      "9 - Name of Defendant to be served":  defendantName,
      "10 - Name of each Defendant to be served": "",
      "Checkbox 1 - Percentage":           "",
      "Checkbox 2 - Amount":               "",
      "Checkbox 3 - Cost of Service":      "",
      "Street Address, Unit Number1":      plaintiffAddr,
      "City State ZIP1":                   plaintiffCsz,
      "Telephone1":                        plaintiffPhone,
      "Email":                             plaintiffEmail,
      "Print Your Name1":                  plaintiffName,
      // Form explicitly says: "If you are completing this form on a computer,
      // sign your name by typing it."
      "Signature":                         plaintiffName,
    };

    return pdftk_fill_form(PDF_PATH, {
      text: {
        ...textFields,
        ...(countyVal ? { "County": countyVal } : {}),
      },
    });
  },
};

FormRegistry.register(ilLetterToSheriffDefinition);
export { ilLetterToSheriffDefinition };
