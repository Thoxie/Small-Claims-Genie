/**
 * IL Small Claims Complaint — AcroForm fill via pdftk.
 *
 * Uses the Illinois Supreme Court standardized SMC_SmallClaimsComplaint.pdf
 * accepted at every Illinois Circuit Court (735 ILCS 5/2-209 et seq.).
 * Claim limit: $10,000.
 *
 * Fields confirmed via: pdftk il-smc-complaint.pdf dump_data_fields
 *
 * Technique: xfa-pdftk (pdftk FDF fill + flatten).
 * The County field is a dropdown — must match exactly one of the 102 county
 * names in the form's FieldStateOption list.
 */

import * as path from "path";
import { PDFDocument } from "pdf-lib";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";

const PDF_PATH = path.join(ASSET_DIR, "forms", "il-smc-complaint.pdf");

// Maps our internal county IDs (il-cook, il-dupage, etc.) to the exact
// dropdown value the IL PDF expects (matches FieldStateOption list exactly).
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

function fmtAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtAddr(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const parts: string[] = [];
  if (street) parts.push(street);
  const csz = [city, state && zip ? `${state} ${zip}` : (state ?? zip)].filter(Boolean).join(", ");
  if (csz) parts.push(csz);
  return parts.join(", ");
}

function countyValue(countyId?: string | null): string {
  if (!countyId) return "";
  return COUNTY_ID_TO_FORM_VALUE[countyId] ?? "";
}

const ilSmcComplaintDefinition: FormDefinition = {
  state: "IL",
  formId: "IL-SMC-COMPLAINT",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(d: import("../types").CaseData, _body: FormBody, opts?: GenerateOptions): Promise<Buffer> {
    const defendantAddr = fmtAddr(d.defendantAddress, d.defendantCity, d.defendantState, d.defendantZip);

    // Build the claim narrative for section 3 (reason lines).
    // Split across the two reason lines if needed.
    const claimDesc = d.claimDescription ?? "";
    const reasonLine1 = claimDesc.slice(0, 120);
    const reasonLine2 = claimDesc.slice(120, 240);

    // Build the "facts" narrative for section 5 (up to 20 lines).
    // Combine description, amount calculation, and prior demand info.
    const facts: string[] = [];
    if (d.claimDescription) facts.push(d.claimDescription);
    if (d.howAmountCalculated) facts.push(`Amount calculation: ${d.howAmountCalculated}`);
    if (d.priorDemandMade && d.priorDemandDescription) {
      facts.push(`Prior demand: ${d.priorDemandDescription}`);
    }
    const fullNarrative = facts.join(" ");
    const CHARS_PER_LINE = 110;
    const narrativeLines: Record<string, string> = {};
    for (let i = 0; i < 20; i++) {
      const chunk = fullNarrative.slice(i * CHARS_PER_LINE, (i + 1) * CHARS_PER_LINE);
      if (chunk) narrativeLines[`5 - Line ${i + 1}`] = chunk;
    }

    const textFields: Record<string, string> = {
      "Plaintiff/Petitioner Name (First, Middle, Last)": d.plaintiffName ?? "",
      "1 - Name": d.plaintiffName ?? "",
      "Print Your Name1":            d.plaintiffName ?? "",
      "Street Address, Unit Number1": d.plaintiffAddress ?? "",
      "City State ZIP1":             [d.plaintiffCity, d.plaintiffState, d.plaintiffZip].filter(Boolean).join(", "),
      "Telephone1":                  d.plaintiffPhone ?? "",
      "Email":                       d.plaintiffEmail ?? "",

      "Defendants (First, middle, last name or business name) - Line 1": d.defendantName ?? "",
      "2 - Defendant's Name and Address - Line 1": d.defendantName ?? "",
      "2 - Defendant's Name and Address - Line 2": defendantAddr,

      "3 - Amount":      fmtAmount(d.claimAmount),
      "3 - Reason - Line 1": reasonLine1,
      "3 - Reason - Line 2": reasonLine2,

      ...narrativeLines,
    };

    // County dropdown — must match the PDF's FieldStateOption list exactly
    const countyVal = countyValue(d.countyId);

    const filledBuf = await pdftk_fill_form(PDF_PATH, {
      text: {
        ...textFields,
        ...(countyVal ? { "County": countyVal } : {}),
      },
      checkboxes: {
        // Section 3: written-agreement checkbox group — default to (a) no written
        // agreement since CaseData does not collect whether a written agreement exists.
        "3 - Checkboxes": "I have no written agreement with Defendants.",
        // Section 4: demanded payment — check when the intake recorded a prior demand.
        "4 - Checkbox": d.priorDemandMade ? "Yes" : "Off",
      },
    });

    // Both unsigned and signed run through pdf-lib so they share the same
    // compression baseline. The signed variant adds the signature image on top.
    const doc = await PDFDocument.load(filledBuf, { ignoreEncryption: true });

    if (opts?.signatureBytes) {
      // Signature is on page 2 (index 1), above the "Your Signature" label.
      // pdftotext -bbox-layout: "/s/" yMin=411.681 yMax=425.277
      // → pdf-lib y_bottom = 792 − 425.277 = 367, y_top = 792 − 411.681 = 380
      // x = 142 (xMin of /s/ placeholder)
      const page = doc.getPage(1);
      try {
        const sigImg =
          (await doc.embedPng(opts.signatureBytes).catch(() => null)) ??
          (await doc.embedJpg(opts.signatureBytes).catch(() => null));
        if (sigImg) {
          page.drawImage(sigImg, { x: 142, y: 358, width: 200, height: 22, opacity: 1 });
        }
      } catch { /* ignore */ }
    }

    return Buffer.from(await doc.save({ updateFieldAppearances: false, useObjectStreams: false }));
  },
};

FormRegistry.register(ilSmcComplaintDefinition);
export { ilSmcComplaintDefinition };
