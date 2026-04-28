import * as path from "path";
import * as fs from "fs";
import { withPage } from "./chromium-pool";
import type { SC100FieldMap, FieldCoord } from "./sc100-calibrate";

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

// ── Page dimensions ────────────────────────────────────────────────────────────
const PW = 612;  // points wide
const PH = 792;  // points tall

// ── Field map (loaded once at startup, refreshed after calibration) ───────────
// All coordinates are CSS top-left in pt: x=0 is left, y=0 is TOP of page.
// This eliminates the old py() bottom-origin formula entirely.
let _fieldMap: SC100FieldMap | null = null;
let _fieldMapAssetDir: string | null = null;

function loadFieldMap(assetDir: string): SC100FieldMap | null {
  const mapPath = path.join(assetDir, "forms", "sc100-field-map.json");
  if (!fs.existsSync(mapPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(mapPath, "utf8")) as SC100FieldMap;
  } catch {
    return null;
  }
}

export function refreshFieldMap(assetDir: string): void {
  _fieldMapAssetDir = assetDir;
  _fieldMap = loadFieldMap(assetDir);
}

function getCoord(
  pageKey: string,
  fieldId: string,
  fallback: FieldCoord
): FieldCoord {
  const map = _fieldMap;
  if (map) {
    const coord = map.pages[pageKey]?.[fieldId];
    if (coord) return coord;
  }
  return fallback;
}

// ── Hardcoded fallback coordinates (CSS top-origin pt) ────────────────────────
// These are used when no calibrated field map exists.
// Computed from the original bottom-origin values via: top = 792 - y - size*0.72
// Once calibration runs and saves sc100-field-map.json these are never used.
const FB: Record<string, Record<string, FieldCoord>> = {
  "1": {
    countyDisplay:     { x: 384, y: 216,  size: 11 },
    courthouseName:    { x: 380, y: 244,  size: 8 },
    courthouseAddress: { x: 380, y: 258,  size: 8 },
    courthouseLocation:{ x: 380, y: 272,  size: 8 },
    caseNameDisplay:   { x: 362, y: 344,  size: 8 },
  },
  "2": {
    plaintiffNameHeader:  { x: 163, y: 36,  size: 9 },
    caseNumberHeader:     { x: 440, y: 36,  size: 9 },
    plaintiffName:        { x: 95,  y: 110, size: 11 },
    plaintiffPhone:       { x: 462, y: 110, size: 11 },
    plaintiffStreet:      { x: 133, y: 129, size: 11 },
    plaintiffCity:        { x: 370, y: 129, size: 11 },
    plaintiffState:       { x: 472, y: 129, size: 11 },
    plaintiffZip:         { x: 499, y: 129, size: 11 },
    plaintiffMailingStreet:{ x: 197, y: 156, size: 11 },
    plaintiffMailingCity: { x: 370, y: 156, size: 11 },
    plaintiffMailingState:{ x: 472, y: 156, size: 11 },
    plaintiffMailingZip:  { x: 499, y: 156, size: 11 },
    plaintiffEmail:       { x: 191, y: 183, size: 11 },
    p2Name:               { x: 95,  y: 218, size: 11 },
    p2Phone:              { x: 462, y: 218, size: 11 },
    p2Street:             { x: 133, y: 234, size: 11 },
    p2City:               { x: 370, y: 234, size: 11 },
    p2State:              { x: 472, y: 234, size: 11 },
    p2Zip:                { x: 499, y: 234, size: 11 },
    p2MailingStreet:      { x: 197, y: 263, size: 11 },
    p2MailingCity:        { x: 370, y: 263, size: 11 },
    p2MailingState:       { x: 472, y: 263, size: 11 },
    p2MailingZip:         { x: 499, y: 263, size: 11 },
    p2Email:              { x: 191, y: 294, size: 11 },
    defendantName:        { x: 95,  y: 395, size: 11 },
    defendantPhone:       { x: 462, y: 395, size: 11 },
    defendantStreet:      { x: 133, y: 412, size: 11 },
    defendantCity:        { x: 370, y: 412, size: 11 },
    defendantState:       { x: 472, y: 412, size: 11 },
    defendantZip:         { x: 499, y: 412, size: 11 },
    defendantMailingStreet:{ x: 215, y: 440, size: 11 },
    defendantMailingCity: { x: 370, y: 440, size: 11 },
    defendantMailingState:{ x: 472, y: 440, size: 11 },
    defendantMailingZip:  { x: 499, y: 440, size: 11 },
    agentName:            { x: 95,  y: 501, size: 11 },
    agentTitle:           { x: 413, y: 501, size: 11 },
    agentStreet:          { x: 124, y: 516, size: 11 },
    agentCity:            { x: 341, y: 516, size: 11 },
    agentState:           { x: 441, y: 516, size: 11 },
    agentZip:             { x: 469, y: 516, size: 11 },
    claimAmount:          { x: 295, y: 591, size: 11 },
    claimDescription:     { x: 63,  y: 621, size: 10 },
  },
  "3": {
    p3PlaintiffHeader:  { x: 163, y: 36,  size: 9 },
    p3CaseNumberHeader: { x: 440, y: 36,  size: 9 },
    incidentDate:       { x: 217, y: 87,  size: 11 },
    dateStarted:        { x: 335, y: 103, size: 11 },
    dateThrough:        { x: 470, y: 103, size: 11 },
    howAmountCalculated:{ x: 63,  y: 143, size: 10 },
    needsMC031:         { x: 63,  y: 206, size: 10 },
    priorDemandYes:     { x: 64,  y: 296, size: 10 },
    priorDemandNo:      { x: 116, y: 296, size: 10 },
    priorDemandWhyNot:  { x: 63,  y: 327, size: 10 },
    venueA:             { x: 79,  y: 415, size: 10 },
    venueB:             { x: 79,  y: 474, size: 10 },
    venueC:             { x: 79,  y: 513, size: 10 },
    venueD:             { x: 79,  y: 534, size: 10 },
    venueE:             { x: 79,  y: 558, size: 10 },
    venueOtherText:     { x: 167, y: 558, size: 10 },
    venueZip:           { x: 415, y: 578, size: 11 },
    attyFeeYes:         { x: 358, y: 624, size: 10 },
    attyFeeNo:          { x: 409, y: 624, size: 10 },
    attyArbitration:    { x: 503, y: 631, size: 10 },
    publicEntityYes:    { x: 244, y: 647, size: 10 },
    publicEntityNo:     { x: 295, y: 647, size: 10 },
    publicEntityDate:   { x: 453, y: 645, size: 11 },
  },
  "4": {
    p4PlaintiffHeader:  { x: 163, y: 36,  size: 9 },
    p4CaseNumberHeader: { x: 440, y: 36,  size: 9 },
    filed12Yes:         { x: 64,  y: 112, size: 10 },
    filed12No:          { x: 113, y: 112, size: 10 },
    over2500Yes:        { x: 276, y: 125, size: 10 },
    over2500No:         { x: 322, y: 125, size: 10 },
    declarationDate:    { x: 65,  y: 278, size: 11 },
    declarantName:      { x: 36,  y: 296, size: 11 },
  },
};

// ── HTML generation helpers ────────────────────────────────────────────────────
// All coordinates are CSS top-left in pt. No conversion needed.

// City names longer than 11 chars (e.g. "ORANGE COUNTY") can overflow the
// fixed city column (~91pt). Auto-shrink to 9pt so they always fit.
function cityFontSz(city: string | null | undefined): string {
  if (!city || city.length <= 11) return "";
  return "font-size:9pt;";
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fieldAt(coord: FieldCoord, text: string | null | undefined, extraStyle = ""): string {
  if (!text) return "";
  const size = coord.size ?? 11;
  return `<div class="f" style="left:${coord.x}pt;top:${coord.y}pt;font-size:${size}pt;${extraStyle}">${esc(text)}</div>`;
}

function wrapAt(coord: FieldCoord, text: string | null | undefined, maxW: number, lineH: number): string {
  if (!text) return "";
  const size = coord.size ?? 10;
  return `<div class="f wrap" style="left:${coord.x}pt;top:${coord.y}pt;font-size:${size}pt;width:${maxW}pt;line-height:${lineH / size};">${esc(text)}</div>`;
}

function xmarkAt(coord: FieldCoord, show: boolean | null | undefined): string {
  if (!show) return "";
  const size = coord.size ?? 10;
  return `<div class="f" style="left:${coord.x}pt;top:${coord.y}pt;font-size:${size}pt;">X</div>`;
}

function sigAt(sigDataUrl: string | undefined, coord: FieldCoord, w: number, h: number): string {
  if (!sigDataUrl) return "";
  return `<img class="sig" src="${sigDataUrl}" style="left:${coord.x}pt;top:${coord.y}pt;width:${w}pt;height:${h}pt;" />`;
}

// ── Shorthand: resolve coord from map or fallback, then render ────────────────
function f(page: string, id: string, text: string | null | undefined, extraStyle = ""): string {
  const coord = getCoord(page, id, FB[page]?.[id] ?? { x: 0, y: 0 });
  return fieldAt(coord, text, extraStyle);
}
function w(page: string, id: string, text: string | null | undefined, maxW: number, lineH: number): string {
  const coord = getCoord(page, id, FB[page]?.[id] ?? { x: 0, y: 0 });
  return wrapAt(coord, text, maxW, lineH);
}
function x(page: string, id: string, show: boolean | null | undefined): string {
  const coord = getCoord(page, id, FB[page]?.[id] ?? { x: 0, y: 0 });
  return xmarkAt(coord, show);
}

// ── Build the full 4-page HTML document ──────────────────────────────────────
function buildHtml(d: SC100Data, assetDir: string, sigDataUrl?: string): string {
  // Load field map on first use (or after calibration refresh)
  if (_fieldMapAssetDir !== assetDir) {
    refreshFieldMap(assetDir);
  }

  const bg = (n: number): string => {
    const pngPath = path.join(assetDir, `sc100_hq-${n}.png`);
    const b64 = fs.readFileSync(pngPath).toString("base64");
    return `data:image/png;base64,${b64}`;
  };

  // ── PAGE 1: Instructions + court info ──────────────────────────────────────
  const page1 = `
    <div class="page">
      <img class="bg" src="${bg(1)}" />
      ${f("1", "countyDisplay",      d.countyDisplay)}
      ${f("1", "courthouseName",     d.courthouseName)}
      ${f("1", "courthouseAddress",  d.courthouseAddress)}
      ${f("1", "courthouseLocation", d.courthouseLocation)}
      ${f("1", "caseNameDisplay",    d.caseNameDisplay)}
    </div>`;

  // ── PAGE 2: Plaintiff / Defendant / Claim ──────────────────────────────────
  const page2 = `
    <div class="page">
      <img class="bg" src="${bg(2)}" />

      ${f("2", "plaintiffNameHeader", d.plaintiffName)}
      ${f("2", "caseNumberHeader",    d.caseNumber)}

      ${f("2", "plaintiffName",  d.plaintiffName)}
      ${f("2", "plaintiffPhone", d.plaintiffPhone)}
      ${f("2", "plaintiffStreet", d.plaintiffAddress)}
      ${f("2", "plaintiffCity",   d.plaintiffCity,  cityFontSz(d.plaintiffCity))}
      ${f("2", "plaintiffState",  d.plaintiffState ?? "CA")}
      ${f("2", "plaintiffZip",    d.plaintiffZip)}

      ${d.plaintiffMailingAddress ? `
        ${f("2", "plaintiffMailingStreet", d.plaintiffMailingAddress)}
        ${f("2", "plaintiffMailingCity",   d.plaintiffMailingCity,  cityFontSz(d.plaintiffMailingCity))}
        ${f("2", "plaintiffMailingState",  d.plaintiffMailingState ?? "CA")}
        ${f("2", "plaintiffMailingZip",    d.plaintiffMailingZip)}
      ` : ""}

      ${f("2", "plaintiffEmail", d.plaintiffEmail)}

      ${d.secondPlaintiffName ? `
        ${f("2", "p2Name",  d.p2NameTitle ?? d.secondPlaintiffName)}
        ${f("2", "p2Phone", d.secondPlaintiffPhone)}
        ${f("2", "p2Street", d.secondPlaintiffAddress)}
        ${f("2", "p2City",   d.secondPlaintiffCity,  cityFontSz(d.secondPlaintiffCity))}
        ${f("2", "p2State",  d.secondPlaintiffState ?? "CA")}
        ${f("2", "p2Zip",    d.secondPlaintiffZip)}
        ${d.secondPlaintiffMailingAddress ? `
          ${f("2", "p2MailingStreet", d.secondPlaintiffMailingAddress)}
          ${f("2", "p2MailingCity",   d.secondPlaintiffMailingCity,  cityFontSz(d.secondPlaintiffMailingCity))}
          ${f("2", "p2MailingState",  d.secondPlaintiffMailingState ?? "CA")}
          ${f("2", "p2MailingZip",    d.secondPlaintiffMailingZip)}
        ` : ""}
        ${f("2", "p2Email", d.secondPlaintiffEmail)}
      ` : ""}

      ${f("2", "defendantName",  d.defendantName)}
      ${f("2", "defendantPhone", d.defendantPhone)}
      ${f("2", "defendantStreet", d.defendantAddress)}
      ${f("2", "defendantCity",   d.defendantCity,  cityFontSz(d.defendantCity))}
      ${f("2", "defendantState",  d.defendantState ?? "CA")}
      ${f("2", "defendantZip",    d.defendantZip)}

      ${d.defendantMailingAddress ? `
        ${f("2", "defendantMailingStreet", d.defendantMailingAddress)}
        ${f("2", "defendantMailingCity",   d.defendantMailingCity,  cityFontSz(d.defendantMailingCity))}
        ${f("2", "defendantMailingState",  d.defendantMailingState ?? "CA")}
        ${f("2", "defendantMailingZip",    d.defendantMailingZip)}
      ` : ""}

      ${d.hasAgent ? `
        ${f("2", "agentName",   d.defendantAgentName)}
        ${f("2", "agentTitle",  d.defendantAgentTitle)}
        ${f("2", "agentStreet", d.defendantAgentStreet)}
        ${f("2", "agentCity",   d.defendantAgentCity,  cityFontSz(d.defendantAgentCity))}
        ${f("2", "agentState",  d.defendantAgentState ?? "CA")}
        ${f("2", "agentZip",    d.defendantAgentZip)}
      ` : ""}

      ${f("2", "claimAmount", d.claimAmountFormatted)}
      ${w("2", "claimDescription", d.claimDescriptionForForm, 480, 14)}
    </div>`;

  // ── PAGE 3: Claim details / venue / checkboxes ─────────────────────────────
  const page3 = `
    <div class="page">
      <img class="bg" src="${bg(3)}" />

      ${f("3", "p3PlaintiffHeader",  d.plaintiffName)}
      ${f("3", "p3CaseNumberHeader", d.caseNumber)}

      ${f("3", "incidentDate", d.incidentDate)}
      ${d.hasDateRange ? `
        ${f("3", "dateStarted", d.dateStarted)}
        ${f("3", "dateThrough", d.dateThrough)}
      ` : ""}

      ${w("3", "howAmountCalculated", d.howAmountCalculated, 480, 13)}
      ${x("3", "needsMC031", d.needsMC031)}

      ${x("3", "priorDemandYes", d.priorDemandMade === true)}
      ${x("3", "priorDemandNo",  d.priorDemandMade === false)}
      ${d.priorDemandWhyNot ? w("3", "priorDemandWhyNot", d.priorDemandWhyNot, 490, 14) : ""}

      ${x("3", "venueA", d.venueBasisLetter === "a")}
      ${x("3", "venueB", d.venueBasisLetter === "b")}
      ${x("3", "venueC", d.venueBasisLetter === "c")}
      ${x("3", "venueD", d.venueBasisLetter === "d")}
      ${x("3", "venueE", d.venueBasisLetter === "e")}
      ${d.isVenueOther ? f("3", "venueOtherText", d.venueReason) : ""}

      ${f("3", "venueZip", d.venueZip)}

      ${x("3", "attyFeeYes",      d.isAttyFeeDispute === true)}
      ${x("3", "attyFeeNo",       d.isAttyFeeDispute === false)}
      ${x("3", "attyArbitration", d.attyFeeAndArbitration === true)}

      ${x("3", "publicEntityYes", d.isSuingPublicEntity === true)}
      ${x("3", "publicEntityNo",  d.isSuingPublicEntity === false)}
      ${d.publicEntityHasDate ? f("3", "publicEntityDate", d.publicEntityClaimFiledDate) : ""}
    </div>`;

  // ── PAGE 4: Declaration ────────────────────────────────────────────────────
  // Signature position: calibrated by user. Started at { x: 248, y: 212 }, then
  // shifted +1" right and +1.5" down → { x: 320, y: 320 }, then -1.25" up (-90pt)
  // → { x: 320, y: 230 }, then another -1.25" up (-90pt) → { x: 320, y: 140 },
  // then another -1.25" up (-90pt) → { x: 320, y: 50 }.
  // Coordinates are CSS top-origin (y increases downward).
  const sigCoord = getCoord("4", "signature", { x: 320, y: 50 });
  const page4 = `
    <div class="page" style="page-break-after:avoid;">
      <img class="bg" src="${bg(4)}" />

      ${f("4", "p4PlaintiffHeader",  d.plaintiffName)}
      ${f("4", "p4CaseNumberHeader", d.caseNumber)}

      ${x("4", "filed12Yes", d.filedMoreThan12Claims === true)}
      ${x("4", "filed12No",  d.filedMoreThan12Claims === false || d.filedMoreThan12Claims == null)}

      ${x("4", "over2500Yes", d.claimOver2500 === true)}
      ${x("4", "over2500No",  d.claimOver2500 === false || d.claimOver2500 == null)}

      ${f("4", "declarationDate", d.declarationDate)}
      ${f("4", "declarantName",   d.declarantNameTitle)}

      ${sigAt(sigDataUrl, sigCoord, 240, 30)}
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

// ── Public render function ─────────────────────────────────────────────────────
export async function buildSC100Pdf(
  data: SC100Data,
  assetDir: string,
  signaturePngBytes?: Buffer
): Promise<Buffer> {
  const sigDataUrl = signaturePngBytes
    ? `data:image/png;base64,${signaturePngBytes.toString("base64")}`
    : undefined;

  const html = buildHtml(data, assetDir, sigDataUrl);

  return withPage(async (page) => {
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdfBuffer = await page.pdf({
      width: "8.5in",
      height: "11in",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdfBuffer);
  });
}
