import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LogOut, Sparkles, Maximize2, Minimize2, CheckSquare2, Square, RotateCcw, CheckCircle, Loader2, Play, X, ChevronRight, CloudOff, Scale } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { DateRangePicker, intakeStep2Schema } from "./shared";

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
}

export function IntakeStep2({ caseId, initialData, onNext, saving, autoOpenAdvisor, onAdvisorOpened, onSaveExit }: Props) {
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
      const res = await fetch(`/api/cases/${caseId}/intake`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ data: values }),
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
    autoSave,
  ]);

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
  const [copied, setCopied] = useState(false);

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
      const token = await getToken();
      // Flush any pending debounced save so the DB is up to date before AI reads it
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      await autoSave(values as Record<string, unknown>);
      const res = await fetch(`/api/cases/${caseId}/advisor/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setQuestions(data.questions || []);
      setEvidenceChecklist(data.evidenceChecklist || []);
      setTruncatedDocs(data.truncatedDocs || []);
      setLegalAlert(typeof data.legalAlert === "string" ? data.legalAlert : "");
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

          {/* Option C outer wrapper — full-width when inline-expanded */}
          <div className={descExpanded ? "flex flex-col gap-5" : "grid grid-cols-1 md:grid-cols-2 gap-5"}>
            <FormField control={form.control} name="claimDescription" render={({ field }) => (
              <FormItem className={descExpanded ? "col-span-2" : ""}>
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
                  {/* Option C — inline expand/collapse toggle */}
                  <button
                    type="button"
                    onClick={() => setDescExpanded(v => !v)}
                    className="ml-auto flex items-center gap-1 text-[11px] font-medium text-[#0d6b5e] hover:text-[#0a5449] hover:underline transition-colors"
                    title={descExpanded ? "Collapse editor" : "Expand inline"}
                  >
                    {descExpanded ? <><Minimize2 className="h-3.5 w-3.5" /> Collapse</> : <><Maximize2 className="h-3.5 w-3.5" /> Expand</>}
                  </button>
                  {/* Full-screen button moved here so resize handle corner is unobstructed */}
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
                    className={`transition-all ${descExpanded ? "min-h-[400px]" : "min-h-[88px]"}`}
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
            <FormField control={form.control} name="howAmountCalculated" render={({ field }) => (
              <FormItem>
                <FormLabel>How did you calculate this amount? <span className="text-destructive">*</span></FormLabel>
                <FormControl><Textarea className="min-h-[88px]" placeholder="e.g. $500 unpaid rent + $100 late fee + $50 court costs" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4">
            <p className="font-semibold text-sm text-[#0d6b5e]">Not sure if your description is strong enough?</p>
            <p className="text-xs text-[#4a9990] mt-0.5 leading-relaxed">The Case Advisor will review what you've written, ask follow-up questions, and help you write a stronger statement.</p>
          </div>

          <div className="sticky bottom-0 z-10 bg-white border-t border-border flex items-center justify-between px-6 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] -mx-4 mt-6">
            <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
              <LogOut className="mr-2 h-4 w-4" />
              Save &amp; Exit
            </Button>
            <Button type="button" size="lg" onClick={openAdvisor} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
              <Sparkles className="h-4 w-4" /> AI Check My Case
            </Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving} className="gap-2">
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
            </form>
          </Form>
        </div>

        {/* Right: video tutorial card */}
        <div
          onClick={() => setTutorialOpen(true)}
          className="cursor-pointer group flex-shrink-0 w-[220px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
          title="Watch the tutorial for this step"
        >
          <div className="relative bg-[#0f2537] h-[120px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
                <Play className="w-5 h-5 text-white ml-1" fill="white" />
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
                      ))}. During beta, please contact us at{" "}
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
                  <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
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
