#!/usr/bin/env tsx
/**
 * validate-form-fields.ts
 *
 * AcroForm field rendering validator.
 *
 * For each template PDF in artifacts/api-server/assets/forms/ that has
 * AcroForm text fields, this script fills every text field with a unique
 * sentinel value, flattens the PDF with pdftk, then runs pdftotext and
 * verifies the sentinel appears in the rendered output.
 *
 * This catches "AcroForm appearance stream" bugs where pdftk stores a value
 * in a field but it never visually renders — the exact class of bug seen in
 * TX petition (damages_amount, personal_property_value). Those fields passed
 * pdftotext on the unflattened PDF but disappeared after flatten, meaning the
 * appearance stream was missing or corrupt.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run validate:form-fields
 *   pnpm --filter @workspace/scripts run validate:form-fields -- az-ljsc00001f-complaint.pdf
 *   pnpm --filter @workspace/scripts run validate:form-fields -- tx-small-claims
 */

import { execSync, spawnSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, readdirSync, existsSync } from "fs";
import { join, basename, resolve } from "path";
import { tmpdir } from "os";

const FORMS_DIR = resolve(process.cwd(), "../artifacts/api-server/assets/forms");
const SENTINEL = "VTEST";

// ─── pdftk helpers ────────────────────────────────────────────────────────────

interface PdfField {
  name: string;
  type: string;
  stateOptions: string[];
  readOnly: boolean;
}

function dumpFields(pdfPath: string): { fields: PdfField[]; error?: string } {
  try {
    const raw = execSync(`pdftk "${pdfPath}" dump_data_fields_utf8 2>&1`, {
      encoding: "utf8",
      timeout: 15_000,
    });
    const fields: PdfField[] = [];
    for (const block of raw.split("---")) {
      const get = (key: string) => block.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim();
      const name = get("FieldName");
      const type = get("FieldType");
      if (!name || !type) continue;
      const stateOptions = [...block.matchAll(/FieldStateOption:\s*(.+)/g)].map((m) => m[1].trim());
      const flags = parseInt(get("FieldFlags") ?? "0", 10);
      const readOnly = (flags & 1) !== 0;
      fields.push({ name, type, stateOptions, readOnly });
    }
    return { fields };
  } catch (e) {
    return { fields: [], error: String(e).split("\n")[0] };
  }
}

function makeFdf(fills: Array<{ name: string; value: string }>): string {
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const entries = fills
    .map(({ name, value }) => `<< /T (${esc(name)}) /V (${esc(value)}) >>`)
    .join("\n");
  return `%FDF-1.2\n1 0 obj << /FDF << /Fields [\n${entries}\n] >> >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n`;
}

// ─── Per-form check ───────────────────────────────────────────────────────────

interface FieldResult {
  field: string;
  sentinel: string;
  found: boolean;
}

interface FormResult {
  pdf: string;
  passed: boolean;
  fields: FieldResult[];
  skipped?: string;
  error?: string;
}

function checkForm(pdfPath: string): FormResult {
  const pdf = basename(pdfPath);
  const { fields, error: dumpError } = dumpFields(pdfPath);

  if (dumpError) return { pdf, passed: false, fields: [], error: dumpError };
  if (fields.length === 0) {
    return {
      pdf,
      passed: true,
      fields: [],
      skipped: "No AcroForm fields (XFA or overlay-only — not validated here)",
    };
  }

  const fills: Array<{ name: string; value: string }> = [];
  let skippedNonText = 0;
  let skippedReadOnly = 0;

  for (const f of fields) {
    if (f.readOnly) { skippedReadOnly++; continue; }
    if (f.type !== "Text") { skippedNonText++; continue; }
    const tag = f.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 10);
    fills.push({ name: f.name, value: `${SENTINEL}${tag}` });
  }

  if (fills.length === 0) {
    return {
      pdf,
      passed: true,
      fields: [],
      skipped: `No fillable text fields (${skippedNonText} non-text, ${skippedReadOnly} read-only)`,
    };
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const fdfPath = join(tmpdir(), `scg-val-${id}.fdf`);
  const outPdf  = join(tmpdir(), `scg-val-${id}.pdf`);
  const outTxt  = join(tmpdir(), `scg-val-${id}.txt`);

  try {
    writeFileSync(fdfPath, makeFdf(fills));

    const fillRes = spawnSync(
      "pdftk",
      [pdfPath, "fill_form", fdfPath, "output", outPdf, "flatten"],
      { timeout: 25_000 },
    );
    if (fillRes.status !== 0) {
      return {
        pdf,
        passed: false,
        fields: [],
        error: `pdftk fill_form failed: ${
          fillRes.stderr?.toString().trim().split("\n")[0] ?? "unknown"
        }`,
      };
    }

    const txtRes = spawnSync("pdftotext", [outPdf, outTxt], { timeout: 15_000 });
    if (txtRes.status !== 0) {
      return {
        pdf,
        passed: false,
        fields: [],
        error: `pdftotext failed: ${
          txtRes.stderr?.toString().trim().split("\n")[0] ?? "unknown"
        }`,
      };
    }

    const rendered = readFileSync(outTxt, "utf8");
    const fieldResults: FieldResult[] = fills.map(({ name, value }) => ({
      field: name,
      sentinel: value,
      found: rendered.includes(value),
    }));

    const allPassed = fieldResults.every((r) => r.found);
    return { pdf, passed: allPassed, fields: fieldResults };
  } finally {
    for (const p of [fdfPath, outPdf, outTxt]) {
      try { if (existsSync(p)) unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const targetFilter = process.argv[2];
const allPdfs = readdirSync(FORMS_DIR)
  .filter((f) => f.endsWith(".pdf"))
  .map((f) => join(FORMS_DIR, f))
  .sort();

const pdfsToCheck = targetFilter
  ? allPdfs.filter((p) => basename(p).includes(targetFilter))
  : allPdfs;

if (pdfsToCheck.length === 0) {
  console.error(`No PDFs found matching: ${targetFilter}`);
  process.exit(1);
}

console.log(
  `\nAcroForm field render validator — ${pdfsToCheck.length} PDF${pdfsToCheck.length !== 1 ? "s" : ""}\n${"─".repeat(64)}`,
);

let totalForms = 0;
let failedForms = 0;
let totalFields = 0;
let failedFields = 0;

for (const pdfPath of pdfsToCheck) {
  const result = checkForm(pdfPath);
  totalForms++;

  if (result.skipped) {
    console.log(`  SKIP  ${result.pdf}\n        ${result.skipped}`);
    continue;
  }
  if (result.error) {
    failedForms++;
    console.log(`  ERR   ${result.pdf}\n        ${result.error}`);
    continue;
  }

  const nOk   = result.fields.filter((f) =>  f.found).length;
  const nFail = result.fields.filter((f) => !f.found).length;
  totalFields  += result.fields.length;
  failedFields += nFail;

  if (result.passed) {
    console.log(`  PASS  ${result.pdf}  (${nOk} field${nOk !== 1 ? "s" : ""} verified)`);
  } else {
    failedForms++;
    console.log(`  FAIL  ${result.pdf}  (${nOk}/${result.fields.length} fields render correctly)`);
    for (const f of result.fields.filter((r) => !r.found)) {
      console.log(`        ✗ "${f.field}"`);
      console.log(`          Sentinel "${f.sentinel}" missing from pdftotext output.`);
      console.log(`          → Appearance stream bug. Switch this field to pdf-lib coordinate overlay.`);
    }
  }
}

console.log(`\n${"─".repeat(64)}`);
console.log(`Checked: ${totalForms} forms`);
if (totalFields > 0) {
  console.log(`Fields:  ${totalFields - failedFields}/${totalFields} text fields render correctly`);
}

if (failedForms > 0 || failedFields > 0) {
  console.log(`\n⚠  Failures above indicate appearance stream bugs.`);
  console.log(
    `   Fix: find the field in the form definition and switch from AcroForm fill\n` +
    `        to pdf-lib coordinate overlay (see tx-petition-oca-definition.ts for\n` +
    `        the pattern used to fix damages_amount and personal_property_value).`,
  );
  process.exit(1);
}

console.log("\n✓ All AcroForm text fields render correctly in pdftotext output.");
