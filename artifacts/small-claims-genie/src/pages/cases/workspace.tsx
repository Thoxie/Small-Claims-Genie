import { useState } from "react";
import { useParams } from "wouter";
import {
  useGetCase,
  useGetCaseReadiness,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, PlusCircle } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { Link } from "wouter";

import { IntakeTab } from "./tabs/intake-tab";
import { DocumentsTab } from "./tabs/documents-tab";
import { ChatTab } from "./tabs/chat-tab";
import { FormsTab } from "./tabs/forms-tab";
import { DemandLetterTab } from "./tabs/demand-letter-tab";
import { HearingPrepTab } from "./tabs/hearing-prep-tab";
import { DeadlineCalculatorTab } from "./tabs/deadline-calculator-tab";

export default function CaseWorkspace() {
  const params = useParams();
  const caseId = parseInt(params.id || "0", 10);
  const [activeTab, setActiveTab] = useState("intake");

  const { data: currentCase, isLoading: caseLoading } = useGetCase(caseId, { query: { enabled: !!caseId } });
  const { data: readiness } = useGetCaseReadiness(caseId, { query: { enabled: !!caseId } });

  if (caseLoading) {
    return (
      <WorkspaceLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="container mx-auto p-8">
          <Skeleton className="h-12 w-1/3 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </WorkspaceLayout>
    );
  }

  if (!currentCase) {
    return (
      <WorkspaceLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-8 text-center">
          <div className="text-5xl">📋</div>
          <h2 className="text-xl font-bold text-foreground">No case found</h2>
          <p className="text-muted-foreground max-w-sm">
            This case doesn't exist or may have been removed. Start a new case to get going.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/cases/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Start a New Case
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  const score = readiness?.score ?? (currentCase as any).readinessScore ?? 0;
  const borderColor = score >= 80 ? "border-green-400" : score >= 50 ? "border-yellow-400" : "border-red-400";
  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-500";
  const scoreLabel = score >= 80 ? "Ready to file" : score >= 50 ? "Nearly ready" : "Needs info";
  const allItems = [
    ...(readiness?.strengths ?? []).map((s: string) => ({ text: s, ok: true })),
    ...(readiness?.missingFields ?? []).map((f: string) => ({ text: f, ok: false })),
  ];

  return (
    <WorkspaceLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="container mx-auto px-4 pt-3 pb-6 max-w-6xl flex flex-col gap-3">

        {/* ── Readiness card ── */}
        <div className={`bg-card px-5 py-3 rounded-xl border-2 ${borderColor} shadow-sm`}>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">Plaintiff</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{currentCase.plaintiffName || "—"}</p>
                </div>
                <span className="text-xs text-muted-foreground pb-0.5 shrink-0">v.</span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">Defendant</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{currentCase.defendantName || "—"}</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black leading-none ${scoreColor}`}>{score}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Readiness</span>
                <span className={`text-[10px] font-semibold ${scoreColor}`}>· {scoreLabel}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Claim: <span className="font-semibold text-foreground">{(currentCase as any).claimAmount ? `$${Number((currentCase as any).claimAmount).toLocaleString()}` : "—"}</span></span>
                {(currentCase as any).countyId && (
                  <span className="text-xs text-muted-foreground">· {(currentCase as any).countyId} County</span>
                )}
                {currentCase.caseNumber && (
                  <span className="text-xs text-muted-foreground">· No. <span className="font-semibold text-foreground">{currentCase.caseNumber}</span></span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 border-l border-border pl-4">
              {allItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {allItems.map((item, i) => (
                    <div key={i} className={`flex items-start gap-1 text-[10px] leading-tight ${item.ok ? "text-green-700" : "text-destructive"}`}>
                      {item.ok
                        ? <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-500" />
                        : <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      }
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Complete your intake form to see your readiness score.</p>
              )}
              <div className="mt-1">
                <Badge variant={currentCase.status === 'filed' ? 'default' : 'secondary'} className="capitalize text-xs">
                  {currentCase.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab content — plain conditional rendering, no Radix dependency ── */}
        <div className={`border rounded-lg bg-white shadow-sm ${activeTab === "chat" ? "" : "min-h-[600px]"}`}>
          {activeTab === "intake" && (
            <IntakeTab caseId={caseId} initialData={currentCase} />
          )}
          {activeTab === "documents" && (
            <DocumentsTab caseId={caseId} evidenceChecklist={(currentCase as any)?.evidenceChecklist || []} />
          )}
          {activeTab === "chat" && (
            <ChatTab caseId={caseId} isDraftMode={false} currentCase={currentCase} />
          )}
          {activeTab === "demand-letter" && (
            <DemandLetterTab caseId={caseId} currentCase={currentCase} isDraftMode={false} />
          )}
          {activeTab === "forms" && (
            <FormsTab caseId={caseId} currentCase={currentCase} onSwitchToIntake={() => setActiveTab("intake")} onSwitchToPrep={() => setActiveTab("prep")} isDraftMode={false} />
          )}
          {activeTab === "prep" && (
            <HearingPrepTab caseId={caseId} currentCase={currentCase} isDraftMode={false} />
          )}
          {activeTab === "deadlines" && (
            <DeadlineCalculatorTab currentCase={currentCase} />
          )}
        </div>

      </div>
    </WorkspaceLayout>
  );
}
