import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Sparkles, CheckCircle2, SkipForward, Info, AlertTriangle } from "lucide-react";

const FORMS = [
  {
    id: "sc100",
    number: "SC-100",
    name: "Plaintiff's Claim and ORDER to Go to Small Claims Court",
    shortDesc: "The primary form that starts your case — tells the court who you're suing, for how much, and why.",
    detailDesc: "SC-100 is the form that starts your California small claims case. It tells the court who you are suing, how much money you want, and why you are asking the court to order payment.",
    caseTypes: "both",
    hasAI: false,
    warnings: [
      "Make sure you have the defendant's correct address — incorrect service can delay or dismiss your case.",
      "The $12,500 limit applies to most individuals; businesses are capped at $6,250.",
    ],
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
    warnings: [
      "This form is confidential — the court will not give it to the other party.",
      "False statements on a fee waiver form are a criminal offense.",
    ],
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
    warnings: [
      "The plaintiff cannot personally serve their own papers.",
      "Service is a technical step — if done wrong, the hearing can be delayed or dismissed.",
    ],
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
  required: {
    label: "Required",
    pill: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  optional: {
    label: "Optional",
    pill: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
  skipped: {
    label: "Not applicable",
    pill: "bg-slate-100 text-slate-500 border border-slate-200",
    dot: "bg-slate-300",
  },
};

export function FormsWizard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const current = FORMS[currentIndex];
  const total = FORMS.length;
  const progress = ((currentIndex + 1) / total) * 100;
  const isSkipped = current.status === "skipped";

  // Navy = hsl(220 45% 15%) ≈ #1a2744
  // Accent gold = hsl(45 90% 50%) ≈ #f0b429

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "hsl(220 14% 96%)",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: "hsl(220 45% 15%)",
      }}
    >
      {/* ── Simulated tab bar ──────────────────────────────────────────────── */}
      <div style={{ background: "white", borderBottom: "1px solid hsl(220 13% 91%)" }}>
        <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 h-11">
          {["Intake", "Documents", "Research", "Court Forms", "Hearing Prep"].map((tab) => {
            const active = tab === "Court Forms";
            return (
              <span
                key={tab}
                className="px-3 h-full flex items-center text-sm font-medium transition-colors"
                style={{
                  color: active ? "hsl(220 45% 15%)" : "hsl(220 15% 50%)",
                  borderBottom: active ? "2px solid hsl(220 45% 15%)" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {tab}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Page body ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto w-full px-6 py-5 flex flex-col gap-4 flex-1">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "hsl(220 45% 15%)" }}>Court Forms</h2>
            <p className="text-xs mt-0.5" style={{ color: "hsl(220 15% 50%)" }}>
              Smith v. Acme Rentals LLC · California Small Claims
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(220 15% 45%)" }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: "#16a34a" }} />
            <span>3 of 5 reviewed</span>
          </div>
        </div>

        {/* ── Progress card ──────────────────────────────────────────────── */}
        <div
          className="rounded-xl p-4"
          style={{ background: "white", border: "1px solid hsl(220 13% 91%)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: "hsl(220 45% 15%)" }}>
              Form {currentIndex + 1} of {total}
            </span>
            <span className="text-xs" style={{ color: "hsl(220 15% 50%)" }}>
              {FORMS.filter((f) => f.status === "required").length} required ·{" "}
              {FORMS.filter((f) => f.status === "optional").length} optional ·{" "}
              {FORMS.filter((f) => f.status === "skipped").length} skipped
            </span>
          </div>

          {/* Bar */}
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "hsl(220 14% 91%)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: "hsl(220 45% 15%)" }}
            />
          </div>

          {/* Dots */}
          <div className="flex justify-between mt-2.5">
            {FORMS.map((f, i) => {
              const cfg = STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG];
              return (
                <button
                  key={f.id}
                  onClick={() => setCurrentIndex(i)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all ${cfg.dot} ${
                      i === currentIndex ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""
                    }`}
                  />
                  <span
                    className="text-[10px] font-medium hidden sm:block"
                    style={{ color: i === currentIndex ? "hsl(220 45% 15%)" : "hsl(220 15% 60%)" }}
                  >
                    {f.number}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Form card ──────────────────────────────────────────────────── */}
        <div
          className="rounded-xl flex-1 flex flex-col"
          style={{
            background: "white",
            border: `1px solid ${isSkipped ? "hsl(220 13% 91%)" : "hsl(220 13% 87%)"}`,
            opacity: isSkipped ? 0.8 : 1,
          }}
        >
          {/* Card header */}
          <div
            className="p-5 flex items-start gap-4"
            style={{ borderBottom: "1px solid hsl(220 13% 91%)" }}
          >
            <div
              className="rounded-lg p-2.5 flex-shrink-0"
              style={{
                background: isSkipped ? "hsl(220 14% 96%)" : "hsl(220 45% 15% / 0.08)",
              }}
            >
              <FileText
                className="w-5 h-5"
                style={{ color: isSkipped ? "hsl(220 15% 60%)" : "hsl(220 45% 15%)" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                  style={{
                    background: "hsl(220 14% 96%)",
                    color: "hsl(220 15% 40%)",
                    border: "1px solid hsl(220 13% 88%)",
                  }}
                >
                  {current.number}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_CONFIG[current.status as keyof typeof STATUS_CONFIG].pill
                  }`}
                >
                  {STATUS_CONFIG[current.status as keyof typeof STATUS_CONFIG].label}
                </span>
                {current.caseTypes === "business" && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    Business cases only
                  </span>
                )}
              </div>
              <h3
                className="text-base font-bold mt-1.5 leading-snug"
                style={{ color: "hsl(220 45% 15%)" }}
              >
                {current.name}
              </h3>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: "hsl(220 15% 40%)" }}>
                {current.shortDesc}
              </p>
            </div>
          </div>

          {/* Card body */}
          <div className="p-5 flex-1 flex flex-col gap-4">
            {isSkipped ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(220 14% 95%)" }}
                >
                  <SkipForward className="w-5 h-5" style={{ color: "hsl(220 15% 55%)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "hsl(220 45% 20%)" }}>
                    This form doesn't apply to your case
                  </p>
                  <p className="text-xs mt-1" style={{ color: "hsl(220 15% 55%)" }}>
                    {current.number} is only required for business cases. Since your case is filed as
                    an individual, you can skip this form.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentIndex(Math.min(currentIndex + 1, total - 1))}
                  className="mt-1 text-xs font-medium underline underline-offset-2"
                  style={{ color: "hsl(220 45% 30%)" }}
                >
                  Continue to next form →
                </button>
              </div>
            ) : (
              <>
                {/* About */}
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: "hsl(220 15% 55%)" }}
                  >
                    About this form
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(220 15% 30%)" }}>
                    {current.detailDesc}
                  </p>
                </div>

                {/* Warnings */}
                {current.warnings.length > 0 && (
                  <div
                    className="rounded-lg p-3.5 flex gap-2.5"
                    style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                    <div className="flex flex-col gap-1">
                      {current.warnings.map((w, i) => (
                        <p key={i} className="text-xs leading-relaxed" style={{ color: "#92400e" }}>
                          {w}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related forms */}
                {current.relatedForms.length > 0 && (
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: "hsl(220 15% 55%)" }}
                    >
                      Also file with
                    </p>
                    <div className="flex flex-col gap-1">
                      {current.relatedForms.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(220 15% 40%)" }}>
                          <div className="w-1 h-1 rounded-full bg-slate-300" />
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
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: "hsl(220 14% 96%)",
                      border: "1px solid hsl(220 13% 88%)",
                      color: "hsl(220 45% 20%)",
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Download blank PDF
                  </a>
                  {current.hasAI && (
                    <button
                      onClick={() => setAiOpen(true)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: "hsl(45 90% 50% / 0.12)",
                        border: "1px solid hsl(45 90% 50% / 0.35)",
                        color: "hsl(30 80% 30%)",
                      }}
                    >
                      <Sparkles className="w-4 h-4" style={{ color: "hsl(45 90% 40%)" }} />
                      Fill with AI Assistant
                    </button>
                  )}
                  <button
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium"
                    style={{
                      background: "hsl(220 14% 96%)",
                      border: "1px solid hsl(220 13% 88%)",
                      color: "hsl(220 15% 45%)",
                    }}
                  >
                    <Info className="w-4 h-4" />
                    Filing guide
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1 pb-2">
          <button
            onClick={() => setCurrentIndex(Math.max(currentIndex - 1, 0))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "white",
              border: "1px solid hsl(220 13% 88%)",
              color: "hsl(220 45% 20%)",
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex gap-1.5 items-center">
            {FORMS.map((f, i) => {
              const cfg = STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG];
              return (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${cfg.dot}`}
                  style={{ width: i === currentIndex ? "16px" : "6px" }}
                />
              );
            })}
          </div>

          <button
            onClick={() => setCurrentIndex(Math.min(currentIndex + 1, total - 1))}
            disabled={currentIndex === total - 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "hsl(220 45% 15%)",
              color: "white",
              border: "none",
            }}
          >
            {currentIndex === total - 1 ? "Done" : "Next form"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── AI modal ───────────────────────────────────────────────────────── */}
      {aiOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setAiOpen(false)}
        >
          <div
            className="rounded-xl max-w-md w-full p-6"
            style={{ background: "white", border: "1px solid hsl(220 13% 88%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" style={{ color: "hsl(45 90% 40%)" }} />
              <h3 className="text-base font-bold" style={{ color: "hsl(220 45% 15%)" }}>
                AI Form Assistant
              </h3>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(220 15% 40%)" }}>
              The assistant will use the information you've already entered about your case to
              pre-fill this form. Review everything carefully before downloading.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAiOpen(false)}
                className="px-3 py-1.5 text-sm rounded-lg"
                style={{ color: "hsl(220 15% 45%)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setAiOpen(false)}
                className="px-4 py-1.5 text-sm rounded-lg font-semibold"
                style={{ background: "hsl(220 45% 15%)", color: "white" }}
              >
                Fill form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
