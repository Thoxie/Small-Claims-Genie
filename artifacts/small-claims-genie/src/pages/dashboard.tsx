import { useListCases } from "@workspace/api-client-react";
import type { Case } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, CheckCircle, FileText, Circle, PartyPopper, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { usePurchaseStatus } from "@/hooks/usePurchaseStatus";


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

function countyDisplayName(countyId?: string | null): string | null {
  if (!countyId) return null;
  const name = countyId
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${name} County`;
}

/**
 * Extracts the short courthouse name from a full name.
 * "Sacramento County Superior Court - Gordon D. Schaber Courthouse"
 * → "Gordon D. Schaber Courthouse"
 */
function shortCourtName(full?: string | null): string | null {
  if (!full) return null;
  const idx = Math.max(full.lastIndexOf(" - "), full.lastIndexOf(" – "));
  return idx > 0 ? full.slice(idx + 3).trim() : full;
}

/** Label stacked above value — used in the 2-col metadata grid */
function MetaCell({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground leading-snug">{value}</span>
    </div>
  );
}

function ReadinessItem({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
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

/** Compact row used in Case Snapshot card */
function SnapRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function CaseView({ c }: { c: Case }) {
  const savedTab = localStorage.getItem(`case-last-tab-${c.id}`);
  const hash = savedTab ? `#${savedTab}` : "";

  const plaintiff  = c.plaintiffName?.trim() || null;
  const defendant  = c.defendantName?.trim() || null;
  const amount     = formatCurrency(c.claimAmount);
  const savedDate  = formatDate(c.updatedAt);
  const countyName = countyDisplayName(c.countyId);

  const courtName      = c.courthouseName
    ?? (countyName ? `${countyName} Superior Court — Small Claims` : null);
  const courtNameShort = shortCourtName(courtName);

  const courtAddress = [
    c.courthouseAddress,
    c.courthouseCity,
    c.courthouseZip ? `CA ${c.courthouseZip}` : null,
  ].filter(Boolean).join(", ") || null;

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
  const completeCount = readinessItems.filter(i => i.complete).length;
  const readinessPct  = Math.round((completeCount / readinessItems.length) * 100);

  const allComplete   = completeCount === readinessItems.length;
  const derivedStatus = allComplete ? c.status : "draft";
  const statusLabel   = STATUS_LABEL[derivedStatus] ?? STATUS_LABEL[c.status] ?? c.status;
  const statusColor   = STATUS_COLOR[derivedStatus] ?? STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-700 border-gray-200";

  const evidenceLabel = c.documentCount != null ? `${c.documentCount} total` : null;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Save confirmation banner — always visible ── */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Saved successfully.</p>
          {savedDate && (
            <p className="text-xs text-green-700 mt-0.5">Your case progress was saved {savedDate}.</p>
          )}
        </div>
      </div>

      {/* ══ Main case card ══ */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">

        {/* Zone 1 — identity + status block */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          {/* Left: case name + sub-line */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground leading-snug">{heading}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[amount, titleCase(c.claimType)].filter(Boolean).join(" · ")}
            </p>
          </div>
          {/* Right: status + readiness stacked */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge className={`text-xs font-medium border ${statusColor}`} variant="outline">
              {statusLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Readiness:{" "}
              <span className="font-semibold text-foreground">{readinessPct}%</span>
            </span>
          </div>
        </div>

        {/* Zone 2 — court metadata 2-column grid */}
        <div className="border-t border-gray-100 px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {countyName    && <MetaCell label="County"             value={countyName} />}
            {courtNameShort && <MetaCell label="Court"            value={courtNameShort} />}
            {courtAddress  && <MetaCell label="Court Address"     value={courtAddress} />}
            {evidenceLabel && <MetaCell label="Evidence Documents" value={evidenceLabel} />}
          </div>
        </div>

        {/* Zone 3 — updated date + resume button */}
        <div className="border-t border-gray-100 flex items-center justify-between gap-2 px-6 py-3">
          <span className="text-xs text-muted-foreground">Updated {savedDate}</span>
          <Button
            asChild
            size="sm"
            className="gap-1.5 rounded-full px-4 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          >
            <Link href={`/cases/${c.id}${hash}`}>
              Resume Case <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ══ Two-column: Readiness (left) + Snapshot (right) ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* Case Readiness */}
        <div className="bg-white border border-border rounded-xl px-5 py-4 shadow-sm h-full">
          <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-2">
            Case Readiness
          </h4>
          {readinessItems.map(item => (
            <ReadinessItem key={item.label} label={item.label} complete={item.complete} />
          ))}
        </div>

        {/* Filing Overview */}
        <div className="bg-white border border-border rounded-xl px-5 py-4 shadow-sm h-full">
          <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-2">
            Filing Overview
          </h4>
          <SnapRow label="Venue"               value={countyName} />
          <SnapRow label="Claim Limit"         value="Within California small claims limit" />
          <SnapRow label="Court Identified"    value={courtName ? "Yes" : "No"} />
          <SnapRow label="Parties Identified"  value={plaintiff && defendant ? "Yes" : "Incomplete"} />
          <SnapRow label="Evidence Documents"  value={c.documentCount != null ? `${c.documentCount} uploaded` : "None uploaded"} />
        </div>
      </div>

      {/* ── Trust line ── */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        Your case information is saved securely and can be updated anytime.
      </p>

    </div>
  );
}

function PaymentSuccessBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-4 mb-6 shadow-sm">
      <PartyPopper className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-bold text-emerald-800">Payment confirmed — you're all set!</p>
        <p className="text-xs text-emerald-700 mt-0.5">
          Your plan is now active. You can download court forms, generate demand letters, and access all paid features from your case workspace.
        </p>
      </div>
      <button onClick={onDismiss} className="text-emerald-500 hover:text-emerald-700 transition-colors mt-0.5 shrink-0" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function Dashboard() {
  const hasPurchase = usePurchaseStatus();
  const { data: cases, isLoading, isError } = useListCases({ query: { enabled: hasPurchase === true } });
  const [, navigate] = useLocation();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowPaymentSuccess(true);
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // Still checking purchase status
  const purchaseChecking = hasPurchase === null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#edfaf8] to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {showPaymentSuccess && (
          <PaymentSuccessBanner onDismiss={() => setShowPaymentSuccess(false)} />
        )}

        {/* Purchase status loading */}
        {purchaseChecking && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-72 mb-2" />
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="border-t border-gray-100 px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col gap-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No purchase — prompt user to choose a plan */}
        {!purchaseChecking && hasPurchase === false && (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#edfaf8] border-2 border-[#14b8a6]/40 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-[#0d6b5e]" />
            </div>
            <div className="max-w-md">
              <h2 className="text-2xl font-bold text-foreground mb-2">Ready to build your case?</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Choose a plan to get started. You'll have full access to all tools — AI advisor, court forms, demand letters, hearing prep, and more — with a 30-day money-back guarantee.
              </p>
            </div>
            <Link href="/pricing">
              <Button className="bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white font-bold px-8 py-3 rounded-full text-base shadow-md">
                Choose a Plan — Start Your Case
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground">30-day money-back guarantee. One-time flat fee. No subscription.</p>
          </div>
        )}

        {/* Purchased — show normal case dashboard */}
        {!purchaseChecking && hasPurchase === true && (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-6">Your Case — Pick up where you left off.</h1>

            {/* Loading cases skeleton */}
            {isLoading && (
              <div className="flex flex-col gap-4">
                <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
                    <div className="flex flex-col gap-2 flex-1">
                      <Skeleton className="h-6 w-64" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <div className="border-t border-gray-100 px-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col gap-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 flex items-center justify-between px-6 py-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-8 w-28 rounded-full" />
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Couldn't load your cases. Please try refreshing.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
              </div>
            )}

            {/* Empty state */}
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

            {/* Case view */}
            {!isLoading && !isError && cases && cases.length > 0 && (
              <CaseView c={cases[0]} />
            )}
          </>
        )}

      </div>
    </div>
  );
}
