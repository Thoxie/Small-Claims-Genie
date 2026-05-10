import { useState, useEffect } from "react";
import { useListCases } from "@workspace/api-client-react";
import type { Case } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, CheckCircle, FileText, Circle } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "In Progress",
  intake_complete: "Intake Complete",
  documents_uploaded: "Docs Uploaded",
  ready_to_file: "Ready to File",
  filed: "Filed",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 border-amber-200",
  intake_complete: "bg-blue-100 text-blue-800 border-blue-200",
  documents_uploaded: "bg-purple-100 text-purple-800 border-purple-200",
  ready_to_file: "bg-green-100 text-green-800 border-green-200",
  filed: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatCurrency(amount?: number) {
  if (!amount) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ReadinessItem({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {complete
        ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
        : <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
      <span className={`text-sm ${complete ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`ml-auto text-xs font-medium ${complete ? "text-green-700" : "text-muted-foreground"}`}>
        {complete ? "Complete" : "Incomplete"}
      </span>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function CaseDetail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="font-medium text-foreground/70">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function CaseView({ c, justSaved }: { c: Case; justSaved: boolean }) {
  const savedTab = localStorage.getItem(`case-last-tab-${c.id}`);
  const hash = savedTab ? `#${savedTab}` : "";

  const statusLabel = STATUS_LABEL[c.status] ?? c.status;
  const statusColor = STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const amount = formatCurrency(c.claimAmount);
  const plaintiff = c.plaintiffName?.trim();
  const defendant = c.defendantName?.trim();

  const heading = plaintiff && defendant
    ? `${plaintiff} vs. ${defendant}`
    : plaintiff ? `${plaintiff} vs. (defendant TBD)`
    : defendant ? `(plaintiff TBD) vs. ${defendant}`
    : c.title;

  const readinessItems = [
    { label: "Claim Details", complete: !!(c.claimType && c.claimAmount) },
    { label: "Parties",       complete: !!(plaintiff && defendant) },
    { label: "Timeline",      complete: !!(c.incidentDate) },
    { label: "Evidence",      complete: !!(c.documentCount && c.documentCount > 0) },
    { label: "Review",        complete: !!(c.intakeComplete) },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* ── Save confirmation banner ── */}
      {justSaved && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Saved successfully.</p>
            <p className="text-xs text-green-700 mt-0.5">Your case progress was saved {formatDate(c.updatedAt)}.</p>
          </div>
        </div>
      )}

      {/* ── Main case card ── */}
      <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-4 shadow-sm">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base leading-snug">{heading}</h3>
          </div>
          <Badge className={`shrink-0 text-xs font-medium border ${statusColor}`} variant="outline">
            {statusLabel}
          </Badge>
        </div>

        {/* Key figures */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {amount && <span className="font-semibold text-foreground text-base">{amount}</span>}
          {c.claimType && <span className="text-muted-foreground capitalize">{c.claimType.replace(/_/g, " ")}</span>}
          {c.readinessScore != null && (
            <span className="ml-auto text-xs text-muted-foreground">
              Readiness: <span className="font-semibold text-foreground">{c.readinessScore}%</span>
            </span>
          )}
        </div>

        {/* Extra case details */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100">
          <CaseDetail label="Court" value="California Small Claims" />
          <CaseDetail label="Jurisdiction" value="California" />
          {c.documentCount != null && (
            <CaseDetail label="Evidence uploaded" value={`${c.documentCount} file${c.documentCount !== 1 ? "s" : ""}`} />
          )}
          <CaseDetail label="Status" value={statusLabel} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
          <span className="text-xs text-muted-foreground">Updated {formatDate(c.updatedAt)}</span>
          <Button asChild size="sm" className="gap-1.5 rounded-full px-4 bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href={`/cases/${c.id}${hash}`}>
              Resume Case <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Case Readiness ── */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex flex-col gap-3">
        <h4 className="text-sm font-semibold text-foreground">Case Readiness</h4>
        <div className="flex flex-col gap-2">
          {readinessItems.map(item => (
            <ReadinessItem key={item.label} label={item.label} complete={item.complete} />
          ))}
        </div>
      </div>

      {/* ── Case Snapshot ── */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-foreground mb-2">Case Snapshot</h4>
        <SnapshotRow label="Claim type"   value={c.claimType ? c.claimType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : null} />
        <SnapshotRow label="Amount"       value={amount} />
        <SnapshotRow label="Plaintiff"    value={plaintiff ?? null} />
        <SnapshotRow label="Defendant"    value={defendant ?? null} />
        <SnapshotRow label="Court"        value="California Small Claims" />
        <SnapshotRow label="Last updated" value={formatDate(c.updatedAt)} />
      </div>

      {/* ── Trust line ── */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        Your case information is saved securely and can be updated anytime.
      </p>

    </div>
  );
}

export default function Dashboard() {
  const { data: cases, isLoading, isError } = useListCases();
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("scg-just-saved") === "true") {
      setJustSaved(true);
      sessionStorage.removeItem("scg-just-saved");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#edfaf8] to-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">

        <h1 className="text-2xl font-bold text-foreground mb-1">Your Cases</h1>
        <p className="text-muted-foreground text-sm mb-6">Pick up where you left off.</p>

        {isLoading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-border rounded-xl p-5 flex flex-col gap-3">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-4 w-36" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-16 flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Couldn't load your cases. Please try refreshing.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
          </div>
        )}

        {!isLoading && !isError && cases && cases.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">No cases yet</h2>
              <p className="text-muted-foreground text-sm mt-1">Contact support to get started with your case.</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && cases && cases.length > 0 && (
          <CaseView c={cases[0]} justSaved={justSaved} />
        )}

      </div>
    </div>
  );
}
