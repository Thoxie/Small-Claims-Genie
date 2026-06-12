/**
 * enrichment.ts
 *
 * Shared enrichment utilities used by every form definition.
 * All date formatting, name normalization, currency formatting,
 * checkbox helpers, and court-info building live here.
 */

import { CALIFORNIA_COUNTIES } from "../routes/counties";

// ─── Date / time ──────────────────────────────────────────────────────────────

export function today(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/** Converts ISO date strings (YYYY-MM-DD) to MM/DD/YYYY display form. */
export function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return d;
}

/** Converts 24-hour time strings (HH:MM) to 12-hour display form. */
export function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return t;
  const h = parseInt(m[1], 10);
  const min = m[2];
  const period = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${period}`;
}

// ─── String coercion ──────────────────────────────────────────────────────────

/** Safely converts any value to a string, returning "" for null/undefined. */
export function str(v: unknown): string {
  return v != null ? String(v) : "";
}

// ─── Currency ─────────────────────────────────────────────────────────────────

/** Formats a number as "1,234.56" (USD without the $ symbol). */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") return "";
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Names / titles ───────────────────────────────────────────────────────────

/** Combines name + title into "Name, Title" form (omits the comma if no title). */
export function nameWithTitle(name: string | null | undefined, title: string | null | undefined): string {
  const n = str(name);
  const t = str(title);
  return t ? `${n}, ${t}` : n;
}

// ─── Court info ───────────────────────────────────────────────────────────────

/**
 * Builds the multi-line court-info block for the upper-right caption.
 * Looks up the county from CALIFORNIA_COUNTIES; falls back to raw case fields.
 */
export function buildCourtInfo(d: Record<string, any>): string {
  const county = CALIFORNIA_COUNTIES.find((c) => c.id === d.countyId);
  const lines: string[] = [];
  if (county) {
    lines.push(county.name);
    if (county.courthouseName) lines.push(county.courthouseName);
    if (county.courthouseAddress) lines.push(county.courthouseAddress);
    const cityZip = [
      county.courthouseCity,
      county.courthouseZip ? `CA ${county.courthouseZip}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    if (cityZip) lines.push(cityZip);
  } else {
    if (d.courthouseName) lines.push(str(d.courthouseName));
    if (d.courthouseAddress) lines.push(str(d.courthouseAddress));
    if (d.courthouseCity || d.courthouseZip) {
      lines.push(
        [d.courthouseCity, d.courthouseZip ? `CA ${d.courthouseZip}` : null]
          .filter(Boolean)
          .join(", ")
      );
    }
  }
  return lines.join("\n");
}

/**
 * Builds the court-info block with "Superior Court of California, County of …"
 * prefix (used by FW-001 and similar forms).
 */
export function buildCourtInfoFormal(d: Record<string, any>): string {
  const county = CALIFORNIA_COUNTIES.find((c) => c.id === d.countyId);
  const lines: string[] = [];
  if (county) {
    lines.push(`Superior Court of California, County of ${county.name}`);
    if (county.courthouseName) lines.push(county.courthouseName);
    if (county.courthouseAddress) lines.push(county.courthouseAddress);
    const cityZip = [
      county.courthouseCity,
      county.courthouseZip ? `CA ${county.courthouseZip}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    if (cityZip) lines.push(cityZip);
  } else {
    if (d.courthouseName) lines.push(str(d.courthouseName));
    if (d.courthouseAddress) lines.push(str(d.courthouseAddress));
    if (d.courthouseCity) {
      lines.push([d.courthouseCity, "CA", d.courthouseZip].filter(Boolean).join(" "));
    }
  }
  return lines.join("\n");
}

// ─── Checkbox helpers ─────────────────────────────────────────────────────────

/**
 * Safe pdf-lib checkbox helper — silently skips if the field doesn't exist.
 */
export function checkBox(
  form: ReturnType<import("pdf-lib").PDFDocument["getForm"]>,
  name: string,
  checked: boolean
): void {
  try {
    if (checked) form.getCheckBox(name).check();
    else form.getCheckBox(name).uncheck();
  } catch {
    // field not present in this PDF revision — silently skip
  }
}

/**
 * Safe pdf-lib text field setter — silently skips if the field doesn't exist.
 */
export function setTextField(
  form: ReturnType<import("pdf-lib").PDFDocument["getForm"]>,
  name: string,
  value: string
): void {
  try {
    form.getTextField(name).setText(value || "");
  } catch {
    // field not present — silently skip
  }
}
