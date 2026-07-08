/**
 * Visual form check — generates all FL + WA forms with realistic data,
 * saves PDFs to /tmp/form-check/, renders page 1 (and page 2 where relevant)
 * to PNG at 150 DPI for visual alignment inspection.
 *
 * Run:  pnpm --filter @workspace/scripts run form-check-visual
 */
import { db, casesTable, downloadTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { deflateSync } from "zlib";

const execFileAsync = promisify(execFile);
const BASE = process.env.API_BASE_URL ?? "http://localhost:80";
const OUT  = "/tmp/form-check";

interface FormSpec {
  label:    string;
  countyId: string;
  state:    string;
  endpoint: (id: number, tok: string) => string;
  method:   "GET" | "POST";
  pages:    number[];   // which pages to render (1-based)
}

const FORMS: FormSpec[] = [
  {
    label:    "fl-clkct333-miami-dade",
    countyId: "fl-miami-dade",
    state:    "FL",
    endpoint: (id, tok) => `${BASE}/api/cases/${id}/forms/fl/clkct333/signed?token=${tok}`,
    method:   "POST",
    pages:    [1],
  },
  {
    label:    "fl-cl219-volusia",
    countyId: "fl-volusia",
    state:    "FL",
    endpoint: (id, tok) => `${BASE}/api/cases/${id}/forms/fl/cl219-volusia-pdf/signed?token=${tok}`,
    method:   "POST",
    pages:    [1, 2],
  },
  {
    label:    "fl-plain-soc-orange",
    countyId: "fl-orange",
    state:    "FL",
    endpoint: (id, tok) => `${BASE}/api/cases/${id}/forms/fl/plain-soc-orange/signed?token=${tok}`,
    method:   "POST",
    pages:    [1],
  },
  {
    label:    "fl-soc-hillsborough",
    countyId: "fl-hillsborough",
    state:    "FL",
    endpoint: (id, tok) => `${BASE}/api/cases/${id}/forms/fl/soc-hillsborough/signed?token=${tok}`,
    method:   "POST",
    pages:    [1, 2],
  },
  {
    label:    "wa-notice-misc-05-0100",
    countyId: "wa-king",
    state:    "WA",
    endpoint: (id, tok) => `${BASE}/api/cases/${id}/forms/wa/notice?token=${tok}`,
    method:   "POST",
    pages:    [1, 2],
  },
];

function buildBlackPng(w: number, h: number): string {
  
  const rowBytes = 1 + w * 3;
  const raw = Buffer.alloc(h * rowBytes);
  for (let r = 0; r < h; r++) {
    raw[r * rowBytes] = 0;
    for (let c = 0; c < w; c++) {
      raw[r * rowBytes + 1 + c * 3]     = 0;
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
  return "data:image/png;base64," + Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]).toString("base64");
}

const SIG = buildBlackPng(180, 36);

async function renderPages(pdfPath: string, label: string, pages: number[]): Promise<void> {
  for (const page of pages) {
    const pngBase = `${OUT}/${label}-p${page}`;
    try {
      await execFileAsync("pdftoppm", ["-png", "-r", "150", "-f", String(page), "-l", String(page), pdfPath, pngBase]);
      console.log(`  Rendered page ${page} → ${pngBase}-*.png`);
    } catch (e: any) {
      console.warn(`  Could not render page ${page}: ${e.message}`);
    }
  }
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const insertedIds: number[] = [];

  try {
    for (const spec of FORMS) {
      console.log(`\n── ${spec.label} ──`);

      const [ins] = await db.insert(casesTable).values({
        userId:           "form-visual-check",
        title:            `Visual check: ${spec.label}`,
        status:           "draft",
        countyId:         spec.countyId,
        plaintiffName:    "Patricia A. Ramirez",
        plaintiffAddress: "1234 Main Street Apt 5B",
        plaintiffCity:    spec.state === "WA" ? "Seattle" : "Miami",
        plaintiffState:   spec.state,
        plaintiffZip:     spec.state === "WA" ? "98101" : "33101",
        plaintiffPhone:   "555-123-4567",
        plaintiffEmail:   "patricia.ramirez@example.com",
        defendantName:    "Acme Property Services LLC",
        defendantAddress: "9876 Commerce Boulevard Suite 200",
        defendantCity:    spec.state === "WA" ? "Bellevue" : "Miami",
        defendantState:   spec.state,
        defendantZip:     spec.state === "WA" ? "98004" : "33132",
        defendantPhone:   "555-987-6543",
        claimType:        "services",
        claimAmount:      4750,
        claimDescription: "Defendant was contracted to provide landscaping services for $4,750. Despite receiving full payment on January 15, 2026, Defendant performed substandard work, damaging irrigation systems. Plaintiff made written demand on February 1, 2026 for a full refund but Defendant refused to respond.",
      }).returning({ id: casesTable.id });
      insertedIds.push(ins.id);

      const token = randomUUID();
      await db.insert(downloadTokensTable).values({
        token, caseId: ins.id, userId: "form-visual-check",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const url = spec.endpoint(ins.id, token);
      const opts: RequestInit = { method: spec.method, headers: { "Content-Type": "application/json" } };
      if (spec.method === "POST") opts.body = JSON.stringify({ signatureDataUrl: SIG });

      const resp = await fetch(url, opts);
      if (!resp.ok) {
        const text = await resp.text();
        console.error(`  FAIL HTTP ${resp.status}: ${text.slice(0, 200)}`);
        continue;
      }

      const buf  = Buffer.from(await resp.arrayBuffer());
      const path = `${OUT}/${spec.label}.pdf`;
      await writeFile(path, buf);
      console.log(`  Saved ${buf.length.toLocaleString()} bytes → ${path}`);

      await renderPages(path, spec.label, spec.pages);

      // Also run pdftotext -bbox-layout for text position audit
      try {
        const { stdout } = await execFileAsync("pdftotext", ["-bbox-layout", path, "-"]);
        const bboxPath = `${OUT}/${spec.label}-bbox.txt`;
        await writeFile(bboxPath, stdout);
        console.log(`  bbox-layout → ${bboxPath}`);
      } catch (e: any) {
        console.warn(`  pdftotext failed: ${e.message}`);
      }
    }
  } finally {
    for (const id of insertedIds) {
      await db.delete(casesTable).where(eq(casesTable.id, id));
    }
    console.log("\nCleanup done.");
  }
}

run().catch(e => { console.error(e); process.exit(1); });
