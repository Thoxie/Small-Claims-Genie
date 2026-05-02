import { useState, useEffect } from "react";
import {
  useGetCase,
  useGetCaseReadiness,
} from "@workspace/api-client-react";
import type { ExtendedCase } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, PlusCircle } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { Link } from "wouter";

const VALID_TABS = ["intake", "documents", "chat", "demand-letter", "forms", "prep", "deadlines"];

// Map outer step number → { tab, intakeStep }
const STEP_MAP: Record<number, { tab: string; intakeStep?: 1 | 2 }> = {
  1: { tab: "intake", intakeStep: 1 },
  2: { tab: "intake", intakeStep: 2 },
  3: { tab: "documents" },
  4: { tab: "demand-letter" },
  5: { tab: "chat" },
  6: { tab: "forms" },
  7: { tab: "prep" },
  8: { tab: "deadlines" },
};

function getTabFromHash(): string {
  const hash = window.location.hash.slice(1);
  return VALID_TABS.includes(hash) ? hash : "intake";
}

function useHashTab(): [string, (tab: string) => void] {
  const [activeTab, setActiveTabState] = useState(getTabFromHash);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const onHashChange = () => setActiveTabState(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return [activeTab, setActiveTab];
}

import { IntakeTab } from "./tabs/intake-tab";
import { DocumentsTab } from "./tabs/documents-tab";
import { ChatTab } from "./tabs/chat-tab";
import { FormsTab } from "./tabs/forms-tab";
import { DemandLetterTab } from "./tabs/demand-letter-tab";
import { HearingPrepTab } from "./tabs/hearing-prep-tab";
import { DeadlineCalculatorTab } from "./tabs/deadline-calculator-tab";

export default function CaseWorkspace({ caseIdParam }: { caseIdParam: string }) {
  const caseId = parseInt(caseIdParam || "0", 10);
  const [activeTab, setActiveTab] = useHashTab();

  // Track which intake sub-step (1 or 2) is requested from the outer nav
  const [intakeSubStep, setIntakeSubStep] = useState<1 | 2 | undefined>(undefined);

  // Compute which outer step number is currently active
  const currentOuterStep = (() => {
    if (activeTab === "intake") return intakeSubStep === 2 ? 2 : 1;
    const entry = Object.entries(STEP_MAP).find(([, v]) => v.tab === activeTab && !v.intakeStep);
    return entry ? parseInt(entry[0]) : 1;
  })();

  // Handle outer stepper click
  const handleStepClick = (stepN: number) => {
    const mapping = STEP_MAP[stepN];
    if (!mapping) return;
    if (mapping.intakeStep) {
      setIntakeSubStep(mapping.intakeStep);
      setActiveTab("intake");
    } else {
      setIntakeSubStep(undefined);
      setActiveTab(mapping.tab);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { data: currentCase, isLoading: caseLoading } = useGetCase(caseId, { query: { enabled: !!caseId } });
  const { data: readiness } = useGetCaseReadiness(caseId, { query: { enabled: !!caseId } });

  if (caseLoading) {
    return (
      <WorkspaceLayout
        activeTab={activeTab}
        currentOuterStep={currentOuterStep}
        setActiveTab={setActiveTab}
        onStepClick={handleStepClick}
      >
        <div className="container mx-auto p-8">
          <Skeleton className="h-12 w-1/3 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </WorkspaceLayout>
    );
  }

  if (!currentCase) {
    return (
      <WorkspaceLayout
        activeTab={activeTab}
        currentOuterStep={currentOuterStep}
        setActiveTab={setActiveTab}
        onStepClick={handleStepClick}
      >
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

  const extCase = currentCase as ExtendedCase;
  const score = readiness?.score ?? extCase.readinessScore ?? 0;

  // Compute which steps are truly completed based on actual case data
  const completedSteps = new Set<number>();
  // Step 1: parties entered — use intakeStep as canonical signal (moved past step 1 in intake)
  if ((extCase.intakeStep ?? 1) >= 2 || (extCase.plaintiffName && extCase.defendantName)) completedSteps.add(1);
  // Step 2: intake fully complete
  if (extCase.intakeComplete) completedSteps.add(2);
  // Step 3: at least one document uploaded
  if ((extCase.documentCount ?? 0) > 0) completedSteps.add(3);
  // Step 4: demand letter was generated
  if (extCase.demandLetterText) completedSteps.add(4);
  // Step 5: case reviewed meaningfully (readiness score reflects substantial data entry)
  if (score >= 50) completedSteps.add(5);
  // Step 6: forms were created (mc030 title set, or case is filed)
  if (extCase.mc030DeclarationTitle || extCase.status === "filed") completedSteps.add(6);
  // Step 7: hearing is scheduled
  if (extCase.hearingDate) completedSteps.add(7);

  const borderColor = score >= 80 ? "border-green-400" : score >= 50 ? "border-yellow-400" : "border-red-400";
  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-500";
  const scoreLabel = score >= 80 ? "Ready to file" : score >= 50 ? "Nearly ready" : "Needs info";
  const allItems = [
    ...(readiness?.strengths ?? []).map((s: string) => ({ text: s, ok: true })),
    ...(readiness?.missingFields ?? []).map((f: string) => ({ text: f, ok: false })),
  ];

  return (
    <WorkspaceLayout
      activeTab={activeTab}
      currentOuterStep={currentOuterStep}
      completedSteps={completedSteps}
      setActiveTab={setActiveTab}
      onStepClick={handleStepClick}
    >
      <div className="container mx-auto px-4 pt-0 pb-6 max-w-6xl flex flex-col gap-3">

        {/* ── Readiness card — only shown on the Prep tab ── */}
        {activeTab === "prep" && <div className={`bg-card px-5 py-3 rounded-xl border-2 ${borderColor} shadow-sm`}>
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
                <span className="text-xs text-muted-foreground">Claim: <span className="font-semibold text-foreground">{extCase.claimAmount ? `$${Number(extCase.claimAmount).toLocaleString()}` : "—"}</span></span>
                {extCase.countyId && (
                  <span className="text-xs text-muted-foreground">· {extCase.countyId} County</span>
                )}
                {extCase.caseNumber && (
                  <span className="text-xs text-muted-foreground">· No. <span className="font-semibold text-foreground">{extCase.caseNumber}</span></span>
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
        </div>}

        {/* ── Tab content ── */}
        <div className={`border rounded-lg bg-white shadow-sm ${activeTab === "chat" ? "" : "min-h-[600px]"}`}>
          {activeTab === "intake" && (
            <IntakeTab
              caseId={caseId}
              initialData={extCase}
              forceStep={intakeSubStep}
              onStepChange={(step) => {
                if (step === 1 || step === 2) setIntakeSubStep(step as 1 | 2);
                else setIntakeSubStep(undefined);
              }}
            />
          )}
          {activeTab === "documents" && (
            <DocumentsTab caseId={caseId} evidenceChecklist={extCase?.evidenceChecklist || []} />
          )}
          {activeTab === "chat" && (
            <ChatTab caseId={caseId} isDraftMode={false} currentCase={extCase} />
          )}
          {activeTab === "demand-letter" && (
            <DemandLetterTab caseId={caseId} currentCase={extCase} />
          )}
          {activeTab === "forms" && (
            <FormsTab caseId={caseId} currentCase={extCase} onSwitchToIntake={() => setActiveTab("intake")} onSwitchToPrep={() => setActiveTab("prep")} isDraftMode={false} />
          )}
          {activeTab === "prep" && (
            <HearingPrepTab caseId={caseId} currentCase={extCase} isDraftMode={false} />
          )}
          {activeTab === "deadlines" && (
            <DeadlineCalculatorTab caseId={caseId} currentCase={extCase} />
          )}
        </div>

      </div>
    </WorkspaceLayout>
  );
}
