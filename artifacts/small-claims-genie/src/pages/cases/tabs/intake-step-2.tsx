import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LogOut, Sparkles, Maximize2, CheckSquare2, Square, RotateCcw, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { DateRangePicker, intakeStep2Schema } from "./shared";

interface Props {
  caseId: number;
  initialData: any;
  onNext: (d: any) => void;
  onBack: () => void;
  saving?: boolean;
  autoOpenAdvisor?: boolean;
  onAdvisorOpened?: () => void;
  onSaveExit: (d: any) => void;
}

export function IntakeStep2({ caseId, initialData, onNext, onBack, saving, autoOpenAdvisor, onAdvisorOpened, onSaveExit }: Props) {
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

          <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] p-4 flex items-center gap-3">
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
                <LogOut className="mr-2 h-4 w-4" />
                Save & Exit
              </Button>
            </div>
            <div className="flex-1 px-3 min-w-0">
              <p className="font-semibold text-sm text-[#0d6b5e]">Not sure if your description is strong enough?</p>
              <p className="text-xs text-[#4a9990] mt-0.5 leading-relaxed">The Case Advisor will review what you've written, ask follow-up questions, and help you write a stronger statement.</p>
            </div>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving} className="shrink-0">
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
            </Button>
            <Button type="button" onClick={openAdvisor} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-2">
              <Sparkles className="h-4 w-4" /> Check My Case
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
