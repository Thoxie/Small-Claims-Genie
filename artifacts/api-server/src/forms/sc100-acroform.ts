// SC-100 AcroForm filler — uses pdf-lib to fill the official California AcroForm PDF.
// This is the sole SC-100 renderer; the legacy Playwright/PNG approach has been removed.
//
// Field names confirmed from PDF inspection on 2026-05-12.
// AcroForm source: assets/forms/sc100_acroform.pdf (Rev. January 1, 2026)

import * as path from "path";
import * as fs from "fs";
import { PDFDocument, StandardFonts, PDFName, rgb } from "pdf-lib";
import { CALIFORNIA_COUNTIES } from "../routes/counties";

// ── helpers ────────────────────────────────────────────────────────────────────

function checkBox(form: ReturnType<PDFDocument["getForm"]>, name: string, checked: boolean): void {
  try {
    if (checked) {
      form.getCheckBox(name).check();
    } else {
      form.getCheckBox(name).uncheck();
    }
  } catch {
    // field not present — silently skip
  }
}

function str(v: unknown): string {
  return v != null ? String(v) : "";
}

// Build the court-info block for page 1 upper-right corner.
function buildCourtInfo(d: Record<string, any>): string {
  const county = CALIFORNIA_COUNTIES.find(c => c.id === d.countyId);
  const lines: string[] = [];
  if (county) {
    lines.push(county.name);
    if (county.courthouseName)  lines.push(county.courthouseName);
    if (county.courthouseAddress) lines.push(county.courthouseAddress);
    const cityZip = [county.courthouseCity, county.courthouseZip ? `CA ${county.courthouseZip}` : null]
      .filter(Boolean).join(", ");
    if (cityZip) lines.push(cityZip);
  } else {
    if (d.courthouseName)    lines.push(str(d.courthouseName));
    if (d.courthouseAddress) lines.push(str(d.courthouseAddress));
    if (d.courthouseCity || d.courthouseZip) {
      lines.push([d.courthouseCity, d.courthouseZip ? `CA ${d.courthouseZip}` : null].filter(Boolean).join(", "));
    }
  }
  return lines.join("\n");
}

// Build a description for the prior-demand text box (Section 4).
// Uses structured intake data (date, method, response description) when available;
// falls back to generic language.
function buildPriorDemandText(d: Record<string, any>): string {
  if (d.priorDemandMade === false) {
    return str(d.priorDemandWhyNot);
  }
  // Demand was made — compose from structured fields (date + method) and append
  // the defendant's response description if provided.
  const parts: string[] = [];
  const method = str(d.priorDemandMethod || d.demandMethod || "");
  const demandDate = str(d.priorDemandDate || d.demandDate || "");

  if (demandDate && method) {
    parts.push(`Plaintiff contacted defendant on ${demandDate} by ${method} to request payment.`);
  } else if (demandDate) {
    parts.push(`Plaintiff contacted defendant on ${demandDate} to request payment.`);
  } else if (method) {
    parts.push(`Plaintiff contacted defendant by ${method} to request payment.`);
  } else {
    parts.push("Plaintiff contacted defendant to demand payment prior to filing.");
  }

  // Append the defendant's response / free-text notes if provided.
  if (d.priorDemandDescription) {
    parts.push(str(d.priorDemandDescription));
  }

  if (d.demandLetterSentDate || d.demandLetterGenerated) {
    const dateStr = d.demandLetterSentDate ? ` on ${str(d.demandLetterSentDate)}` : "";
    parts.push(`A written demand letter was sent${dateStr}.`);
  }
  return parts.join(" ");
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function buildSC100AcroformPdf(
  d: Record<string, any>,
  assetDir: string,
  sigPngBytes?: Buffer,
): Promise<Buffer> {
  const acroPath = path.join(assetDir, "forms", "sc100_acroform.pdf");
  const pdfBytes = fs.readFileSync(acroPath);
  const pdfDoc    = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form      = pdfDoc.getForm();
  // Embed Helvetica so we can generate real AP streams at exactly 12pt.
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Local helper — sets text, locks font to 12pt, and immediately generates
  // the appearance stream for this field so every PDF viewer shows it at 12pt
  // regardless of whether it honours the NeedAppearances flag.
  function setField(name: string, value: string): void {
    try {
      const f = form.getTextField(name);
      f.setText(value || "");
      f.setFontSize(12);
      // Remove any widget-level DA entry so it cannot override the field-level
      // fontSize=12 we just set.  Several large text fields in the source PDF
      // store a per-widget DA with size=0 (auto-size).  pdf-lib resolves font
      // size as `widgetFontSize ?? fieldFontSize`, and because 0 is not nullish
      // it wins over our field-level 12, causing the appearance provider to
      // fall back to auto-sizing and shrink long text below 12pt.
      for (const widget of f.acroField.getWidgets()) {
        widget.dict.delete(PDFName.of("DA"));
      }
      f.updateAppearances(helvetica);
    } catch {
      // field not present in this revision — silently skip
    }
  }

  // For large text fields whose AP-stream generation is unreliable (the source
  // PDF stores per-widget DA with fontSize=0 which overrides setFontSize even
  // after deleting the widget DA, because the font-size ends up being derived
  // from the parent field node instead).  The guaranteed fix: set the field to
  // empty text so flatten stamps an invisible placeholder, then draw the real
  // text directly onto the page content stream after flatten at exactly 12pt.
  // This completely bypasses AcroForm appearance-stream generation.
  type DirectDraw = {
    pageIndex: number;
    x: number; y: number; w: number; h: number;
    text: string;
  };
  const directQueue: DirectDraw[] = [];

  function queueDirectField(name: string, value: string): void {
    if (!value) { setField(name, ""); return; }
    try {
      const f = form.getTextField(name);
      const widgets = f.acroField.getWidgets();
      if (!widgets.length) return;
      const rect = widgets[0].getRectangle();
      // Page index from field-name convention: "…Page1[0]…" → index 0
      const m = name.match(/\.Page(\d+)\[/);
      const pageIndex = m ? parseInt(m[1], 10) - 1 : 0;
      // Set empty text so flatten produces an invisible (no-content) XObject
      f.setText("");
      for (const w of f.acroField.getWidgets()) w.dict.delete(PDFName.of("DA"));
      try { f.updateAppearances(helvetica); } catch { /* blank field — always OK */ }
      directQueue.push({ pageIndex, x: rect.x, y: rect.y, w: rect.width, h: rect.height, text: value });
    } catch {
      // field not present — fall back to normal setField so we don't lose data
      setField(name, value);
    }
  }

  const caseName      = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  const courtInfo     = buildCourtInfo(d);
  const caseNumber    = str(d.caseNumber);
  const plaintiffHdr  = str(d.plaintiffName);
  const venueLetter   = str(d.venueBasisLetter);          // "a" | "b" | "c" | "d" | "e"
  const priorDemandTx = buildPriorDemandText(d);

  // ── PAGE 1 — cover / court header ──────────────────────────────────────────
  queueDirectField("SC-100[0].Page1[0].CaptionRight[0].County[0].CourtInfo[0]", courtInfo);
  setField("SC-100[0].Page1[0].CaptionRight[0].CN[0].CaseNumber[0]",    caseNumber);
  queueDirectField("SC-100[0].Page1[0].CaptionRight[0].CN[0].CaseName[0]",      caseName);
  // Trial-date rows are clerk-filled; leave blank.

  // ── PAGE 2 — caption headers ────────────────────────────────────────────────
  setField("SC-100[0].Page2[0].PxCaption[0].Plaintiff[0]",  plaintiffHdr);
  setField("SC-100[0].Page2[0].PxCaption[0].CaseNumber[0]", caseNumber);

  // ── PAGE 2 §1 — Plaintiff 1 ─────────────────────────────────────────────────
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffName1[0]",         str(d.plaintiffName));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffPhone1[0]",        str(d.plaintiffPhone));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffAddress1[0]",      str(d.plaintiffAddress || d.plaintiffStreet));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffCity1[0]",         str(d.plaintiffCity));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffState1[0]",        str(d.plaintiffState || "CA"));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffZip1[0]",          str(d.plaintiffZip));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffMailingAddress1[0]", str(d.plaintiffMailingAddress));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffMailingCity1[0]",  str(d.plaintiffMailingCity));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffMailingState1[0]", str(d.plaintiffMailingState));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffMailingZip1[0]",   str(d.plaintiffMailingZip));
  setField("SC-100[0].Page2[0].List1[0].Item1[0].EmailAdd1[0]",             str(d.plaintiffEmail));

  // ── PAGE 2 §1 — Plaintiff 2 (if present) ───────────────────────────────────
  if (d.secondPlaintiffName) {
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffName2[0]",         str(d.p2NameTitle ?? d.secondPlaintiffName));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffPhone2[0]",        str(d.secondPlaintiffPhone));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffAddress2[0]",      str(d.secondPlaintiffAddress));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffCity2[0]",         str(d.secondPlaintiffCity));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffState2[0]",        str(d.secondPlaintiffState || "CA"));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffZip2[0]",          str(d.secondPlaintiffZip));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffMailingAddress2[0]", str(d.secondPlaintiffMailingAddress));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffMailingCity2[0]",  str(d.secondPlaintiffMailingCity));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffMailingState2[0]", str(d.secondPlaintiffMailingState));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].PlaintiffMailingZip2[0]",   str(d.secondPlaintiffMailingZip));
    setField("SC-100[0].Page2[0].List1[0].Item1[0].EmailAdd2[0]",              str(d.secondPlaintiffEmail));
  }
  // Checkbox1 = more than 2 plaintiffs, Checkbox2 = fictitious name, Checkbox3 = payday lender
  // Leave unchecked unless we have explicit intake data for them.

  // ── PAGE 2 §2 — Defendant ──────────────────────────────────────────────────
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantName1[0]",    str(d.defendantName));
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantPhone1[0]",   str(d.defendantPhone));
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantAddress1[0]", str(d.defendantAddress || d.defendantStreet));
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantCity1[0]",    str(d.defendantCity));
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantState1[0]",   str(d.defendantState || "CA"));
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantZip1[0]",     str(d.defendantZip));
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantMailingAddress1[0]", str(d.defendantMailingAddress));
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantMailingCity1[0]",    str(d.defendantMailingCity));
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantMailingState1[0]",   str(d.defendantMailingState));
  setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantMailingZip1[0]",     str(d.defendantMailingZip));

  // Service-of-process agent (corporations / LLCs / public entities)
  if (d.defendantIsBusinessOrEntity) {
    setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantName2[0]",    str(d.defendantAgentName));
    setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantJob1[0]",     str(d.defendantAgentTitle));
    setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantAddress2[0]", str(d.defendantAgentStreet || d.defendantAddress));
    setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantCity2[0]",    str(d.defendantAgentCity   || d.defendantCity));
    setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantState2[0]",   str(d.defendantAgentState  || d.defendantState || "CA"));
    setField("SC-100[0].Page2[0].List2[0].item2[0].DefendantZip2[0]",     str(d.defendantAgentZip    || d.defendantZip));
  }
  // Checkbox4 = more than one defendant, Checkbox5 = military duty — leave unchecked.

  // ── PAGE 2 §3a — Claim amount + description ────────────────────────────────
  setField("SC-100[0].Page2[0].List3[0].PlaintiffClaimAmount1[0]", str(d.claimAmountFormatted));
  queueDirectField("SC-100[0].Page2[0].List3[0].Lia[0].FillField2[0]",    str(d.claimDescriptionForForm));

  // ── PAGE 3 — caption headers ────────────────────────────────────────────────
  setField("SC-100[0].Page3[0].PxCaption[0].Plaintiff[0]",  plaintiffHdr);
  setField("SC-100[0].Page3[0].PxCaption[0].CaseNumber[0]", caseNumber);

  // ── PAGE 3 §3b — Incident date ─────────────────────────────────────────────
  // If it's a date range, Date1 = full date (or start), Date2 = start, Date3 = end.
  if (d.hasDateRange) {
    setField("SC-100[0].Page3[0].List3[0].Lib[0].Date1[0]", "");
    setField("SC-100[0].Page3[0].List3[0].Lib[0].Date2[0]", str(d.dateStarted));
    setField("SC-100[0].Page3[0].List3[0].Lib[0].Date3[0]", str(d.dateThrough));
  } else {
    setField("SC-100[0].Page3[0].List3[0].Lib[0].Date1[0]", str(d.incidentDate));
    setField("SC-100[0].Page3[0].List3[0].Lib[0].Date2[0]", "");
    setField("SC-100[0].Page3[0].List3[0].Lib[0].Date3[0]", "");
  }

  // ── PAGE 3 §3c — How amount was calculated ─────────────────────────────────
  queueDirectField("SC-100[0].Page3[0].List3[0].Lic[0].FillField1[0]", str(d.howAmountCalculated));

  // Checkbox1 = "need more space / attach MC-031"
  checkBox(form, "SC-100[0].Page3[0].List3[0].Checkbox1[0]", !!d.needsMC031);

  // ── PAGE 3 §4 — Prior demand ────────────────────────────────────────────────
  checkBox(form, "SC-100[0].Page3[0].List4[0].Item4[0].Checkbox50[0]", d.priorDemandMade === true);
  checkBox(form, "SC-100[0].Page3[0].List4[0].Item4[0].Checkbox50[1]", d.priorDemandMade === false);
  queueDirectField("SC-100[0].Page3[0].List4[0].Item4[0].FillField2[0]", priorDemandTx);

  // ── PAGE 3 §5 — Venue ──────────────────────────────────────────────────────
  checkBox(form, "SC-100[0].Page3[0].List5[0].Lia[0].Checkbox5cb[0]", venueLetter === "a");
  checkBox(form, "SC-100[0].Page3[0].List5[0].Lib[0].Checkbox5cb[0]", venueLetter === "b");
  checkBox(form, "SC-100[0].Page3[0].List5[0].Lic[0].Checkbox5cb[0]", venueLetter === "c");
  checkBox(form, "SC-100[0].Page3[0].List5[0].Lid[0].Checkbox5cb[0]", venueLetter === "d");
  checkBox(form, "SC-100[0].Page3[0].List5[0].Lie[0].Checkbox5cb[0]", venueLetter === "e");
  if (venueLetter === "e") {
    setField("SC-100[0].Page3[0].List5[0].Lie[0].FillField55[0]", str(d.venueOtherText || d.venueReason));
  }
  setField("SC-100[0].Page3[0].List6[0].item6[0].ZipCode1[0]", str(d.venueZip));

  // ── PAGE 3 §7 — Attorney fee dispute ───────────────────────────────────────
  checkBox(form, "SC-100[0].Page3[0].List7[0].item7[0].Checkbox60[0]", d.isAttyFeeDispute === true);
  checkBox(form, "SC-100[0].Page3[0].List7[0].item7[0].Checkbox60[1]", d.isAttyFeeDispute === false || d.isAttyFeeDispute == null);
  checkBox(form, "SC-100[0].Page3[0].List7[0].item7[0].Checkbox11[0]", !!d.attyFeeAndArbitration);

  // ── PAGE 3 §8 — Suing a public entity ─────────────────────────────────────
  checkBox(form, "SC-100[0].Page3[0].List8[0].item8[0].Checkbox61[0]", d.isSuingPublicEntity === true);
  checkBox(form, "SC-100[0].Page3[0].List8[0].item8[0].Checkbox61[1]", d.isSuingPublicEntity === false || d.isSuingPublicEntity == null);
  if (d.publicEntityHasDate) {
    setField("SC-100[0].Page3[0].List8[0].item8[0].Date4[0]", str(d.publicEntityClaimFiledDate));
  }

  // ── PAGE 4 — caption headers ────────────────────────────────────────────────
  setField("SC-100[0].Page4[0].PxCaption[0].Plaintiff[0]",  plaintiffHdr);
  setField("SC-100[0].Page4[0].PxCaption[0].CaseNumber[0]", caseNumber);

  // ── PAGE 4 §9 — Filed 12+ claims ───────────────────────────────────────────
  checkBox(form, "SC-100[0].Page4[0].List9[0].Item9[0].Checkbox62[0]", d.filedMoreThan12Claims === true);
  checkBox(form, "SC-100[0].Page4[0].List9[0].Item9[0].Checkbox62[1]", !d.filedMoreThan12Claims);

  // ── PAGE 4 §10 — Claim over $2,500 ────────────────────────────────────────
  checkBox(form, "SC-100[0].Page4[0].List10[0].li10[0].Checkbox63[0]", !!d.claimOver2500);
  checkBox(form, "SC-100[0].Page4[0].List10[0].li10[0].Checkbox63[1]", !d.claimOver2500);

  // ── PAGE 4 §11 — Declaration / signature block ────────────────────────────
  setField("SC-100[0].Page4[0].Sign[0].Date1[0]",         str(d.declarationDate));
  setField("SC-100[0].Page4[0].Sign[0].PlaintiffName1[0]", str(d.declarantNameTitle || d.plaintiffName));
  if (d.secondPlaintiffName) {
    setField("SC-100[0].Page4[0].Sign[0].Date2[0]",          str(d.declarationDate));
    setField("SC-100[0].Page4[0].Sign[0].PlaintiffName2[0]", str(d.secondPlaintiffName));
  }

  // ── Signature image (signed version only) ─────────────────────────────────
  // The AcroForm has no native signature field; embed the PNG directly on page 4.
  // Coordinates are in PDF points, bottom-left origin.
  // Signature box: x=320, width=240, top-of-sig y=503 (= 792−289), height=30pt.
  if (sigPngBytes) {
    try {
      const sigImage = await pdfDoc.embedPng(sigPngBytes);
      const pages    = pdfDoc.getPages();
      const page4    = pages[3];                 // index 3 = page 4
      const sigW     = 240;
      const sigH     = 30;
      const sigX     = 320;
      const sigY     = 792 - 289 - sigH;         // CSS top 289 → PDF bottom-origin
      page4.drawImage(sigImage, { x: sigX, y: sigY, width: sigW, height: sigH });
    } catch {
      // Signature embedding failed — generate unsigned PDF rather than failing entirely.
    }
  }

  // Flatten the form: stamps every field's AP stream directly onto the page
  // as static content and removes the AcroForm layer entirely.  This is the
  // only viewer-independent way to guarantee 12pt text — without flattening,
  // Acrobat, Chrome, and Preview each apply their own font-sizing logic to
  // interactive AcroForm fields regardless of NeedAppearances or AP streams.
  form.flatten();

  // Draw the large text fields directly onto the page content stream.
  // These fields were queued by queueDirectField() above; their AcroForm
  // widgets were flattened as empty placeholders, and the real text is
  // rendered here — after flatten — so it sits on top of the page layer
  // at exactly 12pt with no AcroForm font-size interference.
  const pages = pdfDoc.getPages();
  for (const spec of directQueue) {
    const page = pages[spec.pageIndex];
    if (!page) continue;
    // Baseline starts near the top of the field rectangle.
    // 14pt line height gives 2pt leading between 12pt lines.
    const startY = spec.y + spec.h - 14;
    page.drawText(spec.text, {
      x: spec.x + 2,
      y: startY,
      font: helvetica,
      size: 12,
      maxWidth: spec.w - 4,
      lineHeight: 14,
      color: rgb(0, 0, 0),
    });
  }

  const saved = await pdfDoc.save();
  return Buffer.from(saved);
}
