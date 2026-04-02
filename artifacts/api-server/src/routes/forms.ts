import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db";
import { PDFDocument, StandardFonts, rgb, LineCapStyle } from "pdf-lib";

const router: IRouter = Router();

// ─── Shared drawing helpers ───────────────────────────────────────────────────

type DrawCtx = {
  page: ReturnType<PDFDocument["addPage"]>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  reg: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  small: Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

const BLACK  = rgb(0,    0,    0);
const GRAY   = rgb(0.4,  0.4,  0.4);
const LGRAY  = rgb(0.85, 0.85, 0.85);
const NAVY   = rgb(0.05, 0.15, 0.35);
const WHITE  = rgb(1,    1,    1);

const W = 612;   // letter width  pts
const H = 792;   // letter height pts
const ML = 36;   // margin left
const MR = 36;   // margin right
const CW = W - ML - MR;  // content width

/** Draw a rectangle outline */
function box(ctx: DrawCtx, x: number, y: number, w: number, h: number, lw = 0.5) {
  ctx.page.drawRectangle({ x, y, width: w, height: h, borderColor: BLACK, borderWidth: lw, color: WHITE });
}

/** Draw a horizontal rule */
function hline(ctx: DrawCtx, x: number, y: number, w: number, lw = 0.5) {
  ctx.page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: lw, color: BLACK });
}

/** Draw text, returns width */
function txt(ctx: DrawCtx, text: string, x: number, y: number, size: number, bold = false, color = BLACK, maxWidth?: number) {
  const font = bold ? ctx.bold : ctx.reg;
  let t = text;
  if (maxWidth) {
    // truncate to fit
    while (t.length > 0 && font.widthOfTextAtSize(t, size) > maxWidth) {
      t = t.slice(0, -1);
    }
    if (t.length < text.length) t = t.slice(0, -1) + "…";
  }
  ctx.page.drawText(t, { x, y, size, font, color });
  return font.widthOfTextAtSize(t, size);
}

/** Draw a checkbox (filled=true draws an X) */
function checkbox(ctx: DrawCtx, x: number, y: number, filled: boolean) {
  const s = 7;
  box(ctx, x, y - s + 1, s, s, 0.6);
  if (filled) {
    ctx.page.drawText("✓", { x: x + 0.5, y: y - s + 2, size: 6.5, font: ctx.bold, color: BLACK });
  }
}

/** Underline field: label + value on a line */
function field(ctx: DrawCtx, label: string, value: string | null | undefined,
               x: number, y: number, lineWidth: number, labelSize = 7, valueSize = 8) {
  txt(ctx, label, x, y, labelSize, false, GRAY);
  const labelW = ctx.reg.widthOfTextAtSize(label, labelSize);
  const vx = x + labelW + 3;
  const val = value || "";
  txt(ctx, val, vx, y, valueSize, false, BLACK, lineWidth - labelW - 5);
  hline(ctx, vx, y - 2, lineWidth - labelW - 3);
}

/** Multi-line wrapped text, returns final y */
function multiline(ctx: DrawCtx, text: string, x: number, y: number, maxW: number, size: number, lineH: number, maxLines = 999): number {
  const words = (text || "").split(/\s+/);
  let line = "";
  let count = 0;
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (ctx.reg.widthOfTextAtSize(candidate, size) > maxW && line) {
      txt(ctx, line, x, y, size);
      y -= lineH;
      count++;
      line = word;
      if (count >= maxLines) { txt(ctx, "…", x, y, size); y -= lineH; break; }
    } else {
      line = candidate;
    }
  }
  if (line && count < maxLines) {
    txt(ctx, line, x, y, size);
    y -= lineH;
  }
  return y;
}

/** Section item number bubble */
function itemNum(ctx: DrawCtx, n: string, x: number, y: number) {
  ctx.page.drawCircle({ x: x + 7, y: y + 3, size: 7, color: NAVY });
  txt(ctx, n, x + (n.length > 1 ? 3 : 5), y, 7, true, WHITE);
}

// ─── Page header shared across pages 2-4 ─────────────────────────────────────
function drawPageHeader(ctx: DrawCtx, pageNum: number, plaintiffName: string, caseNumber: string, y: number) {
  // Top border
  ctx.page.drawRectangle({ x: 0, y: H - 28, width: W, height: 28, color: NAVY });
  txt(ctx, "SC-100", 10, H - 20, 11, true, WHITE);
  txt(ctx, "Plaintiff's Claim and ORDER to Go to Small Claims Court", 65, H - 16, 8, false, WHITE);
  txt(ctx, `Rev. January 1, 2026`, 65, H - 25, 6.5, false, rgb(0.7,0.7,0.7));
  txt(ctx, `Page ${pageNum} of 4`, W - 70, H - 20, 7, false, WHITE);

  // Plaintiff name + case number bar
  ctx.page.drawRectangle({ x: ML, y: y - 14, width: CW, height: 16, color: LGRAY });
  txt(ctx, "Plaintiff (list names):", ML + 3, y - 8, 7, false, GRAY);
  const pNameX = ML + ctx.reg.widthOfTextAtSize("Plaintiff (list names): ", 7) + 6;
  txt(ctx, plaintiffName || "", pNameX, y - 8, 7.5, true, BLACK, 260);
  txt(ctx, "Case Number:", ML + CW - 130, y - 8, 7, false, GRAY);
  txt(ctx, caseNumber || "(court assigns)", ML + CW - 75, y - 8, 7, false, GRAY);
  return y - 28;
}

// ─── DRAFT watermark ──────────────────────────────────────────────────────────
function drawDraftWatermark(page: ReturnType<PDFDocument["addPage"]>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  page.drawText("DRAFT – PREPARED WITH SMALL CLAIMS GENIE", {
    x: 90, y: H / 2 - 20, size: 28, font,
    color: rgb(0.85, 0.85, 0.85), opacity: 0.35,
    rotate: { type: "degrees" as const, angle: 45 },
  });
}

// ─── Main route ───────────────────────────────────────────────────────────────
router.get("/cases/:id/forms/sc100", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const [c] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  const pdfDoc = await PDFDocument.create();
  const bold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const reg   = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const small = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Convenience: map venueBasis code → SC-100 checkbox letter
  const venueBasisMap: Record<string, string> = {
    where_defendant_lives:       "a1",
    where_damage_happened:       "a2",
    where_plaintiff_injured:     "a3",
    where_contract_made_broken:  "a4",
    buyer_household_goods:       "b",
    retail_installment:          "c",
    vehicle_finance:             "d",
    other:                       "e",
  };
  const venueSel = venueBasisMap[c.venueBasis ?? ""] ?? "";

  // ── PAGE 1 — Cover / Instructions ──────────────────────────────────────────
  {
    const page = pdfDoc.addPage([W, H]);
    const ctx: DrawCtx = { page, bold, reg, small };
    drawDraftWatermark(page, bold);

    // Top navy banner
    page.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: NAVY });
    txt(ctx, "SC-100", 12, H - 25, 18, true, WHITE);
    txt(ctx, "Plaintiff's Claim and ORDER", 90, H - 22, 13, true, WHITE);
    txt(ctx, "to Go to Small Claims Court", 90, H - 37, 13, false, WHITE);
    txt(ctx, "Rev. January 1, 2026  |  Judicial Council of California, courts.ca.gov", 12, H - 53, 7, false, rgb(0.7,0.7,0.7));

    // Right side: clerk stamp box + court info
    const rightX = W - 195;
    box(ctx, rightX, H - 130, 175, 65, 0.8);
    txt(ctx, "Clerk stamps date here when form is filed.", rightX + 5, H - 75, 7, false, GRAY);
    hline(ctx, rightX + 5, H - 100, 165);
    hline(ctx, rightX + 5, H - 115, 165);

    box(ctx, rightX, H - 200, 175, 62, 0.8);
    txt(ctx, "Fill in court name and street address:", rightX + 4, H - 143, 7, false, GRAY);
    txt(ctx, "Superior Court of California, County of", rightX + 4, H - 155, 7.5, false, BLACK);
    const county = (c.countyId ?? "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    txt(ctx, county || "________________________", rightX + 4, H - 168, 8.5, true, BLACK);
    hline(ctx, rightX + 4, H - 176, 165);
    hline(ctx, rightX + 4, H - 187, 165);

    box(ctx, rightX, H - 230, 175, 28, 0.8);
    txt(ctx, "Case Number:", rightX + 4, H - 214, 7, false, GRAY);
    txt(ctx, "Court assigns on filing", rightX + 4, H - 225, 7, false, GRAY);

    box(ctx, rightX, H - 260, 175, 28, 0.8);
    txt(ctx, "Case Name:", rightX + 4, H - 244, 7, false, GRAY);
    txt(ctx, c.plaintiffName ? `${c.plaintiffName} v. ${c.defendantName ?? ""}` : c.title, rightX + 4, H - 255, 7.5, false, BLACK, 165);

    // Notice boxes
    const noticeY = H - 75;
    const noticeW = rightX - ML - 10;
    box(ctx, ML, noticeY - 120, noticeW, 120, 0.8);
    txt(ctx, "Notice to the person being sued:", ML + 5, noticeY - 14, 8, true, BLACK);
    const notices = [
      "You are the defendant if your name is listed in item 2 on page 2 of this form.",
      "You and the plaintiff must go to court on the trial date listed below.",
      "If you do not go to court, you may lose the case.",
      "Bring witnesses, receipts, and any evidence you need to prove your case.",
      "Read this form and all pages attached to understand the claim against you.",
    ];
    let ny = noticeY - 27;
    for (const n of notices) {
      txt(ctx, "•", ML + 7, ny, 7, false, BLACK);
      ny = multiline(ctx, n, ML + 15, ny, noticeW - 25, 7, 10, 2);
    }

    // Order to Go to Court table
    const tableY = noticeY - 140;
    box(ctx, ML, tableY - 60, CW, 60, 0.8);
    page.drawRectangle({ x: ML, y: tableY - 14, width: CW, height: 14, color: LGRAY });
    txt(ctx, "Order to Go to Court", ML + 5, tableY - 10, 8, true, NAVY);
    txt(ctx, "The people in 1 and 2 must attend court: (Clerk fills out section below.)", ML + 5, tableY - 24, 7, false, BLACK);
    txt(ctx, "Trial Date", ML + 5, tableY - 36, 7, false, GRAY);
    txt(ctx, "Date", ML + 70, tableY - 36, 7, false, GRAY);
    txt(ctx, "Time", ML + 180, tableY - 36, 7, false, GRAY);
    txt(ctx, "Department", ML + 250, tableY - 36, 7, false, GRAY);
    txt(ctx, "Court Name / Address (if different)", ML + 340, tableY - 36, 7, false, GRAY);
    hline(ctx, ML + 5, tableY - 42, CW - 10, 0.3);
    txt(ctx, "1.", ML + 5, tableY - 53, 7, false, GRAY);
    txt(ctx, "2.", ML + 5, tableY - 65, 7, false, GRAY);

    // Instructions section
    const instY = tableY - 80;
    box(ctx, ML, instY - 155, CW, 155, 0.8);
    page.drawRectangle({ x: ML, y: instY - 14, width: CW, height: 14, color: LGRAY });
    txt(ctx, "Instructions for the person suing:", ML + 5, instY - 10, 8, true, NAVY);
    const insts = [
      "You are the plaintiff. The person you are suing is the defendant.",
      "Before you fill out this form, read form SC-100-INFO, Information for the Plaintiff, to know your rights.",
      "Fill out pages 2, 3, and 4 of this form. Make copies of all pages — one for each party and an extra copy for yourself.",
      "Take or mail the original and the copies to the court clerk's office and pay the filing fee.",
      "You must have someone at least 18 years old — not you or anyone else listed in this case — serve each defendant a court-stamped copy of all pages of this form.",
      "Go to court on your trial date. Bring witnesses, receipts, and any evidence you need to prove your case.",
    ];
    let iy = instY - 30;
    for (const inst of insts) {
      txt(ctx, "•", ML + 7, iy, 7, false, BLACK);
      iy = multiline(ctx, inst, ML + 16, iy, CW - 30, 7, 10, 3);
      iy -= 3;
    }

    // Footer
    txt(ctx, "Judicial Council of California, courts.ca.gov", ML, 28, 7, false, GRAY);
    txt(ctx, "SC-100, Page 1 of 4  |  PREPARED WITH SMALL CLAIMS GENIE — review all information before filing", W / 2 - 100, 20, 6.5, false, GRAY);
  }

  // ── PAGE 2 — Items 1, 2, 3a ────────────────────────────────────────────────
  {
    const page = pdfDoc.addPage([W, H]);
    const ctx: DrawCtx = { page, bold, reg, small };
    drawDraftWatermark(page, bold);

    let y = H - 32;
    y = drawPageHeader(ctx, 2, c.plaintiffName ?? "", "", y);

    // ── Item 1: Plaintiff ────────────────────────────────────────────────────
    y -= 6;
    itemNum(ctx, "1", ML, y);
    txt(ctx, "The plaintiff (the person, business, or public entity that is suing) is:", ML + 20, y, 8, true, NAVY);
    y -= 16;

    // Name + Phone row
    box(ctx, ML, y - 14, 320, 14);
    box(ctx, ML + 320, y - 14, CW - 320, 14);
    txt(ctx, "Name:", ML + 4, y - 10, 7, false, GRAY);
    txt(ctx, c.plaintiffName ?? "", ML + 35, y - 10, 8.5, false, BLACK, 275);
    txt(ctx, "Phone:", ML + 326, y - 10, 7, false, GRAY);
    txt(ctx, c.plaintiffPhone ?? "", ML + 360, y - 10, 8, false, BLACK, 100);
    y -= 14;

    // Street address
    box(ctx, ML, y - 14, CW, 14);
    txt(ctx, "Street address:", ML + 4, y - 10, 7, false, GRAY);
    const addr1 = [c.plaintiffAddress, c.plaintiffCity, c.plaintiffState, c.plaintiffZip].filter(Boolean).join(", ");
    txt(ctx, addr1, ML + 80, y - 10, 8, false, BLACK, CW - 86);
    y -= 14;

    // Mailing address (show if different — for now show same)
    box(ctx, ML, y - 14, CW, 14);
    txt(ctx, "Mailing address (if different):", ML + 4, y - 10, 7, false, GRAY);
    y -= 14;

    // Email
    box(ctx, ML, y - 14, CW, 14);
    txt(ctx, "Email address (if available):", ML + 4, y - 10, 7, false, GRAY);
    txt(ctx, c.plaintiffEmail ?? "", ML + 140, y - 10, 8, false, BLACK, CW - 146);
    y -= 14;

    // Checkboxes
    y -= 4;
    checkbox(ctx, ML + 4, y, false);
    txt(ctx, "Check here if more than two plaintiffs and attach form SC-100A.", ML + 16, y - 5, 7, false, BLACK);
    y -= 12;
    checkbox(ctx, ML + 4, y, false);
    txt(ctx, "Check here if either plaintiff is doing business under a fictitious name and attach form SC-103.", ML + 16, y - 5, 7, false, BLACK);
    y -= 16;

    // ── Item 2: Defendant ────────────────────────────────────────────────────
    hline(ctx, ML, y, CW, 1);
    y -= 8;
    itemNum(ctx, "2", ML, y);
    txt(ctx, "The defendant (the person, business, or public entity being sued) is:", ML + 20, y, 8, true, NAVY);
    y -= 16;

    box(ctx, ML, y - 14, 320, 14);
    box(ctx, ML + 320, y - 14, CW - 320, 14);
    txt(ctx, "Name:", ML + 4, y - 10, 7, false, GRAY);
    txt(ctx, c.defendantName ?? "", ML + 35, y - 10, 8.5, false, BLACK, 275);
    txt(ctx, "Phone:", ML + 326, y - 10, 7, false, GRAY);
    txt(ctx, c.defendantPhone ?? "", ML + 360, y - 10, 8, false, BLACK, 100);
    y -= 14;

    box(ctx, ML, y - 14, CW, 14);
    txt(ctx, "Street address:", ML + 4, y - 10, 7, false, GRAY);
    const addr2 = [c.defendantAddress, c.defendantCity, c.defendantState, c.defendantZip].filter(Boolean).join(", ");
    txt(ctx, addr2, ML + 80, y - 10, 8, false, BLACK, CW - 86);
    y -= 14;

    box(ctx, ML, y - 14, CW, 14);
    txt(ctx, "Mailing address (if different):", ML + 4, y - 10, 7, false, GRAY);
    y -= 14;

    if (c.defendantIsBusinessOrEntity) {
      y -= 4;
      txt(ctx, "If the defendant is a corporation, limited liability company, or public entity, list the person or agent authorized for service of process:", ML + 4, y, 7, false, BLACK);
      y -= 14;
      box(ctx, ML, y - 14, 280, 14);
      box(ctx, ML + 280, y - 14, CW - 280, 14);
      txt(ctx, "Agent Name:", ML + 4, y - 10, 7, false, GRAY);
      txt(ctx, c.defendantAgentName ?? "", ML + 68, y - 10, 8, false, BLACK, 200);
      txt(ctx, "Job title, if known:", ML + 286, y - 10, 7, false, GRAY);
      y -= 14;
      box(ctx, ML, y - 14, CW, 14);
      txt(ctx, "Address:", ML + 4, y - 10, 7, false, GRAY);
      y -= 14;
    }

    y -= 4;
    checkbox(ctx, ML + 4, y, false);
    txt(ctx, "Check here if your case is against more than one defendant and attach form SC-100A.", ML + 16, y - 5, 7, false, BLACK);
    y -= 12;
    checkbox(ctx, ML + 4, y, c.isSuingPublicEntity === true);
    txt(ctx, "Check here if any defendant is on active military duty.", ML + 16, y - 5, 7, false, BLACK);
    y -= 18;

    // ── Item 3a: Why does defendant owe money ────────────────────────────────
    hline(ctx, ML, y, CW, 1);
    y -= 8;
    itemNum(ctx, "3", ML, y);
    txt(ctx, `The plaintiff claims the defendant owes $`, ML + 20, y, 8, true, NAVY);
    const amtX = ML + 20 + bold.widthOfTextAtSize("The plaintiff claims the defendant owes $", 8);
    txt(ctx, c.claimAmount ? c.claimAmount.toFixed(2) : "__________", amtX, y, 9, true, c.claimAmount ? BLACK : GRAY);
    txt(ctx, "   (Explain below and on the next page.)", amtX + 70, y, 8, false, NAVY);
    y -= 14;

    txt(ctx, "a.", ML + 6, y, 8, true, NAVY);
    txt(ctx, "Why does the defendant owe the plaintiff money?", ML + 20, y, 8, false, BLACK);
    y -= 12;

    // Description box — tall
    const descBoxH = Math.min(180, Math.max(80, y - 90));
    box(ctx, ML, y - descBoxH, CW, descBoxH);
    let dy = y - 10;
    if (c.claimDescription) {
      dy = multiline(ctx, c.claimDescription, ML + 6, dy, CW - 12, 8.5, 12, Math.floor(descBoxH / 12));
    } else {
      txt(ctx, "(Not provided)", ML + 6, dy, 8, false, LGRAY);
    }
    y -= descBoxH + 8;

    // Footer
    hline(ctx, ML, 38, CW);
    txt(ctx, `SC-100, Page 2 of 4  |  Plaintiff's Claim and ORDER to Go to Small Claims Court  |  DRAFT — Small Claims Genie`, ML, 28, 6.5, false, GRAY);
  }

  // ── PAGE 3 — Items 3b, 3c, 4, 5, 6, 7, 8 ──────────────────────────────────
  {
    const page = pdfDoc.addPage([W, H]);
    const ctx: DrawCtx = { page, bold, reg, small };
    drawDraftWatermark(page, bold);

    let y = H - 32;
    y = drawPageHeader(ctx, 3, c.plaintiffName ?? "", "", y);
    y -= 6;

    // 3b: When did this happen
    itemNum(ctx, "3", ML, y);
    txt(ctx, "b.", ML + 20, y, 8, true, NAVY);
    txt(ctx, "When did this happen?", ML + 32, y, 8, false, BLACK);
    y -= 14;

    box(ctx, ML, y - 14, CW / 2, 14);
    box(ctx, ML + CW / 2, y - 14, CW / 2, 14);
    txt(ctx, "Date:", ML + 4, y - 10, 7, false, GRAY);
    // parse date range: "MM/dd/yyyy – MM/dd/yyyy" or single date
    const dateParts = (c.incidentDate ?? "").split("–").map((s: string) => s.trim());
    txt(ctx, dateParts[0] ?? "", ML + 35, y - 10, 8.5, false, BLACK, CW / 2 - 42);
    txt(ctx, "If no specific date — Date started:", ML + CW / 2 + 4, y - 10, 7, false, GRAY);
    if (dateParts[0] && dateParts[1]) {
      txt(ctx, dateParts[0], ML + CW / 2 + 140, y - 10, 8, false, BLACK);
    }
    y -= 14;

    if (dateParts[1]) {
      box(ctx, ML, y - 14, CW, 14);
      txt(ctx, "Through:", ML + 4, y - 10, 7, false, GRAY);
      txt(ctx, dateParts[1], ML + 50, y - 10, 8.5, false, BLACK);
      y -= 14;
    }

    y -= 8;

    // 3c: How did you calculate
    txt(ctx, "c.", ML + 20, y, 8, true, NAVY);
    txt(ctx, "How did you calculate the money owed to you? (Do not include court costs or fees for service.)", ML + 32, y, 8, false, BLACK);
    y -= 12;
    const calcH = 70;
    box(ctx, ML, y - calcH, CW, calcH);
    if (c.howAmountCalculated) {
      multiline(ctx, c.howAmountCalculated, ML + 6, y - 8, CW - 12, 8.5, 12, 5);
    } else {
      txt(ctx, "(Not provided)", ML + 6, y - 12, 8, false, LGRAY);
    }
    y -= calcH + 10;

    // 4: Prior demand
    hline(ctx, ML, y, CW, 0.8);
    y -= 10;
    itemNum(ctx, "4", ML, y);
    txt(ctx, "You must ask the defendant to pay you before you sue. Have you done this?", ML + 20, y, 8, false, BLACK);
    y -= 14;

    checkbox(ctx, ML + 20, y, c.priorDemandMade === true);
    txt(ctx, "Yes", ML + 32, y - 5, 8, false, BLACK);
    checkbox(ctx, ML + 70, y, c.priorDemandMade === false);
    txt(ctx, "No", ML + 82, y - 5, 8, false, BLACK);
    if (c.priorDemandMade === false) {
      txt(ctx, "If no, explain why not:", ML + 105, y - 5, 7, false, GRAY);
    }
    y -= 20;

    if (c.priorDemandDescription) {
      box(ctx, ML, y - 40, CW, 40);
      multiline(ctx, c.priorDemandDescription, ML + 5, y - 8, CW - 10, 8, 11, 3);
      y -= 48;
    }

    // 5: Venue
    hline(ctx, ML, y, CW, 0.8);
    y -= 10;
    itemNum(ctx, "5", ML, y);
    txt(ctx, "Why are you filing your claim at this courthouse?", ML + 20, y, 8, false, BLACK);
    txt(ctx, "This courthouse covers the area (check the one that applies):", ML + 20, y - 11, 8, false, BLACK);
    y -= 26;

    const venueOptions = [
      { key: "a1", label: "(1) Where the defendant lives or does business." },
      { key: "a2", label: "(2) Where the plaintiff's property was damaged." },
      { key: "a3", label: "(3) Where the plaintiff was injured." },
      { key: "a4", label: "(4) Where a contract was made, signed, performed, or broken by the defendant." },
    ];

    txt(ctx, "a.", ML + 20, y, 8, true, NAVY);
    for (let i = 0; i < venueOptions.length; i++) {
      const vo = venueOptions[i];
      const ox = i < 2 ? ML + 32 : ML + 32 + CW / 2;
      const oy = i < 2 ? y - (i * 13) : y - ((i - 2) * 13);
      checkbox(ctx, ox, oy + 2, venueSel === vo.key);
      txt(ctx, vo.label, ox + 14, oy - 3, 7, false, BLACK, CW / 2 - 30);
    }
    y -= 32;

    const venueLowerOptions = [
      { key: "b", letter: "b", label: "Where the buyer or lessee signed the contract, lives now, or lived when the contract was made (household goods/services)." },
      { key: "c", letter: "c", label: "Where the buyer signed the contract or lives (retail installment contract)." },
      { key: "d", letter: "d", label: "Where the buyer signed the contract, lives, or where the vehicle is garaged (vehicle finance sale)." },
    ];
    for (const vo of venueLowerOptions) {
      checkbox(ctx, ML + 20, y, venueSel === vo.key);
      txt(ctx, vo.letter + ".", ML + 32, y - 5, 8, true, NAVY);
      txt(ctx, vo.label, ML + 44, y - 5, 7, false, BLACK, CW - 60);
      y -= 14;
    }

    // "e. Other"
    checkbox(ctx, ML + 20, y, venueSel === "e");
    txt(ctx, "e.", ML + 32, y - 5, 8, true, NAVY);
    txt(ctx, "Other (specify):", ML + 44, y - 5, 7, false, GRAY);
    if (c.venueReason) {
      txt(ctx, c.venueReason, ML + 120, y - 5, 8, false, BLACK, CW - 130);
    }
    hline(ctx, ML + 120, y - 8, CW - 130);
    y -= 16;

    // 6: Zip code
    hline(ctx, ML, y, CW, 0.8);
    y -= 10;
    itemNum(ctx, "6", ML, y);
    txt(ctx, "List the zip code of the place checked in 5 above (if you know):", ML + 20, y, 8, false, BLACK);
    box(ctx, ML + 20 + reg.widthOfTextAtSize("List the zip code of the place checked in 5 above (if you know): ", 8) + 20, y - 11, 60, 13);
    y -= 20;

    // 7: Attorney fee dispute
    hline(ctx, ML, y, CW, 0.8);
    y -= 10;
    itemNum(ctx, "7", ML, y);
    txt(ctx, "Is your claim about an attorney-client fee dispute?", ML + 20, y, 8, false, BLACK);
    checkbox(ctx, ML + 20 + reg.widthOfTextAtSize("Is your claim about an attorney-client fee dispute?  ", 8) + 20, y + 2, c.isAttyFeeDispute === true);
    txt(ctx, "Yes", ML + 20 + reg.widthOfTextAtSize("Is your claim about an attorney-client fee dispute?  ", 8) + 34, y - 3, 8, false, BLACK);
    checkbox(ctx, ML + 20 + reg.widthOfTextAtSize("Is your claim about an attorney-client fee dispute?  ", 8) + 65, y + 2, c.isAttyFeeDispute === false);
    txt(ctx, "No", ML + 20 + reg.widthOfTextAtSize("Is your claim about an attorney-client fee dispute?  ", 8) + 79, y - 3, 8, false, BLACK);
    y -= 20;

    // 8: Public entity
    hline(ctx, ML, y, CW, 0.8);
    y -= 10;
    itemNum(ctx, "8", ML, y);
    txt(ctx, "Are you suing a public entity?", ML + 20, y, 8, false, BLACK);
    const peX = ML + 20 + reg.widthOfTextAtSize("Are you suing a public entity?  ", 8) + 12;
    checkbox(ctx, peX, y + 2, c.isSuingPublicEntity === true);
    txt(ctx, "Yes", peX + 14, y - 3, 8, false, BLACK);
    checkbox(ctx, peX + 45, y + 2, c.isSuingPublicEntity !== true);
    txt(ctx, "No", peX + 59, y - 3, 8, false, BLACK);
    y -= 14;

    if (c.isSuingPublicEntity) {
      txt(ctx, "If yes, you must file a written claim with the entity first. A claim was filed on (date):", ML + 20, y, 7.5, false, BLACK);
      box(ctx, ML + 20 + reg.widthOfTextAtSize("If yes, you must file a written claim with the entity first. A claim was filed on (date): ", 7.5) + 20, y - 10, 110, 13);
      txt(ctx, c.publicEntityClaimFiledDate ?? "", ML + 20 + reg.widthOfTextAtSize("If yes, you must file a written claim with the entity first. A claim was filed on (date): ", 7.5) + 25, y - 7, 8, false, BLACK);
      y -= 20;
    }

    // Footer
    hline(ctx, ML, 38, CW);
    txt(ctx, `SC-100, Page 3 of 4  |  Plaintiff's Claim and ORDER to Go to Small Claims Court  |  DRAFT — Small Claims Genie`, ML, 28, 6.5, false, GRAY);
  }

  // ── PAGE 4 — Items 9, 10, 11, Signature ────────────────────────────────────
  {
    const page = pdfDoc.addPage([W, H]);
    const ctx: DrawCtx = { page, bold, reg, small };
    drawDraftWatermark(page, bold);

    let y = H - 32;
    y = drawPageHeader(ctx, 4, c.plaintiffName ?? "", "", y);
    y -= 10;

    // 9: Filed more than 12 claims
    itemNum(ctx, "9", ML, y);
    txt(ctx, "Have you filed more than 12 other small claims within the last 12 months in California?", ML + 20, y, 8, false, BLACK);
    y -= 14;
    checkbox(ctx, ML + 20, y, c.filedMoreThan12Claims === true);
    txt(ctx, "Yes   — If yes, the filing fee for this case will be higher.", ML + 34, y - 5, 8, false, BLACK);
    y -= 12;
    checkbox(ctx, ML + 20, y, c.filedMoreThan12Claims !== true);
    txt(ctx, "No", ML + 34, y - 5, 8, false, BLACK);
    y -= 20;

    // 10: Claim over $2,500
    hline(ctx, ML, y, CW, 0.8);
    y -= 10;
    itemNum(ctx, "10", ML, y);
    txt(ctx, "Is your claim for more than $2,500?", ML + 20, y, 8, false, BLACK);
    y -= 14;
    checkbox(ctx, ML + 20, y, c.claimOver2500 === true);
    txt(ctx, "Yes — You also confirm you have not filed more than two claims over $2,500 in California this calendar year.", ML + 34, y - 5, 7.5, false, BLACK, CW - 50);
    y -= 12;
    checkbox(ctx, ML + 20, y, c.claimOver2500 !== true);
    txt(ctx, "No", ML + 34, y - 5, 8, false, BLACK);
    y -= 20;

    // 11: No right to appeal
    hline(ctx, ML, y, CW, 0.8);
    y -= 10;
    itemNum(ctx, "11", ML, y);
    txt(ctx, "I understand that by filing a claim in small claims court, I have no right to appeal this claim.", ML + 20, y, 8, false, BLACK);
    y -= 24;

    // Declaration
    hline(ctx, ML, y, CW, 1.2);
    y -= 14;
    const decl = "I declare under penalty of perjury under the laws of the State of California that the information above and on any attachments to this form is true and correct.";
    y = multiline(ctx, decl, ML, y, CW, 8, 12, 3);
    y -= 14;

    // Signature block — plaintiff 1
    box(ctx, ML, y - 50, CW / 2 - 10, 50);
    txt(ctx, "Date:", ML + 6, y - 10, 7, false, GRAY);
    hline(ctx, ML + 34, y - 12, CW / 2 - 50);
    txt(ctx, "Plaintiff types or prints name here:", ML + 6, y - 26, 7, false, GRAY);
    txt(ctx, c.plaintiffName ?? "", ML + 6, y - 37, 9, false, BLACK, CW / 2 - 18);
    hline(ctx, ML + 6, y - 40, CW / 2 - 22);
    txt(ctx, "Plaintiff signs here →", ML + 6, y - 52, 7, false, GRAY);

    box(ctx, ML + CW / 2 + 10, y - 50, CW / 2 - 10, 50);
    txt(ctx, "Date:", ML + CW / 2 + 16, y - 10, 7, false, GRAY);
    hline(ctx, ML + CW / 2 + 44, y - 12, CW / 2 - 50);
    txt(ctx, "Plaintiff signs here:", ML + CW / 2 + 16, y - 52, 7, false, GRAY);
    y -= 60;

    // Accommodations notice
    y -= 10;
    page.drawRectangle({ x: ML, y: y - 56, width: CW, height: 56, color: rgb(0.97, 0.97, 0.97), borderColor: LGRAY, borderWidth: 0.8 });
    txt(ctx, "Requests for Accommodations", ML + 8, y - 13, 8, true, NAVY);
    const accText = "Assistive listening systems, computer-assisted real-time captioning, or sign language interpreter services are available if you ask at least five days before the trial. For these and other accommodations, contact the clerk's office for form MC-410, Disability Accommodation Request. (Civ. Code, § 54.8.)";
    multiline(ctx, accText, ML + 8, y - 26, CW - 16, 7.5, 11, 4);
    y -= 65;

    // DRAFT disclaimer box
    y -= 8;
    page.drawRectangle({ x: ML, y: y - 52, width: CW, height: 52, color: rgb(1, 0.98, 0.90), borderColor: rgb(0.8, 0.65, 0), borderWidth: 1 });
    txt(ctx, "⚠  IMPORTANT — DRAFT DOCUMENT", ML + 8, y - 14, 9, true, rgb(0.6, 0.4, 0));
    txt(ctx, "This form was prepared by Small Claims Genie as a guide only. You MUST obtain and file the official SC-100 form", ML + 8, y - 27, 7.5, false, BLACK);
    txt(ctx, "from your county courthouse or courts.ca.gov. Small Claims Genie is not a law firm. This is not legal advice.", ML + 8, y - 38, 7.5, false, BLACK);
    txt(ctx, `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, ML + 8, y - 49, 7, false, GRAY);

    // Footer
    hline(ctx, ML, 38, CW);
    txt(ctx, `SC-100, Page 4 of 4  |  Plaintiff's Claim and ORDER to Go to Small Claims Court  |  DRAFT — Small Claims Genie`, ML, 28, 6.5, false, GRAY);
  }

  const pdfBytes = await pdfDoc.save();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="SC100-Case-${id}-Draft.pdf"`);
  res.setHeader("Content-Length", pdfBytes.length);
  res.send(Buffer.from(pdfBytes));
});

// ── Preview endpoint (unchanged) ──────────────────────────────────────────────
router.get("/cases/:id/forms/sc100/preview", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const [c] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  res.json({
    plaintiffName: c.plaintiffName,
    plaintiffAddress: [c.plaintiffAddress, c.plaintiffCity, c.plaintiffState, c.plaintiffZip].filter(Boolean).join(", "),
    plaintiffPhone: c.plaintiffPhone,
    plaintiffEmail: c.plaintiffEmail,
    defendantName: c.defendantName,
    defendantAddress: [c.defendantAddress, c.defendantCity, c.defendantState, c.defendantZip].filter(Boolean).join(", "),
    defendantPhone: c.defendantPhone,
    defendantIsBusinessOrEntity: c.defendantIsBusinessOrEntity,
    defendantAgentName: c.defendantAgentName,
    claimAmount: c.claimAmount,
    claimType: c.claimType,
    claimDescription: c.claimDescription,
    incidentDate: c.incidentDate,
    howAmountCalculated: c.howAmountCalculated,
    priorDemandMade: c.priorDemandMade,
    priorDemandDescription: c.priorDemandDescription,
    venueBasis: c.venueBasis,
    venueReason: c.venueReason,
    countyId: c.countyId,
    isSuingPublicEntity: c.isSuingPublicEntity,
    publicEntityClaimFiledDate: c.publicEntityClaimFiledDate,
    isAttyFeeDispute: c.isAttyFeeDispute,
    filedMoreThan12Claims: c.filedMoreThan12Claims,
    claimOver2500: c.claimOver2500,
  });
});

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current = current ? current + " " + word : word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default router;
