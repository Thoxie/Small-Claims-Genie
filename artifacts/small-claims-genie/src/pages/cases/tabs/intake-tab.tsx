import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  useSaveIntakeProgress,
  getGetCaseQueryKey,
  getGetCaseReadinessQueryKey,
  getListCasesQueryKey,
  getGetCaseStatsQueryKey,
} from "@workspace/api-client-react";
import type { ExtendedCase } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { IntakeStep1 } from "./intake-step-1";
import { IntakeStep2 } from "./intake-step-2";
import { IntakeStep3 } from "./intake-step-3";
import { IntakeStep4 } from "./intake-step-4";
import { IntakeStep5 } from "./intake-step-5";
import { IntakeStep6 } from "./intake-step-6";
import { IntakeStep7 } from "./intake-step-7";

// ─── Hearing Info Card ────────────────────────────────────────────────────────
export function HearingInfoCard({ caseId, initialData }: { caseId: number; initialData: ExtendedCase }) {
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
            <Input placeholder="Hon. Smith" value={form.hearingJudge} onChange={e => setForm(f => ({ ...f, hearingJudge: e.target.value }))} className="h-7 text-xs bg-white border-teal-200 px-2" />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={saving} className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 w-full">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const INTAKE_TABS = [
  { num: 1, label: "Enter The Parties" },
  { num: 2, label: "Make Your Claim" },
  { num: 3, label: "Upload My Evidence" },
  { num: 4, label: "Send Demand Letter" },
  { num: 5, label: "AI Genie Case Review" },
  { num: 6, label: "Create Court Forms" },
  { num: 7, label: "Prep for Hearing" },
] as const;

type StepNum = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Required fields per step — checked on Complete Intake
const REQUIRED: { tab: number; key: string; label: string }[] = [
  { tab: 1, key: "plaintiffName",       label: "Your name" },
  { tab: 1, key: "plaintiffAddress",    label: "Your address" },
  { tab: 1, key: "defendantName",       label: "Defendant name" },
  { tab: 1, key: "defendantAddress",    label: "Defendant address" },
  { tab: 1, key: "countyId",            label: "Filing county" },
  { tab: 2, key: "claimType",           label: "Claim type" },
  { tab: 2, key: "claimAmount",         label: "Claim amount" },
  { tab: 2, key: "claimDescription",    label: "Claim description" },
  { tab: 2, key: "incidentDate",        label: "Incident date" },
  { tab: 2, key: "howAmountCalculated", label: "Amount calculation" },
  { tab: 5, key: "venueBasis",          label: "Venue basis" },
];

// ─── Intake Tab ───────────────────────────────────────────────────────────────
export function IntakeTab({
  caseId,
  initialData,
  forceStep,
  forceStepNonce,
  onStepChange,
  onGoToAiChat,
  onRegisterFlush,
}: {
  caseId: number;
  initialData: ExtendedCase;
  forceStep?: 1 | 2;
  forceStepNonce?: number;
  onStepChange?: (step: number) => void;
  onGoToAiChat?: () => void;
  onRegisterFlush?: (flush: (() => Promise<void>) | null) => void;
}) {
  const isFreshCase = !initialData.plaintiffName && !initialData.plaintiffAddress;

  const getInitialStep = (): StepNum => {
    if (forceStep) return forceStep;
    const stored = localStorage.getItem(`intake-step-${caseId}`);
    const fromSession = stored ? parseInt(stored) : NaN;
    if (fromSession >= 1 && fromSession <= 7) return fromSession as StepNum;
    if (isFreshCase) return 1;
    return Math.min(initialData.intakeStep || 1, 7) as StepNum;
  };

  const [activeTab, setActiveTabState] = useState<StepNum>(getInitialStep);

  // Central step setter — always updates localStorage and notifies workspace
  const setActiveTab = (step: StepNum) => {
    localStorage.setItem(`intake-step-${caseId}`, String(step));
    setActiveTabState(step);
    onStepChange?.(step);
  };

  // On mount, immediately tell the workspace which step IntakeTab is actually
  // displaying. This fixes the mismatch when localStorage is empty (e.g. after
  // a fresh login) and the workspace nav falls back to step 1 while IntakeTab
  // correctly restores from the database value.
  useEffect(() => {
    onStepChange?.(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only run once on mount

  // Jump to forced step when outer nav requests step 1 or 2.
  // forceStepNonce increments on every outer-nav click so this effect re-fires
  // even when forceStep value is unchanged (e.g., clicking outer step 2 twice).
  useEffect(() => {
    if (forceStep === undefined) return;
    setActiveTab(forceStep); // writes localStorage + notifies workspace
  // forceStepNonce is the real trigger; forceStep carries the destination.
  }, [forceStep, forceStepNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const [autoOpenAdvisor, setAutoOpenAdvisor] = useState(false);
  const [missingWarnings, setMissingWarnings] = useState<{ tab: number; label: string }[]>([]);

  // Always-current step ref so onSuccess callbacks can guard against backward navigation
  // even when multiple mutations from rapid step-advances are in flight simultaneously.
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const saveIntake = useSaveIntakeProgress();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getGetCaseReadinessQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCaseStatsQueryKey() });
  };

  const handleNext = (data: Record<string, unknown>) => {
    // Capture the current step at call time so the onSuccess closure can verify
    // the user hasn't already moved away before the network round-trip completes.
    const currentStep = activeTabRef.current;
    const next = Math.min(currentStep + 1, 7) as StepNum;
    saveIntake.mutate({ id: caseId, data: { step: next, data } }, {
      onSuccess: () => {
        // Only navigate if the user is still on the same step they were on when
        // they clicked. This prevents two failure modes:
        //   1. A late-arriving callback from a previous step firing after the
        //      user has already advanced (or gone back) would silently no-op.
        //   2. A duplicate save (e.g. from form onSubmit + footer button both
        //      firing) lands here; the second callback sees currentStep !== activeTabRef
        //      because the first already advanced the step, so it no-ops correctly.
        if (activeTabRef.current === currentStep) {
          setActiveTab(next);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        invalidateAll();
      },
      onError: (err: Error) => {
        toast({ title: "Could not save progress", description: err?.message || "Please check your connection and try again.", variant: "destructive" });
      },
    });
  };

  const handleComplete = (formData: Record<string, unknown>) => {
    const merged: Record<string, unknown> = { ...initialData, ...formData };
    const missing = REQUIRED.filter(r => !merged[r.key]);
    if (missing.length > 0) {
      setMissingWarnings(missing);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setMissingWarnings([]);
    saveIntake.mutate({ id: caseId, data: { step: 7, intakeComplete: true } }, {
      onSuccess: () => {
        toast({ title: "Intake Complete", description: "Your information has been saved." });
        invalidateAll();
      }
    });
  };

  const handleSaveExit = (formData: Record<string, unknown>) => {
    // Fire the save in the background, then navigate directly via the browser.
    // Using window.location.href bypasses wouter so the hash-based tab tracking
    // in the workspace can't interfere with navigation.
    saveIntake.mutate(
      { id: caseId, data: { step: activeTab, data: formData } },
    );
    toast({ title: "Progress saved", description: "Returning to your dashboard…" });
    sessionStorage.setItem("scg-just-saved", "true");
    window.location.href = "/dashboard";
  };

  const goToAdvisor = () => {
    if (onGoToAiChat) {
      onGoToAiChat();
    } else {
      setAutoOpenAdvisor(true);
      setActiveTab(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const warningsByTab = INTAKE_TABS.map(t => ({
    ...t,
    items: missingWarnings.filter(w => w.tab === t.num),
  })).filter(t => t.items.length > 0);

  return (
    <div className="p-4 md:p-5">
      {/* ── Step progress indicator ── */}
      <div className="mb-5">
        {/* Bar */}
        <div className="flex gap-1 mb-2">
          {INTAKE_TABS.map(({ num }) => {
            const isCompleted = num < activeTab;
            const isCurrent = num === activeTab;
            return (
              <div
                key={num}
                className={[
                  "flex-1 h-1.5 rounded-full transition-all duration-200",
                  isCurrent
                    ? "bg-teal-500"
                    : isCompleted
                    ? "bg-teal-300"
                    : "bg-slate-200",
                ].join(" ")}
              />
            );
          })}
        </div>
        {/* Step labels */}
        <div className="flex gap-1">
          {INTAKE_TABS.map(({ num, label }) => {
            const isCompleted = num < activeTab;
            const isCurrent = num === activeTab;
            if (isCompleted) {
              return (
                <button
                  key={num}
                  onClick={() => setActiveTab(num as StepNum)}
                  className="flex-1 text-center text-[10px] leading-tight text-teal-600 hover:text-teal-800 hover:underline underline-offset-2 truncate"
                  aria-label={`Go back to step ${num}: ${label}`}
                  title={label}
                >
                  {label}
                </button>
              );
            }
            return (
              <span
                key={num}
                className={[
                  "flex-1 text-center text-[10px] leading-tight truncate",
                  isCurrent ? "font-semibold text-teal-700" : "text-slate-400",
                ].join(" ")}
                title={label}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Missing field warnings (shown on step 7 before completing) ── */}
      {activeTab === 7 && warningsByTab.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Please complete these required fields before finishing:
          </div>
          <div className="space-y-1.5">
            {warningsByTab.map(({ num, label: tabLabel, items }) => (
              <div key={num} className="flex items-start gap-2 text-xs">
                <button
                  onClick={() => setActiveTab(num as StepNum)}
                  className="font-bold text-red-600 underline underline-offset-2 shrink-0 hover:text-red-800"
                >
                  Step {num} — {tabLabel}:
                </button>
                <span className="text-red-700">{items.map(i => i.label).join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step content ── */}
      {activeTab === 1 && (
        <IntakeStep1
          initialData={initialData}
          onNext={handleNext}
          onBack={() => {}}
          saving={saveIntake.isPending}
          onSaveExit={handleSaveExit}
          onAiCheck={goToAdvisor}
        />
      )}
      {activeTab === 2 && (
        <IntakeStep2
          caseId={caseId}
          initialData={initialData}
          onNext={handleNext}
          onBack={() => setActiveTab(1)}
          saving={saveIntake.isPending}
          autoOpenAdvisor={autoOpenAdvisor}
          onAdvisorOpened={() => setAutoOpenAdvisor(false)}
          onSaveExit={handleSaveExit}
          onRegisterFlush={onRegisterFlush}
        />
      )}
      {activeTab === 3 && (
        <IntakeStep3
          caseId={caseId}
          initialData={initialData}
          onNext={handleNext}
          onBack={() => setActiveTab(2)}
          saving={saveIntake.isPending}
          onSaveExit={handleSaveExit}
          onAiCheck={goToAdvisor}
        />
      )}
      {activeTab === 4 && (
        <IntakeStep4
          caseId={caseId}
          initialData={initialData}
          onNext={handleNext}
          onBack={() => setActiveTab(3)}
          saving={saveIntake.isPending}
          onSaveExit={handleSaveExit}
          onAiCheck={goToAdvisor}
        />
      )}
      {activeTab === 5 && (
        <IntakeStep5
          initialData={initialData}
          onNext={handleNext}
          onBack={() => setActiveTab(4)}
          saving={saveIntake.isPending}
          onCheckCase={goToAdvisor}
          onSaveExit={handleSaveExit}
        />
      )}
      {activeTab === 6 && (
        <IntakeStep6
          caseId={caseId}
          initialData={initialData}
          onNext={handleNext}
          onBack={() => setActiveTab(5)}
          saving={saveIntake.isPending}
          onSaveExit={handleSaveExit}
          onAiCheck={goToAdvisor}
        />
      )}
      {activeTab === 7 && (
        <IntakeStep7
          caseId={caseId}
          initialData={initialData}
          onComplete={handleComplete}
          onBack={() => setActiveTab(6)}
          saving={saveIntake.isPending}
          onSaveExit={handleSaveExit}
        />
      )}
    </div>
  );
}
