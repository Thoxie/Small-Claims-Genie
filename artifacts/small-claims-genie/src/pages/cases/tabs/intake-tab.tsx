import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import {
  useSaveIntakeProgress,
  useListCounties,
  getGetCaseQueryKey,
  getGetCaseReadinessQueryKey,
  getListCasesQueryKey,
  getGetCaseStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CalendarIcon, Loader2, Sparkles, CheckCircle, CheckSquare2, Square, RotateCcw, Maximize2, MapPin, Phone, Mail, Globe, ExternalLink, LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatPhone, DateRangePicker, intakeStep1Schema, intakeStep2Schema, intakeStep3Schema, intakeStep4Schema } from "./shared";

// ─── Hearing Info Card ────────────────────────────────────────────────────────
export function HearingInfoCard({ caseId, initialData }: { caseId: number; initialData: any }) {
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

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function Step1({ initialData, onNext, saving, onSaveExit }: { initialData: any, onNext: (d: any) => void, saving?: boolean, onSaveExit: (d: any) => void }) {
  const { data: counties } = useListCounties();
  const form = useForm({
    resolver: zodResolver(intakeStep1Schema),
    defaultValues: {
      countyId: initialData.countyId || "",
      courthouseId: initialData.courthouseId || "",
      plaintiffName: initialData.plaintiffName || "",
      plaintiffIsBusiness: initialData.plaintiffIsBusiness || false,
      secondPlaintiffName: initialData.secondPlaintiffName || "",
      plaintiffTitle: initialData.plaintiffTitle || "",
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
  const plaintiffIsBusiness = form.watch("plaintiffIsBusiness");
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

          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Filing County &amp; Court</h3>
            <div className="flex flex-wrap gap-3 items-end mb-3">
              <FormField control={form.control} name="countyId" render={({ field }) => (
                <FormItem className="flex-1 min-w-[200px]">
                  <FormLabel className="font-semibold">California County <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue("courthouseId", ""); }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select your county" /></SelectTrigger>
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
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select courthouse" /></SelectTrigger>
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
            {selectedCounty && courtName && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-background border px-4 py-2.5 text-sm">
                <span className="font-semibold text-foreground">{courtName}</span>
                {courtAddress && <span className="text-muted-foreground">{courtAddress}</span>}
                {courtPhone && <span className="text-muted-foreground">{courtPhone}</span>}
                {selectedCounty?.website && (
                  <a href={selectedCounty.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">
                    Court website ↗
                  </a>
                )}
              </div>
            )}
            {selectedCountyId && !courtName && <p className="text-xs text-muted-foreground italic">Loading court information…</p>}
            {!selectedCountyId && <p className="text-xs text-muted-foreground">Select a county to see the court location.</p>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Your Information (Plaintiff)</h3>
              <FormField control={form.control} name="plaintiffIsBusiness" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">I am filing as a business or organization</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="plaintiffName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{plaintiffIsBusiness ? "Business / Organization Name" : "Your Full Name"} <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {plaintiffIsBusiness && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="secondPlaintiffName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name (Individual) <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input {...field} placeholder="First Last" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="plaintiffTitle" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Title / Position</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Owner, President" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="plaintiffPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} placeholder="(555) 555-5555" value={field.value} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="plaintiffEmail" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="plaintiffAddress" render={({ field }) => (
                <FormItem><FormLabel>Street Address <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-5 gap-2">
                <FormField control={form.control} name="plaintiffCity" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="plaintiffState" render={({ field }) => (
                  <FormItem className="col-span-1"><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="plaintiffZip" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Defendant Information</h3>
              <FormField control={form.control} name="defendantIsBusinessOrEntity" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">I am suing a business or public entity</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="defendantName" render={({ field }) => (
                <FormItem><FormLabel>{isBusiness ? "Business Name" : "Full Name"} <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {isBusiness && (
                <FormField control={form.control} name="defendantAgentName" render={({ field }) => (
                  <FormItem><FormLabel>Agent for Service of Process (if known)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={form.control} name="defendantPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} placeholder="(555) 555-5555" value={field.value} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="defendantAddress" render={({ field }) => (
                <FormItem><FormLabel>Street Address <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-5 gap-2">
                <FormField control={form.control} name="defendantCity" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="defendantState" render={({ field }) => (
                  <FormItem className="col-span-1"><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="defendantZip" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
              <LogOut className="mr-2 h-4 w-4" />
              Save & Exit
            </Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function Step2({ caseId, initialData, onNext, onBack, saving, autoOpenAdvisor, onAdvisorOpened, onSaveExit }: { caseId: number, initialData: any, onNext: (d: any) => void, onBack: () => void, saving?: boolean, autoOpenAdvisor?: boolean, onAdvisorOpened?: () => void, onSaveExit: (d: any) => void }) {
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

  const [descModalOpen, setDescModalOpen] = useState(false);
  const [descModalValue, setDescModalValue] = useState("");
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
      await fetch(`/api/cases/${caseId}/intake`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ step: 2, data: values }),
      }).catch(() => {});
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
              <FormControl><DateRangePicker value={field.value} onChange={field.onChange} /></FormControl>
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
                    <Textarea className="min-h-[88px] pr-10 resize-none" placeholder="Briefly describe why the defendant owes you money…" {...field} />
                    <button type="button" title="Expand to full editor" onClick={() => { setDescModalValue(field.value || ""); setDescModalOpen(true); }}
                      className="absolute bottom-2 right-2 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
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
                <FormControl><Textarea className="min-h-[88px]" placeholder="e.g. $500 unpaid rent + $100 late fee + $50 court costs" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm text-[#0d6b5e]">Not sure if your description is strong enough?</p>
              <p className="text-xs text-[#4a9990] mt-0.5">The Case Advisor will review what you've written, ask follow-up questions, and help you write a stronger statement.</p>
            </div>
            <Button type="button" onClick={openAdvisor} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-2">
              <Sparkles className="h-4 w-4" /> Check My Case
            </Button>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
                <LogOut className="mr-2 h-4 w-4" />
                Save & Exit
              </Button>
            </div>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={descModalOpen} onOpenChange={setDescModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Maximize2 className="h-5 w-5 text-primary" /> What happened? — Full Description Editor
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Write as much detail as you need. Include what happened, when, and exactly how much money you lost.</p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
            <textarea value={descModalValue} onChange={(e) => setDescModalValue(e.target.value)}
              placeholder="Describe what happened in your own words…"
              className="flex-1 min-h-[320px] w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{descModalValue.length} characters</span>
              {descModalValue.length > 650 && <span className="text-amber-600 font-medium">⚠ Long descriptions may need a separate MC-030 attachment.</span>}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 gap-2">
            <Button variant="outline" onClick={() => setDescModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const currentFieldValue = form.getValues("claimDescription");
              if (descModalValue !== currentFieldValue) form.setValue("claimDescription", descModalValue, { shouldValidate: true, shouldDirty: true });
              setDescModalOpen(false);
            }}>Save Description</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                          <Textarea className="min-h-[70px] text-sm" placeholder="Your answer…" value={answers[q.id] || ""} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                    <Button onClick={refineStatement} disabled={advisorPhase === "refining"} className="w-full bg-[#0d6b5e] hover:bg-[#0a5449] text-white gap-2">
                      {advisorPhase === "refining" ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating your statement…</> : <><Sparkles className="h-4 w-4" /> Generate My Statement</>}
                    </Button>
                  </div>
                )}
                {evidenceChecklist.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-[#0d6b5e] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                      <h3 className="font-semibold text-sm">Evidence you should gather</h3>
                    </div>
                    <div className="space-y-2">
                      {evidenceChecklist.map((item) => (
                        <button key={item.id} type="button" onClick={() => toggleEvidence(item.id)}
                          className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors">
                          <div className="mt-0.5 shrink-0 text-[#0d6b5e]">
                            {checkedEvidence.has(item.id) ? <CheckSquare2 className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
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
                  <Button type="button" onClick={() => setAdvisorOpen(false)} className="w-full bg-[#0d6b5e] hover:bg-[#0a5449] text-white">Done for now</Button>
                  <p className="text-center text-xs text-muted-foreground">Your document checklist is saved — find it in the Documents tab whenever you're ready to upload.</p>
                </div>
              </>
            )}
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
                  <div className="rounded-lg border border-[#a8e6df] bg-[#f0fffe] p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">{refinedStatement}</div>
                  <Button type="button" onClick={copyToCase} variant="outline" className={`w-full gap-2 text-sm ${copied ? "border-green-500 text-green-700" : ""}`}>
                    {copied ? <><CheckCircle className="h-4 w-4" /> Re-applied!</> : <><RotateCcw className="h-4 w-4" /> Re-apply to form</>}
                  </Button>
                  <button type="button" onClick={() => setAdvisorPhase("questions")} className="w-full text-xs text-muted-foreground hover:text-foreground text-center hover:underline">
                    ← Back to questions to refine further
                  </button>
                </div>
                {evidenceChecklist.length > 0 && (
                  <div className="space-y-3 border-t pt-5">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-[#0d6b5e] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                      <h3 className="font-semibold text-sm">Evidence to gather</h3>
                    </div>
                    <div className="space-y-2">
                      {evidenceChecklist.map((item) => (
                        <button key={item.id} type="button" onClick={() => toggleEvidence(item.id)}
                          className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors">
                          <div className="mt-0.5 shrink-0 text-[#0d6b5e]">
                            {checkedEvidence.has(item.id) ? <CheckSquare2 className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
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
                  <Button type="button" onClick={() => setAdvisorOpen(false)} className="w-full bg-[#0d6b5e] hover:bg-[#0a5449] text-white">Done for now</Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function Step3({ initialData, onNext, onBack, saving, onSaveExit }: { initialData: any, onNext: (d: any) => void, onBack: () => void, saving?: boolean, onSaveExit: (d: any) => void }) {
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Prior Demand</h3>
              <FormField control={form.control} name="priorDemandMade" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-medium">Have you already asked the defendant to pay you?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={(val) => field.onChange(val === 'true')} defaultValue={field.value ? 'true' : 'false'} className="flex flex-col space-y-2">
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
                    <FormControl><Textarea className="min-h-[100px]" placeholder="e.g. Sent a text on Oct 1st and an email on Oct 5th demanding payment." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Why This County?</h3>
              <FormField control={form.control} name="venueBasis" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-medium">Select the reason you're filing here <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2">
                      {[
                        { value: "where_defendant_lives", label: "Where the defendant lives or does business" },
                        { value: "where_damage_happened", label: "Where the damage or injury happened" },
                        { value: "where_contract_made_broken", label: "Where the contract was made or broken" },
                        { value: "other", label: "Other reason" },
                      ].map(({ value, label }) => (
                        <FormItem key={value} className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 cursor-pointer">
                          <FormControl><RadioGroupItem value={value} /></FormControl>
                          <FormLabel className="font-normal cursor-pointer">{label}</FormLabel>
                        </FormItem>
                      ))}
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
            </div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
                <LogOut className="mr-2 h-4 w-4" />
                Save & Exit
              </Button>
            </div>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────
function Step4({ initialData, onComplete, onBack, saving, onCheckCase, onSaveExit }: { initialData: any, onComplete: (d: any) => void, onBack: () => void, saving?: boolean, onCheckCase?: () => void, onSaveExit: (d: any) => void }) {
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
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Eligibility Questions</h3>
              {[
                { name: "isSuingPublicEntity" as const, label: "Suing a public entity? (e.g. City, County, State)" },
                { name: "isAttyFeeDispute" as const, label: "Is this a dispute with a lawyer about attorney fees?" },
                { name: "filedMoreThan12Claims" as const, label: "Filed more than 12 small claims in California in the past 12 months?" },
                { name: "claimOver2500" as const, label: "Claim over $2,500: Have you filed 2+ other small claims over $2,500 in CA this calendar year?" },
              ].map(({ name, label }) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none"><FormLabel className="cursor-pointer">{label}</FormLabel></div>
                  </FormItem>
                )} />
              ))}
              {suingPublic && (
                <FormField control={form.control} name="publicEntityClaimFiledDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>When did you file a government claim with them?</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>
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
                  {initialData.claimDescription && <p className="text-sm text-muted-foreground line-clamp-3">{initialData.claimDescription}</p>}
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
                        <a href={`tel:${initialData.courthousePhone.replace(/\D/g, "")}`} className="text-primary font-medium hover:underline">{initialData.courthousePhone}</a>
                      </div>
                    )}
                    {initialData.courthouseClerkEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={`mailto:${initialData.courthouseClerkEmail}`} className="text-primary hover:underline break-all">{initialData.courthouseClerkEmail}</a>
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
                    {initialData.filingFee && <p className="text-sm">Filing fee: <span className="font-bold">${initialData.filingFee}</span></p>}
                    {initialData.courthouseAddress && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${initialData.courthouseAddress}, ${initialData.courthouseCity}, CA ${initialData.courthouseZip}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                        <MapPin className="w-3.5 h-3.5" /> Get Directions
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
                <Sparkles className="h-4 w-4" /> Check My Case
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
                <LogOut className="mr-2 h-4 w-4" />
                Save & Exit
              </Button>
            </div>
            <Button type="submit" size="lg" data-testid="button-complete-intake" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8">
              {saving ? "Saving…" : "Complete Intake ✓"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Intake Tab ───────────────────────────────────────────────────────────────
export function IntakeTab({ caseId, initialData }: { caseId: number, initialData: any }) {
  const [step, setStep] = useState(Math.min(initialData.intakeStep || 1, 4));
  const [autoOpenAdvisor, setAutoOpenAdvisor] = useState(false);
  const [, navigate] = useLocation();
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
        toast({ title: "Could not save progress", description: err?.message || "Please check your connection and try again.", variant: "destructive" });
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

  const handleSaveExit = (formData: any) => {
    saveIntake.mutate({ id: caseId, data: { step, data: formData } }, {
      onSuccess: () => {
        invalidateAll();
        navigate("/dashboard");
      },
      onError: () => {
        navigate("/dashboard");
      },
    });
  };

  const progress = (step / 4) * 100;
  const stepLabels = ["Parties & Filing County", "Claim Details", "Prior Demand & Venue", "Eligibility & Review"];

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

      {step === 1 && <Step1 initialData={initialData} onNext={handleNext} saving={saveIntake.isPending} onSaveExit={handleSaveExit} />}
      {step === 2 && <Step2 caseId={caseId} initialData={initialData} onNext={handleNext} onBack={() => setStep(1)} saving={saveIntake.isPending} autoOpenAdvisor={autoOpenAdvisor} onAdvisorOpened={() => setAutoOpenAdvisor(false)} onSaveExit={handleSaveExit} />}
      {step === 3 && <Step3 initialData={initialData} onNext={handleNext} onBack={() => setStep(2)} saving={saveIntake.isPending} onSaveExit={handleSaveExit} />}
      {step === 4 && <Step4 initialData={initialData} onComplete={handleComplete} onBack={() => setStep(3)} saving={saveIntake.isPending} onCheckCase={goToAdvisor} onSaveExit={handleSaveExit} />}
    </div>
  );
}
