/**
 * Signature-placement audit for all NON-CA forms.
 *
 * For every registered form whose state !== "CA", generate the SIGNED variant
 * with a solid black test signature, save the PDF to /tmp/sig-audit/, then run
 * `pdftotext -bbox-layout` and report every token containing "sign" with its
 * converted pdf-lib Y coordinate (bottom-left origin). This pinpoints where each
 * form's signature line/label sits so we can confirm the signature image is
 * placed ABOVE the line.
 */
import "../forms/definitions/index";
import { FormRegistry } from "../forms/registry";
import type { CaseData } from "../forms/types";
import { writeFile, mkdir } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { deflateSync } from "zlib";

const execFileAsync = promisify(execFile);
const OUT = "/tmp/sig-audit";

function buildBlackPng(w: number, h: number): Buffer {
  const rowBytes = 1 + w * 3;
  const raw = Buffer.alloc(h * rowBytes);
  for (let r = 0; r < h; r++) {
    raw[r * rowBytes] = 0;
    for (let c = 0; c < w; c++) {
      raw[r * rowBytes + 1 + c * 3] = 0;
      raw[r * rowBytes + 1 + c * 3 + 1] = 0;
      raw[r * rowBytes + 1 + c * 3 + 2] = 0;
    }
  }
  const compressed = deflateSync(raw);
  const tbl: number[] = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tbl[n] = c; }
  const crc32 = (b: Buffer) => { let c = 0xFFFFFFFF; for (const x of b) c = tbl[(c ^ x) & 0xff]! ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (t: string, d: Buffer) => { const tb = Buffer.from(t, "ascii"); const L = Buffer.alloc(4); L.writeUInt32BE(d.length); const C = Buffer.alloc(4); C.writeUInt32BE(crc32(Buffer.concat([tb, d]))); return Buffer.concat([L, tb, d, C]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

const SIG = buildBlackPng(200, 34);

const COUNTY: Record<string, string> = {
  AZ: "az-maricopa-phoenix",
  FL: "fl-miami-dade",
  IL: "il-cook",
  TX: "tx-travis",
  WA: "wa-king",
  NC: "nc-wake",
  NJ: "nj-essex",
  VA: "va-fairfax",
};

function baseCase(state: string): CaseData {
  return {
    id: 999999,
    userId: "sig-audit",
    title: "Signature audit",
    status: "draft",
    countyId: COUNTY[state] ?? "",
    caseNumber: "2026-SC-001234",
    plaintiffName: "Patricia A. Ramirez",
    plaintiffAddress: "1234 Main Street Apt 5B",
    plaintiffCity: "Springfield",
    plaintiffState: state,
    plaintiffZip: "00000",
    plaintiffPhone: "555-123-4567",
    plaintiffEmail: "patricia.ramirez@example.com",
    defendantName: "Acme Property Services LLC",
    defendantAddress: "9876 Commerce Boulevard Suite 200",
    defendantCity: "Springfield",
    defendantState: state,
    defendantZip: "00000",
    defendantPhone: "555-987-6543",
    claimType: "services",
    claimAmount: 4750,
    claimDescription: "Defendant was contracted to provide landscaping services for $4,750. Despite full payment, Defendant performed substandard work. Plaintiff demanded a refund on February 1, 2026 but Defendant refused.",
  } as CaseData;
}

interface SignTok { page: number; text: string; xMin: number; yTop: number; yBase: number; }

function parseSignTokens(bbox: string): SignTok[] {
  const out: SignTok[] = [];
  const pageRe = /<page width="([\d.]+)" height="([\d.]+)">/g;
  const pages: { start: number; end: number; h: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pageRe.exec(bbox))) pages.push({ start: m.index, end: bbox.length, h: parseFloat(m[2]!) });
  for (let i = 0; i < pages.length; i++) pages[i]!.end = pages[i + 1]?.start ?? bbox.length;
  const wordRe = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
  while ((m = wordRe.exec(bbox))) {
    const text = m[5]!;
    if (!/sign/i.test(text)) continue;
    const idx = m.index;
    const pageIdx = pages.findIndex(p => idx >= p.start && idx < p.end);
    const h = pages[pageIdx]?.h ?? 792;
    const yMin = parseFloat(m[2]!), yMax = parseFloat(m[4]!);
    out.push({ page: pageIdx + 1, text, xMin: Math.round(parseFloat(m[1]!)), yTop: Math.round(h - yMin), yBase: Math.round(h - yMax) });
  }
  return out;
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const defs = FormRegistry.all().filter(d => d.state !== "CA").sort((a, b) => `${a.state}/${a.formId}`.localeCompare(`${b.state}/${b.formId}`));
  console.log(`Auditing ${defs.length} non-CA forms\n`);
  for (const def of defs) {
    const key = `${def.state}/${def.formId}`;
    try {
      const pdf = await def.generate(baseCase(def.state), {}, { signatureBytes: SIG, signed: true });
      const path = `${OUT}/${def.state}-${def.formId}.pdf`.replace(/\s+/g, "_");
      await writeFile(path, pdf);
      let signToks: SignTok[] = [];
      try {
        const { stdout } = await execFileAsync("pdftotext", ["-bbox-layout", path, "-"]);
        signToks = parseSignTokens(stdout);
      } catch { /* ignore */ }
      const grouped = signToks.map(t => `p${t.page} "${t.text}" x=${t.xMin} yTop=${t.yTop} yBase=${t.yBase}`).join(" | ");
      console.log(`OK  ${key.padEnd(26)} ${(pdf.length / 1024).toFixed(0)}KB  ${grouped || "(no 'sign' text found)"}`);
    } catch (e: any) {
      console.log(`XX  ${key.padEnd(26)} FAILED: ${String(e?.message ?? e).slice(0, 140)}`);
    }
  }
  console.log(`\nPDFs saved to ${OUT}`);
}

run().catch(e => { console.error(e); process.exit(1); });
