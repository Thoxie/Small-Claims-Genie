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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string | undefined | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function titleCase(str?: string | null) {
  if (!str) return null;
  return str.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function ReadinessItem({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {complete
        ? <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
        : <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
      <span className="text-sm text-foreground flex-1">{label}</span>
      <span className={`text-xs font-medium ${complete ? "text-green-700" : "text-muted-foreground"}`}>
        {complete ? "Complete" : "Incomplete"}
      </span>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-baseline gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function CaseView({ c, justSaved }: { c: Case; justSaved: boolean }) {
  const savedTab = localStorage.getItem(`case-last-tab-${c.id}`);
  const hash = savedTab ? `#${savedTab}` : "";

  const plaintiff = c.plaintiffName?.trim() || null;
  const defendant = c.defendantName?.trim() || null;

  const heading = plaintiff && defendant
    ? `${plaintiff} vs. ${defendant}`
    : plaintiff ? `${plaintiff} vs. (defendant TBD)`
    : defendant ? `(plaintiff TBD) vs. ${defendant}`
    : c.title;

  const amount = formatCurrency(c.claimAmount);

  // Derive readiness from the checklist items, not from the server field,
  // so the percentage stays consistent with what the checklist shows.
  const readinessItems = [
    { label: "Claim Details", complete: !!(c.claimType && c.claimAmount) },
    { label: "Parties",       complete: !!(plaintiff && defendant) },
    { label: "Timeline",      complete: !!(c.incidentDate) },
    { label: "Evidence",      complete: !!(c.documentCount && c.documentCount > 0) },
    { label: "Review",        complete: !!(c.intakeComplete) },
  ];
  const completeCount = readinessItems.filter(i => i.complete).length;
  const readinessPct = Math.round((completeCount / readinessItems.length) * 100);

  // Status badge: use server status but only show "Intake Complete" if readiness
  // is actually 100%; otherwise fall back to "In Progress".
  const allComplete = completeCount === readinessItems.length;
  const derivedStatus = allComplete ? c.status : "draft";
  const statusLabel = STATUS_LABEL[derivedStatus] ?? STATUS_LABEL[c.status] ?? c.status;
  const statusColor = STATUS_COLOR[derivedStatus] ?? STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-700 border-gray-200";

  const savedDate = formatDate(c.updatedAt);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Save confirmation banner ── */}
      {justSaved && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Saved successfully.</p>
            {savedDate && (
              <p className="text-xs text-green-700 mt-0.5">
                {"Your case progress was saved "}
                {savedDate}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Main case card ── */}
      <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-3 shadow-sm">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground text-base leading-snug flex-1 min-w-0">{heading}</h3>
          <Badge className={`shrink-0 text-xs font-medium border ${statusColor}`} variant="outline">
            {statusLabel}
          </Badge>
        </div>

        {/* Amount · Claim type · Readiness */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
          {amount && <span className="font-semibold text-foreground">{amount}</span>}
          {amount && c.claimType && <span className="text-muted-foreground">·</span>}
          {c.claimType && (
            <span className="text-muted-foreground capitalize">{c.claimType.replace(/_/g, " ")}</span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            Readiness:{" "}
            <span className="font-semibold text-foreground">{readinessPct}%</span>
          </span>
        </div>

        {/* Compact metadata line */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t border-gray-100 pt-2">
          <span>California Small Claims · California</span>
          {c.documentCount != null && (
            <span>
              Evidence uploaded: {c.documentCount} total
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
          <span className="text-xs text-muted-foreground">Updated {savedDate}</span>
          <Button
            asChild
            size="sm"
            className="gap-1.5 rounded-full px-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href={`/cases/${c.id}${hash}`}>
              Resume Case <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Two-column row: Readiness + Snapshot ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Case Readiness */}
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
            Case Readiness
          </h4>
          {readinessItems.map(item => (
            <ReadinessItem key={item.label} label={item.label} complete={item.complete} />
          ))}
        </div>

        {/* Case Snapshot */}
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm flex flex-col">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
            Case Snapshot
          </h4>
          <SnapshotRow label="Plaintiff"    value={plaintiff} />
          <SnapshotRow label="Defendant"    value={defendant} />
          <SnapshotRow label="Claim type"   value={titleCase(c.claimType)} />
          <SnapshotRow label="Amount"       value={amount} />
          <SnapshotRow label="Court"        value="California Small Claims" />
          <SnapshotRow label="Last updated" value={savedDate} />
        </div>
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

        {/* Title + subtitle on one line */}
        <div className="flex items-baseline gap-2 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Your Cases</h1>
          <span className="text-sm text-muted-foreground">Pick up where you left off.</span>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-3">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-36" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-24 mb-1" />
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
              <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-24 mb-1" />
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            </div>
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
              <p className="text-muted-foreground text-sm mt-1">
                Contact support to get started with your case.
              </p>
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
