import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import {
  useSaveIntakeProgress,
  getGetCaseQueryKey,
  getGetCaseReadinessQueryKey,
  getListCasesQueryKey,
  getGetCaseStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { IntakeStep1 } from "./intake-step-1";
import { IntakeStep2 } from "./intake-step-2";
import { IntakeStep3 } from "./intake-step-3";
import { IntakeStep4 } from "./intake-step-4";

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

// ─── Tab definitions ──────────────────────────────────────────────────────────
const INTAKE_TABS = [
  { num: 1, label: "Enter The Parties" },
  { num: 2, label: "Make Your Claim" },
  { num: 3, label: "Send Demand Letter" },
  { num: 4, label: "Review Your Case" },
] as const;

// Required fields per tab — checked on Complete Intake
const REQUIRED: { tab: number; key: string; label: string }[] = [
  { tab: 1, key: "plaintiffName",    label: "Your name" },
  { tab: 1, key: "plaintiffAddress", label: "Your address" },
  { tab: 1, key: "defendantName",    label: "Defendant name" },
  { tab: 1, key: "defendantAddress", label: "Defendant address" },
  { tab: 1, key: "countyId",         label: "Filing county" },
  { tab: 2, key: "claimType",        label: "Claim type" },
  { tab: 2, key: "claimAmount",      label: "Claim amount" },
  { tab: 2, key: "claimDescription", label: "Claim description" },
  { tab: 2, key: "incidentDate",     label: "Incident date" },
  { tab: 2, key: "howAmountCalculated", label: "Amount calculation" },
  { tab: 3, key: "venueBasis",       label: "Venue basis" },
];

// ─── Intake Tab ───────────────────────────────────────────────────────────────
export function IntakeTab({ caseId, initialData }: { caseId: number; initialData: any }) {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(
    (Math.min(initialData.intakeStep || 1, 4) as 1 | 2 | 3 | 4)
  );
  const [autoOpenAdvisor, setAutoOpenAdvisor] = useState(false);
  const [missingWarnings, setMissingWarnings] = useState<{ tab: number; label: string }[]>([]);
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
    const next = Math.min(activeTab + 1, 4) as 1 | 2 | 3 | 4;
    saveIntake.mutate({ id: caseId, data: { step: next, data } }, {
      onSuccess: () => {
        setActiveTab(next);
        invalidateAll();
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onError: (err: any) => {
        toast({ title: "Could not save progress", description: err?.message || "Please check your connection and try again.", variant: "destructive" });
      },
    });
  };

  const handleComplete = (formData: any) => {
    // Check required fields across all tabs
    const merged = { ...initialData, ...formData };
    const missing = REQUIRED.filter(r => !merged[r.key]);
    if (missing.length > 0) {
      setMissingWarnings(missing);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setMissingWarnings([]);
    saveIntake.mutate({ id: caseId, data: { step: 4, ...formData, intakeComplete: true } }, {
      onSuccess: () => {
        toast({ title: "Intake Complete", description: "Your information has been saved." });
        invalidateAll();
      }
    });
  };

  const handleSaveExit = (formData: any) => {
    saveIntake.mutate({ id: caseId, data: { step: activeTab, data: formData } }, {
      onSuccess: () => { invalidateAll(); navigate("/dashboard"); },
      onError: () => { navigate("/dashboard"); },
    });
  };

  const goToAdvisor = () => {
    setAutoOpenAdvisor(true);
    setActiveTab(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Group missing warnings by tab for display
  const warningsByTab = INTAKE_TABS.map(t => ({
    ...t,
    items: missingWarnings.filter(w => w.tab === t.num),
  })).filter(t => t.items.length > 0);

  return (
    <div className="p-4 md:p-5">
      {activeTab === 4 && <HearingInfoCard caseId={caseId} initialData={initialData} />}

      {/* ── Numbered tab bar ── */}
      <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1.5 mb-5 overflow-x-auto no-scrollbar">
        {INTAKE_TABS.map(({ num, label }) => {
          const active = activeTab === num;
          return (
            <button
              key={num}
              onClick={() => setActiveTab(num as 1 | 2 | 3 | 4)}
              className={[
                "flex items-center gap-2.5 flex-1 min-w-0 px-3 py-2.5 rounded-lg transition-all text-left",
                active
                  ? "bg-white shadow-sm text-[#0d6b5e] border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
              ].join(" ")}
            >
              <span className={[
                "inline-flex items-center justify-center w-9 h-9 rounded-full text-base font-bold shrink-0 transition-all",
                active ? "bg-[#14b8a6] text-white" : "bg-gray-200 text-gray-500",
              ].join(" ")}>
                {num}
              </span>
              <span className="hidden sm:block text-xs font-semibold leading-snug">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Missing field warnings (tab 4 only) ── */}
      {activeTab === 4 && warningsByTab.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Please complete these required fields before finishing:
          </div>
          <div className="space-y-1.5">
            {warningsByTab.map(({ num, label: tabLabel, items }) => (
              <div key={num} className="flex items-start gap-2 text-xs">
                <button
                  onClick={() => setActiveTab(num as 1 | 2 | 3 | 4)}
                  className="font-bold text-red-600 underline underline-offset-2 shrink-0 hover:text-red-800"
                >
                  Tab {num} — {tabLabel}:
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
        />
      )}
      {activeTab === 3 && (
        <IntakeStep3
          initialData={initialData}
          onNext={handleNext}
          onBack={() => setActiveTab(2)}
          saving={saveIntake.isPending}
          onSaveExit={handleSaveExit}
        />
      )}
      {activeTab === 4 && (
        <IntakeStep4
          initialData={initialData}
          onComplete={handleComplete}
          onBack={() => setActiveTab(3)}
          saving={saveIntake.isPending}
          onCheckCase={goToAdvisor}
          onSaveExit={handleSaveExit}
        />
      )}
    </div>
  );
}
