import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Sparkles, CheckCircle2, SkipForward, Info, AlertTriangle } from "lucide-react";

// ── Representative forms for the mockup ───────────────────────────────────────
const FORMS = [
  {
    id: "sc100",
    number: "SC-100",
    name: "Plaintiff's Claim and ORDER to Go to Small Claims Court",
    shortDesc: "The primary form that starts your case — tells the court who you're suing, for how much, and why.",
    detailDesc: "SC-100 is the form that starts your California small claims case. It tells the court who you are suing, how much money you want, and why you are asking the court to order payment.",
    caseTypes: "both",
    hasAI: false,
    warnings: ["Make sure you have the defendant's correct address — incorrect service can delay or dismiss your case.", "The $12,500 limit applies to most individuals; businesses are capped at $6,250."],
    relatedForms: ["MC-030 — if your description needs more space", "FW-001 — to waive filing fees if you qualify"],
    status: "required",
  },
  {
    id: "sc103",
    number: "SC-103",
    name: "Fictitious Business Name",
    shortDesc: "Required when a party is suing or being sued under a 'doing business as' (DBA) name.",
    detailDesc: "SC-103 must be filed alongside SC-100 or SC-120 whenever a plaintiff or defendant operates under a fictitious business name.",
    caseTypes: "business",
    hasAI: false,
    warnings: ["SC-103 is a separate document — hand it to the clerk alongside SC-100, do not staple them together."],
    relatedForms: ["SC-100 — primary filing form"],
    status: "skipped",
  },
  {
    id: "fw001",
    number: "FW-001",
    name: "Request to Waive Court Fees",
    shortDesc: "Ask the court to waive your filing fees if paying would be a financial hardship.",
    detailDesc: "FW-001 lets you ask the court to waive court filing fees when you cannot afford them. You may qualify if you receive public benefits, your income is below the threshold, or paying the fee would prevent you from meeting your household's basic needs.",
    caseTypes: "both",
    hasAI: true,
    warnings: ["This form is confidential — the court will not give it to the other party.", "False statements on a fee waiver form are a criminal offense."],
    relatedForms: ["SC-100 — file together with your claim", "FW-001-INFO — eligibility information sheet"],
    status: "optional",
  },
  {
    id: "sc104",
    number: "SC-104",
    name: "Proof of Service",
    shortDesc: "Documents that the defendant was properly served with the court papers.",
    detailDesc: "SC-104 is completed by the person who delivered (served) the court papers to the defendant — this must be someone at least 18 years old and not named in the case.",
    caseTypes: "both",
    hasAI: false,
    warnings: ["The plaintiff cannot personally serve their own papers.", "Service is a technical step — if done wrong, the hearing can be delayed or dismissed."],
    relatedForms: ["SC-112A — if later papers are served by mail"],
    status: "required",
  },
  {
    id: "mc030",
    number: "MC-030",
    name: "Declaration",
    shortDesc: "A sworn statement form for information that doesn't fit on the main form.",
    detailDesc: "MC-030 is a blank declaration form used whenever a party needs to submit a written statement under penalty of perjury that doesn't fit within the space provided on another form.",
    caseTypes: "both",
    hasAI: true,
    warnings: ["Keep facts separate from opinions.", "A declaration can hurt clarity if it becomes too long."],
    relatedForms: ["SC-100 — main claim form this typically supports"],
    status: "optional",
  },
];

const STATUS_CONFIG = {
  required: { label: "Required", color: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  optional: { label: "Optional", color: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  skipped: { label: "Not applicable", color: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30" },
};

export function FormsWizard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const current = FORMS[currentIndex];
  const total = FORMS.length;
  const progress = ((currentIndex + 1) / total) * 100;
  const isSkipped = current.status === "skipped";

  return (
    <div className="min-h-screen bg-[#0f0f11] text-zinc-100 flex flex-col" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* ── Simulated tab bar ─────────────────────────────────────────────── */}
      <div className="border-b border-zinc-800 bg-[#141418]">
        <div className="max-w-5xl mx-auto px-6 flex items-center gap-6 h-11 text-sm">
          {["Intake", "Documents", "Research", "Court Forms", "Hearing Prep"].map((tab) => (
            <span
              key={tab}
              className={tab === "Court Forms"
                ? "text-white border-b-2 border-indigo-500 pb-0.5 font-medium h-full flex items-center"
                : "text-zinc-500 h-full flex items-center"}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto w-full px-6 py-6 flex flex-col gap-5 flex-1">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Court Forms</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Smith v. Acme Rentals LLC · California Small Claims</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>3 of 5 reviewed</span>
          </div>
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        <div className="bg-[#1a1a20] rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-300">
              Form {currentIndex + 1} of {total}
            </span>
            <span className="text-xs text-zinc-500">
              {FORMS.filter(f => f.status === "required").length} required · {FORMS.filter(f => f.status === "optional").length} optional · {FORMS.filter(f => f.status === "skipped").length} skipped
            </span>
          </div>

          {/* Step dots + bar */}
          <div className="relative">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {FORMS.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setCurrentIndex(i)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex ? "bg-indigo-400 scale-125" :
                    i < currentIndex ? "bg-indigo-600" :
                    "bg-zinc-700"
                  }`} />
                  <span className={`text-[10px] hidden sm:block ${i === currentIndex ? "text-zinc-300" : "text-zinc-600"}`}>
                    {f.number}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form card ────────────────────────────────────────────────────── */}
        <div className={`bg-[#1a1a20] rounded-xl border flex-1 flex flex-col transition-all ${
          isSkipped ? "border-zinc-800 opacity-75" : "border-zinc-700"
        }`}>

          {/* Card header */}
          <div className="p-5 border-b border-zinc-800 flex items-start gap-4">
            <div className={`rounded-lg p-2.5 flex-shrink-0 ${isSkipped ? "bg-zinc-800" : "bg-indigo-500/15"}`}>
              <FileText className={`w-5 h-5 ${isSkipped ? "text-zinc-500" : "text-indigo-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                  {current.number}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[current.status as keyof typeof STATUS_CONFIG].color}`}>
                  {STATUS_CONFIG[current.status as keyof typeof STATUS_CONFIG].label}
                </span>
                {current.caseTypes === "business" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-medium">
                    Business cases only
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-white mt-1.5 leading-snug">
                {current.name}
              </h3>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                {current.shortDesc}
              </p>
            </div>
          </div>

          {/* Card body */}
          <div className="p-5 flex-1 flex flex-col gap-4">

            {isSkipped ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <SkipForward className="w-5 h-5 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400">This form doesn't apply to your case</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {current.number} is only required for business cases. Since your case is filed as an individual, you can skip this form.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentIndex(Math.min(currentIndex + 1, total - 1))}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                >
                  Continue to next form →
                </button>
              </div>
            ) : (
              <>
                {/* About this form */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">About this form</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{current.detailDesc}</p>
                </div>

                {/* Warnings */}
                {current.warnings.length > 0 && (
                  <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg p-3.5 flex gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      {current.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-300/80 leading-relaxed">{w}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related forms */}
                {current.relatedForms.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Also file with</p>
                    <div className="flex flex-col gap-1">
                      {current.relatedForms.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <div className="w-1 h-1 rounded-full bg-zinc-600" />
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto pt-2 flex flex-wrap gap-2.5">
                  <a
                    href="#"
                    onClick={e => e.preventDefault()}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download blank PDF
                  </a>
                  {current.hasAI && (
                    <button
                      onClick={() => setAiOpen(true)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-sm text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Fill with AI Assistant
                    </button>
                  )}
                  <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm text-zinc-400 hover:border-zinc-600 transition-colors">
                    <Info className="w-4 h-4" />
                    Filing guide
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Navigation ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setCurrentIndex(Math.max(currentIndex - 1, 0))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:border-zinc-600 hover:enabled:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex gap-1.5">
            {FORMS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? "bg-indigo-400 w-4" : "bg-zinc-700"}`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentIndex(Math.min(currentIndex + 1, total - 1))}
            disabled={currentIndex === total - 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {currentIndex === total - 1 ? "Done" : "Next form"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── AI modal overlay ─────────────────────────────────────────────── */}
      {aiOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setAiOpen(false)}>
          <div className="bg-[#1e1e26] border border-zinc-700 rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">AI Form Assistant</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">
              The assistant will use the information you've already entered about your case to pre-fill this form. Review everything before downloading.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAiOpen(false)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => setAiOpen(false)} className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium">Fill form</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
