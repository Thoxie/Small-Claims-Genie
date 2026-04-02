import { useState, useEffect, useRef } from "react";
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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { i18n } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";
import { Mic, Send, Paperclip, FileText, Download, CheckCircle, AlertCircle, Trash2, ClipboardList, MessageSquare, Scale, ArrowLeft, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCaseQueryKey } from "@workspace/api-client-react";

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

// ─── Intake Zod Schemas (mapped 1-to-1 to SC-100 fields) ─────────────────────
const intakeStep1Schema = z.object({
  plaintiffName: z.string().min(2, "Name is required"),
  plaintiffPhone: z.string().min(10, "Phone is required"),
  plaintiffAddress: z.string().min(5, "Address is required"),
  plaintiffCity: z.string().min(2, "City is required"),
  plaintiffState: z.string().min(2, "State is required"),
  plaintiffZip: z.string().min(5, "ZIP is required"),
  plaintiffEmail: z.string().email("Valid email required").optional().or(z.literal("")),
});

const intakeStep2Schema = z.object({
  defendantName: z.string().min(2, "Defendant name is required"),
  defendantPhone: z.string().optional(),
  defendantAddress: z.string().min(5, "Address is required"),
  defendantCity: z.string().min(2, "City is required"),
  defendantState: z.string().min(2, "State is required"),
  defendantZip: z.string().min(5, "ZIP is required"),
  defendantIsBusinessOrEntity: z.boolean().default(false),
  defendantAgentName: z.string().optional(),
});

const intakeStep3Schema = z.object({
  claimType: z.string().min(1, "Claim type is required"),
  claimAmount: z.coerce.number().min(1, "Amount must be greater than 0"),
  claimDescription: z.string().min(10, "Please describe what happened"),
  incidentDate: z.string().min(1, "Date is required"),
  howAmountCalculated: z.string().min(5, "Please explain how you calculated the amount"),
});

const intakeStep4Schema = z.object({
  priorDemandMade: z.boolean(),
  priorDemandDescription: z.string().optional(),
});

const intakeStep5Schema = z.object({
  countyId: z.string().min(1, "County is required"),
  courthouseId: z.string().optional(),
  venueBasis: z.string().min(1, "Please select a reason"),
  venueReason: z.string().optional(),
});

const intakeStep6Schema = z.object({
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
  
  const { data: currentCase, isLoading: caseLoading } = useGetCase(caseId, { query: { enabled: !!caseId } });
  
  if (caseLoading) {
    return <div className="container mx-auto p-8"><Skeleton className="h-12 w-1/3 mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!currentCase) {
    return <div className="container mx-auto p-8">Case not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl flex flex-col gap-5">

      {/* Your Cases button */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary border rounded-md px-3 py-1.5 transition-colors w-fit bg-background hover:bg-muted">
        <ArrowLeft className="h-4 w-4" />
        Your Cases
      </Link>

      {/* Case header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-5 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{currentCase.title}</h1>
            <Badge variant={currentCase.status === 'filed' ? 'default' : 'secondary'} className="capitalize text-sm">
              {currentCase.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Claim Amount: <span className="font-semibold text-foreground">{currentCase.claimAmount ? `$${currentCase.claimAmount.toLocaleString()}` : "Not set"}</span>
          </p>
        </div>
      </div>

      {/* Tab navigation — click any tab to switch sections */}
      <Tabs defaultValue="intake" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted/80 rounded-xl gap-1">
          <TabsTrigger
            value="intake"
            className="flex flex-col sm:flex-row items-center gap-1.5 py-3 px-2 text-sm font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            data-testid="tab-intake"
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span>{i18n.workspace.tabs.intake}</span>
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="flex flex-col sm:flex-row items-center gap-1.5 py-3 px-2 text-sm font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            data-testid="tab-documents"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>{i18n.workspace.tabs.documents}</span>
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex flex-col sm:flex-row items-center gap-1.5 py-3 px-2 text-sm font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            data-testid="tab-chat"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span>{i18n.workspace.tabs.chat}</span>
          </TabsTrigger>
          <TabsTrigger
            value="forms"
            className="flex flex-col sm:flex-row items-center gap-1.5 py-3 px-2 text-sm font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            data-testid="tab-forms"
          >
            <Scale className="h-4 w-4 shrink-0" />
            <span>{i18n.workspace.tabs.forms}</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6 border rounded-lg bg-card shadow-sm min-h-[600px]">
          <TabsContent value="intake" className="p-0 m-0">
            <IntakeTab caseId={caseId} initialData={currentCase} />
          </TabsContent>
          <TabsContent value="documents" className="p-0 m-0">
            <DocumentsTab caseId={caseId} />
          </TabsContent>
          <TabsContent value="chat" className="p-0 m-0">
            <ChatTab caseId={caseId} />
          </TabsContent>
          <TabsContent value="forms" className="p-0 m-0">
            <FormsTab caseId={caseId} currentCase={currentCase} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ─── INTAKE TAB ───────────────────────────────────────────────────────────────
function IntakeTab({ caseId, initialData }: { caseId: number, initialData: any }) {
  const [step, setStep] = useState(initialData.intakeStep || 1);
  const saveIntake = useSaveIntakeProgress();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleNext = (data: any) => {
    const nextStep = Math.min(step + 1, 7);
    saveIntake.mutate({ id: caseId, data: { step: nextStep, data } }, {
      onSuccess: () => {
        setStep(nextStep);
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
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

  const handleComplete = () => {
    saveIntake.mutate({ id: caseId, data: { step: 7, intakeComplete: true } }, {
      onSuccess: () => {
        toast({ title: "Intake Complete", description: "Your information has been saved." });
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
        queryClient.invalidateQueries({ queryKey: getGetCaseReadinessQueryKey(caseId) });
      }
    });
  };

  const progress = (step / 7) * 100;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2 text-sm font-medium text-muted-foreground">
          <span>Step {step} of 7</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {step === 1 && <Step1 initialData={initialData} onNext={handleNext} saving={saveIntake.isPending} />}
      {step === 2 && <Step2 initialData={initialData} onNext={handleNext} onBack={() => setStep(1)} saving={saveIntake.isPending} />}
      {step === 3 && <Step3 initialData={initialData} onNext={handleNext} onBack={() => setStep(2)} saving={saveIntake.isPending} />}
      {step === 4 && <Step4 initialData={initialData} onNext={handleNext} onBack={() => setStep(3)} saving={saveIntake.isPending} />}
      {step === 5 && <Step5 initialData={initialData} onNext={handleNext} onBack={() => setStep(4)} saving={saveIntake.isPending} />}
      {step === 6 && <Step6 initialData={initialData} onNext={handleNext} onBack={() => setStep(5)} saving={saveIntake.isPending} />}
      {step === 7 && <Step7 initialData={initialData} onComplete={handleComplete} onBack={() => setStep(6)} saving={saveIntake.isPending} />}
    </div>
  );
}

function Step1({ initialData, onNext, saving }: { initialData: any, onNext: (d: any) => void, saving?: boolean }) {
  const form = useForm({
    resolver: zodResolver(intakeStep1Schema),
    defaultValues: {
      plaintiffName: initialData.plaintiffName || "",
      plaintiffPhone: initialData.plaintiffPhone || "",
      plaintiffAddress: initialData.plaintiffAddress || "",
      plaintiffCity: initialData.plaintiffCity || "",
      plaintiffState: initialData.plaintiffState || "CA",
      plaintiffZip: initialData.plaintiffZip || "",
      plaintiffEmail: initialData.plaintiffEmail || "",
    }
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{i18n.intake.steps.step1}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField control={form.control} name="plaintiffName" render={({ field }) => (
            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="plaintiffPhone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="(555) 555-5555"
                    value={field.value}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="plaintiffEmail" render={({ field }) => (
              <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="plaintiffAddress" render={({ field }) => (
            <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="plaintiffCity" render={({ field }) => (
              <FormItem className="col-span-1"><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="plaintiffState" render={({ field }) => (
              <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="plaintiffZip" render={({ field }) => (
              <FormItem><FormLabel>ZIP Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>{saving ? "Saving…" : i18n.intake.saveAndContinue}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Step2({ initialData, onNext, onBack, saving }: { initialData: any, onNext: (d: any) => void, onBack: () => void, saving?: boolean }) {
  const form = useForm({
    resolver: zodResolver(intakeStep2Schema),
    defaultValues: {
      defendantName: initialData.defendantName || "",
      defendantPhone: initialData.defendantPhone || "",
      defendantAddress: initialData.defendantAddress || "",
      defendantCity: initialData.defendantCity || "",
      defendantState: initialData.defendantState || "CA",
      defendantZip: initialData.defendantZip || "",
      defendantIsBusinessOrEntity: initialData.defendantIsBusinessOrEntity || false,
      defendantAgentName: initialData.defendantAgentName || "",
    }
  });

  const isBusiness = form.watch("defendantIsBusinessOrEntity");

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{i18n.intake.steps.step2}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField control={form.control} name="defendantIsBusinessOrEntity" render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>I am suing a business or public entity</FormLabel>
              </div>
            </FormItem>
          )} />
          
          <FormField control={form.control} name="defendantName" render={({ field }) => (
            <FormItem><FormLabel>{isBusiness ? "Business Name" : "Full Name"}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          {isBusiness && (
            <FormField control={form.control} name="defendantAgentName" render={({ field }) => (
              <FormItem><FormLabel>Agent for Service of Process (if known)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          )}

          <FormField control={form.control} name="defendantPhone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="(555) 555-5555"
                  value={field.value}
                  onChange={(e) => field.onChange(formatPhone(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="defendantAddress" render={({ field }) => (
            <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="defendantCity" render={({ field }) => (
              <FormItem className="col-span-1"><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="defendantState" render={({ field }) => (
              <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="defendantZip" render={({ field }) => (
              <FormItem><FormLabel>ZIP Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>{saving ? "Saving…" : i18n.intake.saveAndContinue}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Step3({ initialData, onNext, onBack, saving }: { initialData: any, onNext: (d: any) => void, onBack: () => void, saving?: boolean }) {
  const form = useForm({
    resolver: zodResolver(intakeStep3Schema),
    defaultValues: {
      claimType: initialData.claimType || "",
      claimAmount: initialData.claimAmount || "",
      claimDescription: initialData.claimDescription || "",
      incidentDate: initialData.incidentDate || "",
      howAmountCalculated: initialData.howAmountCalculated || "",
    }
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{i18n.intake.steps.step3}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="claimType" render={({ field }) => (
              <FormItem>
                <FormLabel>Claim Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {["Money Owed", "Unpaid Debt", "Security Deposit", "Property Damage", "Contract Dispute", "Fraud", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="claimAmount" render={({ field }) => (
              <FormItem><FormLabel>Amount Requested ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          
          <FormField control={form.control} name="incidentDate" render={({ field }) => (
            <FormItem>
              <FormLabel>When did this happen?</FormLabel>
              <FormControl>
                <DateRangePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <p className="text-xs text-muted-foreground">Click a start date, then click an end date to select a range. Click one date for a single day.</p>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="claimDescription" render={({ field }) => (
            <FormItem><FormLabel>What happened?</FormLabel><FormControl><Textarea className="min-h-[120px]" placeholder="Briefly describe why the defendant owes you money..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          
          <FormField control={form.control} name="howAmountCalculated" render={({ field }) => (
            <FormItem><FormLabel>How did you calculate this amount?</FormLabel><FormControl><Textarea className="min-h-[80px]" placeholder="e.g. $500 for rent + $100 late fee" {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>{saving ? "Saving…" : i18n.intake.saveAndContinue}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Step4({ initialData, onNext, onBack, saving }: { initialData: any, onNext: (d: any) => void, onBack: () => void, saving?: boolean }) {
  const form = useForm({
    resolver: zodResolver(intakeStep4Schema),
    defaultValues: {
      priorDemandMade: initialData.priorDemandMade ?? false,
      priorDemandDescription: initialData.priorDemandDescription || "",
    }
  });

  const madeDemand = form.watch("priorDemandMade");

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{i18n.intake.steps.step4}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField control={form.control} name="priorDemandMade" render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Have you asked the defendant to pay you (or perform the required action)?</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={(val) => field.onChange(val === 'true')} defaultValue={field.value ? 'true' : 'false'} className="flex flex-col space-y-1">
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl><RadioGroupItem value="true" /></FormControl>
                    <FormLabel className="font-normal">Yes, I asked them.</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl><RadioGroupItem value="false" /></FormControl>
                    <FormLabel className="font-normal">No, I have not asked them.</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {madeDemand && (
            <FormField control={form.control} name="priorDemandDescription" render={({ field }) => (
              <FormItem><FormLabel>How and when did you ask them?</FormLabel><FormControl><Textarea placeholder="e.g. I sent a text message on Oct 1st and an email on Oct 5th." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          )}

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>{saving ? "Saving…" : i18n.intake.saveAndContinue}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Step5({ initialData, onNext, onBack, saving }: { initialData: any, onNext: (d: any) => void, onBack: () => void, saving?: boolean }) {
  const { data: counties } = useListCounties();
  const form = useForm({
    resolver: zodResolver(intakeStep5Schema),
    defaultValues: {
      countyId: initialData.countyId || "",
      courthouseId: initialData.courthouseId || "",
      venueBasis: initialData.venueBasis || "",
      venueReason: initialData.venueReason || "",
    }
  });

  const selectedCountyId = form.watch("countyId");
  const selectedCourthouseId = form.watch("courthouseId");
  const basis = form.watch("venueBasis");

  const selectedCounty = counties?.find((c: any) => c.id === selectedCountyId);
  const hasMultipleCourthouses = selectedCounty?.courthouses && selectedCounty.courthouses.length > 0;

  const selectedCourthouse = hasMultipleCourthouses
    ? selectedCounty.courthouses.find((ch: any) => ch.id === selectedCourthouseId)
    : null;

  const courtName = selectedCourthouse
    ? selectedCourthouse.name
    : selectedCounty?.courthouseName;
  const courtAddress = selectedCourthouse
    ? `${selectedCourthouse.address}, ${selectedCourthouse.city}, CA ${selectedCourthouse.zip}`
    : selectedCounty ? `${selectedCounty.courthouseAddress}, ${selectedCounty.courthouseCity}, CA ${selectedCounty.courthouseZip}` : "";
  const courtPhone = selectedCourthouse?.phone ?? selectedCounty?.phone;

  const claimAmount = initialData.claimAmount || 0;
  const filingFee = claimAmount < 1500
    ? selectedCounty?.filingFeeUnder1500 ?? 30
    : claimAmount <= 5000
      ? selectedCounty?.filingFee1500to5000 ?? 50
      : selectedCounty?.filingFeeOver5000 ?? 75;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{i18n.intake.steps.step5}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">

          {/* State / County / Courthouse — all in one row */}
          <div className="grid grid-cols-3 gap-3">
            <FormItem>
              <FormLabel>State</FormLabel>
              <div className="flex h-10 w-full items-center rounded-md border bg-muted px-3 text-sm font-medium text-muted-foreground select-none">
                California
              </div>
            </FormItem>

            <FormField control={form.control} name="countyId" render={({ field }) => (
              <FormItem>
                <FormLabel>County</FormLabel>
                <Select onValueChange={(v) => { field.onChange(v); form.setValue("courthouseId", ""); }} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger></FormControl>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    {counties?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} County</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="courthouseId" render={({ field }) => (
              <FormItem>
                <FormLabel>Filing Location</FormLabel>
                {hasMultipleCourthouses ? (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select courthouse" /></SelectTrigger></FormControl>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {selectedCounty.courthouses.map((ch: any) => (
                        <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-10 w-full items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                    {selectedCounty ? "Single location" : "Select county first"}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Auto-populated court info — compact single strip */}
          {selectedCounty && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 grid grid-cols-4 gap-x-6 gap-y-1 items-start">
              <div>
                <p className="text-xs text-muted-foreground">Court Name</p>
                <p className="text-sm font-medium leading-snug">{courtName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium leading-snug">{courtAddress || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{courtPhone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Filing Fee</p>
                <p className="text-sm font-bold text-primary">${filingFee}</p>
              </div>
            </div>
          )}

          {/* Venue basis — 2x2 grid */}
          <FormField control={form.control} name="venueBasis" render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Why are you filing in this county?</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-2">
                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3"><FormControl><RadioGroupItem value="where_defendant_lives" /></FormControl><FormLabel className="font-normal cursor-pointer">Where the defendant lives or does business</FormLabel></FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3"><FormControl><RadioGroupItem value="where_damage_happened" /></FormControl><FormLabel className="font-normal cursor-pointer">Where the damage or injury happened</FormLabel></FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3"><FormControl><RadioGroupItem value="where_contract_made_broken" /></FormControl><FormLabel className="font-normal cursor-pointer">Where the contract was made or broken</FormLabel></FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3"><FormControl><RadioGroupItem value="other" /></FormControl><FormLabel className="font-normal cursor-pointer">Other reason</FormLabel></FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {basis === 'other' && (
            <FormField control={form.control} name="venueReason" render={({ field }) => (
              <FormItem><FormLabel>Please explain</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          )}

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>{saving ? "Saving…" : i18n.intake.saveAndContinue}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Step6({ initialData, onNext, onBack, saving }: { initialData: any, onNext: (d: any) => void, onBack: () => void, saving?: boolean }) {
  const form = useForm({
    resolver: zodResolver(intakeStep6Schema),
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
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{i18n.intake.steps.step6}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField control={form.control} name="isSuingPublicEntity" render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Are you suing a public entity? (e.g., City, County, State)</FormLabel></div></FormItem>
          )} />
          {suingPublic && (
            <FormField control={form.control} name="publicEntityClaimFiledDate" render={({ field }) => (
              <FormItem><FormLabel>When did you file a claim with them?</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          )}
          <FormField control={form.control} name="isAttyFeeDispute" render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Is this a dispute with a lawyer about attorney fees?</FormLabel></div></FormItem>
          )} />
          <FormField control={form.control} name="filedMoreThan12Claims" render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Have you filed more than 12 small claims in California in the past 12 months?</FormLabel></div></FormItem>
          )} />
          <FormField control={form.control} name="claimOver2500" render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>If your claim is over $2,500: Have you filed more than 2 other small claims for over $2,500 in CA this calendar year?</FormLabel></div></FormItem>
          )} />

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>{saving ? "Saving…" : i18n.intake.saveAndContinue}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Step7({ initialData, onComplete, onBack, saving }: { initialData: any, onComplete: () => void, onBack: () => void, saving?: boolean }) {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{i18n.intake.steps.step7}</h2>
      <div className="space-y-6">
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-lg">Plaintiff &amp; Defendant</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold block text-muted-foreground">Plaintiff</span>{initialData.plaintiffName}<br/>{initialData.plaintiffAddress}<br/>{initialData.plaintiffCity}, {initialData.plaintiffState} {initialData.plaintiffZip}</div>
            <div><span className="font-semibold block text-muted-foreground">Defendant</span>{initialData.defendantName}<br/>{initialData.defendantAddress}<br/>{initialData.defendantCity}, {initialData.defendantState} {initialData.defendantZip}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-lg">The Claim</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold block text-muted-foreground">Type</span>{initialData.claimType}</div>
            <div><span className="font-semibold block text-muted-foreground">Amount</span>${initialData.claimAmount}</div>
            <div className="col-span-2"><span className="font-semibold block text-muted-foreground">Description</span>{initialData.claimDescription}</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-between pt-8">
        <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
        <Button onClick={onComplete} size="lg" data-testid="button-complete-intake" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">{saving ? "Saving…" : "Complete Intake"}</Button>
      </div>
    </div>
  );
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────────────────────
function DocumentsTab({ caseId }: { caseId: number }) {
  const { data: documents } = useListDocuments(caseId, { query: { enabled: !!caseId } });
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    await uploadDoc.mutateAsync({ id: caseId, data: { file, label: file.name } });
    queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getGetCaseReadinessQueryKey(caseId) });
    toast({ title: "Document uploaded", description: "OCR text extraction is running in the background." });
    e.target.value = "";
  };

  const handleDelete = (docId: number) => {
    deleteDoc.mutate({ id: caseId, docId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(caseId) });
        queryClient.invalidateQueries({ queryKey: getGetCaseReadinessQueryKey(caseId) });
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

      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center mb-8 bg-muted/5 cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium mb-1">Drag and drop files here</h3>
        <p className="text-muted-foreground mb-4">{i18n.documents.uploadZone}</p>
        <Button variant="outline" type="button">Browse Files</Button>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const { data: history } = useGetChatHistory(caseId, { query: { enabled: !!caseId } });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // SSE streaming send — evidence-grounded via buildCaseContext on the server
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    const newMsg = { id: Date.now(), role: 'user', content };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      
      if (reader) {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "" }]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(Boolean);
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
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
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) setInput(transcript.trim());
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

  const voiceLabel = isRecording ? i18n.chat.recording : "";

  return (
    <div className="flex flex-col h-[600px]">
      <div className="bg-primary/5 border-b p-3 text-center text-sm font-medium text-primary flex items-center justify-center gap-2">
        <CheckCircle className="h-4 w-4" /> Your AI Genie is trained on your uploaded documents.
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
            <div className="text-4xl mb-4">🧞</div>
            <p>Ask anything about your case.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-strong:font-semibold prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-a:text-primary">
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

      <div className="p-4 border-t bg-card mt-auto">
        {voiceLabel && (
          <div className="text-xs text-center text-muted-foreground mb-2 font-medium animate-pulse">{voiceLabel}</div>
        )}
        <div className="flex items-center gap-2 relative">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={i18n.chat.placeholder}
            className="flex-1 h-12 pr-12 rounded-full border-2"
            disabled={isRecording}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className={`absolute right-14 rounded-full transition-colors ${isRecording ? 'text-destructive animate-pulse bg-destructive/10' : 'text-muted-foreground'}`}
            onMouseDown={handleVoiceStart}
            onMouseUp={handleVoiceStop}
            onMouseLeave={isRecording ? handleVoiceStop : undefined}
            onTouchStart={handleVoiceStart}
            onTouchEnd={handleVoiceStop}
            aria-label={isRecording ? "Recording — release to send" : "Hold to record voice message"}
          >
            <Mic className="h-5 w-5" />
          </Button>
          <Button onClick={() => sendMessage(input)} size="icon" className="h-12 w-12 rounded-full shrink-0" disabled={isTyping || isRecording}>
            <Send className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── FORMS TAB ────────────────────────────────────────────────────────────────
// Readiness score: intake(60) + documents(30) + prior demand(10) = 0–100
// Score ≥ 80 unlocks SC-100 PDF download
function FormsTab({ caseId, currentCase }: { caseId: number, currentCase: any }) {
  const { data: readiness } = useGetCaseReadiness(caseId, { query: { enabled: !!caseId } });
  
  const score = readiness?.score ?? currentCase.readinessScore ?? 0;
  const isReady = score >= 80;
  const color = score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
  const barColor = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  
  return (
    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">SC-100 Preview</h2>
          <p className="text-muted-foreground">This is the official Plaintiff's Claim form you will file with the court.</p>
        </div>
        
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Plaintiff</span>{currentCase.plaintiffName || "—"}</div>
              <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Defendant</span>{currentCase.defendantName || "—"}</div>
              <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Amount Requested</span>{currentCase.claimAmount ? `$${currentCase.claimAmount}` : "—"}</div>
              <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Incident Date</span>{currentCase.incidentDate || "—"}</div>
              <div className="col-span-2"><span className="font-semibold block text-xs text-muted-foreground uppercase">Why does defendant owe you money?</span>{currentCase.claimDescription || "—"}</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="flex-1 h-14 text-lg font-bold"
            disabled={!isReady}
            onClick={() => window.open(`/api/cases/${caseId}/forms/sc100`, '_blank')}
          >
            <Download className="mr-2 h-5 w-5" /> {i18n.forms.downloadSc100}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-14 text-lg font-bold border-2"
            disabled={!isReady}
            onClick={() => {
              const a = document.createElement("a");
              a.href = `/api/cases/${caseId}/forms/sc100-word`;
              a.download = `SC100-Case-${caseId}.docx`;
              a.click();
            }}
          >
            <Download className="mr-2 h-5 w-5" /> Download as Word (.docx)
          </Button>
        </div>
        {!isReady && <p className="text-sm text-center text-muted-foreground">You must complete your intake to reach 80% readiness before downloading.</p>}
      </div>

      <div className="w-full md:w-80 space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-muted-foreground text-sm uppercase tracking-wider">{i18n.forms.readinessScore}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className={`text-6xl font-black ${color} mb-2`}>{score}</div>
            <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
              <div className={`h-full ${barColor} transition-all duration-700`} style={{ width: `${score}%` }}></div>
            </div>
            {readiness?.missingFields && readiness.missingFields.length > 0 && (
              <div className="w-full mt-4">
                <h4 className="text-sm font-semibold flex items-center gap-1 text-destructive mb-2"><AlertCircle className="h-4 w-4"/> {i18n.forms.missingFields}</h4>
                <ul className="text-sm space-y-1">
                  {readiness.missingFields.map((f: string, i: number) => (
                    <li key={i} className="text-muted-foreground flex items-start gap-2"><span className="text-destructive mt-1">•</span>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            {readiness?.strengths && readiness.strengths.length > 0 && (
              <div className="w-full mt-4">
                <h4 className="text-sm font-semibold flex items-center gap-1 text-green-600 mb-2"><CheckCircle className="h-4 w-4"/> Strengths</h4>
                <ul className="text-sm space-y-1">
                  {readiness.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-muted-foreground flex items-start gap-2"><span className="text-green-500 mt-1">✓</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {readiness?.filingGuidance && (
              <p className="mt-4 text-xs text-muted-foreground text-center border-t pt-3">{readiness.filingGuidance}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
