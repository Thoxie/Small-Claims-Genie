import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetCase,
  useGetCaseReadiness,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardList, FileText, MessageSquare, Mail, Scale, Gavel, CheckCircle, AlertCircle } from "lucide-react";

import { IntakeTab } from "./tabs/intake-tab";
import { DocumentsTab } from "./tabs/documents-tab";
import { ChatTab } from "./tabs/chat-tab";
import { FormsTab } from "./tabs/forms-tab";
import { DemandLetterTab } from "./tabs/demand-letter-tab";
import { HearingPrepTab } from "./tabs/hearing-prep-tab";

export default function CaseWorkspace() {
  const params = useParams();
  const caseId = parseInt(params.id || "0", 10);
  const [activeTab, setActiveTab] = useState("intake");

  const { data: currentCase, isLoading: caseLoading } = useGetCase(caseId, { query: { enabled: !!caseId } });
  const { data: readiness } = useGetCaseReadiness(caseId, { query: { enabled: !!caseId } });

  if (caseLoading) {
    return <div className="container mx-auto p-8"><Skeleton className="h-12 w-1/3 mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!currentCase) {
    return <div className="container mx-auto p-8">Case not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 pt-3 pb-6 max-w-6xl flex flex-col gap-3">

      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary border rounded-md px-3 py-1.5 transition-colors w-fit bg-background hover:bg-muted">
        <ArrowLeft className="h-4 w-4" />
        Your Cases
      </Link>

      {(() => {
        const score = readiness?.score ?? (currentCase as any).readinessScore ?? 0;
        const borderColor = score >= 80 ? "border-green-400" : score >= 50 ? "border-yellow-400" : "border-red-400";
        const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-500";
        const scoreLabel = score >= 80 ? "Ready to file" : score >= 50 ? "Nearly ready" : "Needs info";
        const allItems = [
          ...(readiness?.strengths ?? []).map((s: string) => ({ text: s, ok: true })),
          ...(readiness?.missingFields ?? []).map((f: string) => ({ text: f, ok: false })),
        ];
        return (
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
        );
      })()}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-[70px] md:top-[106px] z-30 bg-background -mx-4 px-4 md:-mx-6 md:px-6 pb-3 pt-1 border-b border-border shadow-sm">
          <TabsList className="w-full grid grid-cols-6 h-auto p-1 bg-muted/80 rounded-xl gap-0.5">
            <TabsTrigger value="intake" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all" data-testid="tab-intake">
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="leading-tight">Intake</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all" data-testid="tab-documents">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="leading-tight">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all" data-testid="tab-chat">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="leading-tight text-center">Ask Genie AI</span>
            </TabsTrigger>
            <TabsTrigger value="demand-letter" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all" data-testid="tab-demand-letter">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="leading-tight">Demand Letter</span>
            </TabsTrigger>
            <TabsTrigger value="forms" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all" data-testid="tab-forms">
              <Scale className="h-4 w-4 shrink-0" />
              <span className="leading-tight">Forms</span>
            </TabsTrigger>
            <TabsTrigger value="prep" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all" data-testid="tab-prep">
              <Gavel className="h-4 w-4 shrink-0" />
              <span className="leading-tight text-center">Prep for<br/>Hearing</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className={`mt-4 border rounded-lg bg-card shadow-sm ${activeTab === "chat" ? "" : "min-h-[600px]"}`}>
          <TabsContent value="intake" className="p-0 m-0">
            <IntakeTab caseId={caseId} initialData={currentCase} />
          </TabsContent>
          <TabsContent value="documents" className="p-0 m-0">
            <DocumentsTab caseId={caseId} evidenceChecklist={(currentCase as any)?.evidenceChecklist || []} />
          </TabsContent>
          <TabsContent value="chat" className="p-0 m-0">
            <ChatTab caseId={caseId} isDraftMode={false} />
          </TabsContent>
          <TabsContent value="demand-letter" className="p-0 m-0">
            <DemandLetterTab caseId={caseId} currentCase={currentCase} isDraftMode={false} />
          </TabsContent>
          <TabsContent value="forms" className="p-0 m-0">
            <FormsTab caseId={caseId} currentCase={currentCase} onSwitchToIntake={() => setActiveTab("intake")} onSwitchToPrep={() => setActiveTab("prep")} isDraftMode={false} />
          </TabsContent>
          <TabsContent value="prep" className="p-0 m-0">
            <HearingPrepTab caseId={caseId} currentCase={currentCase} isDraftMode={false} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
