/**
 * IL Small Claims Summons — AcroForm fill via pdftk.
 *
 * Uses the Illinois Supreme Court standardized SMC Summons PDF accepted at
 * every Illinois Circuit Court (735 ILCS 5/2-202 et seq.).
 * Claim limit: $10,000.
 *
 * Source: https://ilcourtsaudio.blob.core.windows.net/antilles-resources/
 *   resources/b3dc2025-ba0a-44c0-a3a2-57c935c5518d/SMC%20Summons.pdf
 *
 * Fields confirmed via: pdftk il-smc-summons.pdf dump_data_fields
 *
 * Technique: xfa-pdftk (pdftk FDF fill + flatten).
 * The County field is a dropdown — must match exactly one of the 102 county
 * names in the form's FieldStateOption list (same map as il-smc-complaint).
 *
 * Service method defaults to Sheriff checkbox; the plaintiff can change it
 * after downloading. Clerk certification fields (Witness this Date, Clerk
 * of the Court) are left blank — the circuit court clerk fills those at filing.
 */

import * as path from "path";
import type { FormDefinition, FormBody, GenerateOptions } from "../registry";
import { FormRegistry } from "../registry";
import { pdftk_fill_form } from "../pdftk-fdf";
import { ASSET_DIR } from "../../routes/forms-common";
import { ILLINOIS_COUNTIES } from "../../routes/counties";

const PDF_PATH = path.join(ASSET_DIR, "il-forms", "il-smc-summons.pdf");

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

function fmtCsz(
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  const sz = state && zip ? `${state} ${zip}` : (state ?? zip ?? "");
  if (sz) parts.push(sz);
  return parts.join(", ");
}

/** Parse a time string (e.g. "10:30 AM", "14:00", "2:00 PM") → { time, ampm } */
function parseTime(t?: string | null): { time: string; ampm: "AM" | "PM" | "" } {
  if (!t) return { time: "", ampm: "" };
  const upper = t.trim().toUpperCase();
  const isPm = upper.includes("PM");
  const isAm = upper.includes("AM");
  const digits = upper.replace(/[^0-9:]/g, "").trim();
  return {
    time: digits,
    ampm: isPm ? "PM" : isAm ? "AM" : "",
  };
}

/** Format an ISO date string (YYYY-MM-DD) as MM/DD/YYYY for the 3a-Date field. */
function fmtHearingDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return m && d && y ? `${m}/${d}/${y}` : iso;
}

function countyValue(countyId?: string | null): string {
  if (!countyId) return "";
  return COUNTY_ID_TO_FORM_VALUE[countyId] ?? "";
}

// buildILSummons is exported for backward compat with any import, but the
// definition below is the canonical path through FormRegistry.
export async function buildILSummons(
  d: import("../types").CaseData,
  _body: FormBody,
  _opts?: GenerateOptions,
): Promise<Buffer> {
  const countyId = d.countyId;
  const countyVal = countyValue(countyId);

  const countyRecord = countyId
    ? ILLINOIS_COUNTIES.find((c) => c.id === countyId)
    : null;

  const plaintiffName  = d.plaintiffName ?? "";
  const defendantName  = d.defendantName ?? "";
  const defendantAddr  = d.defendantAddress ?? "";
  const defendantCsz   = fmtCsz(d.defendantCity, d.defendantState ?? "IL", d.defendantZip);
  const defendantPhone = d.defendantPhone ?? "";

  const { time: hearingTime, ampm } = parseTime(d.hearingTime);
  const hearingDate = fmtHearingDate(d.hearingDate);

  const courthouseAddr = countyRecord?.courthouseAddress
    ? `${countyRecord.courthouseAddress}, ${countyRecord.courthouseCity ?? ""}, IL ${countyRecord.courthouseZip ?? ""}`.trim()
    : "";
  const clerkPhone   = countyRecord?.phone ?? "";
  const clerkWebsite = countyRecord?.clerkWebsite ?? "";

  const textFields: Record<string, string> = {
    "Plaintiff":             plaintiffName,
    "Defendant - Line 1":    defendantName,
    "Defendant - Line 2":    defendantAddr,
    "Defendant - Line 3":    defendantCsz,

    "Amount Owed":           fmtAmount(d.claimAmount),

    "1a - Name":             plaintiffName,
    "1a - Street Address":   d.plaintiffAddress ?? "",
    "1a - City, State, ZIP": fmtCsz(d.plaintiffCity, "IL", d.plaintiffZip),
    "1a - Telephone Number": d.plaintiffPhone ?? "",
    "1a - Email":            d.plaintiffEmail ?? "",

    "2 - Name":              defendantName,
    "2 - Street Address":    defendantAddr,
    "2 - City, State, ZIP":  defendantCsz,
    "2 - Telephone Number":  defendantPhone,

    "3a - Date":             hearingDate,
    "3a - Time":             hearingTime,
    "3a - Courthouse Address": courthouseAddr,
    "3a - Circuit Clerk Phone Number": clerkPhone,
    "3a - Circuit Clerk Website":      clerkWebsite,
  };

  const checkboxes: Record<string, boolean | string> = {
    "1c - Sheriff": true,
  };

  if (ampm === "AM" || ampm === "PM") {
    checkboxes["3a - AM/PM"] = ampm;
  }

  return pdftk_fill_form(PDF_PATH, {
    text: {
      ...textFields,
      ...(countyVal ? { "County": countyVal } : {}),
    },
    checkboxes,
  });
}

const ilSummonsDefinition: FormDefinition = {
  state: "IL",
  formId: "IL-SUMMONS",
  assetPath: PDF_PATH,
  renderingTechnique: "xfa-pdftk",

  async generate(
    d: import("../types").CaseData,
    b: FormBody,
    opts?: GenerateOptions,
  ): Promise<Buffer> {
    return buildILSummons(d, b, opts);
  },
};

FormRegistry.register(ilSummonsDefinition);
export { ilSummonsDefinition };
