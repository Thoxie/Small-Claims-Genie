import { useMemo } from "react";
import { addDays, addYears, addMonths, differenceInDays, parseISO, isValid, format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, CalendarDays, AlertTriangle, Info, Scale, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HearingInfoCard } from "./intake-tab";

interface Props {
  caseId: number;
  currentCase: any;
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

function getStatuteYears(claimType: string, isBusiness: boolean): { years: number; note: string } {
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

function printDeadlines(deadlines: Deadline[], caseName: string, today: Date) {
  const rows = deadlines.map(d => {
    const dateStr = d.date ? format(d.date, "MMMM d, yyyy") : "—";
    const daysStr = d.date ? daysLabel(d.date, today) : "";
    const statusLabel = d.status === "overdue" ? "⚠️ PAST DEADLINE" : d.status === "urgent" ? "🔴 URGENT" : d.status === "warning" ? "🟡 Coming up" : d.status === "ok" ? "✅ OK" : d.status === "missing" ? "❓ Date needed" : "ℹ️ Info";
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111;font-size:13px">${d.label}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111;font-size:13px">${dateStr}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#666;font-size:12px">${daysStr}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:11px">${statusLabel}</td></tr><tr><td colspan="4" style="padding:4px 12px 10px;color:#555;font-size:11px;border-bottom:1px solid #f3f4f6">${d.detail} <span style="color:#9ca3af">(${d.law})</span></td></tr>`;
  }).join("");

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Deadline Calculator — ${caseName}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111;padding:0 20px}h1{color:#0d6b5e;font-size:22px;margin-bottom:4px}.sub{color:#666;font-size:13px;margin-bottom:28px}table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}th{background:#0d6b5e;color:white;padding:10px 12px;text-align:left;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}.footer{margin-top:24px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}.print-btn{margin-top:24px;padding:10px 24px;background:#0d6b5e;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer}@media print{.print-btn{display:none}}</style></head><body><h1>🗓️ Deadline Calculator</h1><p class="sub">${caseName} — Generated ${format(today, "MMMM d, yyyy")} via Small Claims Genie</p><table><thead><tr><th>Deadline</th><th>Date</th><th>Time Left</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">This calculator is for informational purposes only. Verify all deadlines with your court or an attorney. California courts: courts.ca.gov</div><button class="print-btn" onclick="window.print()">Print / Save as PDF</button><script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

export function DeadlineCalculatorTab({ caseId, currentCase }: Props) {
  const today = useMemo(() => new Date(), []);

  const incidentDate = useMemo(() => parseIncidentDate(currentCase.incidentDate || ""), [currentCase.incidentDate]);
  const hearingDate = useMemo(() => parseHearingDate(currentCase.hearingDate || ""), [currentCase.hearingDate]);
  const isBusiness = !!(currentCase.defendantIsBusinessOrEntity);
  const isSuingPublic = !!(currentCase.isSuingPublicEntity);
  const claimType = currentCase.claimType || "";
  const plaintiffName = currentCase.plaintiffName || "Plaintiff";
  const defendantName = currentCase.defendantName || "Defendant";
  const caseName = `${plaintiffName} v. ${defendantName}`;

  const deadlines: Deadline[] = useMemo(() => {
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
      const { years, note } = getStatuteYears(claimType, isBusiness);
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
      const minDaysAfterFiling = isBusiness ? 70 : 30;
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
  }, [incidentDate, hearingDate, isBusiness, isSuingPublic, claimType, today]);

  const categories = [...new Set(deadlines.map(d => d.category))];

  const urgentCount = deadlines.filter(d => d.status === "urgent" || d.status === "overdue").length;
  const missingCount = deadlines.filter(d => d.status === "missing").length;

  return (
    <div className="p-6 space-y-6">
      <HearingInfoCard caseId={caseId} initialData={currentCase} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Deadline Calculator
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Every California small claims case has hard legal deadlines. Here are yours.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-[#0d6b5e] text-[#0d6b5e] hover:bg-[#f0fffe] shrink-0"
          onClick={() => printDeadlines(deadlines, caseName, today)}
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Hearing Date</p>
          <p className="font-semibold text-foreground">
            {hearingDate ? format(hearingDate, "MMMM d, yyyy") : <span className="text-muted-foreground italic">Not scheduled</span>}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Today</p>
          <p className="font-semibold text-foreground">{format(today, "MMMM d, yyyy")}</p>
        </div>
      </div>

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
          <span className="font-semibold">Disclaimer:</span> This calculator is for informational purposes only and does not constitute legal advice. Always verify deadlines with your specific court or a licensed attorney. County-specific rules may apply. California courts:{" "}
          <a href="https://www.courts.ca.gov" target="_blank" rel="noopener noreferrer" className="underline font-medium">courts.ca.gov</a>
        </p>
      </div>
    </div>
  );
}
