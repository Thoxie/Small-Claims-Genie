import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useParams, Link } from "wouter";
import { 
  useGetCase, 
  useSaveIntakeProgress,
  useListCounties,
  useGetCaseReadiness,
  useListDocuments,
  useUploadDocument,
  useDeleteDocument,
  useGetChatHistory,
  getListDocumentsQueryKey,
  getGetCaseReadinessQueryKey,
  getGetCaseQueryKey,
  getListCasesQueryKey,
  getGetCaseStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { i18n } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";
import { Mic, Send, Paperclip, FileText, Download, CheckCircle, AlertCircle, Trash2, ClipboardList, MessageSquare, Scale, ArrowLeft, Eye, Mail, Loader2, Sparkles, Copy, Square, CheckSquare2, ExternalLink, Phone, MapPin, Globe, Pencil, Info, Gavel, Maximize2, RotateCcw, Star, PenLine, ChevronLeft, Handshake } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// ─── Phone formatter ──────────────────────────────────────────────────────────
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ─── Date range picker ────────────────────────────────────────────────────────
function DateRangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (!value) return undefined;
    const parts = value.split(" – ");
    const from = parts[0] ? new Date(parts[0]) : undefined;
    const to = parts[1] ? new Date(parts[1]) : undefined;
    return from && !isNaN(from.getTime()) ? { from, to: to && !isNaN(to.getTime()) ? to : undefined } : undefined;
  });

  const handleSelect = (r: DateRange | undefined) => {
    setRange(r);
    if (r?.from && r?.to) {
      onChange(`${format(r.from, "MM/dd/yyyy")} – ${format(r.to, "MM/dd/yyyy")}`);
      setOpen(false);
    } else if (r?.from && !r?.to) {
      onChange(format(r.from, "MM/dd/yyyy"));
    }
  };

  const label = range?.from
    ? range.to
      ? `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
      : format(range.from, "MMM d, yyyy")
    : "Select date or date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal ${!range?.from ? "text-muted-foreground" : ""}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) => date > new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Intake Zod Schemas — 4-step consolidated intake ─────────────────────────
const intakeStep1Schema = z.object({
  countyId: z.string().min(1, "County is required"),
  courthouseId: z.string().optional(),
  plaintiffName: z.string().min(2, "Name is required"),
  plaintiffPhone: z.string().min(10, "Phone is required"),
  plaintiffAddress: z.string().min(5, "Address is required"),
  plaintiffCity: z.string().min(2, "City is required"),
  plaintiffState: z.string().min(2, "State is required"),
  plaintiffZip: z.string().min(5, "ZIP is required"),
  plaintiffEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  defendantIsBusinessOrEntity: z.boolean().default(false),
  defendantName: z.string().min(2, "Defendant name is required"),
  defendantAgentName: z.string().optional(),
  defendantPhone: z.string().optional(),
  defendantAddress: z.string().min(5, "Address is required"),
  defendantCity: z.string().min(2, "City is required"),
  defendantState: z.string().min(2, "State is required"),
  defendantZip: z.string().min(5, "ZIP is required"),
});

const intakeStep2Schema = z.object({
  claimType: z.string().min(1, "Claim type is required"),
  claimAmount: z.coerce.number().min(1, "Amount must be greater than 0"),
  claimDescription: z.string().min(10, "Please describe what happened"),
  incidentDate: z.string().min(1, "Date is required"),
  howAmountCalculated: z.string().min(5, "Please explain how you calculated the amount"),
});

const intakeStep3Schema = z.object({
  priorDemandMade: z.boolean(),
  priorDemandDescription: z.string().optional(),
  courthouseId: z.string().optional(),
  venueBasis: z.string().min(1, "Please select a reason"),
  venueReason: z.string().optional(),
});

const intakeStep4Schema = z.object({
  isSuingPublicEntity: z.boolean(),
  publicEntityClaimFiledDate: z.string().optional(),
  isAttyFeeDispute: z.boolean(),
  filedMoreThan12Claims: z.boolean(),
  claimOver2500: z.boolean(),
});

// ─── Root Workspace ───────────────────────────────────────────────────────────
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

      {/* Your Cases button */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary border rounded-md px-3 py-1.5 transition-colors w-fit bg-background hover:bg-muted">
        <ArrowLeft className="h-4 w-4" />
        Your Cases
      </Link>

      {/* Combined case header + readiness score */}
      {(() => {
        const score = readiness?.score ?? (currentCase as any).readinessScore ?? 0;
        const borderColor = score >= 80 ? "border-green-400" : score >= 50 ? "border-yellow-400" : "border-red-400";
        const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-500";
        const scoreLabel = score >= 80 ? "Ready to file" : score >= 50 ? "Nearly ready" : "Needs info";
        const allItems = [
          ...(readiness?.strengths ?? []).map((s: string) => ({ text: s, ok: true })),
          ...(readiness?.missingFields ?? []).map((f: string) => ({ text: f, ok: false })),
        ];
        const half = Math.ceil(allItems.length / 2);
        const col1 = allItems.slice(0, half);
        const col2 = allItems.slice(half);
        return (
          <div className={`bg-card px-5 py-3 rounded-xl border-2 ${borderColor} shadow-sm`}>
            <div className="grid grid-cols-2 gap-4 items-center">

              {/* LEFT: names + score + meta */}
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

              {/* RIGHT: readiness bullets or status */}
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

      {/* Tab navigation — click any tab to switch sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-[70px] md:top-[106px] z-30 bg-background -mx-4 px-4 md:-mx-6 md:px-6 pb-3 pt-1 border-b border-border shadow-sm">
        <TabsList className="w-full grid grid-cols-6 h-auto p-1 bg-muted/80 rounded-xl gap-0.5">
          <TabsTrigger
            value="intake"
            className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            data-testid="tab-intake"
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span className="leading-tight">Intake</span>
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            data-testid="tab-documents"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="leading-tight">Docs</span>
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            data-testid="tab-chat"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="leading-tight text-center">Ask Genie AI</span>
          </TabsTrigger>
          <TabsTrigger
            value="demand-letter"
            className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            data-testid="tab-demand-letter"
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span className="leading-tight">Demand</span>
          </TabsTrigger>
          <TabsTrigger
            value="forms"
            className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            data-testid="tab-forms"
          >
            <Scale className="h-4 w-4 shrink-0" />
            <span className="leading-tight">Forms</span>
          </TabsTrigger>
          <TabsTrigger
            value="prep"
            className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            data-testid="tab-prep"
          >
            <Gavel className="h-4 w-4 shrink-0" />
            <span className="leading-tight">Prep</span>
          </TabsTrigger>
        </TabsList>
        </div>
        
        <div className="mt-4 border rounded-lg bg-card shadow-sm min-h-[600px]">
          <TabsContent value="intake" className="p-0 m-0">
            <IntakeTab caseId={caseId} initialData={currentCase} />
          </TabsContent>
          <TabsContent value="documents" className="p-0 m-0">
            <DocumentsTab caseId={caseId} evidenceChecklist={(currentCase as any)?.evidenceChecklist || []} />
          </TabsContent>
          <TabsContent value="chat" className="p-0 m-0">
            <ChatTab caseId={caseId} />
          </TabsContent>
          <TabsContent value="demand-letter" className="p-0 m-0">
            <DemandLetterTab caseId={caseId} currentCase={currentCase} />
          </TabsContent>
          <TabsContent value="forms" className="p-0 m-0">
            <FormsTab caseId={caseId} currentCase={currentCase} onSwitchToIntake={() => setActiveTab("intake")} onSwitchToPrep={() => setActiveTab("prep")} />
          </TabsContent>
          <TabsContent value="prep" className="p-0 m-0">
            <HearingPrepTab caseId={caseId} currentCase={currentCase} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ─── INTAKE TAB ───────────────────────────────────────────────────────────────
function IntakeTab({ caseId, initialData }: { caseId: number, initialData: any }) {
  const [step, setStep] = useState(Math.min(initialData.intakeStep || 1, 4));
  const [autoOpenAdvisor, setAutoOpenAdvisor] = useState(false);
  const saveIntake = useSaveIntakeProgress();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getGetCaseReadinessQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCaseStatsQueryKey() });
  };

  const handleNext = (data: any) => {
    const nextStep = Math.min(step + 1, 4);
    saveIntake.mutate({ id: caseId, data: { step: nextStep, data } }, {
      onSuccess: () => {
        setStep(nextStep);
        invalidateAll();
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onError: (err: any) => {
        toast({
          title: "Could not save progress",
          description: err?.message || "Please check your connection and try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleComplete = (formData: any) => {
    saveIntake.mutate({ id: caseId, data: { step: 4, ...formData, intakeComplete: true } }, {
      onSuccess: () => {
        toast({ title: "Intake Complete", description: "Your information has been saved." });
        invalidateAll();
      }
    });
  };

  const progress = (step / 4) * 100;
  const stepLabels = [
    "Parties & Filing County",
    "Claim Details",
    "Prior Demand & Venue",
    "Eligibility & Review",
  ];

  const goToAdvisor = () => {
    setAutoOpenAdvisor(true);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-4 md:p-5">
      <HearingInfoCard caseId={caseId} initialData={initialData} />
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#14b8a6" }}>{step}</span>
            <span className="text-sm font-medium text-foreground">{stepLabels[step - 1]}</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">Step {step} of 4</span>
        </div>
        <Progress value={progress} className="h-2 [&>div]:bg-[#14b8a6]" />
      </div>

      {step === 1 && <Step1 initialData={initialData} onNext={handleNext} saving={saveIntake.isPending} />}
      {step === 2 && <Step2 caseId={caseId} initialData={initialData} onNext={handleNext} onBack={() => setStep(1)} saving={saveIntake.isPending} autoOpenAdvisor={autoOpenAdvisor} onAdvisorOpened={() => setAutoOpenAdvisor(false)} />}
      {step === 3 && <Step3 initialData={initialData} onNext={handleNext} onBack={() => setStep(2)} saving={saveIntake.isPending} />}
      {step === 4 && <Step4 initialData={initialData} onComplete={handleComplete} onBack={() => setStep(3)} saving={saveIntake.isPending} onCheckCase={goToAdvisor} />}
    </div>
  );
}

// ─── Step 1: Parties & Filing County ─────────────────────────────────────────
function Step1({ initialData, onNext, saving }: { initialData: any, onNext: (d: any) => void, saving?: boolean }) {
  const { data: counties } = useListCounties();
  const form = useForm({
    resolver: zodResolver(intakeStep1Schema),
    defaultValues: {
      countyId: initialData.countyId || "",
      courthouseId: initialData.courthouseId || "",
      plaintiffName: initialData.plaintiffName || "",
      plaintiffPhone: initialData.plaintiffPhone || "",
      plaintiffAddress: initialData.plaintiffAddress || "",
      plaintiffCity: initialData.plaintiffCity || "",
      plaintiffState: initialData.plaintiffState || "CA",
      plaintiffZip: initialData.plaintiffZip || "",
      plaintiffEmail: initialData.plaintiffEmail || "",
      defendantIsBusinessOrEntity: initialData.defendantIsBusinessOrEntity || false,
      defendantName: initialData.defendantName || "",
      defendantAgentName: initialData.defendantAgentName || "",
      defendantPhone: initialData.defendantPhone || "",
      defendantAddress: initialData.defendantAddress || "",
      defendantCity: initialData.defendantCity || "",
      defendantState: initialData.defendantState || "CA",
      defendantZip: initialData.defendantZip || "",
    }
  });

  const isBusiness = form.watch("defendantIsBusinessOrEntity");
  const selectedCountyId = form.watch("countyId");
  const selectedCourthouseId = form.watch("courthouseId");

  const selectedCounty = counties?.find((c: any) => c.id === selectedCountyId);
  const hasMultipleCourthouses = selectedCounty?.courthouses && selectedCounty.courthouses.length > 0;
  const selectedCourthouse = hasMultipleCourthouses
    ? selectedCounty.courthouses.find((ch: any) => ch.id === selectedCourthouseId)
    : null;

  const courtName = selectedCourthouse?.name ?? selectedCounty?.courthouseName;
  const courtAddress = selectedCourthouse
    ? `${selectedCourthouse.address}, ${selectedCourthouse.city}, CA ${selectedCourthouse.zip}`
    : selectedCounty ? `${selectedCounty.courthouseAddress}, ${selectedCounty.courthouseCity}, CA ${selectedCounty.courthouseZip}` : "";
  const courtPhone = selectedCourthouse?.phone ?? selectedCounty?.phone;

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => {
          onNext({
            ...data,
            courthouseName: courtName || null,
            courthouseAddress: selectedCourthouse?.address ?? selectedCounty?.courthouseAddress ?? null,
            courthouseCity: selectedCourthouse?.city ?? selectedCounty?.courthouseCity ?? null,
            courthouseZip: selectedCourthouse?.zip ?? selectedCounty?.courthouseZip ?? null,
            courthousePhone: courtPhone || null,
            courthouseWebsite: selectedCounty?.website ?? null,
            courthouseClerkEmail: selectedCounty?.clerkEmail ?? null,
          });
        })} className="space-y-4">

          {/* Filing County + Court Info — full width */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Filing County &amp; Court</h3>

            {/* County + Courthouse selectors side by side */}
            <div className="flex flex-wrap gap-3 items-end mb-3">
              <FormField control={form.control} name="countyId" render={({ field }) => (
                <FormItem className="flex-1 min-w-[200px]">
                  <FormLabel className="font-semibold">California County <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue("courthouseId", ""); }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select your county" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {counties?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} County</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {hasMultipleCourthouses && (
                <FormField control={form.control} name="courthouseId" render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel className="font-semibold">Courthouse Location</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select courthouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72 overflow-y-auto">
                        {selectedCounty.courthouses.map((ch: any) => (
                          <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            {/* Horizontal court info strip */}
            {selectedCounty && courtName && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-background border px-4 py-2.5 text-sm">
                <span className="font-semibold text-foreground">{courtName}</span>
                {courtAddress && <span className="text-muted-foreground">{courtAddress}</span>}
                {courtPhone && <span className="text-muted-foreground">{courtPhone}</span>}
                {selectedCounty?.website && (
                  <a
                    href={selectedCounty.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    Court website ↗
                  </a>
                )}
              </div>
            )}
            {selectedCountyId && !courtName && (
              <p className="text-xs text-muted-foreground italic">Loading court information…</p>
            )}
            {!selectedCountyId && (
              <p className="text-xs text-muted-foreground">Select a county to see the court location.</p>
            )}
          </div>

          {/* Plaintiff | Defendant — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Plaintiff ── */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Your Information (Plaintiff)</h3>

              <FormField control={form.control} name="plaintiffName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="plaintiffPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(555) 555-5555" value={field.value} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="plaintiffEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="plaintiffAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-5 gap-2">
                <FormField control={form.control} name="plaintiffCity" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>City</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="plaintiffState" render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>State</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="plaintiffZip" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>ZIP</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* ── Defendant ── */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Defendant Information</h3>

              <FormField control={form.control} name="defendantIsBusinessOrEntity" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">I am suing a business or public entity</FormLabel>
                </FormItem>
              )} />

              <FormField control={form.control} name="defendantName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isBusiness ? "Business Name" : "Full Name"} <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {isBusiness && (
                <FormField control={form.control} name="defendantAgentName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent for Service of Process (if known)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="defendantPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(555) 555-5555" value={field.value} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="defendantAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-5 gap-2">
                <FormField control={form.control} name="defendantCity" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>City</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="defendantState" render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>State</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="defendantZip" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>ZIP</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Step 2: Claim Details ────────────────────────────────────────────────────
function Step2({ caseId, initialData, onNext, onBack, saving, autoOpenAdvisor, onAdvisorOpened }: { caseId: number, initialData: any, onNext: (d: any) => void, onBack: () => void, saving?: boolean, autoOpenAdvisor?: boolean, onAdvisorOpened?: () => void }) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(intakeStep2Schema),
    defaultValues: {
      claimType: initialData.claimType || "",
      claimAmount: initialData.claimAmount || "",
      claimDescription: initialData.claimDescription || "",
      incidentDate: initialData.incidentDate || "",
      howAmountCalculated: initialData.howAmountCalculated || "",
    }
  });

  // ── Claim description expand modal state ─────────────────────────────────
  const [descModalOpen, setDescModalOpen] = useState(false);
  const [descModalValue, setDescModalValue] = useState("");

  // ── Advisor drawer state ───────────────────────────────────────────────────
  const [advisorOpen, setAdvisorOpen] = useState(false);

  useEffect(() => {
    if (autoOpenAdvisor) {
      openAdvisor();
      onAdvisorOpened?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  type AdvisorPhase = "idle" | "analyzing" | "questions" | "refining" | "done";
  const [advisorPhase, setAdvisorPhase] = useState<AdvisorPhase>("idle");
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evidenceChecklist, setEvidenceChecklist] = useState<{ id: string; item: string; description: string }[]>(
    Array.isArray(initialData.evidenceChecklist) ? initialData.evidenceChecklist : []
  );
  const [checkedEvidence, setCheckedEvidence] = useState<Set<string>>(new Set());
  const [refinedStatement, setRefinedStatement] = useState("");
  const [copied, setCopied] = useState(false);

  const openAdvisor = async () => {
    const values = form.getValues();
    if (!values.claimDescription || values.claimDescription.trim().length < 10) {
      toast({ title: "Add a description first", description: "Write at least a sentence about what happened so the advisor can help.", variant: "destructive" });
      return;
    }
    setAdvisorOpen(true);
    setAdvisorPhase("analyzing");
    setQuestions([]);
    setAnswers({});
    setEvidenceChecklist([]);
    setRefinedStatement("");
    setCopied(false);

    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/advisor/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setQuestions(data.questions || []);
      setEvidenceChecklist(data.evidenceChecklist || []);
      setAdvisorPhase("questions");
    } catch {
      toast({ title: "Advisor error", description: "Could not analyze your case. Please try again.", variant: "destructive" });
      setAdvisorPhase("idle");
      setAdvisorOpen(false);
    }
  };

  const refineStatement = async () => {
    setAdvisorPhase("refining");
    try {
      const token = await getToken();
      const values = form.getValues();
      const answersArr = questions.map(q => ({ question: q.question, answer: answers[q.id] || "" }));
      const res = await fetch(`/api/cases/${caseId}/advisor/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...values, answers: answersArr }),
      });
      if (!res.ok) throw new Error("Refine failed");
      const data = await res.json();
      const improved = data.refinedStatement?.trim() || "";
      setRefinedStatement(improved);
      // Auto-apply immediately — no extra button click required
      if (improved) {
        form.setValue("claimDescription", improved, { shouldValidate: true, shouldDirty: true });
        toast({ title: "✓ Description updated", description: "Your improved case description has been applied. Review it in the form below." });
      }
      setAdvisorPhase("done");
    } catch {
      toast({ title: "Advisor error", description: "Could not generate your statement. Please try again.", variant: "destructive" });
      setAdvisorPhase("questions");
    }
  };

  const copyToCase = () => {
    form.setValue("claimDescription", refinedStatement, { shouldValidate: true, shouldDirty: true });
    setCopied(true);
    toast({ title: "Description re-applied", description: "Your case description has been updated." });
    setTimeout(() => setCopied(false), 3000);
  };

  const toggleEvidence = (id: string) => {
    setCheckedEvidence(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField control={form.control} name="claimType" render={({ field }) => (
              <FormItem>
                <FormLabel>Claim Type <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {["Money Owed", "Unpaid Debt", "Security Deposit", "Property Damage", "Contract Dispute", "Fraud", "Other"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="claimAmount" render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Requested ($) <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="number" step="0.01" className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="incidentDate" render={({ field }) => (
            <FormItem>
              <FormLabel>When did this happen? <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <DateRangePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <p className="text-xs text-muted-foreground">Select a single date or a date range.</p>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField control={form.control} name="claimDescription" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  What happened? <span className="text-destructive">*</span>
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Describe why you're owed money</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Textarea
                      className="min-h-[88px] pr-10 resize-none"
                      placeholder="Briefly describe why the defendant owes you money — what happened, when, and how much you lost…"
                      {...field}
                    />
                    <button
                      type="button"
                      title="Expand to full editor"
                      onClick={() => {
                        setDescModalValue(field.value || "");
                        setDescModalOpen(true);
                      }}
                      className="absolute bottom-2 right-2 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="howAmountCalculated" render={({ field }) => (
              <FormItem>
                <FormLabel>How did you calculate this amount? <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea className="min-h-[88px]" placeholder="e.g. $500 unpaid rent + $100 late fee + $50 court costs" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* ── Case Advisor CTA ─────────────────────────────────────────────── */}
          <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm text-[#0d6b5e]">Not sure if your description is strong enough?</p>
              <p className="text-xs text-[#4a9990] mt-0.5">The Case Advisor will review what you've written, ask follow-up questions, and help you write a stronger statement — plus tell you exactly what evidence to gather.</p>
            </div>
            <Button type="button" onClick={openAdvisor} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-2">
              <Sparkles className="h-4 w-4" />
              Check My Case
            </Button>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
            </Button>
          </div>
        </form>
      </Form>

      {/* ── Claim Description Expand Modal ────────────────────────────────────── */}
      <Dialog open={descModalOpen} onOpenChange={setDescModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Maximize2 className="h-5 w-5 text-primary" />
              What happened? — Full Description Editor
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Write as much detail as you need. Explain what happened, when it happened, and exactly how much money you lost. The more specific you are, the stronger your case.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
            <textarea
              value={descModalValue}
              onChange={(e) => setDescModalValue(e.target.value)}
              placeholder="Describe what happened in your own words. Include:&#10;• What the defendant did (or didn't do)&#10;• When it happened (specific dates)&#10;• The exact dollar amount you lost and why&#10;• What you tried to do to resolve it before going to court"
              className="flex-1 min-h-[320px] w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{descModalValue.length} characters</span>
              {descModalValue.length > 650 && (
                <span className="text-amber-600 font-medium">⚠ Long descriptions may need a separate MC-030 attachment — the AI will help generate it.</span>
              )}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 gap-2">
            <Button variant="outline" onClick={() => setDescModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const currentFieldValue = form.getValues("claimDescription");
              if (descModalValue !== currentFieldValue) {
                form.setValue("claimDescription", descModalValue, { shouldValidate: true, shouldDirty: true });
              }
              setDescModalOpen(false);
            }}>
              Save Description
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Case Advisor Drawer ──────────────────────────────────────────────── */}
      <Sheet open={advisorOpen} onOpenChange={setAdvisorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="p-5 border-b bg-gradient-to-r from-[#ddf6f3] to-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-base">Case Advisor</SheetTitle>
                <SheetDescription className="text-xs">Reviewing your case to help you build a stronger description</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 p-5 space-y-6 overflow-y-auto">

            {/* ── Phase: Analyzing ── */}
            {advisorPhase === "analyzing" && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="h-12 w-12 rounded-full bg-[#ddf6f3] flex items-center justify-center animate-pulse">
                  <Sparkles className="h-6 w-6 text-[#0d6b5e]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0d6b5e]">Reviewing your case…</p>
                  <p className="text-sm text-muted-foreground mt-1">Identifying gaps and preparing questions</p>
                </div>
              </div>
            )}

            {/* ── Phase: Questions + Evidence ── */}
            {(advisorPhase === "questions" || advisorPhase === "refining") && (
              <>
                {questions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold">1</div>
                      <h3 className="font-semibold text-sm">Answer these questions to strengthen your case</h3>
                    </div>
                    <div className="space-y-4">
                      {questions.map((q) => (
                        <div key={q.id} className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">{q.question}</label>
                          <Textarea
                            className="min-h-[70px] text-sm"
                            placeholder="Your answer…"
                            value={answers[q.id] || ""}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={refineStatement}
                      disabled={advisorPhase === "refining"}
                      className="w-full bg-[#0d6b5e] hover:bg-[#0a5449] text-white gap-2"
                    >
                      {advisorPhase === "refining" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Generating your statement…</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Generate My Statement</>
                      )}
                    </Button>
                  </div>
                )}

                {evidenceChecklist.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-[#0d6b5e] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                      <h3 className="font-semibold text-sm">Evidence you should gather</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">This list is saved to your case. Gather what you can — you can upload documents anytime from the Documents tab.</p>
                    <div className="space-y-2">
                      {evidenceChecklist.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleEvidence(item.id)}
                          className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors"
                        >
                          <div className="mt-0.5 shrink-0 text-[#0d6b5e]">
                            {checkedEvidence.has(item.id)
                              ? <CheckSquare2 className="h-5 w-5" />
                              : <Square className="h-5 w-5 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${checkedEvidence.has(item.id) ? "line-through text-muted-foreground" : ""}`}>{item.item}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => setAdvisorOpen(false)}
                    className="w-full bg-[#0d6b5e] hover:bg-[#0a5449] text-white"
                  >
                    Done for now
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Your document checklist is saved — find it in the Documents tab whenever you're ready to upload.</p>
                </div>
              </>
            )}

            {/* ── Phase: Done — Show Refined Statement ── */}
            {advisorPhase === "done" && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-green-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">✓</div>
                    <div>
                      <h3 className="font-semibold text-sm">Description updated in your form</h3>
                      <p className="text-xs text-muted-foreground">Already applied — scroll down to review it</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#a8e6df] bg-[#f0fffe] p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {refinedStatement}
                  </div>
                  <Button
                    type="button"
                    onClick={copyToCase}
                    variant="outline"
                    className={`w-full gap-2 text-sm ${copied ? "border-green-500 text-green-700" : ""}`}
                  >
                    {copied ? <><CheckCircle className="h-4 w-4" /> Re-applied!</> : <><RotateCcw className="h-4 w-4" /> Re-apply to form</>}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setAdvisorPhase("questions")}
                    className="w-full text-xs text-muted-foreground hover:text-foreground text-center hover:underline"
                  >
                    ← Back to questions to refine further
                  </button>
                </div>

                {evidenceChecklist.length > 0 && (
                  <div className="space-y-3 border-t pt-5">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-[#0d6b5e] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                      <h3 className="font-semibold text-sm">Evidence to gather</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">This list is saved to your case — find it anytime in the Documents tab when you're ready to upload.</p>
                    <div className="space-y-2">
                      {evidenceChecklist.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleEvidence(item.id)}
                          className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors"
                        >
                          <div className="mt-0.5 shrink-0 text-[#0d6b5e]">
                            {checkedEvidence.has(item.id)
                              ? <CheckSquare2 className="h-5 w-5" />
                              : <Square className="h-5 w-5 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${checkedEvidence.has(item.id) ? "line-through text-muted-foreground" : ""}`}>{item.item}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => setAdvisorOpen(false)}
                    className="w-full bg-[#0d6b5e] hover:bg-[#0a5449] text-white"
                  >
                    Done for now
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Step 3: Prior Demand & Venue ─────────────────────────────────────────────
function Step3({ initialData, onNext, onBack, saving }: { initialData: any, onNext: (d: any) => void, onBack: () => void, saving?: boolean }) {
  const form = useForm({
    resolver: zodResolver(intakeStep3Schema),
    defaultValues: {
      priorDemandMade: initialData.priorDemandMade ?? false,
      priorDemandDescription: initialData.priorDemandDescription || "",
      courthouseId: initialData.courthouseId || "",
      venueBasis: initialData.venueBasis || "",
      venueReason: initialData.venueReason || "",
    }
  });

  const madeDemand = form.watch("priorDemandMade");
  const basis = form.watch("venueBasis");

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">

          {/* Two-column: Prior Demand | Venue Basis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* ── Prior Demand ── */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Prior Demand</h3>
              <FormField control={form.control} name="priorDemandMade" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-medium">Have you already asked the defendant to pay you?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(val) => field.onChange(val === 'true')}
                      defaultValue={field.value ? 'true' : 'false'}
                      className="flex flex-col space-y-2"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="true" /></FormControl>
                        <FormLabel className="font-normal">Yes, I asked them.</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="false" /></FormControl>
                        <FormLabel className="font-normal">No, I have not asked them yet.</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {madeDemand && (
                <FormField control={form.control} name="priorDemandDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>How and when did you ask them?</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="e.g. Sent a text on Oct 1st and an email on Oct 5th demanding payment."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            {/* ── Venue Basis ── */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Why This County?</h3>
              <FormField control={form.control} name="venueBasis" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-medium">Select the reason you're filing here <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2">
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 cursor-pointer">
                        <FormControl><RadioGroupItem value="where_defendant_lives" /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">Where the defendant lives or does business</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 cursor-pointer">
                        <FormControl><RadioGroupItem value="where_damage_happened" /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">Where the damage or injury happened</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 cursor-pointer">
                        <FormControl><RadioGroupItem value="where_contract_made_broken" /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">Where the contract was made or broken</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 cursor-pointer">
                        <FormControl><RadioGroupItem value="other" /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">Other reason</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {basis === 'other' && (
                <FormField control={form.control} name="venueReason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please explain</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Step 4: Eligibility & Review ─────────────────────────────────────────────
function Step4({ initialData, onComplete, onBack, saving, onCheckCase }: { initialData: any, onComplete: (d: any) => void, onBack: () => void, saving?: boolean, onCheckCase?: () => void }) {
  const form = useForm({
    resolver: zodResolver(intakeStep4Schema),
    defaultValues: {
      isSuingPublicEntity: initialData.isSuingPublicEntity || false,
      publicEntityClaimFiledDate: initialData.publicEntityClaimFiledDate || "",
      isAttyFeeDispute: initialData.isAttyFeeDispute || false,
      filedMoreThan12Claims: initialData.filedMoreThan12Claims || false,
      claimOver2500: initialData.claimOver2500 || false,
    }
  });

  const suingPublic = form.watch("isSuingPublicEntity");

  return (
    <div className="space-y-5 text-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onComplete)} className="space-y-5">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Eligibility questions ── */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Eligibility Questions</h3>

              <FormField control={form.control} name="isSuingPublicEntity" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">Suing a public entity? (e.g. City, County, State)</FormLabel>
                  </div>
                </FormItem>
              )} />

              {suingPublic && (
                <FormField control={form.control} name="publicEntityClaimFiledDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>When did you file a government claim with them?</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="isAttyFeeDispute" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">Is this a dispute with a lawyer about attorney fees?</FormLabel>
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control} name="filedMoreThan12Claims" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">Filed more than 12 small claims in California in the past 12 months?</FormLabel>
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control} name="claimOver2500" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">Claim over $2,500: Have you filed 2+ other small claims over $2,500 in CA this calendar year?</FormLabel>
                  </div>
                </FormItem>
              )} />
            </div>

            {/* ── Summary review ── */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Review Your Case</h3>
              <div className="space-y-4 text-sm">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Plaintiff</p>
                    <p className="font-semibold">{initialData.plaintiffName || "—"}</p>
                    <p className="text-muted-foreground">{initialData.plaintiffAddress || ""}</p>
                    <p className="text-muted-foreground">{[initialData.plaintiffCity, initialData.plaintiffState, initialData.plaintiffZip].filter(Boolean).join(", ")}</p>
                    {initialData.plaintiffPhone && <p className="text-muted-foreground">{initialData.plaintiffPhone}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Defendant</p>
                    <p className="font-semibold">{initialData.defendantName || "—"}</p>
                    <p className="text-muted-foreground">{initialData.defendantAddress || ""}</p>
                    <p className="text-muted-foreground">{[initialData.defendantCity, initialData.defendantState, initialData.defendantZip].filter(Boolean).join(", ")}</p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Claim</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{initialData.claimType || "—"}</span>
                    <span className="font-bold text-primary text-sm">${initialData.claimAmount ? Number(initialData.claimAmount).toLocaleString() : "—"}</span>
                  </div>
                  {initialData.incidentDate && <p className="text-muted-foreground text-sm mb-1">Date: {initialData.incidentDate}</p>}
                  {initialData.claimDescription && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{initialData.claimDescription}</p>
                  )}
                  {initialData.howAmountCalculated && (
                    <div className="mt-2 pt-2 border-t border-dashed">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Amount Calculation</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{initialData.howAmountCalculated}</p>
                    </div>
                  )}
                </div>

                {(initialData.courthouseName || initialData.countyId) && (
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Court</p>
                    {initialData.courthouseName && <p className="font-semibold leading-snug">{initialData.courthouseName}</p>}

                    {initialData.courthouseAddress && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{initialData.courthouseAddress}, {initialData.courthouseCity} {initialData.courthouseZip}</span>
                      </div>
                    )}

                    {initialData.courthousePhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={`tel:${initialData.courthousePhone.replace(/\D/g, "")}`} className="text-primary font-medium hover:underline">
                          {initialData.courthousePhone}
                        </a>
                      </div>
                    )}

                    {initialData.courthouseClerkEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={`mailto:${initialData.courthouseClerkEmail}`} className="text-primary hover:underline break-all">
                          {initialData.courthouseClerkEmail}
                        </a>
                      </div>
                    )}

                    {initialData.courthouseWebsite && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={initialData.courthouseWebsite} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 break-all">
                          Court website <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </a>
                      </div>
                    )}

                    {initialData.filingFee && (
                      <p className="text-sm">Filing fee: <span className="font-bold">${initialData.filingFee}</span></p>
                    )}

                    {initialData.courthouseAddress && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          `${initialData.courthouseAddress}, ${initialData.courthouseCity}, CA ${initialData.courthouseZip}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Get Directions
                      </a>
                    )}
                  </div>
                )}

                {initialData.venueBasis && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Venue Basis</p>
                    <p>{initialData.venueBasis.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {onCheckCase && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Want to strengthen your case?</p>
                <p className="text-sm text-amber-700 mt-0.5">Use the Case Advisor to review your claim description and get specific guidance on evidence to gather.</p>
              </div>
              <Button type="button" onClick={onCheckCase} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-2 whitespace-nowrap">
                <Sparkles className="h-4 w-4" />
                Check My Case
              </Button>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
            <Button
              type="submit"
              size="lg"
              data-testid="button-complete-intake"
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8"
            >
              {saving ? "Saving…" : "Complete Intake ✓"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Hearing Info Card (compact) ─────────────────────────────────────────────
function HearingInfoCard({ caseId, initialData }: { caseId: number; initialData: any }) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    caseNumber: initialData.caseNumber || "",
    hearingDate: initialData.hearingDate || "",
    hearingTime: initialData.hearingTime || "",
    hearingJudge: initialData.hearingJudge || "",
    hearingCourtroom: initialData.hearingCourtroom || "",
    hearingNotes: initialData.hearingNotes || "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/hearing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
      toast({ title: "Hearing details saved", description: form.hearingDate ? "Email reminders scheduled." : "Saved." });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50/70 px-3 pt-2 pb-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <CalendarIcon className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-teal-800">Court's Response</span>
        <span className="text-xs text-teal-600 hidden sm:inline">— Enter once the court mails you back your case number, date &amp; time</span>
      </div>
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-teal-700 mb-0.5">Case #</label>
            <Input placeholder="24SC01234" value={form.caseNumber} onChange={e => setForm(f => ({ ...f, caseNumber: e.target.value }))} className="h-7 text-xs bg-white border-teal-200 px-2" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-teal-700 mb-0.5">Hearing Date</label>
            <Input type="date" value={form.hearingDate} onChange={e => setForm(f => ({ ...f, hearingDate: e.target.value }))} className="h-7 text-xs bg-white border-teal-200 px-2" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-teal-700 mb-0.5">Time</label>
            <Input type="time" value={form.hearingTime} onChange={e => setForm(f => ({ ...f, hearingTime: e.target.value }))} className="h-7 text-xs bg-white border-teal-200 px-2" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-teal-700 mb-0.5">Dept / Room</label>
            <Input placeholder="Dept. 12" value={form.hearingCourtroom} onChange={e => setForm(f => ({ ...f, hearingCourtroom: e.target.value }))} className="h-7 text-xs bg-white border-teal-200 px-2" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-teal-700 mb-0.5">Judge</label>
            <Input placeholder="Hon. Rodriguez" value={form.hearingJudge} onChange={e => setForm(f => ({ ...f, hearingJudge: e.target.value }))} className="h-7 text-xs bg-white border-teal-200 px-2" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} size="sm" className="h-7 w-full text-xs bg-teal-600 hover:bg-teal-700 text-white px-2 gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────────────────────
function DocumentsTab({ caseId, evidenceChecklist }: { caseId: number; evidenceChecklist: { id: string; item: string; description: string; checked?: boolean }[] }) {
  const { data: documents } = useListDocuments(caseId, { query: { enabled: !!caseId } });
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    () => new Set(evidenceChecklist.filter(i => i.checked).map(i => i.id))
  );

  // Keep local checked state in sync when parent refetches fresh case data
  useEffect(() => {
    setCheckedItems(new Set(evidenceChecklist.filter(i => i.checked).map(i => i.id)));
  }, [evidenceChecklist]);

  const saveChecked = async (next: Set<string>) => {
    try {
      const token = await getToken();
      await fetch(`/api/cases/${caseId}/advisor/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ checkedIds: Array.from(next) }),
      });
      // Refresh the parent case so checked flags persist across tab switches
      queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
    } catch { /* silent — UI state is still correct */ }
  };

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      saveChecked(n);
      return n;
    });
  };

  const deleteChecklistItem = async (itemId: string) => {
    try {
      const token = await getToken();
      await fetch(`/api/cases/${caseId}/advisor/checklist/${itemId}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
    } catch { /* silent */ }
  };

  const invalidateDocAndScore = () => {
    queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getGetCaseReadinessQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCaseStatsQueryKey() });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    await uploadDoc.mutateAsync({ id: caseId, data: { file, label: file.name } });
    invalidateDocAndScore();
    toast({ title: "Document uploaded", description: "OCR text extraction is running in the background." });
    e.target.value = "";
  };

  const handleDelete = (docId: number) => {
    deleteDoc.mutate({ id: caseId, docId }, {
      onSuccess: () => {
        invalidateDocAndScore();
      }
    });
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{i18n.documents.title}</h2>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploadDoc.isPending} data-testid="button-upload-doc">
          <Paperclip className="h-4 w-4 mr-2" />
          {uploadDoc.isPending ? i18n.documents.processing : i18n.documents.uploadBtn}
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleUpload} />
      </div>

      {evidenceChecklist.length > 0 && (
        <div className="mb-6 rounded-lg border border-[#a8e6df] bg-[#f0fffe] p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-4 w-4 text-[#0d6b5e]" />
            <h3 className="font-semibold text-sm text-[#0d6b5e]">Your Document Checklist</h3>
            <span className="text-xs text-muted-foreground ml-auto">{checkedItems.size}/{evidenceChecklist.length} gathered</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Check off each document as you gather it, then upload it using the button above.</p>
          <div className="space-y-2">
            {evidenceChecklist.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-[#a8e6df] bg-white p-3"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="flex items-start gap-3 flex-1 text-left hover:bg-[#ddf6f3]/40 transition-colors rounded"
                >
                  <div className="mt-0.5 shrink-0 text-[#0d6b5e]">
                    {checkedItems.has(item.id)
                      ? <CheckSquare2 className="h-5 w-5" />
                      : <Square className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${checkedItems.has(item.id) ? "line-through text-muted-foreground" : ""}`}>{item.item}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => deleteChecklistItem(item.id)}
                  className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Remove from checklist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Don't forget:</span> Upload any other documents, photos, screenshots, or images you believe are relevant to your case — even if they're not on the checklist above. More evidence strengthens your claim.
        </p>
      </div>

      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg px-5 py-4 mb-6 bg-muted/5 cursor-pointer hover:border-primary/40 transition-colors flex items-center gap-4"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="shrink-0 w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Drag and drop files here</p>
          <p className="text-xs text-muted-foreground">Contracts, receipts, photos, texts, emails, invoices — anything related to your case</p>
        </div>
        <Button variant="outline" type="button" className="shrink-0" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse Files</Button>
      </div>

      <div className="space-y-4">
        {documents?.map((doc: any) => (
          <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded"><FileText className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="font-medium">{doc.originalName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant={doc.ocrStatus === 'complete' ? 'secondary' : 'outline'}
                    className={`text-[10px] ${doc.ocrStatus === 'complete' ? 'text-green-700 bg-green-100' : doc.ocrStatus === 'failed' ? 'text-red-700 bg-red-100' : ''}`}
                  >
                    {doc.ocrStatus === 'complete' ? i18n.documents.complete : doc.ocrStatus === 'failed' ? i18n.documents.failed : i18n.documents.processing}
                  </Badge>
                  <span>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ""}</span>
                  {doc.createdAt && (
                    <span>
                      {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      {new Date(doc.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(`/api/cases/${caseId}/documents/${doc.id}/file`, "_blank")}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                aria-label="View document"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(doc.id)}
                disabled={deleteDoc.isPending}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(!documents || documents.length === 0) && (
          <p className="text-center text-muted-foreground py-8">{i18n.documents.noDocs}</p>
        )}
      </div>
    </div>
  );
}

// ─── AI CHAT TAB ──────────────────────────────────────────────────────────────
// Uses raw fetch + ReadableStream for SSE — intentionally NOT using a generated hook.
// The AI is grounded in the user's case context and OCR'd documents via buildCaseContext (server-side).
function ChatTab({ caseId }: { caseId: number }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { getToken } = useAuth();

  const downloadChat = async (format: "pdf" | "word", scope: "last" | "all" = "all") => {
    const setLoading = format === "pdf" ? setDownloadingPdf : setDownloadingWord;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/chat/export/${format}?scope=${scope}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(err.error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "pdf" ? "pdf" : "docx";
      const label = scope === "last" ? "ai-document" : "ai-chat-transcript";
      a.download = `${label}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("[Chat export]", e);
      alert(e?.message || "Could not download. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const { data: history } = useGetChatHistory(caseId, { query: { enabled: !!caseId } });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // Detect download commands typed in the chat box
  // Returns { format, scope } where scope="last" means just the last AI response,
  // scope="all" means the full conversation transcript
  const detectDownloadCommand = (text: string): { format: "pdf" | "word"; scope: "last" | "all" } | null => {
    const t = text.toLowerCase().trim();
    const wordPatterns = [/word/, /\.docx/, /docx/, /ms word/, /microsoft word/];
    const pdfPatterns = [/\bpdf\b/, /\.pdf/];
    const actionPatterns = [/download/, /export/, /save/, /give me/, /get me/, /generate/, /send/];
    const hasAction = actionPatterns.some(p => p.test(t));
    if (!hasAction) return null;

    let format: "pdf" | "word" | null = null;
    if (wordPatterns.some(p => p.test(t))) format = "word";
    else if (pdfPatterns.some(p => p.test(t))) format = "pdf";
    if (!format) return null;

    // "all" only if user explicitly references the whole chat/conversation/transcript
    const allPatterns = [/\bchat\b/, /conversation/, /transcript/, /\ball\b/, /everything/, /whole/];
    const scope: "last" | "all" = allPatterns.some(p => p.test(t)) ? "all" : "last";

    return { format, scope };
  };

  // SSE streaming send — evidence-grounded via buildCaseContext on the server
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Intercept download commands — handle locally without hitting the AI
    const downloadCmd = detectDownloadCommand(content);
    if (downloadCmd) {
      const { format, scope } = downloadCmd;
      setInput("");
      const formatLabel = format === "pdf" ? "PDF" : "Word (.docx)";
      const scopeLabel = scope === "last"
        ? "that content"
        : "the full chat transcript";
      const botMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Of course! Downloading ${scopeLabel} as a **${formatLabel}** file — your download will start in a moment.`,
      };
      setMessages(prev => [...prev, { id: Date.now(), role: 'user', content }, botMsg]);
      await downloadChat(format, scope);
      return;
    }

    const newMsg = { id: Date.now(), role: 'user', content };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const token = await getToken();
      const response = await fetch(`/api/cases/${caseId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let sseBuffer = "";

      if (reader) {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "" }]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          // Keep the last (potentially incomplete) line in the buffer
          sseBuffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                });
              }
            } catch {
              // Incomplete or malformed chunk — skip, buffer handles it
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        role: 'assistant',
        content: `Sorry, I ran into an error: ${e?.message || "Please try again."}`,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Push-to-talk: hold mic → browser speech recognition → release → auto-send
  // Uses Web Speech API (browser-native, free, real-time — no Whisper API needed)
  const handleVoiceStart = () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("[Voice] Web Speech API not supported in this browser");
      return;
    }

    // Snapshot whatever is already typed — new dictation appends to it, never replaces it
    const textBeforeRecording = input.trim();

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = true;   // show live text while speaking
    recognition.maxAlternatives = 1;
    recognition.continuous = true;       // keep listening through pauses — no length cap

    recognition.onresult = (event: any) => {
      // Collect ALL result segments (interim + final) for this session
      let sessionTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        sessionTranscript += event.results[i][0].transcript;
      }
      // Append to pre-existing input so repeated mic presses accumulate
      const combined = textBeforeRecording
        ? textBeforeRecording + " " + sessionTranscript.trim()
        : sessionTranscript.trim();
      setInput(combined);
    };

    recognition.onerror = (event: any) => {
      console.error("[Voice] Speech recognition error:", event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleVoiceStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };


  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 290px)", minHeight: "540px" }}>
      {/* Top bar */}
      <div className="bg-primary/5 border-b p-3 text-sm font-medium text-primary flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" /> Your AI Genie is trained on your uploaded documents.
        </div>
        {messages.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground font-normal">Download transcript:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => downloadChat("pdf")}
              disabled={downloadingPdf || downloadingWord}
            >
              {downloadingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => downloadChat("word")}
              disabled={downloadingPdf || downloadingWord}
            >
              {downloadingWord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Word
            </Button>
          </div>
        )}
      </div>

      {/* Messages — scrollable, fills available space */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground opacity-60">
            <div className="text-4xl mb-4">🧞</div>
            <p>Ask anything about your case.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
              {msg.role === 'user' ? (
                <p className="text-[13px] leading-[1.55] whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="text-[13px] leading-[1.55] prose prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-headings:mt-2.5 prose-headings:mb-1 prose-strong:font-semibold prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-a:text-primary">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-tl-sm p-4 text-muted-foreground flex gap-1">
              <span className="animate-bounce">●</span><span className="animate-bounce" style={{animationDelay: '0.2s'}}>●</span><span className="animate-bounce" style={{animationDelay: '0.4s'}}>●</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar — anchored to bottom of the chat tab, not the window */}
      <div className="shrink-0 bg-card border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                }
              }}
              placeholder={isRecording ? "🔴 Recording — release mic to stop…" : i18n.chat.placeholder}
              rows={1}
              disabled={isRecording}
              className="w-full resize-none overflow-hidden rounded-full border border-input bg-background px-4 py-2 pr-10 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-70 transition-colors"
              style={{ minHeight: "38px", maxHeight: "120px" }}
            />
            {/* Mic — inside the input, right edge */}
            <Button
              size="icon"
              variant="ghost"
              className={`absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full transition-colors ${isRecording ? 'text-destructive animate-pulse bg-destructive/10' : 'text-muted-foreground hover:text-primary'}`}
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceStop}
              onMouseLeave={isRecording ? handleVoiceStop : undefined}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceStop}
              aria-label={isRecording ? "Recording — release to stop" : "Hold to record"}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          {/* Send — right of input */}
          <Button
            onClick={() => { sendMessage(input); }}
            size="icon"
            className="h-9 w-9 rounded-full shrink-0"
            disabled={isTyping || isRecording || !input.trim()}
          >
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── FORMS TAB ────────────────────────────────────────────────────────────────
// Readiness score: intake(60) + documents(30) + prior demand(10) = 0–100
// Score ≥ 80 unlocks SC-100 PDF download
// ─── Forms Catalog ────────────────────────────────────────────────────────────
const FORMS_CATALOG = [
  /* ── Top 4 — the core filing set ───────────────────────────────────────── */
  {
    id: "sc100",
    number: "SC-100",
    name: "Plaintiff's Claim and ORDER to Go to Small Claims Court",
    shortDesc: "The primary form to file your small claims case. Lists your claim, both parties, and the amount you're seeking.",
    detailDesc: "SC-100 is the form that starts your California small claims case. It tells the court who you are suing, how much money you want, and why you are asking the court to order payment. You must complete this form — it is the statewide form used to open a small claims case.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/sc100.pdf",
    caseTypes: "both" as const,
  },
  {
    id: "mc030",
    number: "MC-030",
    name: "Declaration",
    shortDesc: "A general sworn statement form for information that doesn't fit on the main form.",
    detailDesc: "MC-030 is a blank declaration form used across many types of California court cases, including small claims. It is used whenever a party needs to submit a written statement under penalty of perjury that doesn't fit within the space provided on a specific form. For example, you might attach an MC-030 to provide a longer explanation of your claim, document witness statements, or supply additional facts. The person signing declares under penalty of perjury that everything written is true and correct.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/mc030.pdf",
    caseTypes: "both" as const,
  },
  {
    id: "sc104",
    number: "SC-104",
    name: "Proof of Service",
    shortDesc: "Documents that the defendant was properly served with the court papers.",
    detailDesc: "SC-104 is completed by the person who delivered (served) the court papers to the defendant — this must be someone who is at least 18 years old and not named in the case. It cannot be you. The server records exactly how, when, and where the papers were delivered, then signs under penalty of perjury. This completed form must be filed with the court at least 5 days before the hearing date. Without proof of service, the court cannot proceed.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/sc104.pdf",
    caseTypes: "both" as const,
  },
  {
    id: "fw001",
    number: "FW-001",
    name: "Request to Waive Court Fees",
    shortDesc: "Ask the court to waive your filing fees if paying would be a financial hardship.",
    detailDesc: "FW-001 lets you ask the court to waive court filing fees when you cannot afford them. You may qualify if you receive public benefits (Medi-Cal, CalWORKS, SSI, etc.), your income is below the threshold for your household size, or paying the fee would prevent you from meeting your household's basic needs. File this with — or before — your SC-100. If granted, the court waives fees at no cost to you; if denied, you'll have time to pay. This form is confidential.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/fw001.pdf",
    caseTypes: "both" as const,
  },
  /* ── Supporting & supplemental forms ───────────────────────────────────── */
  {
    id: "sc100a",
    number: "SC-100A",
    name: "Other Plaintiffs or Defendants",
    shortDesc: "Attach to SC-100 when your case has more than two plaintiffs or defendants.",
    detailDesc: "SC-100A is an attachment form used alongside SC-100 when there are more than two parties on either side of the case. If you are suing three or more people or businesses, or if three or more people are bringing the claim together, you list the additional parties here. Each additional plaintiff must also sign and declare the information is true. Attach as many copies of SC-100A as needed to list everyone involved.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/sc100a.pdf",
    caseTypes: "both" as const,
  },
  {
    id: "sc103",
    number: "SC-103",
    name: "Fictitious Business Name",
    shortDesc: "Required when a party is suing or being sued under a 'doing business as' (DBA) name.",
    detailDesc: "SC-103 must be attached to SC-100 or SC-120 whenever a plaintiff or defendant operates under a fictitious business name — commonly called a 'DBA' (doing business as). The form requires proof that the fictitious name is properly registered with the county and published as required by California law. If this step is skipped, the court can dismiss the case. Only the business owner, president, CEO, or another qualified officer may sign this form.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/sc103.pdf",
    caseTypes: "business" as const,
  },
  {
    id: "sc105",
    number: "SC-105",
    name: "Request for Court Order and Answer",
    shortDesc: "Ask the court to issue a specific order before or after your trial.",
    detailDesc: "SC-105 is a two-part form. The first part (Request) is filled out by the party asking the court to make a specific order — for example, requesting more time, asking to amend the claim, or requesting a payment plan after judgment. The second part (Answer) allows the other party to respond. If a request is filed before the trial, the requesting party must serve copies on all other parties. If filed after trial, the court clerk handles service.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/sc105.pdf",
    caseTypes: "both" as const,
  },
  {
    id: "sc112a",
    number: "SC-112A",
    name: "Proof of Service by Mail",
    shortDesc: "Proves that certain court documents were properly served by mailing them.",
    detailDesc: "SC-112A is used when specific forms are allowed to be served by mail rather than in person. It covers forms like SC-105, SC-109, SC-114, SC-133, SC-150, and SC-221. Important: it cannot be used for serving the original SC-100 or SC-120 claim forms — those require in-person service documented on SC-104. The person mailing the documents must be 18 or older, not a party to the case, and must live or work in the county where the mailing takes place.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/sc112a.pdf",
    caseTypes: "both" as const,
  },
  {
    id: "sc120",
    number: "SC-120",
    name: "Defendant's Claim and ORDER to Go to Small Claims Court",
    shortDesc: "Used by the defendant to file a counter-claim against the original plaintiff.",
    detailDesc: "SC-120 allows the defendant — the person who was originally sued — to file their own claim against the plaintiff in the same case. This is called a cross-complaint or counter-claim. Filing SC-120 does not remove the obligation to appear at the original hearing; both claims are heard together on the same date. The defendant must still serve the plaintiff with this form before the hearing, following the same service rules that applied to the original SC-100.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/sc120.pdf",
    caseTypes: "both" as const,
  },
  {
    id: "sc140",
    number: "SC-140",
    name: "Notice of Appeal",
    shortDesc: "File this to appeal a small claims judgment to the superior court.",
    detailDesc: "SC-140 is used when a party disagrees with the small claims court's decision and wants to appeal it to the superior court. Note that only defendants may appeal a small claims judgment — plaintiffs give up the right to appeal when they choose small claims court. The form must be filed within 30 days of the judgment. Once filed, the superior court will notify all parties of a new hearing date. The appeal is heard as a new trial (de novo), not a review of the original proceedings.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/sc140.pdf",
    caseTypes: "both" as const,
  },
  {
    id: "sc150",
    number: "SC-150",
    name: "Request to Postpone Trial",
    shortDesc: "Ask the court to reschedule your hearing to a later date.",
    detailDesc: "SC-150 lets either a plaintiff or defendant formally request that the court move the trial to a different date. You must explain why you need a postponement and, if the trial is within 10 days, why you didn't ask sooner. After completing the form, you must serve copies on all other parties using SC-104 (in person) or SC-112A (by mail), then file it with the court clerk. There may be a $10 filing fee. The court will mail all parties its decision.",
    available: true,
    blankFormUrl: "https://www.courts.ca.gov/documents/sc150.pdf",
    caseTypes: "both" as const,
  },
];

const FORM_GUIDE_CONTENT: Record<string, {
  role: "primary" | "attachment";
  effectiveDate: string;
  bestUse: string;
  whenToUse: string[];
  whenNotToUse: string[];
  haveReady: string[];
  warnings: string[];
  relatedForms: { number: string; reason: string }[];
}> = {
  sc100: {
    role: "primary",
    effectiveDate: "January 1, 2026",
    bestUse: "Use this form if you are opening the case. It is the main starting form for small claims plaintiffs.",
    whenToUse: [
      "You want to sue a person, business, or agency for money in California small claims court.",
      "You have worked out the correct legal name and service address for each defendant.",
      "You are ready to state the amount you want, why you are owed it, and why the case belongs in that county.",
    ],
    whenNotToUse: [
      "You are responding to a case filed against you — use SC-120 instead.",
      "You only need more room to list additional parties — use SC-100A as an attachment, not a replacement.",
      "You need a long witness-style statement — use MC-030 Declaration as an attachment if the court allows it.",
    ],
    haveReady: [
      "Your full name and mailing address.",
      "The exact legal name of each defendant.",
      "A service address for each defendant.",
      "The amount claimed and a short, plain explanation of what happened.",
      "The reason the county is the correct place to sue.",
      "The courthouse address and any local filing requirements.",
    ],
    warnings: [
      "Naming the wrong defendant is one of the biggest small-claims mistakes — it can make collection difficult even if you win.",
      "Keep the 'why' section short and factual. Let supporting detail live in attachments or evidence uploads.",
      "After filing, service deadlines matter: personal service is usually due at least 15 days before trial, or 20 days if the defendant is in another county.",
    ],
    relatedForms: [
      { number: "SC-100A", reason: "Add extra plaintiffs or defendants" },
      { number: "SC-103", reason: "Suing under a fictitious business name" },
      { number: "SC-104", reason: "Prove the claim was served" },
      { number: "SC-150", reason: "Postpone the trial date later" },
    ],
  },
  sc100a: {
    role: "attachment",
    effectiveDate: "January 1, 2017",
    bestUse: "Attach to SC-100 or SC-120 only when the case has more people or businesses than the main form can hold.",
    whenToUse: [
      "There are more than two plaintiffs or more defendants than the main form can list.",
      "You need to identify each extra person or business clearly for the court record and for service.",
    ],
    whenNotToUse: [
      "Your case fits on SC-100 or SC-120 without extra names — this form is unnecessary.",
      "You need extra room to explain facts. This form is only for listing additional parties, not adding narrative.",
    ],
    haveReady: [
      "The caption information from the main form (case number, names).",
      "The legal name and address details for each additional plaintiff or defendant.",
      "Consistent spellings of all names used elsewhere in the case.",
    ],
    warnings: [
      "This form solves a space problem, not a strategy problem. If you're unsure who to name, take time to confirm the correct legal identity before filing — naming the wrong party can cause service and collection problems.",
      "Don't confuse trade names with legal entities. Confirm official names from business records before filing.",
    ],
    relatedForms: [
      { number: "SC-100", reason: "Main plaintiff claim form" },
      { number: "SC-120", reason: "Defendant counter-claim form" },
      { number: "SC-103", reason: "If a listed business uses a fictitious name" },
    ],
  },
  sc103: {
    role: "attachment",
    effectiveDate: "January 1, 2026",
    bestUse: "Attach to SC-100 or SC-120 when a party is suing or being identified through a DBA (\"doing business as\") name.",
    whenToUse: [
      'A sole proprietor, partnership, or other business uses a "doing business as" (DBA) name.',
      "You want the court record to connect the brand name customers know with the legal owner behind it.",
    ],
    whenNotToUse: [
      "The business is already being named by its full legal entity name and no fictitious business name issue exists.",
      "You are merely mentioning a nickname or informal label that is not actually the business name used in commerce.",
    ],
    haveReady: [
      "The exact fictitious business name as registered.",
      "The legal owner information (person or entity) behind that name.",
      "County fictitious business name filing records or other business registration documents for consistency.",
    ],
    warnings: [
      "A DBA is not a separate legal person — it is a label attached to a real owner or entity. Don't treat them as different parties.",
      "Collecting a judgment is much easier when the legal identity is correct from the start. Take time to look up the official registration before filing.",
    ],
    relatedForms: [
      { number: "SC-100", reason: "Plaintiff claim form" },
      { number: "SC-120", reason: "Defendant claim form" },
    ],
  },
  sc104: {
    role: "primary",
    effectiveDate: "January 1, 2009",
    bestUse: "Use this after a non-party adult personally serves the filed small claims papers so the court knows service happened correctly.",
    whenToUse: [
      "A non-party adult (age 18 or older) personally handed the filed small claims papers to the person or entity that had to be served.",
      "You need to show the court who served, when service happened, and exactly how it was done.",
    ],
    whenNotToUse: [
      "You are proving mail service instead of personal service — a different proof-of-service form may be needed.",
      "You are trying to serve papers yourself. The plaintiff cannot serve their own papers.",
    ],
    haveReady: [
      "Server's full name, age, and address (must be 18+ and not a party to the case).",
      "The date, time, and place of service.",
      "The identity of the person who actually received the papers.",
      "Case information that matches the filed claim exactly.",
    ],
    warnings: [
      "Service is a technical step — if it is done wrong, the hearing can be delayed or the case dismissed.",
      "The plaintiff cannot personally serve their own papers. Use someone else.",
      "If substituted service was used, additional mailing proof is required and stricter timing rules apply.",
    ],
    relatedForms: [
      { number: "SC-104B", reason: "Explanation of service details" },
      { number: "SC-104A", reason: "If substituted service required a separate mailing proof" },
      { number: "SC-112A", reason: "When later papers are served by mail instead" },
    ],
  },
  sc105: {
    role: "primary",
    effectiveDate: "July 1, 2025",
    bestUse: "Use this to ask the judge to rule on a specific procedural issue before or after trial — or to respond when the other side has filed the same request.",
    whenToUse: [
      "You need a court order connected to the small claims case, such as changing a party name or requesting a specific procedural ruling.",
      "The other side already filed SC-105 and you need to tell the court your side before the judge rules.",
    ],
    whenNotToUse: [
      "You are simply asking to move the hearing date — SC-150 is the cleaner, more specific form for that.",
      "You want to explain the merits of the whole case. That belongs at trial, not in a procedural request form.",
    ],
    haveReady: [
      "The exact order you want the judge to make — state it in one sentence.",
      "A concise, facts-first explanation of why the order is needed.",
      "Any supporting documents that back up the request.",
      "Enough lead time to serve the other side if service is required before the ruling.",
    ],
    warnings: [
      "This is not a general narrative form. The judge needs to be able to grant or deny a specific request — keep it focused.",
      "Local court practices vary. Check court-specific instructions and any service requirements before filing.",
    ],
    relatedForms: [
      { number: "SC-105A", reason: "Court's ruling on this request" },
      { number: "SC-150", reason: "To postpone the trial date instead" },
      { number: "MC-030", reason: "If a longer sworn explanation is needed as an attachment" },
    ],
  },
  sc112a: {
    role: "primary",
    effectiveDate: "July 1, 2025",
    bestUse: "Use this to prove that later small claims papers were served by mail when the rules allow mail service.",
    whenToUse: [
      "The specific rules allow the particular small claims document to be served by mail.",
      "A non-party adult completed the mailing and can sign the proof under penalty of perjury.",
    ],
    whenNotToUse: [
      "You are proving personal service of the original claim — use SC-104 for that.",
      "You are not sure whether mail service is allowed for that document. Confirm before mailing — don't assume.",
    ],
    haveReady: [
      "The name and address of the person who mailed the papers.",
      "The date and place of mailing.",
      "The names and mailing addresses of everyone served.",
      "A list of the exact documents that were mailed.",
    ],
    warnings: [
      "Not all papers can be mailed — the original claim (SC-100 or SC-120) must be personally served using SC-104.",
      "Mail service has its own timing rules. Don't mail at the last minute — late service can invalidate the filing.",
    ],
    relatedForms: [
      { number: "SC-150", reason: "When mailing a postponement request" },
      { number: "SC-105", reason: "When mailing a court order request" },
      { number: "SC-104", reason: "When personal service was used instead" },
    ],
  },
  sc120: {
    role: "primary",
    effectiveDate: "July 1, 2025",
    bestUse: "Use this only if you have been sued and want to file your own claim against the plaintiff in the same case.",
    whenToUse: [
      "You were served with SC-100 and believe the plaintiff owes you money.",
      "Your claim fits within small claims court limits and can be raised as a defendant's claim in the same matter.",
    ],
    whenNotToUse: [
      "You are starting a brand-new case against someone who has not sued you — use SC-100 instead.",
      "You just want to deny the plaintiff's allegations without asking for money. You can simply show up and present your side at trial.",
    ],
    haveReady: [
      "The existing case information and scheduled court date.",
      "The amount you claim the plaintiff owes you.",
      "A short explanation of why they owe it.",
      "Correct legal names and service addresses for the plaintiff and any additional parties.",
    ],
    warnings: [
      "Timing is tighter here. If you were served more than 10 days before trial, your claim must be served on the plaintiff at least 5 days before trial. If you were served 10 days or less before trial, service can be as late as 1 day before.",
      "This form is optional — you are not required to file it just to defend against the plaintiff's claim.",
    ],
    relatedForms: [
      { number: "SC-100A", reason: "Add extra parties if needed" },
      { number: "SC-103", reason: "If filing under a fictitious business name" },
      { number: "SC-104", reason: "To prove you served the defendant claim" },
    ],
  },
  sc140: {
    role: "primary",
    effectiveDate: "January 1, 2007",
    bestUse: "Use this after a judgment if you were ordered to pay and want to request a new hearing in superior court.",
    whenToUse: [
      "The court entered a small claims judgment against you and you disagree with the outcome.",
      "You are the defendant — or the plaintiff only on a counter-claim filed against you — and you lost on that claim.",
      "You are still within the 30-day appeal deadline from when the notice of entry of judgment was handed or mailed.",
    ],
    whenNotToUse: [
      "You were the original plaintiff and simply lost your claim. Plaintiffs generally cannot appeal a small claims loss.",
      "You missed the hearing and want another chance — that usually requires a motion to vacate, not an appeal.",
    ],
    haveReady: [
      "The judgment date and the date the notice of entry of judgment was served.",
      "The case number and the full names of all parties.",
      "The filing fee, or a completed fee waiver request (FW-001) if you qualify.",
    ],
    warnings: [
      "A small claims appeal is not a limited review of what happened — it generally leads to a completely new hearing. Prepare from the ground up.",
      "The 30-day deadline is strict. Missing it ends your right to appeal. Calculate the date carefully and act early.",
    ],
    relatedForms: [
      { number: "SC-130", reason: "Notice of Entry of Judgment" },
      { number: "SC-200", reason: "Alternative entry of judgment form" },
      { number: "FW-001", reason: "Fee waiver if cost of filing is a hardship" },
    ],
  },
  sc150: {
    role: "primary",
    effectiveDate: "July 1, 2025",
    bestUse: "Use this when the current trial date genuinely will not work and you can clearly explain why a postponement is necessary.",
    whenToUse: [
      "You have a legitimate conflict, emergency, or service problem that makes the current hearing date unreasonable.",
      "You can explain the reason clearly and, if possible, attach proof (travel records, medical documentation, etc.).",
      "You are asking before the hearing date — ideally at least 10 days in advance.",
    ],
    whenNotToUse: [
      "You are simply not ready because you waited too long, without a strong reason for the delay.",
      "You want to delay for tactical reasons. Judges expect a genuine, documented need — not convenience.",
    ],
    haveReady: [
      "The current scheduled hearing date.",
      "A specific, honest explanation of why you need more time.",
      "Supporting documentation where possible (travel records, medical notes, failed service evidence).",
      "A plan to serve the request on all other parties in the case.",
    ],
    warnings: [
      "A postponement request is not automatically granted — the judge decides. Do not assume the hearing is rescheduled until you receive confirmation from the court.",
      "If the hearing is very close, contact the clerk or small claims advisor for local guidance on emergency procedures.",
      "There is typically a fee to request a postponement unless a fee waiver has been granted.",
    ],
    relatedForms: [
      { number: "SC-112A", reason: "Prove the request was served by mail" },
      { number: "SC-105", reason: "For other types of court orders" },
    ],
  },
  mc030: {
    role: "primary",
    effectiveDate: "January 1, 2006",
    bestUse: "Use this as a sworn written statement when another court form does not give enough space and the court permits or expects an attached declaration.",
    whenToUse: [
      "The main form is too short for the facts the court needs to understand.",
      "A judge, clerk, or instruction page suggests attaching a declaration.",
      "You need to present facts in numbered paragraphs and sign under penalty of perjury.",
    ],
    whenNotToUse: [
      "The main form asks for only a short statement and a longer declaration is unnecessary or discouraged by local rules.",
      "You are trying to use a declaration instead of the correct main form — MC-030 supports another filing; it does not replace it.",
    ],
    haveReady: [
      "A clear heading showing which filing the declaration supports.",
      "Facts stated from your own personal knowledge — not what someone else told you.",
      "Your signature under penalty of perjury and the date signed.",
    ],
    warnings: [
      "Keep facts separate from opinions or argument. Judges respond better to a clean chronology of what happened than to a long persuasive essay.",
      "A declaration can hurt clarity if it becomes too long. Aim for concise, numbered paragraphs — short and factual is more effective.",
    ],
    relatedForms: [
      { number: "MC-031", reason: "If more attachment pages are needed" },
      { number: "SC-100", reason: "Main claim form this typically supports" },
      { number: "SC-105", reason: "Court order request this can be attached to" },
    ],
  },
  fw001: {
    role: "primary",
    effectiveDate: "March 1, 2026",
    bestUse: "Use this before or at the time of filing SC-100 if you cannot afford the court filing fee without financial hardship.",
    whenToUse: [
      "You receive public benefits: Medi-Cal, CalWORKS, SSI/SSP, Food Stamps (CalFresh), IHSS, County Relief, CAPI, or WIC.",
      "Your gross monthly household income is below the threshold for your family size (see form Item 5b for thresholds).",
      "You do not have enough income to pay for basic household needs and court fees (Item 5c — requires completing financial details on page 2).",
    ],
    whenNotToUse: [
      "You can afford the filing fee without financial hardship.",
      "Your case settled for $10,000 or more — a fee waiver lien may apply.",
      "You already filed a fee waiver in this same case within the last six months (attach prior request if reasonably available).",
    ],
    haveReady: [
      "Proof of public benefits if claiming eligibility under Item 5a (benefit card, award letter, or similar document).",
      "Monthly income figures for you and everyone in your household who depends on you for support.",
      "Monthly expense amounts: rent, food, utilities, transportation, medical, child care, and any installment payments.",
      "Information about money and property: bank balances, vehicles, real estate, and other assets.",
    ],
    warnings: [
      "This form is confidential — the court will not give it to the other party in your case.",
      "If your financial situation improves during the case, you are required to notify the court.",
      "If the court denies the fee waiver, you will be given a short time to pay the fee before your case is affected.",
      "If you settle your case for $10,000 or more, the court may recover the waived fees from your settlement.",
      "Sign the form under penalty of perjury. False statements on a fee waiver form are a criminal offense.",
    ],
    relatedForms: [
      { number: "SC-100", reason: "File together with your claim" },
      { number: "FW-001-INFO", reason: "Information sheet explaining eligibility rules" },
      { number: "MC-025", reason: "If you need more space for financial information" },
    ],
  },
};

/* ── Form Assistant field configs ────────────────────────────────────────── */
type FieldDef = { key: string; label: string; type: "text" | "textarea" | "select" | "date"; options?: { value: string; label: string }[]; placeholder?: string; required?: boolean; hint?: string };
type FieldGroup = { title: string; fields: FieldDef[] };

const FORM_FIELD_CONFIG: Record<string, { title: string; subtitle: string; endpoint: string; filename: (id: number) => string; groups: FieldGroup[] }> = {
  fw001: {
    title: "Request to Waive Court Fees (FW-001)",
    subtitle: "Answer a few questions about your income and household. Your personal information will be pre-filled from your case.",
    endpoint: "fw001", filename: (id) => `FW001-Case-${id}.pdf`,
    groups: [
      { title: "Eligibility Basis (Item 5)", fields: [
        { key: "eligibilityBasis", label: "Why are you requesting a fee waiver?", type: "select", required: true, options: [
          { value: "5a", label: "I receive public benefits (Medi-Cal, CalWORKS, SSI, CalFresh, IHSS, etc.)" },
          { value: "5b", label: "My gross monthly income is below the threshold for my household size" },
          { value: "5c", label: "I don't have enough income to cover basic needs and court fees" },
        ], hint: "Check form FW-001-INFO for the exact income thresholds for your household size." },
        { key: "familySize", label: "Number of people in your household (including yourself)", type: "text", placeholder: "e.g. 2" },
        { key: "grossMonthlyIncome", label: "Your gross monthly income (before taxes)", type: "text", placeholder: "e.g. 2400.00" },
      ]},
      { title: "Public Benefits (if Item 5a applies)", fields: [
        { key: "benefits", label: "Which benefits do you receive?", type: "textarea", placeholder: "e.g. Medi-Cal, CalFresh (Food Stamps), SSI", hint: "List any benefits you currently receive. Leave blank if you chose 5b or 5c above." },
      ]},
      { title: "Monthly Expenses (required for Item 5c)", fields: [
        { key: "monthlyRent", label: "Rent or mortgage payment", type: "text", placeholder: "e.g. 1200.00" },
        { key: "monthlyFood", label: "Food and household supplies", type: "text", placeholder: "e.g. 400.00" },
        { key: "monthlyUtilities", label: "Utilities and telephone", type: "text", placeholder: "e.g. 150.00" },
        { key: "monthlyTransportation", label: "Transportation and auto expenses", type: "text", placeholder: "e.g. 200.00" },
        { key: "monthlyMedical", label: "Medical and dental expenses", type: "text", placeholder: "e.g. 100.00" },
        { key: "monthlyOther", label: "Other significant monthly expenses", type: "textarea", placeholder: "e.g. Child care $500, installment payments $150" },
      ]},
      { title: "Signature", fields: [
        { key: "signDate", label: "Date signed", type: "date" },
      ]},
    ],
  },
  mc030: {
    title: "Declaration (MC-030)",
    subtitle: "Provide the title and content of your declaration. Your case information will be filled in automatically.",
    endpoint: "mc030", filename: (id) => `MC030-Case-${id}.pdf`,
    groups: [
      { title: "Declaration Content", fields: [
        { key: "declarationTitle", label: "Declaration Title", type: "text", placeholder: "e.g. Declaration of Jane Doe in Support of Claim", hint: "Optional — leave blank to omit a title" },
        { key: "declarationText", label: "Declaration Text", type: "textarea", placeholder: "Write your sworn statement here. Begin with '1.' for numbered paragraphs...", required: true },
        { key: "signDate", label: "Date Signed", type: "date" },
      ]},
    ],
  },
  sc100a: {
    title: "Other Plaintiffs or Defendants (SC-100A)",
    subtitle: "Add up to 2 additional plaintiffs and 1 additional defendant. Your primary parties from the case will also be included.",
    endpoint: "sc100a", filename: (id) => `SC100A-Case-${id}.pdf`,
    groups: [
      { title: "Additional Plaintiff #1", fields: [
        { key: "p1_name", label: "Full Name", type: "text" },
        { key: "p1_phone", label: "Phone Number", type: "text" },
        { key: "p1_street", label: "Street Address", type: "text" },
        { key: "p1_city", label: "City", type: "text" }, { key: "p1_state", label: "State", type: "text", placeholder: "CA" }, { key: "p1_zip", label: "ZIP", type: "text" },
      ]},
      { title: "Additional Plaintiff #2 (optional)", fields: [
        { key: "p2_name", label: "Full Name", type: "text" },
        { key: "p2_phone", label: "Phone Number", type: "text" },
        { key: "p2_street", label: "Street Address", type: "text" },
        { key: "p2_city", label: "City", type: "text" }, { key: "p2_state", label: "State", type: "text", placeholder: "CA" }, { key: "p2_zip", label: "ZIP", type: "text" },
      ]},
      { title: "Additional Defendant (optional)", fields: [
        { key: "d1_name", label: "Full Name / Business Name", type: "text" },
        { key: "d1_phone", label: "Phone Number", type: "text" },
        { key: "d1_street", label: "Street Address", type: "text" },
        { key: "d1_city", label: "City", type: "text" }, { key: "d1_state", label: "State", type: "text", placeholder: "CA" }, { key: "d1_zip", label: "ZIP", type: "text" },
        { key: "d1_agentName", label: "Agent for Service Name (if corporation/LLC)", type: "text" },
      ]},
    ],
  },
  sc103: {
    title: "Fictitious Business Name (SC-103)",
    subtitle: "Provide your DBA (doing business as) registration details. Attach to SC-100 or SC-120.",
    endpoint: "sc103", filename: (id) => `SC103-Case-${id}.pdf`,
    groups: [
      { title: "Attachment", fields: [
        { key: "attachedTo", label: "Attach to", type: "select", required: true, options: [{ value: "sc100", label: "SC-100 (Plaintiff's Claim)" }, { value: "sc120", label: "SC-120 (Defendant's Claim)" }] },
      ]},
      { title: "Business Information", fields: [
        { key: "businessName", label: "Business Name (DBA)", type: "text", required: true },
        { key: "businessAddress", label: "Business Address (no P.O. Box)", type: "text", required: true },
        { key: "mailingAddress", label: "Mailing Address (if different)", type: "text" },
        { key: "businessType", label: "Business Type", type: "select", required: true, options: [
          { value: "individual", label: "Individual" }, { value: "association", label: "Association" }, { value: "partnership", label: "Partnership" },
          { value: "corporation", label: "Corporation" }, { value: "llc", label: "Limited Liability Company (LLC)" }, { value: "other", label: "Other" },
        ]},
        { key: "businessTypeOther", label: "If Other, specify", type: "text" },
      ]},
      { title: "Fictitious Business Name Statement", fields: [
        { key: "fbnCounty", label: "County where FBN Statement was filed", type: "text", required: true },
        { key: "fbnNumber", label: "FBN Statement Number", type: "text", required: true },
        { key: "fbnExpiry", label: "Expiration Date of FBN Statement", type: "date", required: true },
        { key: "signerName", label: "Name and Title of Signer (owner, president, CEO, etc.)", type: "text" },
        { key: "signDate", label: "Date Signed", type: "date" },
      ]},
    ],
  },
  sc104: {
    title: "Proof of Service (SC-104)",
    subtitle: "To be completed by the person who served the court papers — not you. Fill in the service details.",
    endpoint: "sc104", filename: (id) => `SC104-Case-${id}.pdf`,
    groups: [
      { title: "Hearing Information", fields: [
        { key: "courtStreet", label: "Court Street Address", type: "text", placeholder: "e.g. 111 N. Hill St., Los Angeles, CA 90012" },
        { key: "hearingDate", label: "Hearing Date", type: "date" },
        { key: "hearingTime", label: "Hearing Time", type: "text", placeholder: "e.g. 9:00 a.m." },
        { key: "hearingDept", label: "Department", type: "text", placeholder: "e.g. 97" },
      ]},
      { title: "Who Was Served (Item 1)", fields: [
        { key: "personServedName", label: "Person served (if serving a person)", type: "text" },
        { key: "businessName", label: "Business/entity served (if serving a business)", type: "text" },
        { key: "authorizedPerson", label: "Person authorized to accept service", type: "text" },
        { key: "authorizedTitle", label: "Their job title", type: "text" },
      ]},
      { title: "Documents Served (Item 3)", fields: [
        { key: "docsServed_sc100", label: "SC-100 (Plaintiff's Claim)", type: "select", options: [{ value: "yes", label: "Yes — served this" }, { value: "no", label: "No" }] },
        { key: "docsServed_sc120", label: "SC-120 (Defendant's Claim)", type: "select", options: [{ value: "yes", label: "Yes — served this" }, { value: "no", label: "No" }] },
        { key: "docsServedOther", label: "Other documents (describe)", type: "text" },
      ]},
      { title: "How Service Was Made (Item 4)", fields: [
        { key: "serviceMethod", label: "Service method", type: "select", required: true, options: [{ value: "personal", label: "Personal Service (handed directly to person)" }, { value: "substituted", label: "Substituted Service (left with another adult)" }] },
        { key: "serviceDate", label: "Date of service", type: "date", required: true },
        { key: "serviceTime", label: "Time of service", type: "text", placeholder: "e.g. 2:30 p.m." },
        { key: "serviceAddress", label: "Address where served", type: "text" },
        { key: "serviceCity", label: "City", type: "text" }, { key: "serviceState", label: "State", type: "text", placeholder: "CA" }, { key: "serviceZip", label: "ZIP", type: "text" },
        { key: "subPersonDesc", label: "If substituted — description of person who received (age, relationship)", type: "text" },
      ]},
      { title: "Server's Information (Item 5)", fields: [
        { key: "serverName", label: "Server's full name", type: "text", required: true },
        { key: "serverPhone", label: "Server's phone", type: "text" },
        { key: "serverAddress", label: "Server's address", type: "text" },
        { key: "serverCity", label: "City", type: "text" }, { key: "serverState", label: "State", type: "text", placeholder: "CA" }, { key: "serverZip", label: "ZIP", type: "text" },
        { key: "serverFee", label: "Fee for service (if any)", type: "text", placeholder: "e.g. 25.00" },
        { key: "signDate", label: "Date signed", type: "date" },
      ]},
    ],
  },
  sc105: {
    title: "Request for Court Order (SC-105)",
    subtitle: "Ask the court to make a specific order in your case. Fill in what you're requesting and why.",
    endpoint: "sc105", filename: (id) => `SC105-Case-${id}.pdf`,
    groups: [
      { title: "Court Information", fields: [
        { key: "courtStreet", label: "Court Street Address", type: "text", placeholder: "e.g. 111 N. Hill St., Los Angeles, CA 90012" },
      ]},
      { title: "Requesting Party (Item 1)", fields: [
        { key: "requestingPartyName", label: "Your full name", type: "text", required: true },
        { key: "requestingPartyAddress", label: "Your address", type: "text" },
        { key: "requestingPartyRole", label: "You are a", type: "select", required: true, options: [{ value: "plaintiff", label: "Plaintiff" }, { value: "defendant", label: "Defendant" }] },
      ]},
      { title: "Notice To (Item 2)", fields: [
        { key: "noticeName1", label: "Other party name", type: "text" }, { key: "noticeAddr1", label: "Their address", type: "text" },
        { key: "noticeName2", label: "Second party name (optional)", type: "text" }, { key: "noticeAddr2", label: "Their address", type: "text" },
      ]},
      { title: "Request Details", fields: [
        { key: "orderRequested", label: "I ask the court to make the following order (Item 3)", type: "textarea", required: true, placeholder: "Describe the specific order you are requesting..." },
        { key: "orderReason", label: "I ask for this order because (Item 4)", type: "textarea", required: true, placeholder: "Explain why you need this order..." },
        { key: "signDate", label: "Date signed", type: "date" },
      ]},
    ],
  },
  sc112a: {
    title: "Proof of Service by Mail (SC-112A)",
    subtitle: "Completed by the person who mailed the court documents — not you. Cannot be used for SC-100 or SC-120.",
    endpoint: "sc112a", filename: (id) => `SC112A-Case-${id}.pdf`,
    groups: [
      { title: "Server's Information (Item 1)", fields: [
        { key: "serverName", label: "Server's full name", type: "text", required: true },
        { key: "serverPhone", label: "Server's phone", type: "text" },
        { key: "serverAddress", label: "Server's mailing address", type: "text" },
        { key: "serverCity", label: "City", type: "text" }, { key: "serverState", label: "State", type: "text", placeholder: "CA" }, { key: "serverZip", label: "ZIP", type: "text" },
      ]},
      { title: "Document Mailed (Item 2)", fields: [
        { key: "documentServed", label: "Document served", type: "select", required: true, options: [
          { value: "sc105", label: "SC-105, Request for Court Order and Answer" },
          { value: "sc109", label: "SC-109, Authorization to Appear" },
          { value: "sc114", label: "SC-114, Request to Amend Claim Before Hearing" },
          { value: "sc133", label: "SC-133, Judgment Debtor's Statement of Assets" },
          { value: "sc150", label: "SC-150, Request to Postpone Trial" },
          { value: "sc221", label: "SC-221, Response to Request to Make Payments" },
          { value: "other", label: "Other document" },
        ]},
        { key: "documentServedOther", label: "If other, specify", type: "text" },
      ]},
      { title: "Parties Served (Item 3)", fields: [
        { key: "party1Name", label: "Party 1 name", type: "text", required: true }, { key: "party1Addr", label: "Mailing address on envelope", type: "text", required: true },
        { key: "party2Name", label: "Party 2 name (optional)", type: "text" }, { key: "party2Addr", label: "Mailing address", type: "text" },
        { key: "party3Name", label: "Party 3 name (optional)", type: "text" }, { key: "party3Addr", label: "Mailing address", type: "text" },
      ]},
      { title: "Mailing Details", fields: [
        { key: "mailingDate", label: "Date of mailing", type: "date", required: true },
        { key: "mailingCity", label: "City and state of mailing", type: "text", required: true, placeholder: "e.g. Los Angeles, CA" },
        { key: "signDate", label: "Date signed", type: "date" },
      ]},
    ],
  },
  sc120: {
    title: "Defendant's Counter-Claim (SC-120)",
    subtitle: "File your counter-claim against the plaintiff. Your case parties will be pre-filled. Provide your counter-claim details below.",
    endpoint: "sc120", filename: (id) => `SC120-Case-${id}.pdf`,
    groups: [
      { title: "Your Counter-Claim (Item 3)", fields: [
        { key: "counterClaimAmount", label: "Amount the plaintiff owes you ($)", type: "text", required: true, placeholder: "e.g. 1500.00" },
        { key: "counterClaimReason", label: "Why does the plaintiff owe you money?", type: "textarea", required: true },
        { key: "counterClaimDate", label: "When did this happen? (date)", type: "date" },
        { key: "counterClaimHowCalculated", label: "How did you calculate this amount?", type: "textarea" },
      ]},
      { title: "Additional Questions", fields: [
        { key: "priorDemand", label: "Did you ask the plaintiff to pay before filing? (Item 4)", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
        { key: "attyFeeDispute", label: "Is this about an attorney-client fee dispute? (Item 5)", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
        { key: "suingPublicEntity", label: "Are you suing a public entity? (Item 6)", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
        { key: "moreThan12", label: "Filed more than 12 small claims in last 12 months? (Item 7)", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
        { key: "signDate", label: "Date signed", type: "date" },
      ]},
    ],
  },
  sc140: {
    title: "Notice of Appeal (SC-140)",
    subtitle: "File your appeal of the small claims judgment. Only defendants may appeal a small claims judgment.",
    endpoint: "sc140", filename: (id) => `SC140-Case-${id}.pdf`,
    groups: [
      { title: "Court & Case", fields: [
        { key: "courtName", label: "Court name and address", type: "text", required: true, placeholder: "e.g. Stanley Mosk Courthouse, 111 N. Hill St., Los Angeles, CA 90012" },
      ]},
      { title: "Appeal Details", fields: [
        { key: "appellantRole", label: "You are the", type: "select", required: true, options: [{ value: "plaintiff", label: "Plaintiff" }, { value: "defendant", label: "Defendant" }] },
        { key: "appealType", label: "You are appealing", type: "select", required: true, options: [{ value: "judgment", label: "The small claims judgment" }, { value: "motion_to_vacate", label: "The denial of motion to vacate the judgment" }] },
        { key: "appealFiledDate", label: "Date appeal is being filed", type: "date", required: true },
        { key: "appellantName", label: "Your full name (appellant)", type: "text", hint: "Leave blank to use case plaintiff/defendant name automatically" },
      ]},
    ],
  },
  sc150: {
    title: "Request to Postpone Trial (SC-150)",
    subtitle: "Ask the court to reschedule your hearing. Provide your reason and the dates involved.",
    endpoint: "sc150", filename: (id) => `SC150-Case-${id}.pdf`,
    groups: [
      { title: "Court Information", fields: [
        { key: "courtStreet", label: "Court Street Address", type: "text", placeholder: "e.g. 111 N. Hill St., Los Angeles, CA 90012" },
      ]},
      { title: "Your Information (Item 1)", fields: [
        { key: "requestingPartyName", label: "Your full name", type: "text", required: true },
        { key: "requestingPartyAddress", label: "Your mailing address", type: "text" },
        { key: "requestingPartyPhone", label: "Your phone number", type: "text" },
        { key: "requestingPartyRole", label: "You are a", type: "select", required: true, options: [{ value: "plaintiff", label: "Plaintiff" }, { value: "defendant", label: "Defendant" }] },
      ]},
      { title: "Trial Dates", fields: [
        { key: "currentTrialDate", label: "My trial is now scheduled for (Item 2)", type: "date", required: true },
        { key: "postponeUntilDate", label: "I ask the court to postpone until (approximately) (Item 3)", type: "date" },
      ]},
      { title: "Reasons", fields: [
        { key: "postponeReason", label: "I am asking for this postponement because (Item 4)", type: "textarea", required: true, placeholder: "Explain why you need a postponement..." },
        { key: "withinTenDaysReason", label: "If trial is within 10 days — why didn't you ask sooner? (Item 5)", type: "textarea", placeholder: "Only fill this in if your trial is within the next 10 days..." },
        { key: "signDate", label: "Date signed", type: "date" },
      ]},
    ],
  },
};

/* ── Form Assistant Modal ─────────────────────────────────────────────────── */
function FormAssistantModal({ formId, caseId, onClose, onDownload, onAiGenerate }: { formId: string; caseId: number; onClose: () => void; onDownload: (endpoint: string, filename: string, body: Record<string, any>) => void; onAiGenerate?: () => Promise<string | null> }) {
  const cfg = FORM_FIELD_CONFIG[formId];
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!cfg) return null;

  function set(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  async function handleAiGenerate() {
    if (!onAiGenerate) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const text = await onAiGenerate();
      if (text) {
        setFormData(prev => ({ ...prev, declarationText: text }));
      }
    } catch {
      setAiError("AI generation failed — please try again.");
    } finally {
      setAiGenerating(false);
    }
  }

  function buildBody(): Record<string, any> {
    const d: Record<string, any> = { ...formData };

    if (formId === "sc100a") {
      const makePl = (prefix: string) => {
        const name = formData[`${prefix}_name`];
        if (!name) return null;
        return { name, phone: formData[`${prefix}_phone`], street: formData[`${prefix}_street`], city: formData[`${prefix}_city`], state: formData[`${prefix}_state`] || "CA", zip: formData[`${prefix}_zip`] };
      };
      const makeDef = (prefix: string) => {
        const name = formData[`${prefix}_name`];
        if (!name) return null;
        return { name, phone: formData[`${prefix}_phone`], street: formData[`${prefix}_street`], city: formData[`${prefix}_city`], state: formData[`${prefix}_state`] || "CA", zip: formData[`${prefix}_zip`], agentName: formData[`${prefix}_agentName`] };
      };
      d.additionalPlaintiffs = [makePl("p1"), makePl("p2")].filter(Boolean);
      d.additionalDefendants = [makeDef("d1")].filter(Boolean);
    }

    if (formId === "sc104") {
      const docs: string[] = [];
      if (formData["docsServed_sc100"] === "yes") docs.push("sc100");
      if (formData["docsServed_sc120"] === "yes") docs.push("sc120");
      if (formData["docsServedOther"]) docs.push("other");
      d.docsServed = docs;
    }

    if (formId === "sc105") {
      d.noticeParties = [
        formData["noticeName1"] ? { name: formData["noticeName1"], address: formData["noticeAddr1"] || "" } : null,
        formData["noticeName2"] ? { name: formData["noticeName2"], address: formData["noticeAddr2"] || "" } : null,
      ].filter(Boolean);
    }

    if (formId === "sc112a") {
      d.partiesServed = [
        formData["party1Name"] ? { name: formData["party1Name"], address: formData["party1Addr"] || "" } : null,
        formData["party2Name"] ? { name: formData["party2Name"], address: formData["party2Addr"] || "" } : null,
        formData["party3Name"] ? { name: formData["party3Name"], address: formData["party3Addr"] || "" } : null,
      ].filter(Boolean);
    }

    return d;
  }

  function handleSubmit() {
    const requiredFields: string[] = [];
    for (const group of cfg.groups) {
      for (const field of group.fields) {
        if (field.required && !formData[field.key]) requiredFields.push(field.label);
      }
    }
    if (requiredFields.length > 0) {
      setValidationMsg(`Please fill in: ${requiredFields.join(", ")}`);
      return;
    }
    setValidationMsg(null);
    onDownload(cfg.endpoint, cfg.filename(caseId), buildBody());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-bold leading-tight">{cfg.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{cfg.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* MC-030 AI Generate section */}
          {formId === "mc030" && onAiGenerate && (
            <div className="rounded-xl border-2 border-[#0d6b5e]/30 bg-[#ddf6f3]/50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 shrink-0 text-[#0d6b5e]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-bold text-[#0d6b5e]">AI Declaration Generator</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Click to auto-generate a complete, court-ready declaration based on your case details. You can review and edit the text before downloading.</p>
                </div>
              </div>
              {aiError && (
                <p className="text-xs text-rose-600 font-semibold">{aiError}</p>
              )}
              <button
                onClick={handleAiGenerate}
                disabled={aiGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d6b5e] text-white text-sm font-semibold hover:bg-[#0d6b5e]/90 transition-colors disabled:opacity-60"
              >
                {aiGenerating ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    AI Generate Declaration
                  </>
                )}
              </button>
            </div>
          )}

          {cfg.groups.map((group, gi) => (
            <div key={gi} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0d6b5e]">{group.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.fields.map((field) => (
                  <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      {field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </label>
                    {field.hint && <p className="text-xs text-muted-foreground mb-1">{field.hint}</p>}
                    {field.type === "textarea" ? (
                      <textarea
                        rows={field.key === "declarationText" ? 10 : 4}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ""}
                        onChange={(e) => set(field.key, e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/40"
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={formData[field.key] || ""}
                        onChange={(e) => set(field.key, e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/40"
                      >
                        <option value="">— select —</option>
                        {(field.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type === "date" ? "date" : "text"}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ""}
                        onChange={(e) => set(field.key, e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/40"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {validationMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{validationMsg}</div>
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg bg-[#0d6b5e] text-white text-sm font-semibold hover:bg-[#0d6b5e]/90 transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function FormsTab({ caseId, currentCase, onSwitchToIntake, onSwitchToPrep }: { caseId: number, currentCase: any, onSwitchToIntake: () => void, onSwitchToPrep: () => void }) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { data: readiness } = useGetCaseReadiness(caseId, { query: { enabled: !!caseId } });
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [guideDialogFormId, setGuideDialogFormId] = useState<string | null>(null);
  const [modalFormId, setModalFormId] = useState<string | null>(null);
  const [downloadingForm, setDownloadingForm] = useState<string | null>(null);
  const [mc030Generating, setMc030Generating] = useState(false);
  const [mc030GenError, setMc030GenError] = useState<string | null>(null);
  const [sigModalOpen, setSigModalOpen] = useState(false);

  useEffect(() => {
    if (downloadError) {
      toast({ title: "Download failed", description: downloadError, variant: "destructive" });
      setDownloadError(null);
    }
  }, [downloadError]);

  // SC-100 description overflow: ~8 lines × ~90 chars/line ≈ 720 chars threshold
  const descriptionNeedsMC030 = (currentCase.claimDescription?.length ?? 0) > 650;

  async function generateMC030Declaration(): Promise<string | null> {
    setMc030Generating(true);
    setMc030GenError(null);
    try {
      const clerkToken = await getToken();
      const res = await fetch(`/api/cases/${caseId}/forms/mc030-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clerkToken}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMc030GenError(err.error || "AI generation failed.");
        return null;
      }
      const data = await res.json();
      return data.declarationText ?? null;
    } catch {
      setMc030GenError("AI generation failed — please try again.");
      return null;
    } finally {
      setMc030Generating(false);
    }
  }

  const score = readiness?.score ?? currentCase.readinessScore ?? 0;
  const isReady = score >= 80;

  const isBusinessCase: boolean | null = currentCase.defendantIsBusinessOrEntity ?? null;
  const intakeStarted = currentCase.intakeStep != null && currentCase.intakeStep > 1;

  const filteredForms = FORMS_CATALOG.filter((form) => {
    if (isBusinessCase === null || !intakeStarted) return true;
    if (isBusinessCase) return form.caseTypes === "both" || form.caseTypes === "business";
    return form.caseTypes === "both" || form.caseTypes === "personal";
  });

  const guideDialogForm = FORMS_CATALOG.find(f => f.id === guideDialogFormId) ?? null;

  async function downloadForm(endpoint: string, filename: string, setLoading: (v: boolean) => void) {
    setLoading(true);
    setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clerkToken}` },
      });
      if (!tokenRes.ok) {
        setDownloadError("Could not authorize download — please try again.");
        return;
      }
      const { token } = await tokenRes.json();
      const a = document.createElement("a");
      a.href = `/api/cases/${caseId}/forms/${endpoint}?token=${encodeURIComponent(token)}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setDownloadError("Download failed — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadFormPost(endpoint: string, filename: string, body: Record<string, any>) {
    setDownloadingForm(endpoint);
    setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clerkToken}` },
      });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, token }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDownloadError(err.error || "Failed to generate PDF — please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setModalFormId(null);
    } catch {
      setDownloadError("Download failed — please try again.");
    } finally {
      setDownloadingForm(null);
    }
  }


  return (
    <div className="p-6 md:p-8 space-y-8">

      {/* ── Hearing Prep Coach Teaser ────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
          <Gavel className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-amber-900 text-base">Practice Before Your Hearing</h3>
            <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">New</span>
          </div>
          <p className="text-sm text-amber-800">The Hearing Prep Coach acts as a real judge — asking you the same questions you'll face in court. Practice your answers until you feel confident.</p>
        </div>
        <Button onClick={onSwitchToPrep} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white gap-2 font-semibold">
          <Gavel className="h-4 w-4" />
          Start Practice
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-2xl font-bold">Court Forms Library</h2>
          <p className="text-muted-foreground text-sm">California small claims forms — click any form to learn more or generate it.</p>
        </div>
        {/* Case-type filter pill */}
        {!intakeStarted ? (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Showing all forms — complete intake for a personalized list
          </div>
        ) : isBusinessCase ? (
          <div className="flex items-center gap-1.5 rounded-full border border-[#0d6b5e]/30 bg-[#ddf6f3] px-3 py-1 text-xs font-semibold text-[#0d6b5e]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            Showing forms for: Business / Entity case
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-[#0d6b5e]/30 bg-[#ddf6f3] px-3 py-1 text-xs font-semibold text-[#0d6b5e]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Showing forms for: Personal case
          </div>
        )}
      </div>

      {/* Prompt to complete intake if not started */}
      {!intakeStarted && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="mt-0.5 shrink-0 text-amber-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Complete your case intake to see only the forms that apply to your situation — forms will be filtered based on whether you're suing an individual or a business.
        </div>
      )}

      {/* Case Summary Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Case at a Glance</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
            <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Plaintiff</span>{currentCase.plaintiffName || "—"}</div>
            <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Defendant</span>{currentCase.defendantName || "—"}</div>
            <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Incident Date</span>{currentCase.incidentDate || "—"}</div>
            <div className="col-span-2 sm:col-span-3"><span className="font-semibold block text-xs text-muted-foreground uppercase">Why does defendant owe you money?</span>{currentCase.claimDescription || "—"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Tile Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredForms.map((form) => (
          <div
            key={form.id}
            className={`relative flex flex-col rounded-xl border-2 p-4 transition-all duration-150 hover:shadow-md bg-card hover:border-[#0d6b5e]/40 ${form.id === "sc103" && isBusinessCase ? "border-orange-400 bg-orange-50/30" : "border-border"}`}
          >
            {/* Tile header: number badge + status badge */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {form.number}
                </span>
                {form.id === "sc100" && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Start Here
                  </span>
                )}
                {form.id === "mc030" && descriptionNeedsMC030 && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Needed
                  </span>
                )}
                {form.id === "sc103" && isBusinessCase && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                    Required for DBA
                  </span>
                )}
              </div>
              <div>
                {form.available ? (
                  <span className="text-xs font-semibold text-[#0d6b5e] bg-[#ddf6f3] border border-[#0d6b5e]/30 px-2 py-0.5 rounded-full">Ready</span>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Coming Soon</span>
                )}
              </div>
            </div>

            {/* Title + short description */}
            <h3 className="font-semibold text-sm leading-snug mb-1">{form.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{form.shortDesc}</p>

            {/* 3 action buttons */}
            <div className="flex gap-2 mt-auto pt-3 flex-wrap">
              {/* View & Edit */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 px-2"
                onClick={onSwitchToIntake}
              >
                <Pencil className="h-3 w-3" />
                View &amp; Edit
              </Button>

              {/* Download PDF */}
              {form.available ? (
                form.id === "fw001" ? (
                  <a
                    href={form.blankFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download PDF
                  </a>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 px-2"
                    disabled={form.id === "sc100" ? downloadingPdf : downloadingForm === form.id}
                    onClick={() => {
                      if (form.id === "sc100") {
                        if (isReady) {
                          setSigModalOpen(true);
                        } else {
                          toast({ title: "Intake incomplete", description: "Complete your intake to 80% to unlock the SC-100 download.", variant: "destructive" });
                        }
                      } else {
                        setModalFormId(form.id);
                      }
                    }}
                  >
                    {(form.id === "sc100" ? downloadingPdf : downloadingForm === form.id)
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Download className="h-3 w-3" />
                    }
                    Download PDF
                  </Button>
                )
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 px-2"
                  disabled
                  title="Coming soon"
                >
                  <Download className="h-3 w-3" />
                  Download PDF
                </Button>
              )}

              {/* How to Fill This */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 px-2"
                onClick={() => setGuideDialogFormId(form.id)}
              >
                <Info className="h-3 w-3" />
                How to Fill This
              </Button>
            </div>
          </div>
        ))}
      </div>


      {/* Form Assistant Modal */}
      {modalFormId && (
        <FormAssistantModal
          formId={modalFormId}
          caseId={caseId}
          onClose={() => setModalFormId(null)}
          onDownload={downloadFormPost}
          onAiGenerate={modalFormId === "mc030" ? generateMC030Declaration : undefined}
        />
      )}

      {/* "How to Fill This" Guide Dialog */}
      <Dialog open={!!guideDialogFormId} onOpenChange={(open) => { if (!open) setGuideDialogFormId(null); }}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          {guideDialogForm && (() => {
            const guide = FORM_GUIDE_CONTENT[guideDialogForm.id];
            return (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold tracking-widest uppercase bg-[#0d6b5e] text-white px-3 py-1 rounded-full">{guideDialogForm.number}</span>
                    <DialogTitle className="text-xl font-bold leading-tight">How to Fill the {guideDialogForm.number}</DialogTitle>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{guideDialogForm.detailDesc}</p>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="px-6 py-5 space-y-6">

                    {/* Video placeholder */}
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 flex flex-col items-center justify-center gap-2 py-10 px-4">
                      <svg className="text-muted-foreground/40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                      <p className="text-sm font-medium text-muted-foreground">Video guide — coming soon</p>
                      <p className="text-xs text-muted-foreground/60">Step-by-step walkthrough for {guideDialogForm.number} will appear here</p>
                    </div>

                    {guide && (
                      <div className="space-y-6">

                        {/* Best Use callout */}
                        <div className="rounded-xl bg-[#ddf6f3] border border-[#0d6b5e]/20 px-5 py-4">
                          <p className="text-sm font-semibold text-[#0d6b5e] leading-relaxed">{guide.bestUse}</p>
                        </div>

                        {/* When to use / When NOT to use */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="rounded-xl border bg-card p-4 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#0d6b5e]">Use this form when</p>
                            <ul className="space-y-2">
                              {guide.whenToUse.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                                  <svg className="mt-0.5 shrink-0 text-[#0d6b5e]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border bg-card p-4 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Do not use this form when</p>
                            <ul className="space-y-2">
                              {guide.whenNotToUse.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                                  <svg className="mt-0.5 shrink-0 text-rose-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* What to have ready */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/70">What to have ready</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {guide.haveReady.map((item, i) => (
                              <div key={i} className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                                <div className="mt-0.5 h-5 w-5 rounded-full bg-[#0d6b5e]/10 flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-[#0d6b5e]">{i + 1}</span>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SC-100 overflow note */}
                        {guideDialogForm.id === "sc100" && descriptionNeedsMC030 && (
                          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-5 space-y-2">
                            <div className="flex items-start gap-3">
                              <svg className="mt-0.5 shrink-0 text-blue-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <div>
                                <h3 className="text-sm font-bold text-blue-900">Your description is too long — MC-030 is required</h3>
                                <p className="text-sm text-blue-800 leading-relaxed">Your SC-100 PDF will include the first 7 lines and a note directing the court to the attached MC-030 Declaration. File both forms together.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Warnings */}
                        {guide.warnings.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/70">Important things to know</h3>
                            <div className="space-y-2">
                              {guide.warnings.map((w, i) => (
                                <div key={i} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                                  <svg className="mt-0.5 shrink-0 text-amber-500" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                  <p className="text-sm text-amber-800 leading-relaxed">{w}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Related forms */}
                        {guide.relatedForms.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/70">Related forms &amp; next steps</h3>
                            <div className="flex flex-wrap gap-2">
                              {guide.relatedForms.map((rf, i) => (
                                <div key={i} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5">
                                  <span className="text-xs font-bold text-[#0d6b5e]">{rf.number}</span>
                                  <span className="text-xs text-muted-foreground">{rf.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground/60">Form version referenced: effective {guide.effectiveDate}. Always confirm the current Judicial Council version and any county-specific local rules before filing.</p>

                      </div>
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter className="px-6 py-4 border-t">
                  <Button variant="outline" onClick={() => setGuideDialogFormId(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* SC-100 Signature Modal */}
      <SignaturePadModal
        open={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onSign={async (dataUrl) => {
          setSigModalOpen(false);
          setDownloadingPdf(true);
          try {
            const token = await getToken();
            const res = await fetch(`/api/cases/${caseId}/forms/sc100/signed`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ signatureDataUrl: dataUrl }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              toast({ title: "Download failed", description: err.error || "Could not generate signed SC-100.", variant: "destructive" });
              return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `SC100-Signed-Case-${caseId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
          } catch {
            toast({ title: "Download failed", description: "Could not generate signed SC-100.", variant: "destructive" });
          } finally {
            setDownloadingPdf(false);
          }
        }}
        onSkipSign={async () => {
          setSigModalOpen(false);
          downloadForm("sc100", `SC100-Case-${caseId}.pdf`, setDownloadingPdf);
        }}
      />
    </div>
  );
}

// ─── Demand Letter Tab ────────────────────────────────────────────────────────
type DemandLetterTone = "formal" | "firm" | "friendly";

const TONE_META: { value: DemandLetterTone; label: string; description: string }[] = [
  { value: "formal",   label: "Formal",   description: "Neutral, professional tone — facts stated plainly" },
  { value: "firm",     label: "Firm",     description: "Assertive & deadline-focused — legal basis emphasized" },
  { value: "friendly", label: "Friendly", description: "Cooperative tone — prefers settlement over court" },
];

function DemandLetterTab({ caseId, currentCase }: { caseId: number; currentCase: any }) {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<"demand" | "settlement">("demand");

  // ── Demand letter state ────────────────────────────────────────────────────
  const [text, setText] = useState("");
  const [tone, setTone] = useState<DemandLetterTone>("formal");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Settlement letter state ────────────────────────────────────────────────
  const claimAmt = Number(currentCase?.claimAmount ?? 0);
  const defaultSettle = Math.round(claimAmt * 0.75 * 100) / 100;
  const [settlementText, setSettlementText] = useState("");
  const [settleTone, setSettleTone] = useState<"firm" | "cooperative">("firm");
  const [settleAmount, setSettleAmount] = useState(defaultSettle || 0);
  const [settlePct, setSettlePct] = useState(75);
  const [installments, setInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(3);
  const [responseDays, setResponseDays] = useState(14);
  const [isGeneratingSettle, setIsGeneratingSettle] = useState(false);
  const [isDownloadingSettle, setIsDownloadingSettle] = useState(false);
  const [settleLoaded, setSettleLoaded] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleChecklist, setSettleChecklist] = useState<Record<string, boolean>>({});

  const SETTLE_CHECKLIST = [
    { id: "certified", label: "Send via certified mail (USPS)", detail: "Get a tracking number — you'll need it if they later dispute receipt." },
    { id: "copy", label: "Keep a copy of this letter for your court file", detail: "Bring it to the hearing to show you attempted to settle." },
    { id: "written", label: "If they accept: get the agreement in writing", detail: "A signed written agreement is required before you withdraw your case." },
    { id: "counter", label: "If they counter-offer: nothing is binding until signed", detail: "You can accept, reject, or counter again — you're still in control." },
    { id: "reminder", label: "Set a calendar reminder for your response deadline", detail: "If no response by the deadline, proceed with your court case." },
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/cases/${caseId}/demand-letter`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          if (data.text) setText(data.text);
          if (data.tone) setTone(data.tone as DemandLetterTone);
          setLoaded(true);
        }
      } catch { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [caseId, getToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/cases/${caseId}/settlement-letter`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          if (data.text) setSettlementText(data.text);
          if (data.tone) setSettleTone(data.tone as "firm" | "cooperative");
          setSettleLoaded(true);
        }
      } catch { if (!cancelled) setSettleLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [caseId, getToken]);

  const hasRequiredInfo = !!(currentCase?.plaintiffName && currentCase?.defendantName && currentCase?.claimAmount);

  // ── Demand letter generate ─────────────────────────────────────────────────
  async function generate() {
    if (isGenerating) return;
    setIsGenerating(true); setError(null); setText("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/demand-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tone }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.error ?? "Generation failed"); return; }
      const reader = res.body?.getReader();
      if (!reader) { setError("Streaming not supported"); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const p = JSON.parse(line.slice(6)); if (p.content) setText(prev => prev + p.content); } catch { /* ignore */ }
        }
      }
    } catch (e: any) { setError(e.message ?? "Unexpected error"); }
    finally { setIsGenerating(false); }
  }

  async function downloadPdf() {
    if (!text.trim() || isDownloading) return;
    setIsDownloading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/demand-letter/pdf`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { setError("PDF generation failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `demand-letter.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message ?? "Download failed"); }
    finally { setIsDownloading(false); }
  }

  // ── Settlement letter generate ─────────────────────────────────────────────
  async function generateSettlement() {
    if (isGeneratingSettle) return;
    setIsGeneratingSettle(true); setSettleError(null); setSettlementText("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/settlement-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tone: settleTone, settlementAmount: settleAmount, installments, installmentCount, responseDays }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setSettleError(err.error ?? "Generation failed"); return; }
      const reader = res.body?.getReader();
      if (!reader) { setSettleError("Streaming not supported"); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const p = JSON.parse(line.slice(6)); if (p.content) setSettlementText(prev => prev + p.content); } catch { /* ignore */ }
        }
      }
    } catch (e: any) { setSettleError(e.message ?? "Unexpected error"); }
    finally { setIsGeneratingSettle(false); }
  }

  async function downloadSettlePdf() {
    if (!settlementText.trim() || isDownloadingSettle) return;
    setIsDownloadingSettle(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/settlement-letter/pdf`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: settlementText }),
      });
      if (!res.ok) { setSettleError("PDF generation failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const defName = (currentCase?.defendantName ?? "defendant").replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a"); a.href = url; a.download = `Settlement_Offer_${defName}_${dateStr}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e: any) { setSettleError(e.message ?? "Download failed"); }
    finally { setIsDownloadingSettle(false); }
  }

  const pctLabel = claimAmt > 0
    ? `${settlePct}% of your claim (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settleAmount)})`
    : `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settleAmount)}`;

  return (
    <div className="p-6 space-y-6">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setMode("demand")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === "demand" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-4 w-4" /> Demand Letter
        </button>
        <button
          type="button"
          onClick={() => setMode("settlement")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === "settlement" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Handshake className="h-4 w-4" /> Settlement Offer
        </button>
      </div>

      {/* ── DEMAND LETTER MODE ── */}
      {mode === "demand" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Demand Letter Generator</h2>
              <p className="text-sm text-muted-foreground mt-1">Generate a professional pre-litigation demand letter using your case details.</p>
            </div>
            {text.trim() && (
              <Button onClick={downloadPdf} disabled={isDownloading} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
              </Button>
            )}
          </div>
          {!hasRequiredInfo && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Complete Intake First</p>
                <p className="text-amber-700 text-sm mt-0.5">Fill in your name, the defendant's name, and claim amount in the Intake tab.</p>
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold mb-3">Select Tone</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TONE_META.map(({ value, label, description }) => (
                <button key={value} type="button" onClick={() => setTone(value)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${tone === value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
                  <span className="block font-semibold text-sm">{label}</span>
                  <span className="block text-xs text-muted-foreground mt-1">{description}</span>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={generate} disabled={isGenerating || !hasRequiredInfo} className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-5" size="lg">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating letter…</> : <><Mail className="h-4 w-4" />{text.trim() ? "Regenerate Demand Letter" : "Generate Demand Letter"}</>}
          </Button>
          {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3"><AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" /><p className="text-sm text-destructive">{error}</p></div>}
          {(text.trim() || isGenerating) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Letter Preview</p>
                <p className="text-xs text-muted-foreground">You can edit the text below before downloading.</p>
              </div>
              <Textarea value={text} onChange={e => setText(e.target.value)} className="font-mono text-sm leading-relaxed min-h-[520px] resize-y"
                placeholder={isGenerating ? "Generating your demand letter…" : ""} readOnly={isGenerating} />
              {!isGenerating && text.trim() && (
                <Button onClick={downloadPdf} disabled={isDownloading} className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white mt-2" size="lg">
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download as PDF
                </Button>
              )}
            </div>
          )}
          {!text.trim() && !isGenerating && loaded && (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
              <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No demand letter yet</p>
              <p className="text-xs text-muted-foreground mt-1">Select a tone above and click Generate to create your letter.</p>
            </div>
          )}
        </>
      )}

      {/* ── SETTLEMENT LETTER MODE ── */}
      {mode === "settlement" && (
        <>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Handshake className="h-5 w-5 text-[#0d6b5e]" />Settlement Offer Generator</h2>
            <p className="text-sm text-muted-foreground mt-1">Generate a strategic settlement offer letter — tailored to your case and claim amount.</p>
          </div>

          {/* Coaching card */}
          <div className="rounded-2xl border border-[#a8e6df] bg-[#f0fffe] p-5 space-y-3">
            <p className="text-sm font-bold text-[#0d6b5e]">When to use a Settlement Offer</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Use this <strong>after you've filed</strong> — or after sending a demand letter that was ignored. A good offer is 70–85% of your claim. It signals you're serious but saves both sides the cost and stress of a hearing.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { icon: "📅", tip: "Best timing: 2–6 weeks before your hearing date" },
                { icon: "✍️", tip: "If accepted, get the agreement in writing before withdrawing" },
                { icon: "⚖️", tip: "If ignored, proceed to court — you've shown good faith" },
              ].map(({ icon, tip }) => (
                <div key={tip} className="flex items-start gap-2">
                  <span className="text-base shrink-0">{icon}</span>
                  <p className="text-xs text-gray-600 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {!hasRequiredInfo && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Complete Intake First</p>
                <p className="text-amber-700 text-sm mt-0.5">Fill in your name, the defendant's name, and claim amount in the Intake tab.</p>
              </div>
            </div>
          )}

          {/* Settlement amount slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Settlement Amount</p>
              <span className="text-sm font-bold text-[#0d6b5e]">{pctLabel}</span>
            </div>
            {claimAmt > 0 ? (
              <>
                <Slider
                  min={50} max={100} step={1}
                  value={[settlePct]}
                  onValueChange={([v]) => {
                    setSettlePct(v);
                    setSettleAmount(Math.round(claimAmt * v / 100 * 100) / 100);
                  }}
                  className="[&_.bg-primary]:bg-[#0d6b5e] [&_.border-primary\/50]:border-[#0d6b5e]"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>50%</span><span className="font-semibold text-[#0d6b5e]">← Recommended range: 70–85% →</span><span>100%</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  type="number" min={0} step={1}
                  value={settleAmount}
                  onChange={e => setSettleAmount(Number(e.target.value))}
                  className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]"
                  placeholder="Enter settlement amount"
                />
              </div>
            )}
          </div>

          {/* Installments */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox" id="installments" checked={installments}
                onChange={e => setInstallments(e.target.checked)}
                className="h-4 w-4 accent-[#0d6b5e]"
              />
              <label htmlFor="installments" className="text-sm font-medium cursor-pointer">Offer installment payments</label>
            </div>
            {installments && (
              <div className="flex items-center gap-3 pl-7">
                <span className="text-sm text-muted-foreground">Number of monthly payments:</span>
                {[2, 3, 4, 6].map(n => (
                  <button key={n} type="button" onClick={() => setInstallmentCount(n)}
                    className={`h-8 w-8 rounded-full text-sm font-bold border-2 transition-all ${installmentCount === n ? "border-[#0d6b5e] bg-[#0d6b5e] text-white" : "border-border hover:border-[#0d6b5e]"}`}>
                    {n}
                  </button>
                ))}
                {installments && settleAmount > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ≈ {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settleAmount / installmentCount)}/mo
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Response deadline */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Response deadline</p>
            <div className="flex gap-2">
              {[7, 14, 21].map(d => (
                <button key={d} type="button" onClick={() => setResponseDays(d)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${responseDays === d ? "border-[#0d6b5e] bg-[#f0fffe] text-[#0d6b5e]" : "border-border hover:border-[#0d6b5e]/40"}`}>
                  {d} days
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Tone</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "firm", label: "Firm", desc: "Business-like, no ambiguity about consequences" },
                { value: "cooperative", label: "Cooperative", desc: "Conciliatory, invites dialogue and resolution" },
              ].map(({ value, label, desc }) => (
                <button key={value} type="button" onClick={() => setSettleTone(value as "firm" | "cooperative")}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${settleTone === value ? "border-[#0d6b5e] bg-[#f0fffe] shadow-sm" : "border-border hover:border-[#0d6b5e]/40"}`}>
                  <span className="block font-semibold text-sm">{label}</span>
                  <span className="block text-xs text-muted-foreground mt-1">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button onClick={generateSettlement} disabled={isGeneratingSettle || !hasRequiredInfo || settleAmount <= 0}
            className="w-full gap-2 bg-[#0d6b5e] hover:bg-[#0a5449] text-white py-5" size="lg">
            {isGeneratingSettle
              ? <><Loader2 className="h-4 w-4 animate-spin" />Generating letter…</>
              : <><Handshake className="h-4 w-4" />{settlementText.trim() ? "Regenerate Settlement Offer" : "Generate Settlement Offer"}</>}
          </Button>

          {settleError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{settleError}</p>
            </div>
          )}

          {/* Letter output */}
          {(settlementText.trim() || isGeneratingSettle) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Letter Preview</p>
                <p className="text-xs text-muted-foreground">You can edit before downloading.</p>
              </div>
              <Textarea value={settlementText} onChange={e => setSettlementText(e.target.value)}
                className="font-mono text-sm leading-relaxed min-h-[520px] resize-y"
                placeholder={isGeneratingSettle ? "Generating your settlement offer…" : ""} readOnly={isGeneratingSettle} />
              {!isGeneratingSettle && settlementText.trim() && (
                <Button onClick={downloadSettlePdf} disabled={isDownloadingSettle}
                  className="w-full gap-2 bg-[#0d6b5e] hover:bg-[#0a5449] text-white" size="lg">
                  {isDownloadingSettle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download as PDF
                </Button>
              )}

              {/* Post-gen checklist */}
              {!isGeneratingSettle && settlementText.trim() && (
                <div className="rounded-2xl border border-[#a8e6df] bg-[#f0fffe] p-5 space-y-3">
                  <p className="text-sm font-bold text-[#0d6b5e]">Before you send — checklist</p>
                  {SETTLE_CHECKLIST.map(item => (
                    <button key={item.id} type="button"
                      onClick={() => setSettleChecklist(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className="w-full flex items-start gap-3 text-left hover:bg-[#e6faf8] rounded-lg p-2 transition-colors">
                      <div className="shrink-0 mt-0.5 text-[#0d6b5e]">
                        {settleChecklist[item.id]
                          ? <CheckSquare2 className="h-5 w-5" />
                          : <Square className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${settleChecklist[item.id] ? "line-through text-muted-foreground" : ""}`}>{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!settlementText.trim() && !isGeneratingSettle && settleLoaded && (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
              <Handshake className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No settlement offer yet</p>
              <p className="text-xs text-muted-foreground mt-1">Configure your offer above and click Generate.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── SIGNATURE PAD MODAL ──────────────────────────────────────────────────────
function SignaturePadModal({
  open,
  onClose,
  onSign,
  onSkipSign,
}: {
  open: boolean;
  onClose: () => void;
  onSign: (dataUrl: string) => void;
  onSkipSign: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Reset canvas when modal opens
  useEffect(() => {
    if (open) {
      setHasDrawn(false);
      setTimeout(() => clearCanvas(), 50);
    }
  }, [open]);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    const m = e as React.MouseEvent;
    return { x: (m.clientX - rect.left) * scaleX, y: (m.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setHasDrawn(true);
    lastPos.current = getPos(e, canvas);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#0d1b2a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    lastPos.current = pos;
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setIsDrawing(false);
    lastPos.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleSign() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSign(dataUrl);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Sign Your SC-100
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Draw your signature below using your mouse or finger. This will be placed on the signature line of your SC-100 and downloaded as a signed PDF.
          </p>
        </DialogHeader>

        {/* Signature canvas */}
        <div className="rounded-xl border-2 border-dashed border-input bg-[#fdfdfc] relative overflow-hidden" style={{ touchAction: "none" }}>
          <canvas
            ref={canvasRef}
            width={680}
            height={160}
            className="w-full cursor-crosshair"
            style={{ display: "block" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {/* Signature baseline */}
          <div className="absolute bottom-8 left-8 right-8 border-b border-gray-300 pointer-events-none" />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-muted-foreground/40 text-sm select-none">Sign here ↑</p>
            </div>
          )}
        </div>

        {/* Legal note */}
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 leading-relaxed">
          By signing, you declare under penalty of perjury under the laws of the State of California that the information on your SC-100 is true and correct. This is the same declaration printed on the form.
        </p>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={clearCanvas} disabled={!hasDrawn} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onSkipSign}>
              Skip — Download Without Signature
            </Button>
            <Button
              onClick={handleSign}
              disabled={!hasDrawn}
              className="gap-2 bg-[#0d6b5e] hover:bg-[#0a5549] text-white"
            >
              <Download className="h-4 w-4" />
              Sign &amp; Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── HEARING PREP COACH TAB ────────────────────────────────────────────────────
type PrepMessage = { role: "user" | "assistant"; content: string };

function HearingPrepTab({ caseId, currentCase }: { caseId: number; currentCase: any }) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<PrepMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [prepMode, setPrepMode] = useState<null | "statement" | "mock-trial">(null);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const streamJudgeResponse = async (msgHistory: PrepMessage[]) => {
    setIsTyping(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/cases/${caseId}/hearing-prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: msgHistory }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.error || "Something went wrong. Please try again."}` }]);
        return;
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              fullResponse += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullResponse };
                return updated;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      console.error("[HearingPrep] Streaming error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startSession = () => {
    setSessionStarted(true);
    setMessages([]);
    // Kick off with empty history so judge gives opening statement
    streamJudgeResponse([]);
  };

  const resetSession = () => {
    setSessionStarted(false);
    setMessages([]);
    setInput("");
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const newMessages: PrepMessage[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    await streamJudgeResponse(newMessages);
  };

  const handleVoiceStart = () => {
    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!API) return;
    const before = input.trim();
    const rec = new API();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput(before ? `${before} ${transcript.trim()}` : transcript.trim());
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  };

  const handleVoiceStop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  };

  // ── Landing — two tiles ─────────────────────────────────────────────────────
  if (!sessionStarted && prepMode === null) {
    return (
      <div className="p-6 md:p-10 flex flex-col items-center gap-8 text-center max-w-2xl mx-auto">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl">
            <Gavel className="h-10 w-10 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[#0d6b5e] flex items-center justify-center border-2 border-white">
            <Star className="h-3.5 w-3.5 text-white fill-white" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Hearing Prep Coach</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-md mx-auto">
            Two ways to get ready for your court date. Start with your statement, then practice with the AI judge.
          </p>
        </div>

        {/* Two tiles */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tile 1 — Court-Ready Statement */}
          <button
            type="button"
            onClick={() => setPrepMode("statement")}
            className="group text-left rounded-2xl border-2 border-[#a8e6df] bg-[#f0fffe] hover:border-[#0d6b5e] hover:bg-[#e6faf8] transition-all p-6 space-y-3 shadow-sm hover:shadow-md"
          >
            <div className="h-12 w-12 rounded-xl bg-[#0d6b5e] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">Court-Ready Statement</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Build and polish exactly what you'll say when the judge asks you to explain your case. Includes coaching tips.
              </p>
            </div>
            <p className="text-xs font-semibold text-[#0d6b5e] flex items-center gap-1">
              Start here →
            </p>
          </button>

          {/* Tile 2 — Mock Trial */}
          <button
            type="button"
            onClick={() => setPrepMode("mock-trial")}
            className="group text-left rounded-2xl border-2 border-amber-200 bg-amber-50 hover:border-amber-500 hover:bg-amber-100 transition-all p-6 space-y-3 shadow-sm hover:shadow-md"
          >
            <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Gavel className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">Mock Trial with Judge Chen</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Practice answering real judge questions in a simulated courtroom. Get instant feedback on your answers.
              </p>
            </div>
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
              Practice session →
            </p>
          </button>
        </div>

        <p className="text-xs text-muted-foreground">Nothing you say here is sent to the court — this is 100% private practice.</p>
      </div>
    );
  }

  // ── Statement Coach ─────────────────────────────────────────────────────────
  if (!sessionStarted && prepMode === "statement") {
    const desc = currentCase.claimDescription || "";
    const defName = currentCase.defendantName || "the defendant";
    const amount = currentCase.claimAmount ? `$${Number(currentCase.claimAmount).toLocaleString()}` : "the amount claimed";
    return (
      <div className="p-5 md:p-8 space-y-6 max-w-2xl mx-auto">
        {/* Back */}
        <button type="button" onClick={() => setPrepMode(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0d6b5e] flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Court-Ready Statement</h2>
            <p className="text-xs text-muted-foreground">What to say when the judge asks you to explain your case</p>
          </div>
        </div>

        {/* Coaching tips */}
        <div className="rounded-2xl border border-[#a8e6df] bg-[#f0fffe] p-5 space-y-4">
          <p className="text-sm font-bold text-[#0d6b5e] uppercase tracking-wide">5 rules for speaking in court</p>
          {[
            { icon: "1", tip: "Introduce yourself and your relationship", detail: `"My name is [your name]. I am suing ${defName} because…"` },
            { icon: "2", tip: "Tell the story in order", detail: "State what happened first, then next, then what the result was. Judges want a clear timeline — not a back-and-forth." },
            { icon: "3", tip: "Name the exact dollar amount", detail: `State ${amount} clearly and explain exactly how you calculated it. Bring the math.` },
            { icon: "4", tip: "Mention your prior demand", detail: "Did you ask them to pay before filing? Say so. It shows you tried to resolve it first." },
            { icon: "5", tip: "Keep it under 3 minutes", detail: "Judges appreciate brevity. Practice until you can say the essentials in 2–3 minutes. You can add detail when asked." },
          ].map(({ icon, tip, detail }) => (
            <div key={icon} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-[#0d6b5e] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{icon}</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{tip}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Their statement */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900">Your case description (from your form)</p>
          {desc ? (
            <div className="rounded-xl border bg-background p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
              {desc}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground text-center">
              No description yet — go to the Details tab and fill in your claim description first.
            </div>
          )}
          <p className="text-xs text-muted-foreground">Use this as your opening statement. Practice saying it out loud a few times before your hearing.</p>
        </div>

        {/* What NOT to do */}
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-2">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Common mistakes to avoid</p>
          {[
            "Don't bring up the defendant's character — stick to facts about this specific dispute",
            "Don't interrupt the judge — wait until they finish before speaking",
            "Don't bring papers you haven't already submitted — hand copies to the clerk before the hearing",
            "Don't get emotional — calm and factual always wins over angry and passionate",
          ].map((m, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-red-400 shrink-0 mt-0.5">✕</span>
              <p className="text-xs text-red-800 leading-relaxed">{m}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={() => setPrepMode("mock-trial")}
            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white h-11"
          >
            <Gavel className="h-4 w-4" /> Ready to practice? Try the Mock Trial →
          </Button>
          <button type="button" onClick={() => setPrepMode(null)} className="text-xs text-muted-foreground hover:text-foreground text-center hover:underline">
            ← Back to prep options
          </button>
        </div>
      </div>
    );
  }

  // ── Mock Trial Intro (coaching before the AI) ───────────────────────────────
  if (!sessionStarted && prepMode === "mock-trial") {
    const hasHearingDate = !!currentCase.hearingDate;
    return (
      <div className="p-5 md:p-8 space-y-6 max-w-2xl mx-auto">
        {/* Back */}
        <button type="button" onClick={() => setPrepMode(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <Gavel className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mock Trial with Judge Chen</h2>
            <p className="text-xs text-muted-foreground">AI-simulated courtroom — practice before the real thing</p>
          </div>
        </div>

        {/* Coaching before the AI */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-4">
          <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Before you start — a few tips</p>
          {[
            { icon: "🎯", tip: "Answer as if it's real court", detail: "The more seriously you treat it, the more useful the practice. Speak out loud — don't just think the answers." },
            { icon: "📅", tip: "Have your dates and amounts ready", detail: "The judge will ask specifics. Know your incident date, the amount you're claiming, and how you got that number." },
            { icon: "🧾", tip: "Mention your evidence", detail: "When the judge asks, say what documents you have — receipts, texts, photos, contracts. Even if you don't have everything yet." },
            { icon: "💬", tip: "Ask for feedback when you're done", detail: 'After a few rounds, type "Give me feedback" to get a personal critique of how you answered.' },
          ].map(({ icon, tip, detail }) => (
            <div key={tip} className="flex items-start gap-3">
              <span className="text-lg shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">{tip}</p>
                <p className="text-xs text-amber-800/80 mt-0.5 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-xl border bg-background p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">How the session works</p>
          {[
            { num: "1", text: "Judge Chen opens the session and asks you to explain your case in your own words" },
            { num: "2", text: "The judge follows up with the same questions a real judge would ask — amounts, dates, evidence" },
            { num: "3", text: "You keep going until you feel confident, then ask for personal feedback" },
          ].map(({ num, text }) => (
            <div key={num} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{num}</div>
              <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {hasHearingDate && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              <strong>Hearing date set:</strong> {new Date(currentCase.hearingDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.
              Your session is tailored to your real case.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            onClick={startSession}
            className="w-full gap-3 text-base h-12 bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Gavel className="h-5 w-5" />
            Enter Judge Chen's Courtroom
          </Button>
          <p className="text-xs text-muted-foreground text-center">This is practice only — nothing is sent to the court.</p>
          <button type="button" onClick={() => setPrepMode("statement")} className="text-xs text-muted-foreground hover:text-foreground text-center hover:underline">
            ← Build your statement first
          </button>
        </div>
      </div>
    );
  }

  // ── Active session ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-260px)] min-h-[520px]">
      {/* Session header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
            <Gavel className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Judge Chen's Courtroom</p>
            <p className="text-xs text-muted-foreground">Practice session — answer as you would in real court</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetSession}
          className="gap-1.5 text-muted-foreground hover:text-destructive text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restart
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mr-2 mt-1">
                <Gavel className="h-4 w-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-[#0d6b5e] text-white rounded-tr-sm"
                : "bg-amber-50 border border-amber-200 text-gray-800 rounded-tl-sm"
            }`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mr-2 mt-1">
              <Gavel className="h-4 w-4 text-white" />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-card mt-auto">
        <div className={`text-xs text-center mb-2 font-medium transition-colors ${isRecording ? "text-destructive animate-pulse" : "text-muted-foreground/60"}`}>
          {isRecording ? "Recording — release to send" : "Speak your answer or type below — press Enter to send"}
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 160) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Type your answer here… speak naturally, like you would in court"
              rows={1}
              disabled={isRecording || isTyping}
              className="w-full resize-none overflow-hidden rounded-3xl border-2 border-input bg-background px-4 py-3 pr-12 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-0 disabled:opacity-50 transition-colors"
              style={{ minHeight: "44px", maxHeight: "160px" }}
            />
            <Button
              size="icon"
              variant="ghost"
              className={`absolute right-2 bottom-1.5 rounded-full transition-colors ${isRecording ? "text-destructive animate-pulse bg-destructive/10" : "text-muted-foreground"}`}
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceStop}
              onMouseLeave={isRecording ? handleVoiceStop : undefined}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceStop}
              aria-label={isRecording ? "Recording — release to send" : "Hold to record voice answer"}
            >
              <Mic className="h-5 w-5" />
            </Button>
          </div>
          <Button
            onClick={() => sendMessage(input)}
            size="icon"
            className="h-11 w-11 rounded-full shrink-0 mb-0.5 bg-amber-500 hover:bg-amber-600"
            disabled={isTyping || isRecording || !input.trim()}
          >
            <Send className="h-5 w-5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
