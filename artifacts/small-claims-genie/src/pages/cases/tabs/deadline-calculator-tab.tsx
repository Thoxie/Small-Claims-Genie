import { useMemo } from "react";
import { addDays, addYears, addMonths, differenceInDays, parseISO, isValid, format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, CalendarDays, AlertTriangle, Info, Scale, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HearingInfoCard } from "./intake-tab";
import { STATE_FACTS } from "@workspace/state-facts";

import type { ExtendedCase } from "@/lib/types";

interface Props {
  caseId: number;
  currentCase: ExtendedCase;
}

interface Deadline {
  id: string;
  category: string;
  label: string;
  date: Date | null;
  status: "ok" | "warning" | "urgent" | "overdue" | "info" | "missing";
  detail: string;
  law: string;
}

function parseIncidentDate(raw: string): Date | null {
  if (!raw) return null;
  const parts = raw.split(" – ");
  const candidate = parts.length > 1 ? parts[1].trim() : parts[0].trim();
  const d = new Date(candidate.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2"));
  return isValid(d) ? d : null;
}

function parseHearingDate(raw: string): Date | null {
  if (!raw) return null;
  const d = parseISO(raw);
  return isValid(d) ? d : null;
}

// ── California statute helpers ────────────────────────────────────────────────

function getStatuteYearsCA(claimType: string, _isBusiness: boolean): { years: number; note: string } {
  switch (claimType) {
    case "Property Damage":
      return { years: 3, note: "CCP § 338 — 3-year limit for property damage claims" };
    case "Fraud":
      return { years: 3, note: "CCP § 338(d) — 3-year limit for fraud claims" };
    case "Security Deposit":
      return { years: 4, note: "CCP § 337 — 4-year limit (written lease is a written contract)" };
    case "Contract Dispute":
      return { years: 4, note: "CCP § 337 — 4 years for written contracts; oral contracts are 2 years (CCP § 339)" };
    case "Money Owed":
    case "Unpaid Debt":
      return { years: 4, note: "CCP § 337 — 4 years if based on a written agreement; 2 years if oral only (CCP § 339)" };
    default:
      return { years: 2, note: "CCP § 339 — 2-year default limit. Check if a written contract applies (4 years)" };
  }
}

// ── Florida statute helpers ───────────────────────────────────────────────────

function getStatuteYearsFL(claimType: string): { years: number; note: string } {
  switch (claimType) {
    case "Property Damage":
      return { years: 4, note: "Fla. Stat. § 95.11(3)(a) — 4-year limit for property damage claims" };
    case "Fraud":
      return { years: 4, note: "Fla. Stat. § 95.11(3)(j) — 4-year limit for fraud claims" };
    case "Security Deposit":
      return { years: 5, note: "Fla. Stat. § 95.11(2)(b) — 5 years (written lease is a written contract)" };
    case "Contract Dispute":
      return { years: 5, note: "Fla. Stat. § 95.11(2)(b) — 5 years for written contracts; 4 years for oral contracts (§ 95.11(3)(k))" };
    case "Money Owed":
    case "Unpaid Debt":
      return { years: 5, note: "Fla. Stat. § 95.11(2)(b) — 5 years if based on a written agreement; 4 years if oral only (§ 95.11(3)(k))" };
    case "Personal Injury":
      return { years: 2, note: "Fla. Stat. § 95.11(3)(a) — 2-year limit for personal injury claims" };
    default:
      return { years: 4, note: "Fla. Stat. § 95.11(3)(k) — 4-year default limit for unwritten obligations. Check if a written contract applies (5 years)" };
  }
}


// ── North Carolina statute helpers ───────────────────────────────────────────

function getStatuteYearsNC(claimType: string): { years: number; note: string } {
  switch (claimType) {
    case "Personal Injury":
      return { years: 3, note: "G.S. 1-52(5) — 3-year limit for personal injury claims" };
    case "Property Damage":
      return { years: 3, note: "G.S. 1-52(3) — 3-year limit for property damage claims" };
    case "Fraud":
      return { years: 3, note: "G.S. 1-52(9) — 3-year limit for fraud claims" };
    case "Security Deposit":
      return { years: 3, note: "G.S. 1-52(1) — 3-year limit (written lease is a contract obligation)" };
    case "Contract Dispute":
    case "Money Owed":
    case "Unpaid Debt":
      return { years: 3, note: "G.S. 1-52(1) — 3-year limit for contract and debt claims" };
    default:
      return { years: 3, note: "G.S. 1-52 — 3-year general limit. Most small claims fall under this statute." };
  }
}

// ── Texas statute helpers ─────────────────────────────────────────────────────

function getStatuteYearsTX(claimType: string): { years: number; note: string } {
  switch (claimType) {
    case "Property Damage":
      return { years: 2, note: "Tex. Civ. Prac. & Rem. Code § 16.003 — 2-year limit for property damage claims" };
    case "Personal Injury":
      return { years: 2, note: "Tex. Civ. Prac. & Rem. Code § 16.003 — 2-year limit for personal injury claims" };
    case "Fraud":
      return { years: 4, note: "Tex. Civ. Prac. & Rem. Code § 16.004 — 4-year limit for fraud claims" };
    case "Security Deposit":
      return { years: 4, note: "Tex. Civ. Prac. & Rem. Code § 16.004 — 4-year limit (written lease is a written contract)" };
    case "Contract Dispute":
      return { years: 4, note: "Tex. Civ. Prac. & Rem. Code § 16.004 — 4 years for written contracts; 2 years for oral contracts (§ 16.003)" };
    case "Money Owed":
    case "Unpaid Debt":
      return { years: 4, note: "Tex. Civ. Prac. & Rem. Code § 16.004 — 4 years if based on a written agreement; 2 years if oral only (§ 16.003)" };
    default:
      return { years: 4, note: "Tex. Civ. Prac. & Rem. Code § 16.004 — 4-year default limit. Check if an oral contract applies (2 years under § 16.003)" };
  }
}

// ── Illinois statute helpers ──────────────────────────────────────────────────

function getStatuteYearsIL(claimType: string): { years: number; note: string } {
  switch (claimType) {
    case "Property Damage":
      return { years: 5, note: "735 ILCS 5/13-205 — 5-year limit for property damage claims" };
    case "Personal Injury":
      return { years: 2, note: "735 ILCS 5/13-202 — 2-year limit for personal injury claims" };
    case "Fraud":
      return { years: 5, note: "735 ILCS 5/13-205 — 5-year limit for fraud claims (catch-all civil actions statute)" };
    case "Security Deposit":
      return { years: 10, note: "735 ILCS 5/13-206 — 10-year limit (written lease is a written contract)" };
    case "Contract Dispute":
      return { years: 10, note: "735 ILCS 5/13-206 — 10 years for written contracts; oral contracts are 5 years (735 ILCS 5/13-205)" };
    case "Money Owed":
    case "Unpaid Debt":
      return { years: 10, note: "735 ILCS 5/13-206 — 10 years if based on a written agreement; 5 years if oral only (735 ILCS 5/13-205)" };
    default:
      return { years: 5, note: "735 ILCS 5/13-205 — 5-year default limit for civil actions not otherwise specified. Check if a written contract applies (10 years under 735 ILCS 5/13-206)" };
  }
}

// ── Virginia statute helpers ──────────────────────────────────────────────────

function getStatuteYearsVA(claimType: string): { years: number; note: string } {
  switch (claimType) {
    case "Property Damage":
      return { years: 5, note: "Va. Code § 8.01-243(B) — 5-year limit for property damage claims" };
    case "Personal Injury":
      return { years: 2, note: "Va. Code § 8.01-243(A) — 2-year limit for personal injury claims" };
    case "Fraud":
      return { years: 2, note: "Va. Code § 8.01-243(A) — 2-year limit for fraud claims" };
    case "Security Deposit":
      return { years: 5, note: "Va. Code § 8.01-246(A)(2) — 5-year limit (written lease is a written contract)" };
    case "Contract Dispute":
      return { years: 5, note: "Va. Code § 8.01-246(A)(2) — 5 years for written contracts; 3 years for oral contracts (§ 8.01-246(A)(4))" };
    case "Money Owed":
    case "Unpaid Debt":
      return { years: 5, note: "Va. Code § 8.01-246(A)(2) — 5 years if based on a written agreement; 3 years if oral only (§ 8.01-246(A)(4))" };
    default:
      return { years: 3, note: "Va. Code § 8.01-246(A)(4) — 3-year default limit for oral obligations. Check if a written contract applies (5 years under § 8.01-246(A)(2))" };
  }
}

// ── New Jersey statute helpers ────────────────────────────────────────────────

function getStatuteYearsNJ(claimType: string): { years: number; note: string } {
  switch (claimType) {
    case "Property Damage":
      return { years: 6, note: "N.J.S.A. 2A:14-1 — 6-year limit for property damage claims" };
    case "Personal Injury":
      return { years: 2, note: "N.J.S.A. 2A:14-2 — 2-year limit for personal injury claims" };
    case "Fraud":
      return { years: 6, note: "N.J.S.A. 2A:14-1 — 6-year limit for fraud claims" };
    case "Security Deposit":
      return { years: 6, note: "N.J.S.A. 2A:14-1 — 6-year limit (written lease is a written contract)" };
    case "Contract Dispute":
    case "Money Owed":
    case "Unpaid Debt":
      return { years: 6, note: "N.J.S.A. 2A:14-1 — 6-year limit for written and oral contract claims" };
    default:
      return { years: 6, note: "N.J.S.A. 2A:14-1 — 6-year default limit for contract and property claims. Personal injury claims have a shorter 2-year limit (N.J.S.A. 2A:14-2)" };
  }
}

// ── Washington statute helpers ────────────────────────────────────────────────

function getStatuteYearsWA(claimType: string): { years: number; note: string } {
  switch (claimType) {
    case "Property Damage":
      return { years: 3, note: "RCW 4.16.080 — 3-year limit for property damage claims" };
    case "Personal Injury":
      return { years: 3, note: "RCW 4.16.080 — 3-year limit for personal injury claims" };
    case "Fraud":
      return { years: 3, note: "RCW 4.16.080(4) — 3-year limit for fraud claims (discovery rule may apply)" };
    case "Security Deposit":
      return { years: 6, note: "RCW 4.16.040 — 6-year limit (written lease is a written contract)" };
    case "Contract Dispute":
      return { years: 6, note: "RCW 4.16.040 — 6 years for written contracts; 3 years for oral contracts (RCW 4.16.080)" };
    case "Money Owed":
    case "Unpaid Debt":
      return { years: 6, note: "RCW 4.16.040 — 6 years if based on a written agreement; 3 years if oral only (RCW 4.16.080)" };
    default:
      return { years: 3, note: "RCW 4.16.080 — 3-year default limit for actions not otherwise provided. Check if a written contract applies (6 years under RCW 4.16.040)" };
  }
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function statusColor(s: Deadline["status"]) {
  switch (s) {
    case "ok": return "border-green-200 bg-green-50";
    case "warning": return "border-yellow-200 bg-yellow-50";
    case "urgent": return "border-orange-200 bg-orange-50";
    case "overdue": return "border-red-200 bg-red-50";
    case "info": return "border-blue-100 bg-blue-50";
    case "missing": return "border-gray-200 bg-gray-50";
  }
}

function statusIcon(s: Deadline["status"]) {
  switch (s) {
    case "ok": return <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
    case "warning": return <Clock className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />;
    case "urgent": return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />;
    case "overdue": return <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
    case "info": return <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />;
    case "missing": return <CalendarDays className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />;
  }
}

function labelColor(s: Deadline["status"]) {
  switch (s) {
    case "ok": return "text-green-700";
    case "warning": return "text-yellow-700";
    case "urgent": return "text-orange-700";
    case "overdue": return "text-red-700";
    case "info": return "text-blue-700";
    case "missing": return "text-gray-500";
  }
}

function getDeadlineStatus(date: Date | null, today: Date): Deadline["status"] {
  if (!date) return "missing";
  const diff = differenceInDays(date, today);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "urgent";
  if (diff <= 30) return "warning";
  return "ok";
}

function daysLabel(date: Date | null, today: Date): string {
  if (!date) return "";
  const diff = differenceInDays(date, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `${diff} days from now`;
}

function printDeadlines(deadlines: Deadline[], caseName: string, today: Date, stateAbbr: string) {
  const rows = deadlines.map(d => {
    const dateStr = d.date ? format(d.date, "MMMM d, yyyy") : "—";
    const daysStr = d.date ? daysLabel(d.date, today) : "";
    const statusLabel = d.status === "overdue" ? "⚠️ PAST DEADLINE" : d.status === "urgent" ? "🔴 URGENT" : d.status === "warning" ? "🟡 Coming up" : d.status === "ok" ? "✅ OK" : d.status === "missing" ? "❓ Date needed" : "ℹ️ Info";
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111;font-size:13px">${d.label}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111;font-size:13px">${dateStr}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#666;font-size:12px">${daysStr}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:11px">${statusLabel}</td></tr><tr><td colspan="4" style="padding:4px 12px 10px;color:#555;font-size:11px;border-bottom:1px solid #f3f4f6">${d.detail} <span style="color:#9ca3af">(${d.law})</span></td></tr>`;
  }).join("");

  const courtLink = stateAbbr === "FL"
    ? `Florida courts: <a href="https://www.flcourts.gov" target="_blank">flcourts.gov</a>`
    : stateAbbr === "TX"
    ? `Texas courts: <a href="https://www.txcourts.gov" target="_blank">txcourts.gov</a>`
    : stateAbbr === "NC"
    ? `NC courts: <a href="https://www.nccourts.gov" target="_blank">nccourts.gov</a>`
    : stateAbbr === "IL"
    ? `Illinois courts: <a href="${STATE_FACTS.IL.selfHelpUrl}" target="_blank">${STATE_FACTS.IL.selfHelpLabel}</a>`
    : stateAbbr === "VA"
    ? `Virginia courts: <a href="${STATE_FACTS.VA.selfHelpUrl}" target="_blank">${STATE_FACTS.VA.selfHelpLabel}</a>`
    : stateAbbr === "NJ"
    ? `NJ courts: <a href="${STATE_FACTS.NJ.selfHelpUrl}" target="_blank">${STATE_FACTS.NJ.selfHelpLabel}</a>`
    : stateAbbr === "WA"
    ? `WA courts: <a href="${STATE_FACTS.WA.selfHelpUrl}" target="_blank">${STATE_FACTS.WA.selfHelpLabel}</a>`
    : `California courts: <a href="https://www.courts.ca.gov" target="_blank">courts.ca.gov</a>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Deadline Calculator — ${caseName}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111;padding:0 20px}h1{color:#0d6b5e;font-size:22px;margin-bottom:4px}.sub{color:#666;font-size:13px;margin-bottom:28px}table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}th{background:#0d6b5e;color:white;padding:10px 12px;text-align:left;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}.footer{margin-top:24px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}.print-btn{margin-top:24px;padding:10px 24px;background:#0d6b5e;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer}@media print{.print-btn{display:none}}</style></head><body><h1>🗓️ Deadline Calculator</h1><p class="sub">${caseName} — Generated ${format(today, "MMMM d, yyyy")} via Small Claims Genie</p><table><thead><tr><th>Deadline</th><th>Date</th><th>Time Left</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">This calculator is for informational purposes only. Verify all deadlines with your specific court or a licensed attorney. County-specific rules may apply. ${courtLink}</div><button class="print-btn" onclick="window.print()">Print / Save as PDF</button><script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

// ── Florida deadline builder ───────────────────────────────────────────────────

function buildFlDeadlines(
  incidentDate: Date | null,
  hearingDate: Date | null,
  filingDate: Date | null,
  claimType: string,
  today: Date,
): Deadline[] {
  const list: Deadline[] = [];

  // Statute of limitations
  const { years, note } = getStatuteYearsFL(claimType);
  const solDate = incidentDate ? addYears(incidentDate, years) : null;
  list.push({
    id: "sol",
    category: "Statute of Limitations",
    label: `File your case by (${years}-year limit)`,
    date: solDate,
    status: solDate ? getDeadlineStatus(solDate, today) : "missing",
    detail: note,
    law: `Fla. Stat. § 95.11`,
  });

  // Pretrial conference — within 50 days of filing
  const pretrial50 = filingDate ? addDays(filingDate, 50) : null;
  list.push({
    id: "pretrial",
    category: "Pretrial Conference",
    label: "Pretrial conference must be set by (50-day window)",
    date: pretrial50,
    status: pretrial50 ? getDeadlineStatus(pretrial50, today) : "missing",
    detail: filingDate
      ? `The court must schedule your pretrial conference within 50 days of filing (${format(filingDate, "MMMM d, yyyy")}). Both parties must appear. Mediation is commonly offered at this conference — bring full authority to settle.`
      : "Enter your filing date to calculate this deadline. The pretrial conference must be set within 50 days of the date you file.",
    law: "Fla. Sm. Cl. R. 7.090(a)",
  });

  // Service deadline — 5 days before pretrial conference
  // If we have hearingDate as the trial date, we need the pretrial date.
  // We'll use the hearing date as the trial date, and note pretrial is ≤60 days before trial.
  // Best we can do: show service deadline relative to pretrial50 date.
  const serviceDeadline = pretrial50 ? addDays(pretrial50, -5) : null;
  list.push({
    id: "service",
    category: "Service of Process",
    label: "File proof of service by (5 days before pretrial)",
    date: serviceDeadline,
    status: serviceDeadline ? getDeadlineStatus(serviceDeadline, today) : "missing",
    detail: "Proof of service (Affidavit of Service) must be filed with the court clerk at least 5 days before the pretrial conference. Service may be completed by the county sheriff, certified process server, or certified mail (FL residents only).",
    law: "Fla. Sm. Cl. R. 7.070",
  });

  // Trial — within 60 days of pretrial
  // Use hearingDate as trial date if available; otherwise estimate from pretrial
  const trialDate = hearingDate ?? (pretrial50 ? addDays(pretrial50, 60) : null);
  const trialLabel = hearingDate ? "Trial / hearing date" : "Trial must be set by (60 days after pretrial)";
  list.push({
    id: "trial",
    category: "Trial",
    label: trialLabel,
    date: trialDate,
    status: hearingDate ? getDeadlineStatus(trialDate, today) : "info",
    detail: hearingDate
      ? `Your trial is scheduled for ${format(trialDate!, "MMMM d, yyyy")}. Arrive early, bring organized evidence, and prepare a short statement of your claim.`
      : "Trial must be set within 60 days of the pretrial conference. Enter your hearing date in the Intake tab once you receive it from the court.",
    law: "Fla. Sm. Cl. R. 7.090(a)",
  });

  // Appeal window
  list.push({
    id: "appeal",
    category: "After the Hearing",
    label: "Appeal window (if you lose)",
    date: null,
    status: "info",
    detail: "If the judge rules against you, you have 30 days from the date of judgment to file a Notice of Appeal with the circuit court. Filing the appeal does not stop enforcement of the judgment unless the court grants a stay.",
    law: "Fla. Sm. Cl. R. 7.180",
  });

  // Post-judgment collection
  list.push({
    id: "collection",
    category: "After the Hearing",
    label: "Judgment valid for 20 years",
    date: null,
    status: "info",
    detail: "Florida judgments are valid for 20 years. If the defendant does not pay, you can use wage garnishment, bank levy, writ of execution, or judgment lien certificate to collect. File the Fact Information Sheet (Form 7.343) to compel disclosure of the defendant's assets.",
    law: "Fla. Stat. § 55.081",
  });

  return list;
}

// ── Texas deadline builder ───────────────────────────────────────────────────

function buildTxDeadlines(
  incidentDate: Date | null,
  hearingDate: Date | null,
  claimType: string,
  today: Date,
): Deadline[] {
  const list: Deadline[] = [];

  // Statute of limitations
  const { years, note } = getStatuteYearsTX(claimType);
  const solDate = incidentDate ? addYears(incidentDate, years) : null;
  list.push({
    id: "sol",
    category: "Statute of Limitations",
    label: `File your case by (${years}-year limit)`,
    date: solDate,
    status: solDate ? getDeadlineStatus(solDate, today) : "missing",
    detail: note,
    law: years === 2 ? "Tex. Civ. Prac. & Rem. Code § 16.003" : "Tex. Civ. Prac. & Rem. Code § 16.004",
  });

  // Service deadline — at least 6 days before the hearing
  const serviceDeadline = hearingDate ? addDays(hearingDate, -6) : null;
  list.push({
    id: "service",
    category: "Service of Process",
    label: "Serve the defendant by (6 days before hearing)",
    date: serviceDeadline,
    status: serviceDeadline ? getDeadlineStatus(serviceDeadline, today) : "missing",
    detail: "In Texas JP court, the defendant must be served at least 6 days before the hearing date. Service is typically completed by a constable or private process server. Once served, the defendant must file an answer by 10 a.m. on the Monday next following 10 days after service.",
    law: "Tex. R. Civ. P. 506.4(b)",
  });

  // Hearing date
  if (hearingDate) {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Hearing date",
      date: hearingDate,
      status: getDeadlineStatus(hearingDate, today),
      detail: `Your hearing is scheduled for ${format(hearingDate, "MMMM d, yyyy")}. Arrive early, bring all originals of your evidence, and prepare a brief statement. The JP judge will allow both sides to speak.`,
      law: "Tex. R. Civ. P. 506.4",
    });
  } else {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Hearing date (not yet entered)",
      date: null,
      status: "missing",
      detail: "Enter your hearing date in the Intake tab once the court schedules it. JP courts in Texas typically schedule hearings 20–45 days after the petition is filed.",
      law: "Tex. R. Civ. P. 506.4",
    });
  }

  // Appeal window — 21 days from judgment
  list.push({
    id: "appeal",
    category: "After the Hearing",
    label: "Appeal window (if you lose)",
    date: null,
    status: "info",
    detail: "If the JP judge rules against you, you have 21 days from the date of judgment to file a notice of appeal to the county court at law. The appeal is a de novo (fresh) trial. You must pay the filing fee or request a fee waiver.",
    law: "Tex. R. Civ. P. 506.1",
  });

  // Judgment enforcement
  list.push({
    id: "collection",
    category: "After the Hearing",
    label: "Judgment valid for 10 years",
    date: null,
    status: "info",
    detail: "Texas judgments are valid for 10 years and can be renewed. If the defendant does not pay voluntarily, you may use a writ of execution, wage garnishment (for child support only in TX — general wage garnishment is not available), or abstract of judgment to place a lien on real property.",
    law: "Tex. Civ. Prac. & Rem. Code § 34.001",
  });

  return list;
}

// ── North Carolina deadline builder ──────────────────────────────────────────

function buildNcDeadlines(
  incidentDate: Date | null,
  hearingDate: Date | null,
  claimType: string,
  today: Date,
): Deadline[] {
  const list: Deadline[] = [];

  // Statute of limitations
  const { years, note } = getStatuteYearsNC(claimType);
  const solDate = incidentDate ? addYears(incidentDate, years) : null;
  list.push({
    id: "sol",
    category: "Statute of Limitations",
    label: `File your case by (${years}-year limit)`,
    date: solDate,
    status: solDate ? getDeadlineStatus(solDate, today) : "missing",
    detail: note,
    law: "G.S. 1-52",
  });

  // Hearing set by magistrate — within ~30 days of filing
  if (hearingDate) {
    list.push({
      id: "hearing",
      category: "Hearing",
      label: "Magistrate hearing date",
      date: hearingDate,
      status: getDeadlineStatus(hearingDate, today),
      detail: `Your hearing is scheduled for ${format(hearingDate, "MMMM d, yyyy")}. The magistrate sets the date — typically within 30 days of filing. Arrive early and bring organized evidence. Both parties are allowed to speak.`,
      law: "G.S. 7A-220",
    });
  } else {
    list.push({
      id: "hearing",
      category: "Hearing",
      label: "Magistrate hearing date (not yet entered)",
      date: null,
      status: "missing",
      detail: "In NC small claims (magistrate) court, the court clerk schedules the hearing when you file — typically within 30 days. Enter your hearing date in the Intake tab once you receive the notice.",
      law: "G.S. 7A-220",
    });
  }

  // Service — sheriff handles automatically; no plaintiff service deadline
  list.push({
    id: "service",
    category: "Service of Process",
    label: "Sheriff serves the defendant (automatic)",
    date: null,
    status: "info",
    detail: "In NC small claims court, you do not arrange service yourself. The county sheriff's office is responsible for serving the defendant after you file and pay the service fee. There is no separate plaintiff-driven service deadline — just ensure the case is filed with enough lead time before the hearing.",
    law: "G.S. 7A-217; G.S. 1A-1, Rule 4",
  });

  // Appeal window — 30 days for trial de novo in district court
  list.push({
    id: "appeal",
    category: "After the Hearing",
    label: "Appeal window — 30 days for trial de novo",
    date: null,
    status: "info",
    detail: "If the magistrate rules against you, either party has 30 days from the date of judgment to appeal to NC District Court for a trial de novo (a completely fresh trial). File a Notice of Appeal with the clerk of court and pay the appeal bond or request a waiver.",
    law: "G.S. 7A-228",
  });

  // Judgment enforcement
  list.push({
    id: "collection",
    category: "After the Hearing",
    label: "Judgment valid for 10 years",
    date: null,
    status: "info",
    detail: "NC judgments are valid for 10 years from docketing and can be renewed (docketed anew) before expiration. Post-judgment interest accrues at the legal rate under G.S. 24-1 (currently 8% per year). If the defendant does not pay, you may pursue wage garnishment, writ of execution, or docket a judgment lien against real property.",
    law: "G.S. 1-234; G.S. 24-1",
  });

  return list;
}

// ── Illinois deadline builder ─────────────────────────────────────────────────

function buildIlDeadlines(
  incidentDate: Date | null,
  hearingDate: Date | null,
  claimType: string,
  today: Date,
): Deadline[] {
  const list: Deadline[] = [];
  const facts = STATE_FACTS.IL;

  // Statute of limitations
  const { years, note } = getStatuteYearsIL(claimType);
  const solDate = incidentDate ? addYears(incidentDate, years) : null;
  list.push({
    id: "sol",
    category: "Statute of Limitations",
    label: `File your case by (${years}-year limit)`,
    date: solDate,
    status: solDate ? getDeadlineStatus(solDate, today) : "missing",
    detail: note,
    law: facts.statuteOfLimitationsCitation ?? "735 ILCS 5/13-201 et seq.",
  });

  // Service — plaintiff arranges, at least 3 days before the return date
  const serviceDeadline = hearingDate ? addDays(hearingDate, -3) : null;
  list.push({
    id: "service",
    category: "Service of Process",
    label: "Serve the defendant by (3 days before return date)",
    date: serviceDeadline,
    status: serviceDeadline ? getDeadlineStatus(serviceDeadline, today) : "missing",
    detail: `In Illinois small claims, the plaintiff arranges service — the court does not serve the defendant automatically. ${facts.serviceMethodsText}. The defendant must be served ${facts.serviceDeadlineText}.`,
    law: "735 ILCS 5/2-203",
  });

  // Hearing / return date
  if (hearingDate) {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Return date / hearing date",
      date: hearingDate,
      status: getDeadlineStatus(hearingDate, today),
      detail: `Your hearing (return date) is scheduled for ${format(hearingDate, "MMMM d, yyyy")}. Arrive early, bring organized evidence, and prepare a short statement of your claim.`,
      law: "735 ILCS 5/2-201",
    });
  } else {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Return date / hearing date (not yet entered)",
      date: null,
      status: "missing",
      detail: "Enter your hearing date in the Intake tab once the Circuit Court clerk assigns a return date.",
      law: "735 ILCS 5/2-201",
    });
  }

  // Appeal window
  list.push({
    id: "appeal",
    category: "After the Hearing",
    label: "Appeal window (if you lose)",
    date: null,
    status: "info",
    detail: facts.appealNote,
    law: "Ill. S. Ct. R. 303",
  });

  // Post-judgment collection
  list.push({
    id: "collection",
    category: "After the Hearing",
    label: `Judgment valid for ${facts.judgmentValidityYears} years`,
    date: null,
    status: "info",
    detail: `Illinois judgments are valid for ${facts.judgmentValidityYears} years and can be renewed. If the defendant does not pay, you can use ${facts.collectionToolsText}.`,
    law: "735 ILCS 5/12-108",
  });

  return list;
}

// ── Virginia deadline builder ─────────────────────────────────────────────────

function buildVaDeadlines(
  incidentDate: Date | null,
  hearingDate: Date | null,
  claimType: string,
  today: Date,
): Deadline[] {
  const list: Deadline[] = [];
  const facts = STATE_FACTS.VA;

  // Statute of limitations
  const { years, note } = getStatuteYearsVA(claimType);
  const solDate = incidentDate ? addYears(incidentDate, years) : null;
  list.push({
    id: "sol",
    category: "Statute of Limitations",
    label: `File your case by (${years}-year limit)`,
    date: solDate,
    status: solDate ? getDeadlineStatus(solDate, today) : "missing",
    detail: note,
    law: facts.statuteOfLimitationsCitation ?? "Va. Code § 8.01-243 et seq.",
  });

  // Service — at least 5 days before the hearing
  const serviceDeadline = hearingDate ? addDays(hearingDate, -5) : null;
  list.push({
    id: "service",
    category: "Service of Process",
    label: "Serve the defendant by (5 days before hearing)",
    date: serviceDeadline,
    status: serviceDeadline ? getDeadlineStatus(serviceDeadline, today) : "missing",
    detail: `In Virginia's Small Claims Division, the defendant must be served ${facts.serviceDeadlineText}. ${facts.serviceMethodsText}.`,
    law: facts.serviceOfProcessCitation ?? "Va. Code § 17.1-272",
  });

  // Hearing date
  if (hearingDate) {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Hearing date",
      date: hearingDate,
      status: getDeadlineStatus(hearingDate, today),
      detail: `Your hearing is scheduled for ${format(hearingDate, "MMMM d, yyyy")}. Attorneys are not allowed to represent either side in the Small Claims Division — arrive early and bring organized evidence.`,
      law: "Va. Code § 16.1-122.2",
    });
  } else {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Hearing date (not yet entered)",
      date: null,
      status: "missing",
      detail: "Enter your hearing date in the Intake tab once the General District Court clerk schedules it.",
      law: "Va. Code § 16.1-122.2",
    });
  }

  // Appeal window
  list.push({
    id: "appeal",
    category: "After the Hearing",
    label: "Appeal window (if you lose)",
    date: null,
    status: "info",
    detail: facts.appealNote,
    law: "Va. Code § 16.1-106",
  });

  // Post-judgment collection
  list.push({
    id: "collection",
    category: "After the Hearing",
    label: `Judgment valid for ${facts.judgmentValidityYears} years`,
    date: null,
    status: "info",
    detail: `Virginia GDC judgments are valid for ${facts.judgmentValidityYears} years. If the defendant does not pay, you can use ${facts.collectionToolsText}.`,
    law: "Va. Code § 16.1-94.1",
  });

  return list;
}

// ── New Jersey deadline builder ───────────────────────────────────────────────

function buildNjDeadlines(
  incidentDate: Date | null,
  hearingDate: Date | null,
  claimType: string,
  today: Date,
): Deadline[] {
  const list: Deadline[] = [];
  const facts = STATE_FACTS.NJ;

  // Statute of limitations
  const { years, note } = getStatuteYearsNJ(claimType);
  const solDate = incidentDate ? addYears(incidentDate, years) : null;
  list.push({
    id: "sol",
    category: "Statute of Limitations",
    label: `File your case by (${years}-year limit)`,
    date: solDate,
    status: solDate ? getDeadlineStatus(solDate, today) : "missing",
    detail: note,
    law: facts.statuteOfLimitationsCitation ?? "N.J.S.A. 2A:14-1",
  });

  // Service — court mails the summons automatically; no plaintiff-driven deadline
  list.push({
    id: "service",
    category: "Service of Process",
    label: "Court mails the summons (automatic)",
    date: null,
    status: "info",
    detail: `In NJ's Small Claims Section, you do not arrange service yourself. ${facts.serviceMethodsText}. The defendant must be served ${facts.serviceDeadlineText}.`,
    law: facts.serviceOfProcessCitation ?? "N.J. Ct. R. 6:2-1",
  });

  // Hearing date
  if (hearingDate) {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Hearing date",
      date: hearingDate,
      status: getDeadlineStatus(hearingDate, today),
      detail: `Your hearing is scheduled for ${format(hearingDate, "MMMM d, yyyy")}. Arrive early, bring organized evidence, and prepare a short statement of your claim.`,
      law: "N.J. Ct. R. 6:1-2",
    });
  } else {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Hearing date (not yet entered)",
      date: null,
      status: "missing",
      detail: "Enter your hearing date in the Intake tab once the Special Civil Part clerk schedules it.",
      law: "N.J. Ct. R. 6:1-2",
    });
  }

  // Appeal window
  list.push({
    id: "appeal",
    category: "After the Hearing",
    label: "Appeal window (if you lose)",
    date: null,
    status: "info",
    detail: facts.appealNote,
    law: "N.J. Ct. R. 2:4-1",
  });

  // Post-judgment collection
  list.push({
    id: "collection",
    category: "After the Hearing",
    label: `Judgment valid for ${facts.judgmentValidityYears} years`,
    date: null,
    status: "info",
    detail: `NJ judgments are valid for ${facts.judgmentValidityYears} years. If the defendant does not pay, you can use ${facts.collectionToolsText}.`,
    law: "N.J.S.A. 2A:14-5",
  });

  return list;
}

// ── Washington deadline builder ───────────────────────────────────────────────

function buildWaDeadlines(
  incidentDate: Date | null,
  hearingDate: Date | null,
  claimType: string,
  today: Date,
): Deadline[] {
  const list: Deadline[] = [];
  const facts = STATE_FACTS.WA;

  // Statute of limitations
  const { years, note } = getStatuteYearsWA(claimType);
  const solDate = incidentDate ? addYears(incidentDate, years) : null;
  list.push({
    id: "sol",
    category: "Statute of Limitations",
    label: `File your case by (${years}-year limit)`,
    date: solDate,
    status: solDate ? getDeadlineStatus(solDate, today) : "missing",
    detail: note,
    law: facts.statuteOfLimitationsCitation ?? "RCW 4.16.040; RCW 4.16.080",
  });

  // Service — at least 10 days before the hearing
  const serviceDeadline = hearingDate ? addDays(hearingDate, -10) : null;
  list.push({
    id: "service",
    category: "Service of Process",
    label: "Serve the defendant by (10 days before hearing)",
    date: serviceDeadline,
    status: serviceDeadline ? getDeadlineStatus(serviceDeadline, today) : "missing",
    detail: `In WA Small Claims Department, the defendant must be served ${facts.serviceDeadlineText}. ${facts.serviceMethodsText}.`,
    law: facts.serviceOfProcessCitation ?? "RCW 12.40.030",
  });

  // Hearing date
  if (hearingDate) {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Hearing date",
      date: hearingDate,
      status: getDeadlineStatus(hearingDate, today),
      detail: `Your hearing is scheduled for ${format(hearingDate, "MMMM d, yyyy")}. Attorneys are not allowed to represent either side in WA small claims — arrive early and bring organized evidence.`,
      law: "RCW 12.40.080",
    });
  } else {
    list.push({
      id: "trial",
      category: "Hearing",
      label: "Hearing date (not yet entered)",
      date: null,
      status: "missing",
      detail: "Enter your hearing date in the Intake tab once the District Court clerk schedules it.",
      law: "RCW 12.40.080",
    });
  }

  // Appeal window
  list.push({
    id: "appeal",
    category: "After the Hearing",
    label: "Appeal window (if you lose)",
    date: null,
    status: "info",
    detail: facts.appealNote,
    law: "RALJ 2.5",
  });

  // Post-judgment collection
  list.push({
    id: "collection",
    category: "After the Hearing",
    label: `Judgment valid for ${facts.judgmentValidityYears} years`,
    date: null,
    status: "info",
    detail: `WA judgments are valid for ${facts.judgmentValidityYears} years and may be renewed. If the defendant does not pay, you can use ${facts.collectionToolsText}.`,
    law: "RCW 6.17.020",
  });

  return list;
}

// ── California deadline builder ───────────────────────────────────────────────

function buildCaDeadlines(
  incidentDate: Date | null,
  hearingDate: Date | null,
  isBusiness: boolean,
  isSuingPublic: boolean,
  claimType: string,
  today: Date,
): Deadline[] {
  const list: Deadline[] = [];

  if (isSuingPublic) {
    const solDate = incidentDate ? addMonths(incidentDate, 6) : null;
    const status = getDeadlineStatus(solDate, today);
    list.push({
      id: "govt-claim",
      category: "Statute of Limitations",
      label: "Government Tort Claim filing deadline",
      date: solDate,
      status: solDate ? status : "missing",
      detail: "Before suing a government entity, you must first file a Government Tort Claim within 6 months of the incident. You have 6 months after rejection (or 2 years if no response) to then file your court case.",
      law: "Gov. Code § 912.4",
    });
  } else {
    const { years, note } = getStatuteYearsCA(claimType, isBusiness);
    const solDate = incidentDate ? addYears(incidentDate, years) : null;
    const status = getDeadlineStatus(solDate, today);
    list.push({
      id: "sol",
      category: "Statute of Limitations",
      label: `File your case by (${years}-year limit)`,
      date: solDate,
      status: solDate ? status : "missing",
      detail: note,
      law: years === 4 ? "CCP § 337" : years === 3 ? "CCP § 338" : "CCP § 339",
    });
  }

  const serviceWindow = isSuingPublic ? 30 : 15;
  const serviceNote = isSuingPublic
    ? "Government entities must be served at least 30 days before the hearing."
    : "Defendants within California must be served at least 15 days before the hearing date. If outside California, serve at least 20 days in advance.";
  const serviceDeadline = hearingDate ? addDays(hearingDate, -serviceWindow) : null;
  const serviceStatus = getDeadlineStatus(serviceDeadline, today);
  list.push({
    id: "service",
    category: "Service of Process",
    label: `Serve the defendant by (last day)`,
    date: serviceDeadline,
    status: serviceDeadline ? serviceStatus : "missing",
    detail: serviceNote,
    law: "CCP § 116.340",
  });

  if (hearingDate) {
    list.push({
      id: "hearing-rule",
      category: "Hearing Scheduling",
      label: isBusiness ? "Business/entity 70-day rule" : "Individual 30-day rule",
      date: hearingDate,
      status: "info",
      detail: isBusiness
        ? `Because the defendant is a business or entity, the hearing must be scheduled at least 70 days after you file. Your hearing is set for ${format(hearingDate, "MMMM d, yyyy")}.`
        : `For individual defendants, the hearing must be at least 30 days after filing. Your hearing is set for ${format(hearingDate, "MMMM d, yyyy")}.`,
      law: isBusiness ? "CCP § 116.330(b)" : "CCP § 116.330(a)",
    });
  } else {
    list.push({
      id: "hearing-rule",
      category: "Hearing Scheduling",
      label: isBusiness ? "Business/entity 70-day rule" : "Individual 30-day rule",
      date: null,
      status: "missing",
      detail: isBusiness
        ? "Because the defendant is a business or entity, your hearing must be scheduled at least 70 days after you file. Enter your hearing date in the Intake tab to check compliance."
        : "For individual defendants, the hearing must be at least 30 days after filing. Enter your hearing date in the Intake tab to see your full timeline.",
      law: isBusiness ? "CCP § 116.330(b)" : "CCP § 116.330(a)",
    });
  }

  list.push({
    id: "appeal",
    category: "After the Hearing",
    label: "Appeal window (if you lose)",
    date: null,
    status: "info",
    detail: "If the judge rules against you, you have 30 days from the date of judgment to file a Notice of Appeal (SC-140) with the court clerk. The appeal fee is typically $75–$225.",
    law: "CCP § 116.710",
  });

  list.push({
    id: "defendant-response",
    category: "After the Hearing",
    label: "Defendant's right to pay or respond",
    date: null,
    status: "info",
    detail: "After you win, the defendant has 30 days to pay the judgment or request a payment hearing. If they don't pay, you can pursue wage garnishment or bank levies.",
    law: "CCP § 116.810",
  });

  return list;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DeadlineCalculatorTab({ caseId, currentCase }: Props) {
  const today = useMemo(() => new Date(), []);
  const isFL = currentCase.jurisdictionState === "FL";
  const isTX = currentCase.jurisdictionState === "TX";
  const isNC = (currentCase.jurisdictionState as string) === "NC";
  const isIL = (currentCase.jurisdictionState as string) === "IL";
  const isVA = (currentCase.jurisdictionState as string) === "VA";
  const isNJ = (currentCase.jurisdictionState as string) === "NJ";
  const isWA = (currentCase.jurisdictionState as string) === "WA";

  const incidentDate = useMemo(() => parseIncidentDate(currentCase.incidentDate || ""), [currentCase.incidentDate]);
  const hearingDate = useMemo(() => parseHearingDate(currentCase.hearingDate || ""), [currentCase.hearingDate]);
  // Use case createdAt as a proxy for filing date for FL pretrial window calculation
  const filingDate = useMemo(() => {
    if (!currentCase.createdAt) return null;
    const d = parseISO(currentCase.createdAt);
    return isValid(d) ? d : null;
  }, [currentCase.createdAt]);

  const isBusiness = !!(currentCase.defendantIsBusinessOrEntity);
  const isSuingPublic = !!(currentCase.isSuingPublicEntity);
  const claimType = currentCase.claimType || "";
  const plaintiffName = currentCase.plaintiffName || "Plaintiff";
  const defendantName = currentCase.defendantName || "Defendant";
  const caseName = `${plaintiffName} v. ${defendantName}`;

  const deadlines: Deadline[] = useMemo(() => {
    if (isFL) {
      return buildFlDeadlines(incidentDate, hearingDate, filingDate, claimType, today);
    }
    if (isTX) {
      return buildTxDeadlines(incidentDate, hearingDate, claimType, today);
    }
    if (isNC) {
      return buildNcDeadlines(incidentDate, hearingDate, claimType, today);
    }
    if (isIL) {
      return buildIlDeadlines(incidentDate, hearingDate, claimType, today);
    }
    if (isVA) {
      return buildVaDeadlines(incidentDate, hearingDate, claimType, today);
    }
    if (isNJ) {
      return buildNjDeadlines(incidentDate, hearingDate, claimType, today);
    }
    if (isWA) {
      return buildWaDeadlines(incidentDate, hearingDate, claimType, today);
    }
    return buildCaDeadlines(incidentDate, hearingDate, isBusiness, isSuingPublic, claimType, today);
  }, [isFL, isTX, isNC, isIL, isVA, isNJ, isWA, incidentDate, hearingDate, filingDate, isBusiness, isSuingPublic, claimType, today]);

  const categories = [...new Set(deadlines.map(d => d.category))];

  const urgentCount = deadlines.filter(d => d.status === "urgent" || d.status === "overdue").length;
  const missingCount = deadlines.filter(d => d.status === "missing").length;

  const stateLabel = isFL ? "Florida" : isTX ? "Texas" : isNC ? "North Carolina" : isIL ? "Illinois" : isVA ? "Virginia" : isNJ ? "New Jersey" : isWA ? "Washington" : "California";
  const stateAbbr = isFL ? "FL" : isTX ? "TX" : isNC ? "NC" : isIL ? "IL" : isVA ? "VA" : isNJ ? "NJ" : isWA ? "WA" : "CA";

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <HearingInfoCard caseId={caseId} initialData={currentCase} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Deadline Calculator
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Every {stateLabel} small claims case has hard legal deadlines. Here are yours.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-[#0d6b5e] text-[#0d6b5e] hover:bg-[#f0fffe] shrink-0"
          onClick={() => printDeadlines(deadlines, caseName, today, stateAbbr)}
        >
          <Printer className="h-3.5 w-3.5" /> Print / Save PDF
        </Button>
      </div>

      {(urgentCount > 0 || missingCount > 0) && (
        <div className={`rounded-xl border-2 p-4 flex items-start gap-3 ${urgentCount > 0 ? "border-red-300 bg-red-50" : "border-yellow-200 bg-yellow-50"}`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${urgentCount > 0 ? "text-red-500" : "text-yellow-500"}`} />
          <div>
            {urgentCount > 0 && (
              <p className="text-sm font-bold text-red-700">
                {urgentCount} deadline{urgentCount > 1 ? "s" : ""} need{urgentCount === 1 ? "s" : ""} immediate attention
              </p>
            )}
            {missingCount > 0 && (
              <p className="text-sm font-semibold text-yellow-700 mt-0.5">
                {missingCount} deadline{missingCount > 1 ? "s" : ""} can't be calculated — add missing dates in the <span className="underline cursor-pointer">Intake tab</span>.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-muted/30 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Incident Date</p>
          <p className="font-semibold text-foreground">
            {currentCase.incidentDate ? currentCase.incidentDate : <span className="text-muted-foreground italic">Not entered</span>}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {isFL ? "Trial / Hearing Date" : "Hearing Date"}
          </p>
          <p className="font-semibold text-foreground">
            {hearingDate ? format(hearingDate, "MMMM d, yyyy") : <span className="text-muted-foreground italic">Not scheduled</span>}
          </p>
        </div>
        {isFL ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Case Created</p>
            <p className="font-semibold text-foreground">
              {filingDate ? format(filingDate, "MMMM d, yyyy") : <span className="text-muted-foreground italic">Unknown</span>}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Today</p>
            <p className="font-semibold text-foreground">{format(today, "MMMM d, yyyy")}</p>
          </div>
        )}
      </div>

      {isFL && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Florida note:</span> The pretrial conference and service deadlines below are calculated using your case creation date as a proxy for your filing date. Once you receive your actual filing date from the court clerk, verify these dates match.
          </p>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} className="space-y-2">
          <div className="flex items-center gap-2">
            <Scale className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</p>
          </div>
          <div className="space-y-2">
            {deadlines.filter(d => d.category === cat).map(d => (
              <div key={d.id} className={`rounded-xl border p-4 ${statusColor(d.status)}`}>
                <div className="flex items-start gap-3">
                  {statusIcon(d.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={`font-semibold text-sm leading-tight ${labelColor(d.status)}`}>{d.label}</p>
                      {d.date && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground leading-tight">{format(d.date, "MMM d, yyyy")}</p>
                          <p className={`text-xs font-semibold leading-tight ${labelColor(d.status)}`}>
                            {daysLabel(d.date, today)}
                          </p>
                        </div>
                      )}
                      {!d.date && d.status === "missing" && (
                        <span className="text-xs text-muted-foreground italic shrink-0">Date needed</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{d.detail}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">{d.law}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">Disclaimer:</span> This calculator is for informational purposes only and does not constitute legal advice. Always verify deadlines with your specific court or a licensed attorney. County-specific rules may apply.{" "}
          {isFL ? (
            <a href="https://www.flcourts.gov" target="_blank" rel="noopener noreferrer" className="underline font-medium">flcourts.gov</a>
          ) : isTX ? (
            <a href="https://www.txcourts.gov" target="_blank" rel="noopener noreferrer" className="underline font-medium">txcourts.gov</a>
          ) : isNC ? (
            <a href="https://www.nccourts.gov" target="_blank" rel="noopener noreferrer" className="underline font-medium">nccourts.gov</a>
          ) : isIL ? (
            <a href={STATE_FACTS.IL.selfHelpUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">{STATE_FACTS.IL.selfHelpLabel}</a>
          ) : isVA ? (
            <a href={STATE_FACTS.VA.selfHelpUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">{STATE_FACTS.VA.selfHelpLabel}</a>
          ) : isNJ ? (
            <a href={STATE_FACTS.NJ.selfHelpUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">{STATE_FACTS.NJ.selfHelpLabel}</a>
          ) : isWA ? (
            <a href={STATE_FACTS.WA.selfHelpUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">{STATE_FACTS.WA.selfHelpLabel}</a>
          ) : (
            <a href="https://www.courts.ca.gov" target="_blank" rel="noopener noreferrer" className="underline font-medium">courts.ca.gov</a>
          )}
        </p>
      </div>
    </div>
  );
}
