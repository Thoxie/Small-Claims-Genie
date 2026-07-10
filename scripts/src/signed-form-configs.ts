/**
 * signed-form-configs.ts
 *
 * Per-form configuration for the signed-PDF placement regression tests.
 * Each remaining non-California signed form is registered here and exercised by a
 * thin wrapper (scripts/src/test-<key>-sigcheck.ts) via runSignedFormTest().
 *
 * Guard taxonomy (see signed-form-test-kit.ts):
 *   image         — plaintiff signature image embedded; asserted DARK at calibrated
 *                   coords with a diff-bbox drift check (used by ALL image forms)
 *   image-dynamic — available for forms whose signature position genuinely varies
 *                   run-to-run; NOT currently used — every image form here has a
 *                   stable position and uses the stricter calibrated `image` guard
 *   typed-bright  — TYPED "/name/" block, NOT an image (FL SOC generic builder)
 *   clerk-blank   — clerk-issued / signature ignored; signed must equal unsigned
 *
 * Coordinates are pdf-lib (bottom-left origin), taken from each form definition's
 * drawImage call. Page numbers are 1-indexed (pdf-lib getPages()[i] → page i+1).
 */

import type { FormTestConfig } from "./signed-form-test-kit";

type PartyOverrides = Partial<Omit<FormTestConfig, "key" | "label" | "formPath" | "hasSignedRoute" | "guard">>;

function mk(
  key: string,
  label: string,
  formPath: string,
  hasSignedRoute: boolean,
  guard: FormTestConfig["guard"],
  o: PartyOverrides,
): FormTestConfig {
  return {
    key,
    label,
    formPath,
    hasSignedRoute,
    guard,
    county:           o.county ?? "",
    plaintiffName:    o.plaintiffName ?? "Alice Johnson",
    plaintiffAddress: o.plaintiffAddress ?? "100 Main St",
    plaintiffCity:    o.plaintiffCity ?? "Springfield",
    plaintiffState:   o.plaintiffState ?? "",
    plaintiffZip:     o.plaintiffZip ?? "00000",
    plaintiffPhone:   o.plaintiffPhone ?? "555-555-0101",
    plaintiffEmail:   o.plaintiffEmail ?? "alice.johnson@example.com",
    defendantName:    o.defendantName ?? "Bob Williams",
    defendantAddress: o.defendantAddress ?? "200 Oak Ave",
    defendantCity:    o.defendantCity ?? "Springfield",
    defendantState:   o.defendantState ?? "",
    defendantZip:     o.defendantZip ?? "00000",
    defendantPhone:   o.defendantPhone ?? "555-555-0202",
    claimType:        o.claimType ?? "goods",
    claimAmount:      o.claimAmount ?? 2500,
    claimDescription: o.claimDescription ??
      "Defendant failed to deliver goods that were paid for in full under a written agreement and has not issued a refund despite repeated demands.",
    expectStrings:    o.expectStrings ?? [o.plaintiffName ?? "Alice Johnson"],
    sigW:             o.sigW,
    sigH:             o.sigH,
  };
}

const TX: PartyOverrides = {
  plaintiffState: "TX", plaintiffCity: "Houston", plaintiffZip: "77002",
  defendantState: "TX", defendantCity: "Houston", defendantZip: "77002",
};
const IL: PartyOverrides = {
  plaintiffState: "IL", plaintiffCity: "Chicago", plaintiffZip: "60602",
  defendantState: "IL", defendantCity: "Chicago", defendantZip: "60602",
};
const FL: PartyOverrides = {
  plaintiffState: "FL", plaintiffCity: "Miami", plaintiffZip: "33101",
  defendantState: "FL", defendantCity: "Miami", defendantZip: "33101",
};

export const CONFIGS: Record<string, FormTestConfig> = {
  // ─── Texas (image) ──────────────────────────────────────────────────────────
  "tx-petition": mk("tx-petition", "TX Small Claims Petition", "tx/petition", true,
    { kind: "image", regions: [{ page: 1, pdfX: 307, pdfY: 166, w: 175, h: 20 }] },
    { ...TX, county: "tx-harris", sigW: 175, sigH: 20 }),

  "tx-petition-jp2": mk("tx-petition-jp2", "TX Travis JP2 Petition", "tx/petition-jp2", true,
    { kind: "image", regions: [{ page: 1, pdfX: 316, pdfY: 151, w: 180, h: 22 }] },
    { ...TX, county: "tx-travis", plaintiffCity: "Austin", plaintiffZip: "78701", defendantCity: "Austin", defendantZip: "78701", sigW: 180, sigH: 22 }),

  "tx-petition-jp5": mk("tx-petition-jp5", "TX Travis JP5 Petition", "tx/petition-jp5", true,
    { kind: "image", regions: [{ page: 1, pdfX: 40, pdfY: 156, w: 175, h: 20 }] },
    { ...TX, county: "tx-travis", plaintiffCity: "Austin", plaintiffZip: "78701", defendantCity: "Austin", defendantZip: "78701", sigW: 175, sigH: 20 }),

  "tx-return-of-service": mk("tx-return-of-service", "TX Return of Service", "tx/return-of-service", true,
    { kind: "image", regions: [{ page: 1, pdfX: 219, pdfY: 195, w: 141, h: 25 }], tolPx: 40 },
    { ...TX, county: "tx-harris", sigW: 140, sigH: 24 }),

  "tx-fee-waiver": mk("tx-fee-waiver", "TX Fee Waiver (Statement of Inability)", "tx/fee-waiver", true,
    { kind: "image", regions: [
      { page: 11, pdfX: 96, pdfY: 366, w: 240, h: 25 },
      { page: 12, pdfX: 96, pdfY: 488, w: 240, h: 25 },
    ] },
    { ...TX, county: "tx-harris", sigW: 240, sigH: 25 }),

  // ─── Illinois (image) ─────────────────────────────────────────────────────────
  "il-proof-of-service": mk("il-proof-of-service", "IL Proof of Service", "il/proof-of-service", true,
    { kind: "image", regions: [{ page: 1, pdfX: 54, pdfY: 239, w: 181, h: 29 }], tolPx: 40 },
    { ...IL, county: "il-cook", sigW: 180, sigH: 28 }),

  "il-fee-waiver": mk("il-fee-waiver", "IL Fee Waiver", "il/fee-waiver", true,
    { kind: "image", regions: [{ page: 4, pdfX: 97, pdfY: 550, w: 180, h: 18 }] },
    { ...IL, county: "il-cook", sigW: 180, sigH: 18 }),

  // ─── Florida (image) ────────────────────────────────────────────────────────
  "fl-proof-of-service": mk("fl-proof-of-service", "FL Proof of Service", "fl/proof-of-service", true,
    { kind: "image", regions: [{ page: 1, pdfX: 154, pdfY: 202, w: 141, h: 28 }], tolPx: 40 },
    { ...FL, county: "fl-miami-dade", sigW: 140, sigH: 28 }),

  "fl-fee-waiver": mk("fl-fee-waiver", "FL Fee Waiver (Civil Indigent Status)", "fl/fee-waiver", true,
    { kind: "image", regions: [{ page: 1, pdfX: 332, pdfY: 229, w: 190, h: 24 }] },
    { ...FL, county: "fl-miami-dade", sigW: 190, sigH: 24 }),

  "fl-cl219-volusia-pdf": mk("fl-cl219-volusia-pdf", "FL Volusia CL-219 (official PDF)", "fl/cl219-volusia-pdf", true,
    { kind: "image", regions: [
      { page: 1, pdfX: 342, pdfY: 120, w: 180, h: 20 },
      { page: 2, pdfX: 295, pdfY: 640, w: 180, h: 25 },
    ] },
    { ...FL, county: "fl-volusia", plaintiffCity: "Daytona Beach", plaintiffZip: "32114", defendantCity: "Daytona Beach", defendantZip: "32114", sigW: 180, sigH: 20 }),

  // ─── North Carolina (image) ─────────────────────────────────────────────────
  "nc-aoc-cvm-200": mk("nc-aoc-cvm-200", "NC Complaint AOC-CVM-200", "nc/aoc-cvm-200", true,
    { kind: "image", regions: [{ page: 1, pdfX: 578, pdfY: 87, w: 170, h: 30 }] },
    { county: "nc-wake", plaintiffState: "NC", plaintiffCity: "Raleigh", plaintiffZip: "27601",
      defendantState: "NC", defendantCity: "Raleigh", defendantZip: "27601", claimType: "loan", sigW: 170, sigH: 30 }),

  "nc-aoc-g-106": mk("nc-aoc-g-106", "NC Fee Waiver AOC-G-106", "nc/aoc-g-106", true,
    { kind: "image", regions: [{ page: 1, pdfX: 355, pdfY: 210, w: 190, h: 35 }] },
    { county: "nc-wake", plaintiffState: "NC", plaintiffCity: "Raleigh", plaintiffZip: "27601",
      defendantState: "NC", defendantCity: "Raleigh", defendantZip: "27601", sigW: 190, sigH: 35 }),

  // ─── New Jersey (image, scaled) ─────────────────────────────────────────────
  "nj-complaint": mk("nj-complaint", "NJ Small Claims Complaint (CN 10532)", "nj/complaint", true,
    { kind: "image", regions: [{ page: 2, pdfX: 325, pdfY: 433, w: 229, h: 19 }], tolPx: 60 },
    { county: "nj-essex", plaintiffState: "NJ", plaintiffCity: "Newark", plaintiffZip: "07102",
      defendantState: "NJ", defendantCity: "Newark", defendantZip: "07102", sigW: 200, sigH: 20 }),

  // ─── Washington (image) ─────────────────────────────────────────────────────
  "wa-notice": mk("wa-notice", "WA Notice of Small Claim", "wa/notice", true,
    { kind: "image", regions: [{ page: 3, pdfX: 72, pdfY: 434, w: 210, h: 30 }] },
    { county: "wa-king", plaintiffState: "WA", plaintiffCity: "Seattle", plaintiffZip: "98104",
      defendantState: "WA", defendantCity: "Seattle", defendantZip: "98104", claimType: "property_damage", sigW: 210, sigH: 30 }),

  // ─── Virginia (image; calibrated against the rendered page) ──────────────────
  "va-dc-409": mk("va-dc-409", "VA Warrant in Debt DC-409", "va/dc-409", true,
    { kind: "image", regions: [{ page: 2, pdfX: 208, pdfY: 685, w: 201, h: 25 }], tolPx: 40 },
    { county: "va-fairfax", plaintiffState: "VA", plaintiffCity: "Fairfax", plaintiffZip: "22030",
      defendantState: "VA", defendantCity: "Fairfax", defendantZip: "22030", sigW: 200, sigH: 24 }),

  // ─── Florida county Statement-of-Claim (typed "/name/" block, NOT an image) ──
  "fl-broward": mk("fl-broward", "FL Broward Statement of Claim", "fl/broward", true,
    { kind: "typed-bright", page: 1, crop: "300x40+54+675" },
    { ...FL, county: "fl-broward", plaintiffCity: "Fort Lauderdale", plaintiffZip: "33301", defendantCity: "Fort Lauderdale", defendantZip: "33301" }),

  // fl/orange and fl/hillsborough delegate to the county-specific SOC builders,
  // which embed a plaintiff signature IMAGE (unlike the generic broward/palm-beach
  // typed-"/name/" builder). Coords calibrated from the existing signed tests
  // (test-fl-plain-soc-orange-signed / test-fl-soc-hillsborough-signed).
  "fl-orange": mk("fl-orange", "FL Orange Statement of Claim", "fl/orange", true,
    { kind: "image", regions: [{ page: 1, pdfX: 378, pdfY: 68, w: 150, h: 28 }] },
    { ...FL, county: "fl-orange", plaintiffCity: "Orlando", plaintiffZip: "32801", defendantCity: "Orlando", defendantZip: "32801", sigW: 150, sigH: 28 }),

  "fl-hillsborough": mk("fl-hillsborough", "FL Hillsborough Statement of Claim", "fl/hillsborough", true,
    { kind: "image", regions: [{ page: 2, pdfX: 346, pdfY: 582, w: 180, h: 36 }] },
    { ...FL, county: "fl-hillsborough", plaintiffCity: "Tampa", plaintiffZip: "33602", defendantCity: "Tampa", defendantZip: "33602", sigW: 180, sigH: 36 }),

  "fl-palm-beach": mk("fl-palm-beach", "FL Palm Beach Statement of Claim", "fl/palm-beach", true,
    { kind: "typed-bright", page: 1, crop: "300x40+54+675" },
    { ...FL, county: "fl-palm-beach", plaintiffCity: "West Palm Beach", plaintiffZip: "33401", defendantCity: "West Palm Beach", defendantZip: "33401" }),

  // ─── Clerk-issued / signature-ignored (signed must equal unsigned) ──────────
  "az-summons": mk("az-summons", "AZ Summons", "az/summons", true,
    { kind: "clerk-blank", pages: [1] },
    { county: "az-maricopa", plaintiffState: "AZ", plaintiffCity: "Phoenix", plaintiffZip: "85007",
      defendantState: "AZ", defendantCity: "Phoenix", defendantZip: "85018" }),

  "il-summons": mk("il-summons", "IL Small Claims Summons", "il/summons", false,
    { kind: "clerk-blank", pages: [1] },
    { ...IL, county: "il-cook" }),

  "nc-aoc-cvm-100": mk("nc-aoc-cvm-100", "NC Magistrate Summons AOC-CVM-100", "nc/aoc-cvm-100", false,
    { kind: "clerk-blank", pages: [1] },
    { county: "nc-wake", plaintiffState: "NC", plaintiffCity: "Raleigh", plaintiffZip: "27601",
      defendantState: "NC", defendantCity: "Raleigh", defendantZip: "27601" }),

  "tx-citation": mk("tx-citation", "TX Citation", "tx/citation", true,
    { kind: "clerk-blank", pages: [1] },
    { ...TX, county: "tx-harris" }),

  "fl-summons": mk("fl-summons", "FL Summons (statewide)", "fl/summons", true,
    { kind: "clerk-blank", pages: [1, 2] },
    { ...FL, county: "fl-duval", plaintiffCity: "Jacksonville", plaintiffZip: "32202", defendantCity: "Jacksonville", defendantZip: "32202" }),

  "fl-volusia-summons": mk("fl-volusia-summons", "FL Volusia Summons", "fl/volusia-summons", true,
    { kind: "clerk-blank", pages: [1, 2] },
    { ...FL, county: "fl-volusia", plaintiffCity: "Daytona Beach", plaintiffZip: "32114", defendantCity: "Daytona Beach", defendantZip: "32114" }),

  "fl-broward-summons": mk("fl-broward-summons", "FL Broward Summons", "fl/broward-summons", true,
    { kind: "clerk-blank", pages: [1, 2] },
    { ...FL, county: "fl-broward", plaintiffCity: "Fort Lauderdale", plaintiffZip: "33301", defendantCity: "Fort Lauderdale", defendantZip: "33301" }),

  "fl-orange-summons": mk("fl-orange-summons", "FL Orange Summons", "fl/orange-summons", true,
    { kind: "clerk-blank", pages: [1, 2] },
    { ...FL, county: "fl-orange", plaintiffCity: "Orlando", plaintiffZip: "32801", defendantCity: "Orlando", defendantZip: "32801" }),

  "fl-hillsborough-summons": mk("fl-hillsborough-summons", "FL Hillsborough Summons", "fl/hillsborough-summons", true,
    { kind: "clerk-blank", pages: [1, 2] },
    { ...FL, county: "fl-hillsborough", plaintiffCity: "Tampa", plaintiffZip: "33602", defendantCity: "Tampa", defendantZip: "33602" }),

  "fl-palm-beach-summons": mk("fl-palm-beach-summons", "FL Palm Beach Summons", "fl/palm-beach-summons", true,
    { kind: "clerk-blank", pages: [1, 2] },
    { ...FL, county: "fl-palm-beach", plaintiffCity: "West Palm Beach", plaintiffZip: "33401", defendantCity: "West Palm Beach", defendantZip: "33401" }),

  "wa-service": mk("wa-service", "WA Proof of Service", "wa/service", true,
    { kind: "clerk-blank", pages: [1] },
    { county: "wa-king", plaintiffState: "WA", plaintiffCity: "Seattle", plaintiffZip: "98104",
      defendantState: "WA", defendantCity: "Seattle", defendantZip: "98104" }),
};
