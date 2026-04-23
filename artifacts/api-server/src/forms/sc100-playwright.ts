import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import { chromium } from "playwright-core";

export interface SC100Data {
  countyDisplay?: string;
  courthouseName?: string;
  courthouseAddress?: string;
  courthouseLocation?: string;
  caseNameDisplay?: string;
  caseNumber?: string;
  plaintiffName?: string;
  plaintiffPhone?: string;
  plaintiffAddress?: string;
  plaintiffCity?: string;
  plaintiffState?: string;
  plaintiffZip?: string;
  plaintiffMailingAddress?: string;
  plaintiffMailingCity?: string;
  plaintiffMailingState?: string;
  plaintiffMailingZip?: string;
  plaintiffEmail?: string;
  secondPlaintiffName?: string;
  p2NameTitle?: string;
  secondPlaintiffPhone?: string;
  secondPlaintiffAddress?: string;
  secondPlaintiffCity?: string;
  secondPlaintiffState?: string;
  secondPlaintiffZip?: string;
  secondPlaintiffMailingAddress?: string;
  secondPlaintiffMailingCity?: string;
  secondPlaintiffMailingState?: string;
  secondPlaintiffMailingZip?: string;
  secondPlaintiffEmail?: string;
  defendantName?: string;
  defendantPhone?: string;
  defendantAddress?: string;
  defendantCity?: string;
  defendantState?: string;
  defendantZip?: string;
  defendantMailingAddress?: string;
  defendantMailingCity?: string;
  defendantMailingState?: string;
  defendantMailingZip?: string;
  hasAgent?: string;
  defendantAgentName?: string;
  defendantAgentTitle?: string;
  defendantAgentStreet?: string;
  defendantAgentCity?: string;
  defendantAgentState?: string;
  defendantAgentZip?: string;
  claimAmountFormatted?: string;
  claimDescriptionForForm?: string;
  needsMC031?: boolean;
  incidentDate?: string;
  hasDateRange?: boolean;
  dateStarted?: string;
  dateThrough?: string;
  howAmountCalculated?: string;
  priorDemandMade?: boolean;
  priorDemandWhyNot?: string;
  venueBasisLetter?: string;
  venueReason?: string;
  isVenueOther?: boolean;
  venueZip?: string;
  isAttyFeeDispute?: boolean;
  attyFeeAndArbitration?: boolean;
  isSuingPublicEntity?: boolean;
  publicEntityHasDate?: boolean;
  publicEntityClaimFiledDate?: string;
  filedMoreThan12Claims?: boolean;
  claimOver2500?: boolean;
  declarationDate?: string;
  declarantNameTitle?: string;
  [key: string]: unknown;
}

// ── Page dimensions in points (1pt = 1/72 inch) ───────────────────────────────
const PW = 612;
const PH = 792;

// ── Same coordinate conversion as React-PDF version ───────────────────────────
// In CSS with pt units: top=0 is TOP of page. y is measured from BOTTOM.
// py() converts from bottom-origin y to top-origin CSS top value.
const py = (y: number, size: number = 11): number => PH - y - size * 0.72;

// ── Find the system Chromium binary ──────────────────────────────────────────
function findChromium(): string {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    return execSync("which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null", { encoding: "utf8" }).trim().split("\n")[0];
  } catch {
    throw new Error("Chromium not found. Set CHROMIUM_PATH environment variable.");
  }
}

// ── Escape HTML entities ──────────────────────────────────────────────────────
function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── HTML generation helpers ───────────────────────────────────────────────────

function field(
  x: number,
  y: number,
  text: string | null | undefined,
  size = 11,
  extraStyle = ""
): string {
  if (!text) return "";
  const top = py(y, size);
  return `<div class="f" style="left:${x}pt;top:${top}pt;font-size:${size}pt;${extraStyle}">${esc(text)}</div>`;
}

function xmark(x: number, y: number, show: boolean | null | undefined): string {
  if (!show) return "";
  const top = py(y, 10);
  return `<div class="f" style="left:${x}pt;top:${top}pt;font-size:10pt;">X</div>`;
}

function wrapField(
  x: number,
  y: number,
  text: string | null | undefined,
  maxW: number,
  lineH: number,
  size = 11
): string {
  if (!text) return "";
  const top = py(y, size);
  return `<div class="f wrap" style="left:${x}pt;top:${top}pt;font-size:${size}pt;width:${maxW}pt;line-height:${lineH / size};">${esc(text)}</div>`;
}

// ── Signature image helper ────────────────────────────────────────────────────
function sigImg(sigDataUrl: string | undefined, x: number, y: number, w: number, h: number): string {
  if (!sigDataUrl) return "";
  const top = py(y, h);
  return `<img class="sig" src="${sigDataUrl}" style="left:${x}pt;top:${top}pt;width:${w}pt;height:${h}pt;" />`;
}

// ── Build the full 4-page HTML document ──────────────────────────────────────
function buildHtml(d: SC100Data, assetDir: string, sigDataUrl?: string): string {
  // Embed PNGs as base64 so Playwright can load them without file:// restrictions
  const bg = (n: number) => {
    const pngPath = path.join(assetDir, `sc100_hq-${n}.png`);
    const b64 = fs.readFileSync(pngPath).toString("base64");
    return `data:image/png;base64,${b64}`;
  };

  // PAGE 1 — Instructions + court info box
  const page1 = `
    <div class="page">
      <img class="bg" src="${bg(1)}" />
      ${field(384, 568, d.countyDisplay)}
      ${field(380, 542, d.courthouseName, 8)}
      ${field(380, 528, d.courthouseAddress, 8)}
      ${field(380, 514, d.courthouseLocation, 8)}
      ${field(362, 442, d.caseNameDisplay, 8)}
    </div>`;

  // PAGE 2 — Plaintiff / Defendant / Claim
  const page2 = `
    <div class="page">
      <img class="bg" src="${bg(2)}" />

      ${field(163, 748, d.plaintiffName)}
      ${d.caseNumber ? field(440, 748, d.caseNumber) : ""}

      ${field(95,  674, d.plaintiffName)}
      ${field(462, 674, d.plaintiffPhone)}
      ${field(133, 655, d.plaintiffAddress)}
      ${field(370, 655, d.plaintiffCity)}
      ${field(472, 655, d.plaintiffState ?? "CA")}
      ${field(499, 655, d.plaintiffZip)}
      ${d.plaintiffMailingAddress ? `
        ${field(197, 628, d.plaintiffMailingAddress)}
        ${field(370, 628, d.plaintiffMailingCity)}
        ${field(472, 628, d.plaintiffMailingState ?? "CA")}
        ${field(499, 628, d.plaintiffMailingZip)}
      ` : ""}
      ${field(191, 601, d.plaintiffEmail)}

      ${d.secondPlaintiffName ? `
        ${field(95,  566, d.p2NameTitle)}
        ${d.secondPlaintiffPhone ? field(462, 566, d.secondPlaintiffPhone) : ""}
        ${d.secondPlaintiffAddress ? `
          ${field(133, 550, d.secondPlaintiffAddress)}
          ${field(370, 550, d.secondPlaintiffCity)}
          ${field(472, 550, d.secondPlaintiffState ?? "CA")}
          ${field(499, 550, d.secondPlaintiffZip)}
        ` : ""}
        ${d.secondPlaintiffMailingAddress ? `
          ${field(197, 521, d.secondPlaintiffMailingAddress)}
          ${field(370, 521, d.secondPlaintiffMailingCity)}
          ${field(472, 521, d.secondPlaintiffMailingState ?? "CA")}
          ${field(499, 521, d.secondPlaintiffMailingZip)}
        ` : ""}
        ${d.secondPlaintiffEmail ? field(191, 490, d.secondPlaintiffEmail) : ""}
      ` : ""}

      ${field(95,  389, d.defendantName)}
      ${field(462, 389, d.defendantPhone)}
      ${field(133, 372, d.defendantAddress)}
      ${field(370, 372, d.defendantCity)}
      ${field(472, 372, d.defendantState ?? "CA")}
      ${field(499, 372, d.defendantZip)}
      ${d.defendantMailingAddress ? `
        ${field(215, 344, d.defendantMailingAddress)}
        ${field(370, 344, d.defendantMailingCity)}
        ${field(472, 344, d.defendantMailingState ?? "CA")}
        ${field(499, 344, d.defendantMailingZip)}
      ` : ""}

      ${d.hasAgent ? `
        ${field(95,  283, d.defendantAgentName)}
        ${field(413, 283, d.defendantAgentTitle)}
        ${field(124, 268, d.defendantAgentStreet)}
        ${field(341, 268, d.defendantAgentCity)}
        ${field(441, 268, d.defendantAgentState ?? "CA")}
        ${field(469, 268, d.defendantAgentZip)}
      ` : ""}

      ${field(295, 193, d.claimAmountFormatted)}
      ${wrapField(63, 163, d.claimDescriptionForForm, 480, 14)}
    </div>`;

  // PAGE 3 — Claim details
  const page3 = `
    <div class="page">
      <img class="bg" src="${bg(3)}" />

      ${field(163, 748, d.plaintiffName)}
      ${d.caseNumber ? field(440, 748, d.caseNumber) : ""}

      ${field(217, 697, d.incidentDate)}
      ${d.hasDateRange ? `
        ${field(335, 681, d.dateStarted)}
        ${field(470, 681, d.dateThrough)}
      ` : ""}
      ${wrapField(63, 641, d.howAmountCalculated, 480, 13)}
      ${xmark(63, 579, d.needsMC031)}

      ${xmark(64,  489, d.priorDemandMade === true)}
      ${xmark(116, 489, d.priorDemandMade === false)}
      ${d.priorDemandWhyNot ? wrapField(63, 457, d.priorDemandWhyNot, 490, 14) : ""}

      ${d.venueBasisLetter === "a" ? xmark(79, 370, true) : ""}
      ${d.venueBasisLetter === "b" ? xmark(79, 311, true) : ""}
      ${d.venueBasisLetter === "c" ? xmark(79, 272, true) : ""}
      ${d.venueBasisLetter === "d" ? xmark(79, 251, true) : ""}
      ${d.venueBasisLetter === "e" ? xmark(79, 227, true) : ""}
      ${d.isVenueOther ? field(167, 226, d.venueReason) : ""}

      ${field(415, 206, d.venueZip)}

      ${xmark(358, 161, d.isAttyFeeDispute === true)}
      ${xmark(409, 161, !d.isAttyFeeDispute)}
      ${xmark(503, 154, d.attyFeeAndArbitration === true)}

      ${xmark(244, 138, d.isSuingPublicEntity === true)}
      ${xmark(295, 138, !d.isSuingPublicEntity)}
      ${d.publicEntityHasDate ? field(453, 139, d.publicEntityClaimFiledDate) : ""}
    </div>`;

  // PAGE 4 — Declaration
  const page4 = `
    <div class="page" style="page-break-after:avoid;">
      <img class="bg" src="${bg(4)}" />

      ${field(163, 748, d.plaintiffName)}
      ${d.caseNumber ? field(440, 748, d.caseNumber) : ""}

      ${xmark(64,  673, d.filedMoreThan12Claims === true)}
      ${xmark(113, 673, !d.filedMoreThan12Claims)}

      ${xmark(276, 660, d.claimOver2500 === true)}
      ${xmark(322, 660, !d.claimOver2500)}

      ${field(65,  506, d.declarationDate)}
      ${field(36,  488, d.declarantNameTitle)}

      ${sigImg(sigDataUrl, 248, 558, 240, 30)}
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: 8.5in 11in;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html, body {
    width: ${PW}pt;
    background: white;
  }
  .page {
    width: ${PW}pt;
    height: ${PH}pt;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    background: white;
  }
  .bg {
    position: absolute;
    top: 0;
    left: 0;
    width: ${PW}pt;
    height: ${PH}pt;
  }
  .f {
    position: absolute;
    font-family: Helvetica, Arial, sans-serif;
    color: #000;
    white-space: nowrap;
    line-height: 1;
  }
  .f.wrap {
    white-space: normal;
    word-wrap: break-word;
  }
  .sig {
    position: absolute;
  }
</style>
</head>
<body>
${page1}
${page2}
${page3}
${page4}
</body>
</html>`;
}

// ── Public render function ────────────────────────────────────────────────────
export async function buildSC100Pdf(
  data: SC100Data,
  assetDir: string,
  signaturePngBytes?: Buffer
): Promise<Buffer> {
  const sigDataUrl = signaturePngBytes
    ? `data:image/png;base64,${signaturePngBytes.toString("base64")}`
    : undefined;

  const html = buildHtml(data, assetDir, sigDataUrl);
  const executablePath = findChromium();

  const browser = await chromium.launch({
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdfBuffer = await page.pdf({
      width: "8.5in",
      height: "11in",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
