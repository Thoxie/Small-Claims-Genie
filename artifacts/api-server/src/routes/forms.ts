import { Router, type IRouter } from "express";
import { PDFDocument, StandardFonts, rgb, LineCapStyle } from "pdf-lib";
import { getOwnedCase, getUserId } from "../lib/owned-case";
import { redeemDownloadToken } from "../lib/download-tokens";
import type { Request, Response } from "express";

const router: IRouter = Router();

// ─── Auth helper ─────────────────────────────────────────────────────────────
async function resolveDownloadUser(
  req: Request,
  res: Response,
  caseId: number
): Promise<string | null> {
  const queryToken = req.query.token as string | undefined;
  if (queryToken) {
    const userId = await redeemDownloadToken(queryToken, caseId);
    if (!userId) {
      res.status(403).json({ error: "Invalid or expired download link." });
      return null;
    }
    return userId;
  }
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PW = 612;
const PH = 792;
const ML = 36;
const MR = 36;
const CW = PW - ML - MR; // 540

const BLACK = rgb(0, 0, 0);
const GRAY  = rgb(0.45, 0.45, 0.45);
const LGRAY = rgb(0.82, 0.82, 0.82);
const MGRAY = rgb(0.92, 0.92, 0.92);
const NAVY  = rgb(0.02, 0.12, 0.38);
const WHITE = rgb(1, 1, 1);
const AMBER = rgb(0.55, 0.35, 0);

// ─── Drawing context ─────────────────────────────────────────────────────────
type Fonts = {
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  reg:  Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

type Ctx = Fonts & { page: ReturnType<PDFDocument["addPage"]> };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawRect(ctx: Ctx, x: number, y: number, w: number, h: number,
  opts: { fill?: ReturnType<typeof rgb>; border?: ReturnType<typeof rgb>; lw?: number } = {}
) {
  ctx.page.drawRectangle({
    x, y, width: w, height: h,
    color: opts.fill,
    borderColor: opts.border ?? BLACK,
    borderWidth: opts.lw ?? 0.5,
  });
}

function hline(ctx: Ctx, x: number, y: number, w: number, lw = 0.5) {
  ctx.page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: lw, color: BLACK });
}

function vline(ctx: Ctx, x: number, y: number, h: number, lw = 0.5) {
  ctx.page.drawLine({ start: { x, y }, end: { x, y: y + h }, thickness: lw, color: BLACK });
}

/** Draw text — returns the text width. Truncates with ellipsis if maxW given. */
function t(ctx: Ctx, text: string, x: number, y: number, size: number,
  opts: { bold?: boolean; color?: ReturnType<typeof rgb>; maxW?: number } = {}
): number {
  const font = opts.bold ? ctx.bold : ctx.reg;
  const col  = opts.color ?? BLACK;
  let s = text ?? "";
  if (opts.maxW !== undefined) {
    while (s.length > 0 && font.widthOfTextAtSize(s, size) > opts.maxW) {
      s = s.slice(0, -1);
    }
    if (s.length < (text ?? "").length) s = s.slice(0, -3) + "...";
  }
  ctx.page.drawText(s, { x, y, size, font: font, color: col });
  return font.widthOfTextAtSize(s, size);
}

/** Draw wrapped text; returns the y after the last line. */
function wrap(ctx: Ctx, text: string, x: number, y: number, maxW: number,
  size: number, lineH: number, maxLines = 999
): number {
  const words = (text || "").split(/\s+/);
  let line = "";
  let count = 0;
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (ctx.reg.widthOfTextAtSize(candidate, size) > maxW && line) {
      t(ctx, line, x, y, size);
      y -= lineH;
      count++;
      line = word;
      if (count >= maxLines) { t(ctx, "...", x, y, size); y -= lineH; break; }
    } else {
      line = candidate;
    }
  }
  if (line && count < maxLines) { t(ctx, line, x, y, size); y -= lineH; }
  return y;
}

/** Draw a checkbox (square outline). If checked, draw an X inside. */
function checkbox(ctx: Ctx, x: number, y: number, checked: boolean) {
  const s = 7;
  drawRect(ctx, x, y - s + 1, s, s, { lw: 0.6 });
  if (checked) {
    ctx.page.drawLine({ start: { x: x + 1, y: y - s + 2 }, end: { x: x + s - 1, y: y }, thickness: 0.8, color: BLACK });
    ctx.page.drawLine({ start: { x: x + 1, y: y }, end: { x: x + s - 1, y: y - s + 2 }, thickness: 0.8, color: BLACK });
  }
}

/** Number bubble (circle with number). */
function bubble(ctx: Ctx, label: string, cx: number, cy: number) {
  ctx.page.drawCircle({ x: cx, y: cy, size: 7.5, color: NAVY });
  const lw = ctx.bold.widthOfTextAtSize(label, 6.5);
  ctx.page.drawText(label, { x: cx - lw / 2, y: cy - 2.5, size: 6.5, font: ctx.bold, color: WHITE });
}

/** Underline field row: grey label then value text with underline. */
function labelField(ctx: Ctx, label: string, value: string | null | undefined,
  x: number, y: number, totalW: number, labelSize = 7, valSize = 8.5
) {
  t(ctx, label, x, y, labelSize, { color: GRAY });
  const lw = ctx.reg.widthOfTextAtSize(label, labelSize);
  const vx = x + lw + 3;
  const vw = totalW - lw - 5;
  t(ctx, value ?? "", vx, y, valSize, { maxW: vw });
  hline(ctx, vx, y - 2, vw);
}

// ─── Shared page header (pages 2-4) ──────────────────────────────────────────
function pageHeader(ctx: Ctx, pageNum: number, plaintiffName: string) {
  // Navy top bar
  drawRect(ctx, 0, PH - 24, PW, 24, { fill: NAVY, border: NAVY, lw: 0 });
  t(ctx, "SC-100", 10, PH - 17, 10, { bold: true, color: WHITE });
  t(ctx, "Plaintiff's Claim and ORDER to Go to Small Claims Court",
    65, PH - 13, 7.5, { color: WHITE });
  t(ctx, "Rev. January 1, 2026",
    65, PH - 21, 6, { color: rgb(0.65, 0.65, 0.65) });
  t(ctx, `Page ${pageNum} of 4`, PW - 62, PH - 17, 7, { color: WHITE });

  // Plaintiff / Case # bar
  const barY = PH - 36;
  drawRect(ctx, ML, barY - 13, CW, 13, { fill: MGRAY, border: LGRAY });
  t(ctx, "Plaintiff (list names):", ML + 3, barY - 9, 6.5, { color: GRAY });
  const lpx = ML + 3 + ctx.reg.widthOfTextAtSize("Plaintiff (list names):", 6.5) + 4;
  t(ctx, plaintiffName, lpx, barY - 9, 8, { bold: true, maxW: 240 });
  t(ctx, "Case Number:", PW - 150, barY - 9, 6.5, { color: GRAY });
  t(ctx, "(court assigns)", PW - 90, barY - 9, 6.5, { color: GRAY });

  return barY - 22;
}

// ─── Watermark ────────────────────────────────────────────────────────────────
function watermark(ctx: Ctx) {
  ctx.page.drawText("DRAFT - SMALL CLAIMS GENIE", {
    x: 80, y: PH / 2 - 15, size: 30, font: ctx.bold,
    color: rgb(0.88, 0.88, 0.88), opacity: 0.3,
    rotate: { type: "degrees" as const, angle: 45 },
  });
}

// ─── Page 1: Cover ───────────────────────────────────────────────────────────
function drawPage1(ctx: Ctx, c: Record<string, any>) {
  watermark(ctx);

  const county = (c.countyId ?? "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());

  // Top navy banner
  drawRect(ctx, 0, PH - 58, PW, 58, { fill: NAVY, border: NAVY, lw: 0 });
  t(ctx, "SC-100", 12, PH - 22, 18, { bold: true, color: WHITE });
  t(ctx, "Plaintiff's Claim and ORDER", 90, PH - 20, 13, { bold: true, color: WHITE });
  t(ctx, "to Go to Small Claims Court", 90, PH - 34, 12, { color: WHITE });
  t(ctx, "Rev. January 1, 2026  |  Judicial Council of California, courts.ca.gov",
    12, PH - 51, 6.5, { color: rgb(0.65, 0.65, 0.65) });

  // Right column boxes
  const rX = PW - 192;
  const rW = 168;

  // Clerk stamp box
  drawRect(ctx, rX, PH - 128, rW, 68, { lw: 0.7 });
  t(ctx, "Clerk stamps date here when form is filed.", rX + 5, PH - 72, 6.5, { color: GRAY });
  hline(ctx, rX + 6, PH - 95, rW - 12, 0.4);
  hline(ctx, rX + 6, PH - 110, rW - 12, 0.4);

  // Court name box
  drawRect(ctx, rX, PH - 202, rW, 68, { lw: 0.7 });
  t(ctx, "Fill in court name and street address:", rX + 5, PH - 143, 6.5, { color: GRAY });
  t(ctx, "Superior Court of California, County of", rX + 5, PH - 154, 7, { color: BLACK });
  t(ctx, county || "______________________", rX + 5, PH - 166, 8.5, { bold: true, maxW: rW - 10 });
  hline(ctx, rX + 6, PH - 174, rW - 12, 0.4);
  hline(ctx, rX + 6, PH - 186, rW - 12, 0.4);

  // Case number box
  drawRect(ctx, rX, PH - 232, rW, 28, { lw: 0.7 });
  t(ctx, "Case Number:", rX + 5, PH - 215, 6.5, { color: GRAY });
  t(ctx, "Court assigns on filing", rX + 5, PH - 226, 6.5, { color: GRAY });

  // Case name box
  drawRect(ctx, rX, PH - 263, rW, 28, { lw: 0.7 });
  t(ctx, "Case Name:", rX + 5, PH - 246, 6.5, { color: GRAY });
  const caseName = c.plaintiffName
    ? `${c.plaintiffName} v. ${c.defendantName ?? ""}`
    : (c.title ?? "");
  t(ctx, caseName, rX + 5, PH - 257, 7.5, { maxW: rW - 10 });

  // Notice to defendant
  const noticeW = rX - ML - 8;
  drawRect(ctx, ML, PH - 263, noticeW, 200, { lw: 0.7 });
  t(ctx, "Notice to the person being sued:", ML + 5, PH - 73, 8, { bold: true });
  const notices = [
    "You are the defendant if your name is listed in 2 on page 2 of this form or on form SC-100A.",
    "You and the plaintiff must go to court on the trial date listed below.",
    "If you do not go to court, you may lose the case. If you lose, the court can order that your wages, money, or property be taken to pay this claim.",
    "Bring witnesses, receipts, and any evidence you need to prove your case.",
    "Read this form and all pages attached to understand the claim against you and to protect your rights.",
  ];
  let ny = PH - 87;
  for (const n of notices) {
    t(ctx, "-", ML + 7, ny, 7);
    ny = wrap(ctx, n, ML + 16, ny, noticeW - 24, 7, 10, 3);
    ny -= 2;
  }

  // Aviso (Spanish notice)
  t(ctx, "Aviso al Demandado:", ML + 5, ny - 4, 8, { bold: true });
  ny -= 16;
  const avisos = [
    "Usted es el Demandado si su nombre figura en 2 de la pagina 2 de este formulario, o en el formulario SC-100A.",
    "Usted y el Demandante tienen que presentarse en la corte en la fecha del juicio indicada a continuacion.",
    "Lleve testigos, recibos y cualquier otra prueba que necesite para probar su caso.",
  ];
  for (const av of avisos) {
    t(ctx, "-", ML + 7, ny, 7);
    ny = wrap(ctx, av, ML + 16, ny, noticeW - 24, 7, 10, 2);
    ny -= 2;
  }

  // Order to Go to Court table
  const tableY = PH - 280;
  drawRect(ctx, ML, tableY - 66, CW, 66, { lw: 0.7 });
  drawRect(ctx, ML, tableY - 15, CW, 15, { fill: MGRAY, border: LGRAY });
  t(ctx, "Order to Go to Court", ML + 5, tableY - 10, 8, { bold: true, color: NAVY });
  t(ctx, "The people in 1 and 2 must attend court: (Clerk fills out section below.)",
    ML + 5, tableY - 22, 7);
  // Column headers
  t(ctx, "Trial Date", ML + 6, tableY - 33, 6.5, { color: GRAY });
  t(ctx, "Date", ML + 75, tableY - 33, 6.5, { color: GRAY });
  t(ctx, "Time", ML + 190, tableY - 33, 6.5, { color: GRAY });
  t(ctx, "Department", ML + 255, tableY - 33, 6.5, { color: GRAY });
  t(ctx, "Name and address of court, if different from above",
    ML + 340, tableY - 33, 6, { color: GRAY });
  hline(ctx, ML + 4, tableY - 38, CW - 8, 0.3);
  t(ctx, "1.", ML + 6, tableY - 49, 7);
  t(ctx, "2.", ML + 6, tableY - 60, 7);
  t(ctx, "3.", ML + 6, tableY - 71, 7);

  // Vertical dividers in table
  vline(ctx, ML + 70, tableY - 66, 28, 0.3);
  vline(ctx, ML + 180, tableY - 66, 28, 0.3);
  vline(ctx, ML + 245, tableY - 66, 28, 0.3);
  vline(ctx, ML + 330, tableY - 66, 28, 0.3);

  // Date/Clerk row
  t(ctx, "Date:", ML + 6, tableY - 80, 7, { color: GRAY });
  t(ctx, "Clerk, by", ML + 200, tableY - 80, 7, { color: GRAY });
  t(ctx, ", Deputy", ML + 400, tableY - 80, 7, { color: GRAY });

  // Instructions section
  const instY = tableY - 94;
  drawRect(ctx, ML, instY - 148, CW, 148, { lw: 0.7 });
  drawRect(ctx, ML, instY - 15, CW, 15, { fill: MGRAY, border: LGRAY });
  t(ctx, "Instructions for the person suing:", ML + 5, instY - 10, 8, { bold: true, color: NAVY });
  const insts = [
    "You are the plaintiff. The person you are suing is the defendant.",
    "Before you fill out this form, read form SC-100-INFO, Information for the Plaintiff, to know your rights. You can get form SC-100-INFO at any courthouse, county law library, or courts.ca.gov.",
    "Fill out pages 2, 3, and 4 of this form. Make copies of all the pages of this form and any attachments - one for each party named in this case and an extra copy for yourself.",
    "Take or mail the original and the copies to the court clerk's office and pay the filing fee. The clerk will write the date of your trial in the box above.",
    "You must have someone at least 18 - not you or anyone else listed in this case - give each defendant a court-stamped copy of all pages of this form. See forms SC-104, SC-104B, and SC-104C.",
    "Go to court on your trial date listed above. Bring witnesses, receipts, and any evidence you need to prove your case.",
  ];
  let iy = instY - 28;
  for (const inst of insts) {
    t(ctx, "-", ML + 7, iy, 7);
    iy = wrap(ctx, inst, ML + 16, iy, CW - 28, 7, 10, 3);
    iy -= 3;
  }

  // Footer
  hline(ctx, 0, 32, PW);
  t(ctx, "Judicial Council of California, courts.ca.gov", ML, 22, 7, { color: GRAY });
  t(ctx, "SC-100, Page 1 of 4", PW / 2 - 40, 22, 7, { color: GRAY });
  t(ctx, "Prepared with Small Claims Genie - review before filing",
    PW - 230, 22, 6.5, { color: GRAY });
}

// ─── Page 2: Items 1, 2, 3a ──────────────────────────────────────────────────
function drawPage2(ctx: Ctx, c: Record<string, any>) {
  watermark(ctx);
  let y = pageHeader(ctx, 2, c.plaintiffName ?? "");

  // ── Item 1: Plaintiff ──────────────────────────────────────────────────────
  y -= 4;
  bubble(ctx, "1", ML + 8, y + 2);
  t(ctx, "The plaintiff (the person, business, or public entity that is suing) is:",
    ML + 20, y, 8, { bold: true, color: NAVY });
  y -= 14;

  // Name / Phone row
  const nameW = 320;
  const phoneW = CW - nameW;
  drawRect(ctx, ML, y - 14, nameW, 14, { lw: 0.5 });
  drawRect(ctx, ML + nameW, y - 14, phoneW, 14, { lw: 0.5 });
  t(ctx, "Name:", ML + 4, y - 10, 6.5, { color: GRAY });
  t(ctx, c.plaintiffName ?? "", ML + 38, y - 10, 8.5, { maxW: nameW - 44 });
  t(ctx, "Phone:", ML + nameW + 4, y - 10, 6.5, { color: GRAY });
  t(ctx, c.plaintiffPhone ?? "", ML + nameW + 42, y - 10, 8, { maxW: phoneW - 46 });
  y -= 14;

  // Street address
  drawRect(ctx, ML, y - 14, CW, 14, { lw: 0.5 });
  t(ctx, "Street address:", ML + 4, y - 10, 6.5, { color: GRAY });
  const pAddr = [c.plaintiffAddress, c.plaintiffCity, c.plaintiffState, c.plaintiffZip]
    .filter(Boolean).join(", ");
  t(ctx, pAddr, ML + 90, y - 10, 8, { maxW: CW - 96 });
  y -= 14;

  // Mailing address
  drawRect(ctx, ML, y - 14, CW, 14, { lw: 0.5 });
  t(ctx, "Mailing address (if different):", ML + 4, y - 10, 6.5, { color: GRAY });
  y -= 14;

  // Email
  drawRect(ctx, ML, y - 14, CW, 14, { lw: 0.5 });
  t(ctx, "Email address (if available):", ML + 4, y - 10, 6.5, { color: GRAY });
  t(ctx, c.plaintiffEmail ?? "", ML + 144, y - 10, 8, { maxW: CW - 150 });
  y -= 18;

  // Checkboxes
  checkbox(ctx, ML + 4, y, false);
  t(ctx, "Check here if more than two plaintiffs and attach form SC-100A.", ML + 16, y - 5, 7);
  y -= 12;
  checkbox(ctx, ML + 4, y, false);
  t(ctx, "Check here if either plaintiff is doing business under a fictitious name and attach form SC-103.", ML + 16, y - 5, 7);
  y -= 12;
  checkbox(ctx, ML + 4, y, false);
  t(ctx, "Check here if any plaintiff is a \"licensee\" or payday lender under Financial Code sections 23000 et seq.", ML + 16, y - 5, 7);
  y -= 14;

  // ── Item 2: Defendant ──────────────────────────────────────────────────────
  hline(ctx, ML, y, CW, 0.8);
  y -= 8;
  bubble(ctx, "2", ML + 8, y + 2);
  t(ctx, "The defendant (the person, business, or public entity being sued) is:",
    ML + 20, y, 8, { bold: true, color: NAVY });
  y -= 14;

  drawRect(ctx, ML, y - 14, nameW, 14, { lw: 0.5 });
  drawRect(ctx, ML + nameW, y - 14, phoneW, 14, { lw: 0.5 });
  t(ctx, "Name:", ML + 4, y - 10, 6.5, { color: GRAY });
  t(ctx, c.defendantName ?? "", ML + 38, y - 10, 8.5, { maxW: nameW - 44 });
  t(ctx, "Phone:", ML + nameW + 4, y - 10, 6.5, { color: GRAY });
  t(ctx, c.defendantPhone ?? "", ML + nameW + 42, y - 10, 8, { maxW: phoneW - 46 });
  y -= 14;

  drawRect(ctx, ML, y - 14, CW, 14, { lw: 0.5 });
  t(ctx, "Street address:", ML + 4, y - 10, 6.5, { color: GRAY });
  const dAddr = [c.defendantAddress, c.defendantCity, c.defendantState, c.defendantZip]
    .filter(Boolean).join(", ");
  t(ctx, dAddr, ML + 90, y - 10, 8, { maxW: CW - 96 });
  y -= 14;

  drawRect(ctx, ML, y - 14, CW, 14, { lw: 0.5 });
  t(ctx, "Mailing address (if different):", ML + 4, y - 10, 6.5, { color: GRAY });
  y -= 14;

  if (c.defendantIsBusinessOrEntity) {
    y -= 2;
    t(ctx, "If the defendant is a corporation, LLC, or public entity, list the person or agent authorized for service of process here:",
      ML + 4, y, 6.5);
    y -= 13;
    drawRect(ctx, ML, y - 14, 280, 14, { lw: 0.5 });
    drawRect(ctx, ML + 280, y - 14, CW - 280, 14, { lw: 0.5 });
    t(ctx, "Name:", ML + 4, y - 10, 6.5, { color: GRAY });
    t(ctx, c.defendantAgentName ?? "", ML + 36, y - 10, 8, { maxW: 235 });
    t(ctx, "Job title, if known:", ML + 285, y - 10, 6.5, { color: GRAY });
    y -= 14;
    drawRect(ctx, ML, y - 14, CW, 14, { lw: 0.5 });
    t(ctx, "Address:", ML + 4, y - 10, 6.5, { color: GRAY });
    y -= 14;
  }

  y -= 4;
  checkbox(ctx, ML + 4, y, false);
  t(ctx, "Check here if your case is against more than one defendant and attach form SC-100A.", ML + 16, y - 5, 7);
  y -= 12;
  checkbox(ctx, ML + 4, y, c.defendantOnActiveMilitaryDuty === true);
  t(ctx, "Check here if any defendant is on active military duty and write defendant's name here:", ML + 16, y - 5, 7);
  y -= 14;

  // ── Item 3a: Claim description ─────────────────────────────────────────────
  hline(ctx, ML, y, CW, 0.8);
  y -= 10;
  bubble(ctx, "3", ML + 8, y + 2);
  t(ctx, "The plaintiff claims the defendant owes $", ML + 20, y, 8, { bold: true, color: NAVY });
  const amtLabelW = ctx.bold.widthOfTextAtSize("The plaintiff claims the defendant owes $", 8);
  const amtStr = c.claimAmount ? `${Number(c.claimAmount).toFixed(2)}` : "___________";
  t(ctx, amtStr, ML + 20 + amtLabelW, y, 9, { bold: true });
  t(ctx, "   (Explain below and on next page.)", ML + 20 + amtLabelW + 80, y, 7.5, { color: GRAY });
  y -= 14;

  t(ctx, "a.", ML + 22, y, 8, { bold: true, color: NAVY });
  t(ctx, "Why does the defendant owe the plaintiff money?", ML + 34, y, 8);
  y -= 10;

  const descH = Math.max(70, Math.min(160, y - 42));
  drawRect(ctx, ML, y - descH, CW, descH, { lw: 0.5 });
  if (c.claimDescription) {
    wrap(ctx, c.claimDescription, ML + 6, y - 8, CW - 12, 8.5, 12,
      Math.floor(descH / 12));
  } else {
    t(ctx, "(describe what happened)", ML + 6, y - 14, 8, { color: LGRAY });
  }
  y -= descH + 6;

  // Footer
  hline(ctx, ML, 36, CW, 0.5);
  t(ctx, "Rev. January 1, 2026", ML, 26, 6.5, { color: GRAY });
  t(ctx, "Plaintiff's Claim and ORDER to Go to Small Claims Court", PW / 2 - 120, 26, 6.5, { color: GRAY });
  t(ctx, "SC-100, Page 2 of 4", PW - 100, 26, 6.5, { color: GRAY });
}

// ─── Page 3: Items 3b, 3c, 4, 5, 6, 7, 8 ────────────────────────────────────
function drawPage3(ctx: Ctx, c: Record<string, any>) {
  watermark(ctx);
  let y = pageHeader(ctx, 3, c.plaintiffName ?? "");

  const venueBasisMap: Record<string, string> = {
    where_defendant_lives:      "a1",
    where_damage_happened:      "a2",
    where_plaintiff_injured:    "a3",
    where_contract_made_broken: "a4",
    buyer_household_goods:      "b",
    retail_installment:         "c",
    vehicle_finance:            "d",
    other:                      "e",
  };
  const vSel = venueBasisMap[c.venueBasis ?? ""] ?? "";

  // 3b: When did this happen
  y -= 4;
  bubble(ctx, "3", ML + 8, y + 2);
  t(ctx, "b.", ML + 22, y, 8, { bold: true, color: NAVY });
  t(ctx, "When did this happen?  (Date):", ML + 34, y, 8);
  y -= 14;

  const dateParts = (c.incidentDate ?? "").split(/[-–]/).map((s: string) => s.trim());
  const halfW = CW / 2 - 4;
  drawRect(ctx, ML, y - 14, halfW, 14, { lw: 0.5 });
  drawRect(ctx, ML + halfW + 8, y - 14, halfW, 14, { lw: 0.5 });
  t(ctx, "Date:", ML + 4, y - 10, 6.5, { color: GRAY });
  t(ctx, dateParts[0] ?? "", ML + 34, y - 10, 8.5, { maxW: halfW - 40 });
  t(ctx, "If no specific date, give the time period:  Date started:",
    ML + halfW + 12, y - 10, 6.5, { color: GRAY });
  y -= 14;

  if (dateParts[1]) {
    drawRect(ctx, ML, y - 14, CW, 14, { lw: 0.5 });
    t(ctx, "Through:", ML + 4, y - 10, 6.5, { color: GRAY });
    t(ctx, dateParts[1], ML + 52, y - 10, 8.5);
    y -= 14;
  }
  y -= 8;

  // 3c: How did you calculate
  t(ctx, "c.", ML + 22, y, 8, { bold: true, color: NAVY });
  t(ctx, "How did you calculate the money owed to you? (Do not include court costs or fees for service.)",
    ML + 34, y, 8);
  y -= 12;
  const calcH = 64;
  drawRect(ctx, ML, y - calcH, CW, calcH, { lw: 0.5 });
  if (c.howAmountCalculated) {
    wrap(ctx, c.howAmountCalculated, ML + 6, y - 8, CW - 12, 8.5, 12, 4);
  } else {
    t(ctx, "(explain how you calculated your damages)", ML + 6, y - 14, 8, { color: LGRAY });
  }
  y -= calcH + 4;

  // Overflow checkbox
  checkbox(ctx, ML + 4, y, false);
  t(ctx, "Check here if you need more space. Attach one sheet of paper or form MC-031 and write \"SC-100, Item 3\" at the top.",
    ML + 16, y - 5, 7);
  y -= 16;

  // ── Item 4: Prior demand ───────────────────────────────────────────────────
  hline(ctx, ML, y, CW, 0.8);
  y -= 10;
  bubble(ctx, "4", ML + 8, y + 2);
  t(ctx, "You must ask the defendant (in person, in writing, or by phone) to pay you before you sue.",
    ML + 20, y, 8, { bold: false });
  y -= 10;
  t(ctx, "If your claim is for possession of property, you must ask the defendant to give you the property. Have you done this?",
    ML + 20, y, 8);
  y -= 14;

  checkbox(ctx, ML + 20, y, c.priorDemandMade === true);
  t(ctx, "Yes", ML + 32, y - 5, 8);
  checkbox(ctx, ML + 68, y, c.priorDemandMade === false);
  t(ctx, "No", ML + 80, y - 5, 8);
  t(ctx, "  If no, explain why not:", ML + 100, y - 5, 7, { color: GRAY });
  y -= 14;

  if (c.priorDemandDescription) {
    drawRect(ctx, ML + 20, y - 36, CW - 20, 36, { lw: 0.5 });
    wrap(ctx, c.priorDemandDescription, ML + 26, y - 8, CW - 34, 8, 11, 3);
    y -= 42;
  } else {
    y -= 4;
  }

  // ── Item 5: Venue ──────────────────────────────────────────────────────────
  hline(ctx, ML, y, CW, 0.8);
  y -= 10;
  bubble(ctx, "5", ML + 8, y + 2);
  t(ctx, "Why are you filing your claim at this courthouse?", ML + 20, y, 8);
  y -= 11;
  t(ctx, "This courthouse covers the area (check the one that applies):", ML + 20, y, 8);
  y -= 14;

  // 5a: four sub-options in 2x2 grid
  t(ctx, "a.", ML + 20, y, 8, { bold: true, color: NAVY });
  const col2X = ML + 20 + CW / 2;

  checkbox(ctx, ML + 32, y + 2, vSel === "a1");
  t(ctx, "(1) Where the defendant lives or does business.", ML + 44, y - 3, 7);
  checkbox(ctx, col2X, y + 2, vSel === "a3");
  t(ctx, "(3) Where the plaintiff was injured.", col2X + 12, y - 3, 7);
  y -= 14;

  checkbox(ctx, ML + 32, y + 2, vSel === "a2");
  t(ctx, "(2) Where the plaintiff's property was damaged.", ML + 44, y - 3, 7);
  checkbox(ctx, col2X, y + 2, vSel === "a4");
  wrap(ctx, "(4) Where a contract was made, signed, performed, or broken by the defendant, or where the defendant lived or did business when the contract was made.",
    col2X + 12, y - 3, CW / 2 - 30, 7, 10, 2);
  y -= 24;

  // 5b
  checkbox(ctx, ML + 20, y, vSel === "b");
  t(ctx, "b.", ML + 32, y - 5, 8, { bold: true, color: NAVY });
  wrap(ctx, "Where the buyer or lessee signed the contract, lives now, or lived when the contract was made, if this claim is about an offer or contract for personal, family, or household goods, services, or loans. (Code Civ. Proc., section 395(b).)",
    ML + 44, y - 5, CW - 60, 7, 10, 2);
  y -= 22;

  // 5c
  checkbox(ctx, ML + 20, y, vSel === "c");
  t(ctx, "c.", ML + 32, y - 5, 8, { bold: true, color: NAVY });
  wrap(ctx, "Where the buyer signed the contract, lives now, or lived when the contract was made, if this claim is about a retail installment contract (like a credit card). (Civ. Code, section 1812.10.)",
    ML + 44, y - 5, CW - 60, 7, 10, 2);
  y -= 22;

  // 5d
  checkbox(ctx, ML + 20, y, vSel === "d");
  t(ctx, "d.", ML + 32, y - 5, 8, { bold: true, color: NAVY });
  wrap(ctx, "Where the buyer signed the contract, lives now, or lived when the contract was made, or where the vehicle is permanently garaged, if this claim is about a vehicle finance sale. (Civ. Code, section 2984.4.)",
    ML + 44, y - 5, CW - 60, 7, 10, 2);
  y -= 22;

  // 5e
  checkbox(ctx, ML + 20, y, vSel === "e");
  t(ctx, "e.", ML + 32, y - 5, 8, { bold: true, color: NAVY });
  t(ctx, "Other (specify):", ML + 44, y - 5, 7, { color: GRAY });
  if (c.venueReason) {
    t(ctx, c.venueReason, ML + 138, y - 5, 8, { maxW: CW - 154 });
  }
  hline(ctx, ML + 138, y - 8, CW - 154);
  y -= 16;

  // ── Item 6: Zip code ───────────────────────────────────────────────────────
  hline(ctx, ML, y, CW, 0.8);
  y -= 10;
  bubble(ctx, "6", ML + 8, y + 2);
  t(ctx, "List the zip code of the place checked in 5 above (if you know):", ML + 20, y, 8);
  const zipBoxX = ML + 20 + ctx.reg.widthOfTextAtSize(
    "List the zip code of the place checked in 5 above (if you know):  ", 8) + 10;
  drawRect(ctx, zipBoxX, y - 11, 62, 13, { lw: 0.5 });
  if (c.venueZip) t(ctx, c.venueZip, zipBoxX + 4, y - 8, 8.5);
  y -= 18;

  // ── Item 7: Attorney fee dispute ──────────────────────────────────────────
  hline(ctx, ML, y, CW, 0.8);
  y -= 10;
  bubble(ctx, "7", ML + 8, y + 2);
  t(ctx, "Is your claim about an attorney-client fee dispute?", ML + 20, y, 8);
  const q7x = ML + 20 + ctx.reg.widthOfTextAtSize("Is your claim about an attorney-client fee dispute?  ", 8) + 10;
  checkbox(ctx, q7x, y + 2, c.isAttyFeeDispute === true);
  t(ctx, "Yes", q7x + 12, y - 3, 8);
  checkbox(ctx, q7x + 44, y + 2, c.isAttyFeeDispute === false || !c.isAttyFeeDispute);
  t(ctx, "No", q7x + 56, y - 3, 8);
  y -= 12;
  t(ctx, "If yes, and if you have had arbitration, fill out form SC-101, attach it to this form, and check here:",
    ML + 20, y, 7, { color: GRAY });
  checkbox(ctx, ML + 20 + ctx.reg.widthOfTextAtSize(
    "If yes, and if you have had arbitration, fill out form SC-101, attach it to this form, and check here:  ", 7) + 5,
    y + 2, false);
  y -= 16;

  // ── Item 8: Public entity ──────────────────────────────────────────────────
  hline(ctx, ML, y, CW, 0.8);
  y -= 10;
  bubble(ctx, "8", ML + 8, y + 2);
  t(ctx, "Are you suing a public entity?", ML + 20, y, 8);
  const q8x = ML + 20 + ctx.reg.widthOfTextAtSize("Are you suing a public entity?  ", 8) + 10;
  checkbox(ctx, q8x, y + 2, c.isSuingPublicEntity === true);
  t(ctx, "Yes", q8x + 12, y - 3, 8);
  checkbox(ctx, q8x + 44, y + 2, c.isSuingPublicEntity !== true);
  t(ctx, "No", q8x + 56, y - 3, 8);
  y -= 12;
  t(ctx, "If yes, you must file a written claim with the entity first.  A claim was filed on (date):",
    ML + 20, y, 7.5);
  if (c.isSuingPublicEntity && c.publicEntityClaimFiledDate) {
    const peW = ctx.reg.widthOfTextAtSize(
      "If yes, you must file a written claim with the entity first.  A claim was filed on (date):  ", 7.5);
    drawRect(ctx, ML + 20 + peW + 4, y - 11, 110, 13, { lw: 0.5 });
    t(ctx, c.publicEntityClaimFiledDate, ML + 20 + peW + 8, y - 8, 8);
  }
  y -= 16;

  // Footer
  hline(ctx, ML, 36, CW, 0.5);
  t(ctx, "Rev. January 1, 2026", ML, 26, 6.5, { color: GRAY });
  t(ctx, "Plaintiff's Claim and ORDER to Go to Small Claims Court", PW / 2 - 120, 26, 6.5, { color: GRAY });
  t(ctx, "SC-100, Page 3 of 4", PW - 100, 26, 6.5, { color: GRAY });
}

// ─── Page 4: Items 9, 10, 11, Signature ──────────────────────────────────────
function drawPage4(ctx: Ctx, c: Record<string, any>, caseId: number) {
  watermark(ctx);
  let y = pageHeader(ctx, 4, c.plaintiffName ?? "");
  y -= 6;

  // ── Item 9 ────────────────────────────────────────────────────────────────
  bubble(ctx, "9", ML + 8, y + 2);
  t(ctx, "Have you filed more than 12 other small claims within the last 12 months in California?",
    ML + 20, y, 8);
  y -= 14;
  checkbox(ctx, ML + 20, y, c.filedMoreThan12Claims === true);
  t(ctx, "Yes", ML + 32, y - 5, 8);
  t(ctx, "  If yes, the filing fee for this case will be higher.", ML + 52, y - 5, 7.5);
  y -= 12;
  checkbox(ctx, ML + 20, y, c.filedMoreThan12Claims !== true);
  t(ctx, "No", ML + 32, y - 5, 8);
  y -= 18;

  // ── Item 10 ───────────────────────────────────────────────────────────────
  hline(ctx, ML, y, CW, 0.8);
  y -= 10;
  bubble(ctx, "10", ML + 8, y + 2);
  t(ctx, "Is your claim for more than $2,500?", ML + 20, y, 8);
  const q10x = ML + 20 + ctx.reg.widthOfTextAtSize("Is your claim for more than $2,500?  ", 8) + 10;
  checkbox(ctx, q10x, y + 2, c.claimOver2500 === true);
  t(ctx, "Yes", q10x + 12, y - 3, 8);
  checkbox(ctx, q10x + 44, y + 2, c.claimOver2500 !== true);
  t(ctx, "No", q10x + 56, y - 3, 8);
  y -= 14;
  t(ctx, "If you answer yes, you also confirm that you have not filed, and you understand that you may not file, more than two",
    ML + 20, y, 7.5);
  y -= 11;
  t(ctx, "small claims cases for more than $2,500 in California during this calendar year.",
    ML + 20, y, 7.5);
  y -= 18;

  // ── Item 11 ───────────────────────────────────────────────────────────────
  hline(ctx, ML, y, CW, 0.8);
  y -= 10;
  bubble(ctx, "11", ML + 8, y + 2);
  t(ctx, "I understand that by filing a claim in small claims court, I have no right to appeal this claim.",
    ML + 20, y, 8);
  y -= 22;

  // ── Declaration ───────────────────────────────────────────────────────────
  hline(ctx, ML, y, CW, 1.2);
  y -= 12;
  wrap(ctx,
    "I declare under penalty of perjury under the laws of the State of California that the information above and on any attachments to this form is true and correct.",
    ML, y, CW, 8, 12, 3);
  y -= 36;

  // Signature block – Plaintiff 1
  const sigH = 54;
  const sigW = CW / 2 - 8;
  drawRect(ctx, ML, y - sigH, sigW, sigH, { lw: 0.5 });
  t(ctx, "Date:", ML + 5, y - 9, 7, { color: GRAY });
  hline(ctx, ML + 32, y - 11, sigW - 38);
  hline(ctx, ML + 5, y - 28, sigW - 10, 0.4);
  t(ctx, "Plaintiff types or prints name here", ML + 5, y - 36, 6.5, { color: GRAY });
  t(ctx, c.plaintiffName ?? "", ML + 5, y - 26, 8.5, { maxW: sigW - 14 });
  hline(ctx, ML + 5, y - 48, sigW - 10, 0.4);
  t(ctx, "Plaintiff signs here", ML + 5, y - 56, 6.5, { color: GRAY });

  // Signature block – Plaintiff 2
  drawRect(ctx, ML + sigW + 16, y - sigH, sigW, sigH, { lw: 0.5 });
  t(ctx, "Date:", ML + sigW + 21, y - 9, 7, { color: GRAY });
  hline(ctx, ML + sigW + 48, y - 11, sigW - 38);
  hline(ctx, ML + sigW + 21, y - 28, sigW - 10, 0.4);
  t(ctx, "Second plaintiff types or prints name here", ML + sigW + 21, y - 36, 6.5, { color: GRAY });
  hline(ctx, ML + sigW + 21, y - 48, sigW - 10, 0.4);
  t(ctx, "Second plaintiff signs here", ML + sigW + 21, y - 56, 6.5, { color: GRAY });
  y -= sigH + 14;

  // Accommodations notice
  drawRect(ctx, ML, y - 52, CW, 52, { fill: MGRAY, border: LGRAY });
  t(ctx, "Requests for Accommodations", ML + 8, y - 13, 8, { bold: true, color: NAVY });
  wrap(ctx,
    "Assistive listening systems, computer-assisted real-time captioning, or sign language interpreter services are available if you ask at least five days before the trial. For these and other accommodations, contact the clerk's office for form MC-410, Disability Accommodation Request. (Civ. Code, section 54.8.)",
    ML + 8, y - 26, CW - 16, 7.5, 11, 3);
  y -= 62;

  // Disclaimer box
  y -= 6;
  drawRect(ctx, ML, y - 50, CW, 50, { fill: rgb(1, 0.98, 0.91), border: rgb(0.75, 0.55, 0), lw: 1 });
  t(ctx, "IMPORTANT - DRAFT DOCUMENT PREPARED WITH SMALL CLAIMS GENIE",
    ML + 8, y - 14, 8.5, { bold: true, color: AMBER });
  t(ctx, "Review all information carefully before filing. Obtain the official SC-100 form from courts.ca.gov or your county courthouse.",
    ML + 8, y - 27, 7.5);
  t(ctx, "Small Claims Genie is not a law firm. This document is not legal advice.",
    ML + 8, y - 38, 7.5);
  t(ctx, `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}  |  Case ${caseId}`,
    ML + 8, y - 49, 7, { color: GRAY });

  // Footer
  hline(ctx, ML, 36, CW, 0.5);
  t(ctx, "Rev. January 1, 2026", ML, 26, 6.5, { color: GRAY });
  t(ctx, "Plaintiff's Claim and ORDER to Go to Small Claims Court", PW / 2 - 120, 26, 6.5, { color: GRAY });
  t(ctx, "SC-100, Page 4 of 4", PW - 100, 26, 6.5, { color: GRAY });
}

// ─── Main route ───────────────────────────────────────────────────────────────
router.get("/cases/:id/forms/sc100", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;

  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  try {
    const pdfDoc = await PDFDocument.create();
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const reg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const caseData = c as unknown as Record<string, any>;

    // Page 1
    const p1 = pdfDoc.addPage([PW, PH]);
    drawPage1({ page: p1, bold, reg }, caseData);

    // Page 2
    const p2 = pdfDoc.addPage([PW, PH]);
    drawPage2({ page: p2, bold, reg }, caseData);

    // Page 3
    const p3 = pdfDoc.addPage([PW, PH]);
    drawPage3({ page: p3, bold, reg }, caseData);

    // Page 4
    const p4 = pdfDoc.addPage([PW, PH]);
    drawPage4({ page: p4, bold, reg }, caseData, id);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC100-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("SC-100 PDF generation error:", err?.message ?? err, err?.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate SC-100 PDF. Please try again." });
    }
  }
});

// ─── Preview / data endpoint ──────────────────────────────────────────────────
router.get("/cases/:id/forms/sc100/preview", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;

  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  const caseData = c as unknown as Record<string, any>;
  res.json({
    plaintiffName:              caseData.plaintiffName,
    plaintiffAddress:           [caseData.plaintiffAddress, caseData.plaintiffCity, caseData.plaintiffState, caseData.plaintiffZip].filter(Boolean).join(", "),
    plaintiffPhone:             caseData.plaintiffPhone,
    plaintiffEmail:             caseData.plaintiffEmail,
    defendantName:              caseData.defendantName,
    defendantAddress:           [caseData.defendantAddress, caseData.defendantCity, caseData.defendantState, caseData.defendantZip].filter(Boolean).join(", "),
    defendantPhone:             caseData.defendantPhone,
    defendantIsBusinessOrEntity: caseData.defendantIsBusinessOrEntity,
    defendantAgentName:         caseData.defendantAgentName,
    claimAmount:                caseData.claimAmount,
    claimType:                  caseData.claimType,
    claimDescription:           caseData.claimDescription,
    incidentDate:               caseData.incidentDate,
    howAmountCalculated:        caseData.howAmountCalculated,
    priorDemandMade:            caseData.priorDemandMade,
    priorDemandDescription:     caseData.priorDemandDescription,
    venueBasis:                 caseData.venueBasis,
    venueReason:                caseData.venueReason,
    countyId:                   caseData.countyId,
    isSuingPublicEntity:        caseData.isSuingPublicEntity,
    publicEntityClaimFiledDate: caseData.publicEntityClaimFiledDate,
    isAttyFeeDispute:           caseData.isAttyFeeDispute,
    filedMoreThan12Claims:      caseData.filedMoreThan12Claims,
    claimOver2500:              caseData.claimOver2500,
  });
});

export default router;
