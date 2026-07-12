import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Home, Sparkles, Maximize2, Minimize2, CheckSquare2, Square, RotateCcw, CheckCircle, Loader2, Play, X, ChevronRight, ChevronLeft, CloudOff, Scale, MessageSquareText, ClipboardCheck, Copy, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { DateRangePicker, intakeStep2Schema } from "./shared";
import { getStarterQuestions, reviewDraftWithAI, generateCaseStatementWithAI, getMissingFactsWithAI, type GuidedQuestion } from "@/lib/case-story-ai";

import type { ExtendedCase } from "@/lib/types";

interface Props {
  caseId: number;
  initialData: Partial<ExtendedCase>;
  onNext: (d: Record<string, unknown>) => void;
  onBack?: () => void;
  saving?: boolean;
  autoOpenAdvisor?: boolean;
  onAdvisorOpened?: () => void;
  onSaveExit: (d: Record<string, unknown>) => void;
  onRegisterFlush?: (flush: (() => Promise<void>) | null) => void;
  onGoToAiChat?: () => void;
}

export function IntakeStep2({ caseId, initialData, onNext, saving, autoOpenAdvisor, onAdvisorOpened, onSaveExit, onRegisterFlush, onGoToAiChat }: Props) {
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
      workDoneStartDate: initialData.workDoneStartDate || "",
      workDoneEndDate: initialData.workDoneEndDate || "",
      workDoneLaborMaterials: initialData.workDoneLaborMaterials || "",
      goodsSoldInterestStartDate: initialData.goodsSoldInterestStartDate || "",
      goodsSoldFirstSaleDate: initialData.goodsSoldFirstSaleDate || "",
      goodsSoldLastSaleDate: initialData.goodsSoldLastSaleDate || "",
      goodsSoldGoodsAndPrices: initialData.goodsSoldGoodsAndPrices || "",
      autoCollisionLocation: initialData.autoCollisionLocation || "",
      autoHighwayName: initialData.autoHighwayName || "",
      autoCollisionCounty: initialData.autoCollisionCounty || "",
      noteInterestRate: initialData.noteInterestRate || "",
      noteInterestDue: initialData.noteInterestDue || "",
      noteAttorneyFees: initialData.noteAttorneyFees || "",
      pawnbrokerLawEnforcementAgency: initialData.pawnbrokerLawEnforcementAgency || "",
      pawnbrokerReportNumber: initialData.pawnbrokerReportNumber || "",
      pawnbrokerWrittenDemandDate: initialData.pawnbrokerWrittenDemandDate || "",
      replevinSeizureReason: initialData.replevinSeizureReason || "",
      replevinDemandDate: initialData.replevinDemandDate || "",
    }
  });

  const [descModalOpen, setDescModalOpen] = useState(false);
  const [descModalValue, setDescModalValue] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);
  const descTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  type SaveStatus = "idle" | "saving" | "saved" | "error";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSave = useCallback(async (values: Record<string, unknown>) => {
    setSaveStatus("saving");
    try {
      const token = await getToken();
      // API schema expects claimAmount as a number — coerce from string input value
      const payload: Record<string, unknown> = { ...values };
      if (payload.claimAmount !== undefined && payload.claimAmount !== "") {
        const n = parseFloat(String(payload.claimAmount).replace(/[^0-9.]/g, ""));
        payload.claimAmount = isNaN(n) ? undefined : n;
      } else {
        delete payload.claimAmount;
      }
      const res = await fetch(`/api/cases/${caseId}/intake`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ data: payload }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("saved");
      if (savedClearRef.current) clearTimeout(savedClearRef.current);
      savedClearRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  }, [caseId, getToken]);

  // Resize description textarea when value changes programmatically
  // (e.g., after the AI advisor writes a refined statement or the modal saves)
  useEffect(() => {
    const el = descTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [form.watch("claimDescription")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch all fields — debounce 1.5 s after the last keystroke
  const watchedValues = form.watch();
  const watchedRef = useRef(watchedValues);
  watchedRef.current = watchedValues;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void autoSave(watchedRef.current as Record<string, unknown>);
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    watchedValues.claimType,
    watchedValues.claimAmount,
    watchedValues.claimDescription,
    watchedValues.incidentDate,
    watchedValues.howAmountCalculated,
    watchedValues.workDoneStartDate,
    watchedValues.workDoneEndDate,
    watchedValues.workDoneLaborMaterials,
    watchedValues.goodsSoldInterestStartDate,
    watchedValues.goodsSoldFirstSaleDate,
    watchedValues.goodsSoldLastSaleDate,
    watchedValues.goodsSoldGoodsAndPrices,
    watchedValues.autoCollisionLocation,
    watchedValues.autoHighwayName,
    watchedValues.autoCollisionCounty,
    watchedValues.noteInterestRate,
    watchedValues.noteInterestDue,
    watchedValues.noteAttorneyFees,
    watchedValues.pawnbrokerLawEnforcementAgency,
    watchedValues.pawnbrokerReportNumber,
    watchedValues.pawnbrokerWrittenDemandDate,
    watchedValues.replevinSeizureReason,
    watchedValues.replevinDemandDate,
    autoSave,
  ]);

  // Keep a stable ref to autoSave so flush closures never go stale.
  const autoSaveRef = useRef(autoSave);
  autoSaveRef.current = autoSave;

  // Register an awaitable flush function with the workspace so that when the
  // user clicks the outer nav to leave the intake tab, the workspace can
  // await the save completing before the target tab (e.g. Documents advisor)
  // reads from the database.  Also deregister on unmount so the ref is never
  // pointing at a dead component.
  useEffect(() => {
    const flush = async () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      await autoSaveRef.current(watchedRef.current as Record<string, unknown>);
    };
    onRegisterFlush?.(flush);
    return () => {
      // Fire the flush on unmount as a safety net for navigation paths that
      // don't go through handleStepClick (e.g. browser back, inner tab links).
      void flush();
      onRegisterFlush?.(null);
    };
  }, [onRegisterFlush]);

  type AdvisorPhase = "idle" | "analyzing" | "questions" | "refining" | "done";
  const [advisorPhase, setAdvisorPhase] = useState<AdvisorPhase>("idle");
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [truncatedDocs, setTruncatedDocs] = useState<string[]>([]);
  const [evidenceChecklist, setEvidenceChecklist] = useState<{ id: string; item: string; description: string; checked?: boolean }[]>(
    Array.isArray(initialData.evidenceChecklist) ? initialData.evidenceChecklist : []
  );
  // Seed checked state from persisted `checked` flag on each item
  const [checkedEvidence, setCheckedEvidence] = useState<Set<string>>(
    () => new Set(
      (Array.isArray(initialData.evidenceChecklist) ? initialData.evidenceChecklist : [])
        .filter((i: { checked?: boolean }) => i.checked)
        .map((i: { id: string }) => i.id)
    )
  );
  const [legalAlert, setLegalAlert] = useState<string>("");
  const [refinedStatement, setRefinedStatement] = useState("");
  const [reviewOriginalDraft, setReviewOriginalDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState<string>(() => {
    const raw = initialData.claimAmount;
    if (!raw && raw !== 0) return "";
    const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ""));
    return isNaN(n) || n === 0 ? "" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  });

  // ── Guided "Case Story Builder" flow (path 2: guided questions) ────────────
  const guided = (initialData.guidedIntakeData || {}) as {
    guidedAnswers?: Record<string, string>;
    starterAnswers?: { question: string; answer: string }[];
    generatedDraft?: string;
    missingFacts?: string[];
  };
  type GuidedPhase = "starter" | "loadingFollowups" | "followups";
  const [guidedModalOpen, setGuidedModalOpen] = useState(false);
  const [guidedPhase, setGuidedPhase] = useState<GuidedPhase>("starter");
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string>>(guided.guidedAnswers || {});
  const [guidedFollowUpQuestions, setGuidedFollowUpQuestions] = useState<GuidedQuestion[]>([]);
  const [guidedGenerating, setGuidedGenerating] = useState(false);
  const [guidedDraft, setGuidedDraft] = useState("");
  const [guidedPreviewOpen, setGuidedPreviewOpen] = useState(false);
  const [missingFacts, setMissingFacts] = useState<string[]>(Array.isArray(guided.missingFacts) ? guided.missingFacts : []);

  const persistGuidedData = useCallback(async (data: { guidedAnswers?: Record<string, string>; starterAnswers?: { question: string; answer: string }[]; generatedDraft?: string; missingFacts?: string[] }) => {
    try {
      const token = await getToken();
      await fetch(`/api/cases/${caseId}/intake`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ data: { guidedIntakeData: { ...guided, ...data } } }),
      });
    } catch { /* non-critical — local state already reflects the change */ }
  }, [caseId, getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const claimTypeValue = form.watch("claimType");
  const starterQuestions = getStarterQuestions(claimTypeValue, {
    defendantName: initialData.defendantName,
    plaintiffName: initialData.plaintiffName,
    jurisdictionState: initialData.jurisdictionState,
    defendantIsBusiness: initialData.defendantIsBusinessOrEntity,
  });

  const openGuided = () => {
    if (!claimTypeValue) {
      toast({ title: "Pick a claim type first", description: "Choose a claim type above so we can ask the right questions.", variant: "destructive" });
      return;
    }
    setGuidedPhase("starter");
    setGuidedFollowUpQuestions([]);
    setGuidedModalOpen(true);
  };

  const proceedToFollowUps = async () => {
    setGuidedPhase("loadingFollowups");
    try {
      const starterAnswers = starterQuestions.map(q => ({ question: q.question, answer: guidedAnswers[q.id] || "" }));
      await persistGuidedData({ guidedAnswers, starterAnswers });
      const values = form.getValues();
      const { followUpQuestions } = await reviewDraftWithAI(values as Record<string, unknown>, { caseId, getToken });
      setGuidedFollowUpQuestions(followUpQuestions);
      setGuidedPhase("followups");
    } catch {
      toast({ title: "Could not load follow-up questions", description: "Please try again in a moment.", variant: "destructive" });
      setGuidedPhase("starter");
    }
  };

  const finishGuided = async () => {
    setGuidedGenerating(true);
    try {
      const allQuestions = [...starterQuestions, ...guidedFollowUpQuestions];
      const answersArr = allQuestions.map(q => ({ question: q.question, answer: guidedAnswers[q.id] || "" }));
      const values = form.getValues();
      const { generatedDraft } = await generateCaseStatementWithAI(values as Record<string, unknown>, answersArr, { caseId, getToken });
      setGuidedDraft(generatedDraft);
      setGuidedModalOpen(false);
      setGuidedPreviewOpen(true);
      void persistGuidedData({ guidedAnswers, generatedDraft });
      void runMissingFactsCheck(generatedDraft);
    } catch {
      toast({ title: "Could not generate a draft", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setGuidedGenerating(false);
    }
  };

  const applyGuidedDraft = (mode: "replace" | "insert") => {
    const current = form.getValues("claimDescription") || "";
    const next = mode === "replace" ? guidedDraft : (current ? `${current}\n\n${guidedDraft}` : guidedDraft);
    form.setValue("claimDescription", next, { shouldValidate: true, shouldDirty: true });
    setGuidedPreviewOpen(false);
    toast({ title: mode === "replace" ? "Draft applied" : "Draft inserted", description: "Your case description has been updated. Feel free to keep editing it." });
  };

  const copyGuidedDraft = async () => {
    try {
      await navigator.clipboard.writeText(guidedDraft);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const runMissingFactsCheck = useCallback(async (description: string) => {
    try {
      const facts = await getMissingFactsWithAI(description, claimTypeValue || "Other", guidedAnswers, { caseId, getToken });
      setMissingFacts(facts);
      if (facts.length) void persistGuidedData({ missingFacts: facts });
    } catch { /* non-critical */ }
  }, [claimTypeValue, guidedAnswers, persistGuidedData, caseId, getToken]);

  const openAdvisor = useCallback(async () => {
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
    setCheckedEvidence(new Set());
    setLegalAlert("");
    setRefinedStatement("");
    setCopied(false);
    try {
      // Flush any pending debounced save so the DB is up to date before AI reads it
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      await autoSave(values as Record<string, unknown>);
      const review = await reviewDraftWithAI(values as Record<string, unknown>, { caseId, getToken });
      setQuestions(review.followUpQuestions);
      setEvidenceChecklist(review.evidenceChecklist);
      setTruncatedDocs(review.truncatedDocs);
      setLegalAlert(review.legalAlert);
      setAdvisorPhase("questions");
    } catch {
      toast({ title: "Advisor error", description: "Could not analyze your case. Please try again.", variant: "destructive" });
      setAdvisorPhase("idle");
      setAdvisorOpen(false);
    }
  }, [caseId, form, getToken, toast, autoSave]);

  useEffect(() => {
    if (autoOpenAdvisor) {
      void openAdvisor();
      onAdvisorOpened?.();
    }
  }, [autoOpenAdvisor, openAdvisor, onAdvisorOpened]);

  const refineStatement = async () => {
    setAdvisorPhase("refining");
    try {
      const values = form.getValues();
      setReviewOriginalDraft(values.claimDescription || "");
      const answersArr = questions.map(q => ({ question: q.question, answer: answers[q.id] || "" }));
      const { generatedDraft } = await generateCaseStatementWithAI(values as Record<string, unknown>, answersArr, { caseId, getToken });
      setRefinedStatement(generatedDraft);
      setAdvisorPhase("done");
      // Nothing is written to the user's draft here — the "done" phase below
      // requires an explicit Replace / Insert / Copy action before anything changes.
      void runMissingFactsCheck(generatedDraft);
    } catch {
      toast({ title: "Advisor error", description: "Could not generate your statement. Please try again.", variant: "destructive" });
      setAdvisorPhase("questions");
    }
  };

  const applyReviewDraft = (mode: "replace" | "insert") => {
    const next = mode === "replace" ? refinedStatement : (reviewOriginalDraft ? `${reviewOriginalDraft}\n\n${refinedStatement}` : refinedStatement);
    form.setValue("claimDescription", next, { shouldValidate: true, shouldDirty: true });
    toast({ title: mode === "replace" ? "Draft applied" : "Draft inserted", description: "Your case description has been updated. Feel free to keep editing it." });
  };

  const copyToCase = async () => {
    try {
      await navigator.clipboard.writeText(refinedStatement);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const toggleEvidence = async (id: string) => {
    setCheckedEvidence(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      // Persist immediately — fire-and-forget, no UI block needed
      void (async () => {
        try {
          const token = await getToken();
          await fetch(`/api/cases/${caseId}/advisor/checklist`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ checkedIds: Array.from(next) }),
          });
        } catch { /* non-critical — UI already updated */ }
      })();
      return next;
    });
  };

  return (
    <div className="px-4 pt-3 pb-4 space-y-5">
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">

          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="sm:hidden flex items-center gap-2 rounded-lg border border-[#14b8a6] bg-[#f0fffe] px-3 py-2 text-xs font-semibold text-[#0d6b5e] w-full"
          >
            <Play className="h-3.5 w-3.5 shrink-0" fill="currentColor" />
            Watch Tutorial Video — Step 2
            <ChevronRight className="h-3 w-3 ml-auto shrink-0" />
          </button>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
              {/* ── Claim fields ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField control={form.control} name="claimType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Claim Type <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(initialData.jurisdictionState === "FL"
                          ? ["Auto Negligence", "Goods Sold", "Work Done / Materials Furnished", "Money Lent", "Promissory Note", "Stolen Property from Pawnbroker", "Return of Property from Government", "Account Stated", "General / Other"]
                          : ["Money Owed", "Unpaid Debt", "Security Deposit", "Property Damage", "Vehicle Damage/Accident", "Landlord/Tenant Dispute", "Online Purchase/Marketplace Dispute", "Unpaid Wages/Employment", "Contract Dispute", "Fraud", "Other"]
                        ).map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="claimAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Requested <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="$0.00"
                        className="h-11"
                        value={amountDisplay}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          setAmountDisplay(raw);
                          field.onChange(raw);
                        }}
                        onFocus={() => {
                          const raw = String(field.value ?? "").replace(/[^0-9.]/g, "");
                          setAmountDisplay(raw);
                        }}
                        onBlur={() => {
                          const raw = String(field.value ?? "").replace(/[^0-9.]/g, "");
                          const n = parseFloat(raw);
                          if (!isNaN(n) && n > 0) {
                            setAmountDisplay(`$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
                          } else {
                            setAmountDisplay("");
                          }
                        }}
                      />
                    </FormControl>
                    {initialData.jurisdictionState === "TX"
                      ? <p className="text-xs text-muted-foreground">Texas small claims limit: $20,000</p>
                      : initialData.jurisdictionState === "FL"
                      ? <p className="text-xs text-muted-foreground">Florida small claims limit: $8,000</p>
                      : initialData.jurisdictionState === "CA"
                      ? <p className="text-xs text-muted-foreground">California limit: $12,500 for individuals · $6,250 for businesses</p>
                      : initialData.jurisdictionState === "VA"
                      ? <p className="text-xs text-muted-foreground">Virginia small claims limit: $5,000</p>
                      : initialData.jurisdictionState === "NC"
                      ? <p className="text-xs text-muted-foreground">North Carolina small claims limit: $10,000</p>
                      : initialData.jurisdictionState === "IL"
                      ? <p className="text-xs text-muted-foreground">Illinois small claims limit: $10,000</p>
                      : initialData.jurisdictionState === "NJ"
                      ? <p className="text-xs text-muted-foreground">New Jersey small claims limit: $5,000 (tenancy disputes: $5,000)</p>
                      : initialData.jurisdictionState === "WA"
                      ? <p className="text-xs text-muted-foreground">Washington small claims limit: $10,000</p>
                      : initialData.jurisdictionState === "AZ"
                      ? <p className="text-xs text-muted-foreground">Arizona small claims limit: $5,000 (A.R.S. § 22-503)</p>
                      : <p className="text-xs text-muted-foreground">Check your state's small claims court for its dollar limit.</p>
                    }
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

          {/* Auto Accident Details — conditional section for Auto Negligence claims */}
          {claimTypeValue === "Auto Negligence" && (
            <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-4">
              <p className="font-semibold text-sm text-[#0d6b5e]">Auto Accident Details</p>
              <FormField control={form.control} name="incidentDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Collision</FormLabel>
                  <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">The date the accident occurred.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="autoCollisionLocation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Collision Location</FormLabel>
                  <FormControl><Input className="h-11" placeholder="e.g. Main St & Oak Ave, Anytown" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">The intersection or street address where the collision happened.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="autoHighwayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Public Highway <span className="text-xs font-normal text-muted-foreground">(if applicable)</span></FormLabel>
                  <FormControl><Input className="h-11" placeholder="e.g. I-95, SR-826, US-1" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">Name of the highway or road, if the accident was on a named highway. Leave blank if not applicable.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="autoCollisionCounty" render={({ field }) => (
                <FormItem>
                  <FormLabel>County Where Collision Occurred</FormLabel>
                  <FormControl><Input className="h-11" placeholder="e.g. Broward, Dade, Orange" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">The county where the accident happened — may differ from the county where you are filing.</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* Goods Sold Details — conditional section for Goods Sold claims */}
          {claimTypeValue === "Goods Sold" && (
            <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-4">
              <p className="font-semibold text-sm text-[#0d6b5e]">Goods Sold Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="goodsSoldFirstSaleDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Sale Date</FormLabel>
                    <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">The date of the first sale or delivery.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="goodsSoldLastSaleDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Sale Date</FormLabel>
                    <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">The date of the last sale or delivery.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="goodsSoldInterestStartDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Interest Start Date <span className="text-xs font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">The date interest began — usually the invoice due date or when payment was demanded. Leave blank if not requesting interest.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="goodsSoldGoodsAndPrices" render={({ field }) => (
                <FormItem>
                  <FormLabel>Goods / Prices / Credits</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[120px]"
                      placeholder="e.g. 10 units Widget A × $50 = $500; Payment received = −$100; Balance due = $400"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">List what was sold, the price, any payments received, and the remaining balance.</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* Work Done Details — conditional section for Work Done / Materials Furnished claims */}
          {claimTypeValue === "Work Done / Materials Furnished" && (
            <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-4">
              <p className="font-semibold text-sm text-[#0d6b5e]">Work Done Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="workDoneStartDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Start Date</FormLabel>
                    <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">The date you began the work or furnished materials.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="workDoneEndDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work End Date</FormLabel>
                    <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">The date the work was completed or materials were last delivered.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="workDoneLaborMaterials" render={({ field }) => (
                <FormItem>
                  <FormLabel>Labor, Materials, Charges and Credits</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[120px]"
                      placeholder="e.g. Labor (10 hrs × $50/hr) = $500; Materials = $200; Payment received = −$100; Balance due = $600"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Itemize the work performed, materials furnished, their costs, any payments received, and the remaining balance.</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* Money Lent — contextual hint card for Form 7.333 */}
          {claimTypeValue === "Money Lent" && (
            <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-2">
              <p className="font-semibold text-sm text-[#0d6b5e]">Money Lent — Form 7.333</p>
              <p className="text-xs text-muted-foreground">Your FL Form 7.333 will be filled using the fields above:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Date of Loan:</strong> from "When did this happen?" above.</li>
                <li><strong>Loan Description:</strong> from your "What happened?" description above — include the loan terms and why payment was not made.</li>
                <li><strong>Principal Amount:</strong> from "Amount Requested" above.</li>
              </ul>
              <p className="text-xs text-muted-foreground">The "Interest Start Date" on Form 7.333 is left blank — hand-fill it on the printed form if you are claiming prejudgment interest.</p>
            </div>
          )}

          {/* Promissory Note Details — Form 7.334 */}
          {claimTypeValue === "Promissory Note" && (
            <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-4">
              <p className="font-semibold text-sm text-[#0d6b5e]">Promissory Note Details — Form 7.334</p>
              <p className="text-xs text-muted-foreground">The note date and principal amount come from the fields above. Add any additional amounts that apply below.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="noteInterestRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate <span className="text-xs font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input className="h-11" placeholder="e.g. 6% per year" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="noteInterestDue" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Due <span className="text-xs font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input className="h-11" placeholder="e.g. 150.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="noteAttorneyFees" render={({ field }) => (
                <FormItem>
                  <FormLabel>Attorney Fees Claimed <span className="text-xs font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Input className="h-11" placeholder="e.g. 500.00" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">Only include if the promissory note explicitly provides for attorney fees.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <p className="text-xs text-muted-foreground">The "Default Date" and "Acceleration Election" fields on Form 7.334 require a legal judgment about when default occurred — hand-fill them on the printed form.</p>
            </div>
          )}

          {/* Stolen Property from Pawnbroker — Form 7.335 */}
          {claimTypeValue === "Stolen Property from Pawnbroker" && (
            <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-4">
              <p className="font-semibold text-sm text-[#0d6b5e]">Stolen Property from Pawnbroker — Form 7.335</p>
              <p className="text-xs text-muted-foreground">The theft date, property description, and value come from the fields above. Add the police report details below.</p>
              <FormField control={form.control} name="pawnbrokerLawEnforcementAgency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Law Enforcement Agency</FormLabel>
                  <FormControl><Input className="h-11" placeholder="e.g. Miami Police Department" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">The police or sheriff's department that received your stolen property report.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="pawnbrokerReportNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Police Report Number</FormLabel>
                    <FormControl><Input className="h-11" placeholder="e.g. 2024-123456" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pawnbrokerWrittenDemandDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Written Demand Date <span className="text-xs font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">Date you sent written demand to the pawnbroker, if applicable.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <p className="text-xs text-muted-foreground">The Notary section on Form 7.335 must be completed in person at the courthouse clerk's office.</p>
            </div>
          )}

          {/* Return of Property from Government — Form 7.336 */}
          {claimTypeValue === "Return of Property from Government" && (
            <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-4">
              <p className="font-semibold text-sm text-[#0d6b5e]">Return of Property from Government — Form 7.336</p>
              <p className="text-xs text-muted-foreground">The seizure date, property description, and value come from the fields above. Add the additional details below.</p>
              <FormField control={form.control} name="replevinSeizureReason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason Given for Seizure <span className="text-xs font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Input className="h-11" placeholder="e.g. alleged drug evidence, tax lien" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">The reason the government agency gave for seizing your property, if stated.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="replevinDemandDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Demand Date <span className="text-xs font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">Date you formally demanded the property be returned, if applicable.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <p className="text-xs text-muted-foreground">The Notary section on Form 7.336 must be completed in person at the courthouse clerk's office.</p>
            </div>
          )}

          {/* Account Stated — contextual hint card for Form 7.337 */}
          {claimTypeValue === "Account Stated" && (
            <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-2">
              <p className="font-semibold text-sm text-[#0d6b5e]">Account Stated — Form 7.337</p>
              <p className="text-xs text-muted-foreground">Your FL Form 7.337 will be filled using the fields above:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Account Statement Date:</strong> from "When did this happen?" above.</li>
                <li><strong>Account Details:</strong> from your "What happened?" description above — include the account balance, how it was calculated, and any payments already made.</li>
                <li><strong>Principal Amount:</strong> from "Amount Requested" above.</li>
              </ul>
              <p className="text-xs text-muted-foreground">The "Interest Start Date" on Form 7.337 is left blank — hand-fill it on the printed form if you are claiming prejudgment interest.</p>
            </div>
          )}

          {/* How did you calculate — compact, above What happened */}
          <FormField control={form.control} name="howAmountCalculated" render={({ field }) => (
            <FormItem>
              <FormLabel>How did you calculate this amount? <span className="text-destructive">*</span></FormLabel>
              <FormControl><Textarea className="min-h-[88px]" placeholder="e.g. $500 unpaid rent + $100 late fee + $50 court costs" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* What happened — full-width, tall */}
          <FormField control={form.control} name="claimDescription" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 flex-wrap">
                <span>What happened? <span className="text-destructive">*</span></span>
                <span className="text-xs font-normal text-muted-foreground">Describe why you're owed money</span>
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-[11px] font-normal text-teal-600">
                    <CheckCircle className="h-3 w-3" /> Saved
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1 text-[11px] font-normal text-destructive">
                    <CloudOff className="h-3 w-3" /> Save failed — check connection
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setDescExpanded(v => !v)}
                  className="ml-auto flex items-center gap-1 text-[11px] font-medium text-[#0d6b5e] hover:text-[#0a5449] hover:underline transition-colors"
                  title={descExpanded ? "Collapse editor" : "Expand inline"}
                >
                  {descExpanded ? <><Minimize2 className="h-3.5 w-3.5" /> Collapse</> : <><Maximize2 className="h-3.5 w-3.5" /> Expand</>}
                </button>
                <button
                  type="button"
                  title="Open full-screen editor"
                  onClick={() => { setDescModalValue(field.value || ""); setDescModalOpen(true); }}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#0d6b5e] hover:text-[#0a5449] hover:underline transition-colors"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Full Screen
                </button>
              </FormLabel>
              <FormControl>
                <Textarea
                  className={`transition-all ${descExpanded ? "min-h-[500px]" : "min-h-[240px]"}`}
                  placeholder="Briefly describe why the defendant owes you money…"
                  {...field}
                  ref={(el) => {
                    descTextareaRef.current = el;
                    if (typeof field.ref === "function") field.ref(el);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-3">
            <div>
              <p className="font-semibold text-sm text-[#0d6b5e]">Not sure how to describe what happened?</p>
              <p className="text-xs text-[#4a9990] mt-0.5 leading-relaxed">Write it yourself above, or let the Case Advisor help — either by asking you guided questions and drafting it for you, or by reviewing and improving what you've already written.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={openGuided} className="gap-2 text-sm border-[#0d6b5e] text-[#0d6b5e] hover:bg-[#e6fbf8] hover:text-[#0d6b5e]">
                <MessageSquareText className="h-4 w-4" /> Guide Me Through This
              </Button>
              <Button type="button" variant="outline" onClick={openAdvisor} className="gap-2 text-sm border-[#0d6b5e] text-[#0d6b5e] hover:bg-[#e6fbf8] hover:text-[#0d6b5e]">
                <ClipboardCheck className="h-4 w-4" /> Review My Draft
              </Button>
            </div>
          </div>

          {missingFacts.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="font-semibold text-sm text-amber-900">Your description may be missing a few facts</p>
              </div>
              <ul className="list-disc pl-6 space-y-1">
                {missingFacts.map((fact, i) => (
                  <li key={i} className="text-xs text-amber-800">{fact}</li>
                ))}
              </ul>
            </div>
          )}

            </form>
          </Form>
        </div>

        {/* Right: video tutorial card — desktop only */}
        <div
          onClick={() => setTutorialOpen(true)}
          className="hidden sm:block cursor-pointer group flex-shrink-0 w-[220px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
          title="Watch the tutorial for this step"
        >
          <div className="relative bg-[#0f2537] h-[120px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
                <Play className="w-[18px] h-[18px] text-white ml-1" fill="white" />
              </div>
              <span className="text-white text-xs font-semibold opacity-90">Watch Tutorial</span>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">~3 min</div>
            <div className="absolute top-2 left-2 bg-[#14b8a6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Step 2</div>
          </div>
          <div className="bg-background px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold">Claim Details</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">What happened &amp; how much?</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#14b8a6] shrink-0" />
          </div>
        </div>
      </div>

      {/* ── Full-width footer — outside two-column layout so it spans both columns ── */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-border flex items-center justify-between px-4 sm:pl-6 sm:pr-[165px] py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] -mx-8">
        <Button type="button" variant="ghost" size="lg" className="px-2 sm:px-8" onClick={() => onSaveExit(form.getValues())}>
          <Home className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Save &amp; Exit</span>
        </Button>
        <Button type="button" size="lg" onClick={onGoToAiChat ?? openAdvisor} className="bg-amber-500 hover:bg-amber-600 text-white gap-1 sm:gap-2 px-2 sm:px-8">
          <Sparkles className="h-4 w-4" />
          <span className="sm:hidden">AI Check</span>
          <span className="hidden sm:inline">Review My Draft</span>
        </Button>
        <Button type="button" size="lg" data-testid="button-next-step" disabled={saving} className="gap-2 px-2 sm:px-4" onClick={() => form.handleSubmit(onNext)()}>
          <span className="sm:hidden">{saving ? "Saving…" : "Continue"}</span>
          <span className="hidden sm:inline">{saving ? "Saving…" : i18n.intake.saveAndContinue}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={descModalOpen} onOpenChange={setDescModalOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] h-[92dvh] max-h-[92dvh] flex flex-col p-0 gap-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-5 pb-4 border-b bg-[#f0fffe]">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Maximize2 className="h-5 w-5 text-[#0d6b5e]" />
              Full Description Editor — What happened?
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Write as much detail as you need. Include what happened, when, and exactly how much money you lost.</p>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col px-6 py-4 gap-3">
            <textarea
              value={descModalValue}
              onChange={(e) => setDescModalValue(e.target.value)}
              placeholder="Describe what happened in your own words…"
              autoFocus
              className="flex-1 w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
              <span>{descModalValue.length.toLocaleString()} characters</span>
              {descModalValue.length > 650 && <span className="text-amber-600 font-medium">⚠ Long descriptions may need a separate MC-030 attachment.</span>}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 px-6 pb-5 pt-3 border-t gap-2">
            <Button variant="outline" onClick={() => setDescModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#0d6b5e] hover:bg-[#0a5449] text-white"
              onClick={() => {
                const currentFieldValue = form.getValues("claimDescription");
                if (descModalValue !== currentFieldValue) form.setValue("claimDescription", descModalValue, { shouldValidate: true, shouldDirty: true });
                setDescModalOpen(false);
              }}
            >
              Save &amp; Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={advisorOpen} onOpenChange={setAdvisorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
          <div className="flex items-center gap-3 px-4 py-3 shrink-0 pr-12"
            style={{ background: "linear-gradient(135deg, #0d6b5e 0%, #14b8a6 100%)" }}>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">AI Genie</p>
              <p className="text-white/70 text-[11px] leading-tight">Reviewing your case to help you build a stronger description</p>
            </div>
          </div>
          <div className="flex-1 p-5 space-y-6 overflow-y-auto">
            {advisorPhase === "analyzing" && (
              <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
                <div className="h-12 w-12 rounded-full bg-[#ddf6f3] flex items-center justify-center animate-pulse">
                  <Sparkles className="h-6 w-6 text-[#0d6b5e]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0d6b5e]">Reviewing your case…</p>
                  <p className="text-sm text-muted-foreground mt-1">Identifying gaps and preparing questions</p>
                </div>
                {/* Animated indeterminate progress bar */}
                <div className="w-64 h-1.5 rounded-full bg-[#ddf6f3] overflow-hidden">
                  <div className="h-full w-2/5 rounded-full bg-[#14b8a6] animate-[progress-slide_1.4s_ease-in-out_infinite]" />
                </div>
              </div>
            )}
            {(advisorPhase === "questions" || advisorPhase === "refining") && (
              <>
                {truncatedDocs.length > 0 && (
                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>
                      <strong>Large document notice:</strong> The following {truncatedDocs.length === 1 ? "file was" : "files were"} too large to fully analyze:{" "}
                      {truncatedDocs.map((name, i) => (
                        <span key={i}><em>{name}</em>{i < truncatedDocs.length - 1 ? ", " : ""}</span>
                      ))}. Please contact us at{" "}
                      <a href="mailto:support@smallclaimsgenie.com" className="underline font-medium">support@smallclaimsgenie.com</a>{" "}
                      for assistance.
                    </span>
                  </div>
                )}
                {legalAlert && (
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                        <Scale className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="font-bold text-sm text-amber-900">⚖️ Know Your Legal Rights — You May Be Owed More</p>
                    </div>
                    <p className="text-sm text-amber-900 leading-relaxed">{legalAlert}</p>
                    <p className="text-xs text-amber-700 font-medium">Review your claim amount before filing — you may want to update it.</p>
                  </div>
                )}
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
                {legalAlert && (
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                        <Scale className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="font-bold text-sm text-amber-900">⚖️ Know Your Legal Rights — You May Be Owed More</p>
                    </div>
                    <p className="text-sm text-amber-900 leading-relaxed">{legalAlert}</p>
                    <p className="text-xs text-amber-700 font-medium">Review your claim amount before filing — you may want to update it.</p>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-[#0d6b5e] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Here's your improved draft</h3>
                      <p className="text-xs text-muted-foreground">Nothing has been changed yet — review it, then choose what to do</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#a8e6df] bg-[#f0fffe] p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">{refinedStatement}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" onClick={() => applyReviewDraft("replace")} className="gap-2 text-sm bg-[#0d6b5e] hover:bg-[#0a5449] text-white">
                      <RotateCcw className="h-4 w-4" /> Replace My Draft
                    </Button>
                    <Button type="button" onClick={() => applyReviewDraft("insert")} variant="outline" className="gap-2 text-sm">
                      <ChevronRight className="h-4 w-4" /> Insert Below
                    </Button>
                    <Button type="button" onClick={copyToCase} variant="outline" className={`gap-2 text-sm ${copied ? "border-green-500 text-green-700" : ""}`}>
                      {copied ? <><CheckCircle className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy</>}
                    </Button>
                    <Button type="button" onClick={() => setAdvisorOpen(false)} variant="outline" className="gap-2 text-sm">
                      Keep Editing Myself
                    </Button>
                  </div>
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

      {/* ── Guided questions modal (path 2: "Guide Me Through This") ── */}
      <Dialog open={guidedModalOpen} onOpenChange={setGuidedModalOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="h-5 w-5 text-[#0d6b5e]" />
              Let's build your case story
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {guidedPhase === "starter" && "A few quick questions to get started"}
              {guidedPhase === "loadingFollowups" && "Reviewing your case…"}
              {guidedPhase === "followups" && "A few more questions specific to your case"}
            </p>
          </DialogHeader>
          <div className="w-full h-1.5 rounded-full bg-[#ddf6f3] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#14b8a6] transition-all"
              style={{ width: guidedPhase === "starter" ? "33%" : guidedPhase === "loadingFollowups" ? "66%" : "100%" }}
            />
          </div>

          {guidedPhase === "starter" && (
            <div className="space-y-4 py-2 max-h-[55vh] overflow-y-auto">
              {starterQuestions.map(q => (
                <div key={q.id} className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">{q.question}</label>
                  {q.hint && <p className="text-xs text-muted-foreground">{q.hint}</p>}
                  <Textarea
                    className="min-h-[80px] text-sm"
                    placeholder="Your answer…"
                    value={guidedAnswers[q.id] || ""}
                    onChange={e => setGuidedAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          {guidedPhase === "loadingFollowups" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#0d6b5e]" />
              <p className="text-sm text-muted-foreground">Our AI advisor is reading your case to ask about anything specific that's still missing…</p>
            </div>
          )}

          {guidedPhase === "followups" && (
            <div className="space-y-4 py-2 max-h-[55vh] overflow-y-auto">
              {guidedFollowUpQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No additional questions — you're ready to generate your draft.</p>
              ) : (
                guidedFollowUpQuestions.map(q => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">{q.question}</label>
                    {q.hint && <p className="text-xs text-muted-foreground">{q.hint}</p>}
                    <Textarea
                      className="min-h-[80px] text-sm"
                      placeholder="Your answer…"
                      value={guidedAnswers[q.id] || ""}
                      onChange={e => setGuidedAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  </div>
                ))
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            {guidedPhase === "starter" && (
              <>
                <Button type="button" variant="outline" onClick={() => setGuidedModalOpen(false)}>Cancel</Button>
                <Button type="button" className="gap-1 bg-[#0d6b5e] hover:bg-[#0a5449] text-white" onClick={proceedToFollowUps}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            {guidedPhase === "loadingFollowups" && (
              <Button type="button" variant="outline" disabled className="ml-auto opacity-50">Please wait…</Button>
            )}
            {guidedPhase === "followups" && (
              <>
                <Button type="button" variant="outline" className="gap-1" onClick={() => setGuidedPhase("starter")}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button type="button" disabled={guidedGenerating} className="gap-2 bg-[#0d6b5e] hover:bg-[#0a5449] text-white" onClick={finishGuided}>
                  {guidedGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate My Draft</>}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Guided draft preview — never auto-applied, requires explicit action ── */}
      <Dialog open={guidedPreviewOpen} onOpenChange={setGuidedPreviewOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-[#0d6b5e]" />
              Your draft case story
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Based on your answers. Nothing has been saved to your form yet.</p>
          </DialogHeader>
          <div className="rounded-lg border border-[#a8e6df] bg-[#f0fffe] p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground max-h-[45vh] overflow-y-auto">
            {guidedDraft}
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <Button type="button" onClick={() => applyGuidedDraft("replace")} className="gap-2 text-sm bg-[#0d6b5e] hover:bg-[#0a5449] text-white">
              <RotateCcw className="h-4 w-4" /> Use This Draft
            </Button>
            <Button type="button" onClick={() => applyGuidedDraft("insert")} variant="outline" className="gap-2 text-sm">
              <ChevronRight className="h-4 w-4" /> Insert Below
            </Button>
            <Button type="button" onClick={copyGuidedDraft} variant="outline" className="gap-2 text-sm">
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button type="button" onClick={() => setGuidedPreviewOpen(false)} variant="outline" className="gap-2 text-sm">
              Keep Editing Myself
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Video modal ── */}
      {tutorialOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setTutorialOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-[95vw] max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b bg-[#f8fffe]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#14b8a6] flex items-center justify-center">
                  <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Step 2 Tutorial — Claim Details</p>
                  <p className="text-[10px] text-gray-500">Small Claims Genie Training Video</p>
                </div>
              </div>
              <button
                onClick={() => setTutorialOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              width="800"
              height="450"
              src="https://app.heygen.com/embeds/738523026c8a4781a46f94415f70683c"
              title="HeyGen video player"
              frameBorder="0"
              allow="encrypted-media; fullscreen;"
              allowFullScreen
              className="block"
            />
            <div className="px-5 py-3 bg-[#f0fdf9] border-t flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-600 flex-1 min-w-[200px]">
                Video plays above — click X or press Escape to return to your case.
              </p>
              <button
                onClick={() => setTutorialOpen(false)}
                className="text-xs font-semibold text-[#14b8a6] hover:text-[#0d9488] transition-colors"
              >
                Close &amp; Start Filling
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
