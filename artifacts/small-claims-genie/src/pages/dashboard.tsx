import { useListCases } from "@workspace/api-client-react";
import type { Case } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, FileText } from "lucide-react";

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
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CaseCard({ c }: { c: Case }) {
  const savedTab = localStorage.getItem(`case-last-tab-${c.id}`);
  const hash = savedTab ? `#${savedTab}` : "";
  const statusLabel = STATUS_LABEL[c.status] ?? c.status;
  const statusColor = STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const amount = formatCurrency(c.claimAmount);

  // Build the heading from intake names. Fall back to the stored title only if
  // neither plaintiff nor defendant has been entered yet.
  const plaintiff = c.plaintiffName?.trim();
  const defendant = c.defendantName?.trim();
  const heading = plaintiff && defendant
    ? `${plaintiff} vs. ${defendant}`
    : plaintiff
    ? `${plaintiff} vs. (defendant TBD)`
    : defendant
    ? `(plaintiff TBD) vs. ${defendant}`
    : c.title;

  return (
    <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-base leading-snug">{heading}</h3>
        </div>
        <Badge className={`shrink-0 text-xs font-medium border ${statusColor}`} variant="outline">
          {statusLabel}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {amount && <span className="font-medium text-foreground">{amount}</span>}
        {c.claimType && <span className="capitalize">{c.claimType.replace(/_/g, " ")}</span>}
        {c.readinessScore != null && (
          <span className="ml-auto text-xs">
            Readiness: <span className="font-semibold text-foreground">{c.readinessScore}%</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">Updated {formatDate(c.updatedAt)}</span>
        <Button asChild size="sm" className="gap-1.5 rounded-full px-4 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href={`/cases/${c.id}${hash}`}>
            Resume Case <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: cases, isLoading, isError } = useListCases();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#edfaf8] to-white">
      <div className="container mx-auto px-4 py-10 max-w-2xl">

        <div className="mb-8" />

        <h1 className="text-2xl font-bold text-foreground mb-1">Your Cases</h1>
        <p className="text-muted-foreground text-sm mb-6">Pick up where you left off.</p>

        {isLoading && (
          <div className="flex flex-col gap-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white border border-border rounded-xl p-5 flex flex-col gap-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-16 flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Couldn't load your cases. Please try refreshing the page.</p>
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
          <div className="flex flex-col gap-4">
            {cases.map(c => <CaseCard key={c.id} c={c} />)}
          </div>
        )}

      </div>
    </div>
  );
}
