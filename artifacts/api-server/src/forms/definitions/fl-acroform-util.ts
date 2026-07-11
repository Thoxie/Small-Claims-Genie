/**
 * fl-acroform-util.ts
 *
 * Shared utilities for all Florida AcroForm-based form fills.
 * County → judicial circuit mapping, display helpers, and field formatters.
 */

import type { CaseData } from "../types";

// ─── Florida County → Judicial Circuit ────────────────────────────────────────
const CIRCUIT_MAP: Record<string, string> = {
  "fl-escambia": "1st", "fl-okaloosa": "1st", "fl-santa-rosa": "1st", "fl-walton": "1st",
  "fl-franklin": "2nd", "fl-gadsden": "2nd", "fl-jefferson": "2nd", "fl-leon": "2nd",
  "fl-liberty": "2nd", "fl-wakulla": "2nd",
  "fl-columbia": "3rd", "fl-dixie": "3rd", "fl-hamilton": "3rd", "fl-lafayette": "3rd",
  "fl-madison": "3rd", "fl-suwannee": "3rd", "fl-taylor": "3rd",
  "fl-clay": "4th", "fl-duval": "4th", "fl-nassau": "4th",
  "fl-citrus": "5th", "fl-hernando": "5th", "fl-lake": "5th", "fl-marion": "5th", "fl-sumter": "5th",
  "fl-pasco": "6th", "fl-pinellas": "6th",
  "fl-flagler": "7th", "fl-putnam": "7th", "fl-st-johns": "7th", "fl-volusia": "7th",
  "fl-alachua": "8th", "fl-baker": "8th", "fl-bradford": "8th", "fl-gilchrist": "8th",
  "fl-levy": "8th", "fl-union": "8th",
  "fl-orange": "9th", "fl-osceola": "9th",
  "fl-hardee": "10th", "fl-highlands": "10th", "fl-polk": "10th",
  "fl-miami-dade": "11th",
  "fl-desoto": "12th", "fl-manatee": "12th", "fl-sarasota": "12th",
  "fl-hillsborough": "13th",
  "fl-bay": "14th", "fl-calhoun": "14th", "fl-gulf": "14th", "fl-holmes": "14th",
  "fl-jackson": "14th", "fl-washington": "14th",
  "fl-palm-beach": "15th",
  "fl-monroe": "16th",
  "fl-broward": "17th",
  "fl-brevard": "18th", "fl-seminole": "18th",
  "fl-indian-river": "19th", "fl-martin": "19th", "fl-okeechobee": "19th", "fl-st-lucie": "19th",
  "fl-charlotte": "20th", "fl-collier": "20th", "fl-glades": "20th",
  "fl-hendry": "20th", "fl-lee": "20th",
};

export function flJudicialCircuit(countyId: string | null | undefined): string {
  if (!countyId) return "";
  return CIRCUIT_MAP[countyId] ?? "";
}

export function flCountyDisplay(countyId: string | null | undefined): string {
  if (!countyId) return "";
  return countyId
    .replace(/^fl-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Value formatters ─────────────────────────────────────────────────────────

export function fmtAmountDollars(amount: number | null | undefined): string {
  if (!amount) return "";
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function fmtAmountNumeric(amount: number | null | undefined): string {
  if (!amount) return "";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function flPlaintiffAddress(d: CaseData): string {
  return [d.plaintiffAddress, d.plaintiffCity, d.plaintiffState ?? "FL", d.plaintiffZip]
    .filter(Boolean)
    .join(", ");
}

export function flDefendantAddress(d: CaseData): string {
  const isBusiness = !!(d as any).defendantIsBusinessOrEntity && !!(d as any).defendantAgentName;
  if (isBusiness && (d as any).defendantAgentStreet) {
    return [
      (d as any).defendantAgentStreet,
      (d as any).defendantAgentCity,
      (d as any).defendantAgentState ?? "FL",
      (d as any).defendantAgentZip,
    ]
      .filter(Boolean)
      .join(", ");
  }
  return [d.defendantAddress, d.defendantCity, d.defendantState, d.defendantZip]
    .filter(Boolean)
    .join(", ");
}

export function flDefendantName(d: CaseData): string {
  const isBusiness = !!(d as any).defendantIsBusinessOrEntity && !!(d as any).defendantAgentName;
  return isBusiness
    ? `${d.defendantName ?? ""} c/o ${(d as any).defendantAgentName}`
    : (d.defendantName ?? "");
}

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── FL claim type → form routing ─────────────────────────────────────────────

export interface FlSocFormMeta {
  formNo: string;
  formName: string;
  assetFile: string;
}

export const FL_SOC_FORM_META: Record<string, FlSocFormMeta> = {
  "Auto Negligence": {
    formNo: "7.330",
    formName: "Statement of Claim (Auto Negligence)",
    assetFile: "fl-7330-auto-negligence.pdf",
  },
  "Goods Sold": {
    formNo: "7.331",
    formName: "Statement of Claim (For Goods Sold)",
    assetFile: "fl-7331-goods-sold.pdf",
  },
  "Work Done / Materials Furnished": {
    formNo: "7.332",
    formName: "Statement of Claim (For Work Done and Materials Furnished)",
    assetFile: "fl-7332-work-materials.pdf",
  },
  "Money Lent": {
    formNo: "7.333",
    formName: "Statement of Claim (For Money Lent)",
    assetFile: "fl-7333-money-lent.pdf",
  },
  "Promissory Note": {
    formNo: "7.334",
    formName: "Statement of Claim (Promissory Note)",
    assetFile: "fl-7334-promissory-note.pdf",
  },
  "Stolen Property from Pawnbroker": {
    formNo: "7.335",
    formName: "Statement of Claim (For Return of Stolen Property from Pawnbroker)",
    assetFile: "fl-7335-pawnbroker.pdf",
  },
  "Return of Property from Government": {
    formNo: "7.336",
    formName: "Statement of Claim for Replevin (Return of Personal Property/Weapon from Government Entity)",
    assetFile: "fl-7336-replevin-govt.pdf",
  },
  "Account Stated": {
    formNo: "7.337",
    formName: "Statement of Claim (Account Stated)",
    assetFile: "fl-7337-account-stated.pdf",
  },
};

export function flSocFormMeta(claimType: string | null | undefined): FlSocFormMeta | null {
  if (!claimType) return null;
  return FL_SOC_FORM_META[claimType] ?? null;
}

// FL claim types for UI (ordered for intake dropdown)
export const FL_CLAIM_TYPES_UI = [
  "Auto Negligence",
  "Goods Sold",
  "Work Done / Materials Furnished",
  "Money Lent",
  "Promissory Note",
  "Stolen Property from Pawnbroker",
  "Return of Property from Government",
  "Account Stated",
  "General / Other",
] as const;
