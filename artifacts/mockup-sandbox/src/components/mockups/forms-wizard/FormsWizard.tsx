import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Sparkles, CheckCircle2, SkipForward, Info, AlertTriangle, Play } from "lucide-react";

const FORMS = [
  {
    id: "sc100",
    number: "SC-100",
    shortLabel: "Plaintiff's Claim",
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
    videoTitle: "How to Fill Out SC-100",
  },
  {
    id: "sc103",
    number: "SC-103",
    shortLabel: "Fictitious Name",
    name: "Fictitious Business Name",
    shortDesc: "Required when a party is suing or being sued under a 'doing business as' (DBA) name.",
    detailDesc: "SC-103 must be filed alongside SC-100 or SC-120 whenever a plaintiff or defendant operates under a fictitious business name.",
    caseTypes: "business",
    hasAI: false,
    warnings: ["SC-103 is a separate document — hand it to the clerk alongside SC-100, do not staple them together."],
    relatedForms: ["SC-100 — primary filing form"],
    status: "skipped",
    videoTitle: "About SC-103",
  },
  {
    id: "fw001",
    number: "FW-001",
    shortLabel: "Fee Waiver",
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
    videoTitle: "Do You Qualify for a Fee Waiver?",
  },
  {
    id: "sc104",
    number: "SC-104",
    shortLabel: "Proof of Service",
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
    videoTitle: "How to Serve the Defendant",
  },
  {
    id: "mc030",
    number: "MC-030",
    shortLabel: "Declaration",
    name: "Declaration",
    shortDesc: "A sworn statement form for information that doesn't fit on the main form.",
    detailDesc: "MC-030 is a blank declaration form used whenever a party needs to submit a written statement under penalty of perjury that doesn't fit within the space provided on another form.",
    caseTypes: "both",
    hasAI: true,
    warnings: ["Keep facts separate from opinions.", "A declaration can hurt clarity if it becomes too long."],
    relatedForms: ["SC-100 — main claim form this typically supports"],
    status: "optional",
    videoTitle: "When & How to Use a Declaration",
  },
];

const STATUS_CONFIG = {
  required: { label: "Required", pill: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
  optional: { label: "Optional", pill: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-400" },
  skipped: { label: "Not applicable", pill: "bg-slate-100 text-slate-500 border border-slate-200", dot: "bg-slate-300" },
};

// Navy = hsl(220 45% 15%), Accent gold = hsl(45 90% 50%)
const NAVY = "hsl(220, 45%, 15%)";
const BORDER = "hsl(220, 13%, 91%)";
const MUTED_BG = "hsl(220, 14%, 96%)";
const MUTED_TEXT = "hsl(220, 15%, 50%)";
const BODY_TEXT = "hsl(220, 15%, 30%)";

function VideoCard({ title }: { title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden flex-shrink-0"
      style={{ width: 220, background: "white", border: `1px solid ${BORDER}` }}
    >
      {/* Thumbnail area */}
      <div
        className="relative flex items-center justify-center cursor-pointer group"
        style={{ height: 124, background: "#e8edf5" }}
        onClick={() => setPlaying(!playing)}
      >
        {/* Fake thumbnail gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, hsl(220,35%,88%) 0%, hsl(220,25%,82%) 100%)",
          }}
        />
        {/* Avatar silhouette */}
        <div className="relative flex flex-col items-center gap-1 opacity-40">
          <div className="w-10 h-10 rounded-full bg-slate-400" />
          <div className="w-16 h-2 rounded bg-slate-400" />
        </div>
        {/* Play button */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-100"
          style={{ opacity: playing ? 0 : 1 }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
            style={{ background: NAVY }}
          >
            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
          </div>
        </div>
        {playing && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#111" }}>
            <span className="text-xs text-white opacity-60">Video playing…</span>
          </div>
        )}
      </div>

      {/* Label */}
      <div className="px-3 py-2.5 flex flex-col gap-0.5 flex-1">
        <p className="text-[11px] font-semibold leading-snug" style={{ color: NAVY }}>
          {title}
        </p>
        <p className="text-[10px]" style={{ color: MUTED_TEXT }}>
          Genie explains this form
        </p>
      </div>
    </div>
  );
}

export function FormsWizard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const current = FORMS[currentIndex];
  const total = FORMS.length;
  const progress = ((currentIndex + 1) / total) * 100;
  const isSkipped = current.status === "skipped";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: MUTED_BG, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: NAVY }}
    >
      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div style={{ background: "white", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 h-11">
          {["Intake", "Documents", "Research", "Court Forms", "Hearing Prep"].map((tab) => {
            const active = tab === "Court Forms";
            return (
              <span
                key={tab}
                className="px-3 h-full flex items-center text-sm font-medium"
                style={{
                  color: active ? NAVY : MUTED_TEXT,
                  borderBottom: active ? `2px solid ${NAVY}` : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {tab}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto w-full px-6 py-5 flex flex-col gap-4 flex-1">

        {/* Page heading */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: NAVY }}>Court Forms</h2>
            <p className="text-xs mt-0.5" style={{ color: MUTED_TEXT }}>
              Smith v. Acme Rentals LLC · California Small Claims
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(220 15% 45%)" }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: "#16a34a" }} />
            <span>3 of 5 reviewed</span>
          </div>
        </div>

        {/* ── Top row: progress tracker + video ──────────────────────────────── */}
        <div className="flex gap-4 items-stretch">

          {/* Progress tracker */}
          <div
            className="flex-1 rounded-xl p-4"
            style={{ background: "white", border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: NAVY }}>
                Form {currentIndex + 1} of {total}
              </span>
              <span className="text-xs" style={{ color: MUTED_TEXT }}>
                {FORMS.filter((f) => f.status === "required").length} required ·{" "}
                {FORMS.filter((f) => f.status === "optional").length} optional ·{" "}
                {FORMS.filter((f) => f.status === "skipped").length} skipped
              </span>
            </div>

            {/* Bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220 13% 91%)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: NAVY }}
              />
            </div>

            {/* Form step labels */}
            <div className="flex justify-between mt-3">
              {FORMS.map((f, i) => {
                const cfg = STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG];
                const active = i === currentIndex;
                return (
                  <button
                    key={f.id}
                    onClick={() => setCurrentIndex(i)}
                    className="flex flex-col items-center gap-1 group text-center"
                    style={{ minWidth: 0, flex: 1 }}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all ${cfg.dot}`}
                      style={active ? { outline: `2px solid ${NAVY}`, outlineOffset: 2 } : {}}
                    />
                    <span
                      className="text-[9px] font-bold leading-none mt-0.5"
                      style={{ color: active ? NAVY : MUTED_TEXT }}
                    >
                      {f.number}
                    </span>
                    <span
                      className="text-[9px] leading-none"
                      style={{
                        color: active ? BODY_TEXT : "hsl(220 13% 70%)",
                        maxWidth: 56,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        display: "block",
                      }}
                    >
                      {f.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Video card */}
          <VideoCard title={current.videoTitle} />
        </div>

        {/* ── Form card ──────────────────────────────────────────────────────── */}
        <div
          className="rounded-xl flex flex-col"
          style={{
            background: "white",
            border: `1px solid ${isSkipped ? BORDER : "hsl(220 13% 87%)"}`,
            opacity: isSkipped ? 0.8 : 1,
            flex: 1,
          }}
        >
          {/* Card header */}
          <div className="p-5 flex items-start gap-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div
              className="rounded-lg p-2.5 flex-shrink-0"
              style={{ background: isSkipped ? MUTED_BG : "hsl(220 45% 15% / 0.08)" }}
            >
              <FileText className="w-5 h-5" style={{ color: isSkipped ? MUTED_TEXT : NAVY }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                  style={{ background: MUTED_BG, color: "hsl(220 15% 40%)", border: `1px solid hsl(220 13% 88%)` }}
                >
                  {current.number}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[current.status as keyof typeof STATUS_CONFIG].pill}`}>
                  {STATUS_CONFIG[current.status as keyof typeof STATUS_CONFIG].label}
                </span>
                {current.caseTypes === "business" && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    Business cases only
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold mt-1.5 leading-snug" style={{ color: NAVY }}>
                {current.name}
              </h3>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: "hsl(220 15% 40%)" }}>
                {current.shortDesc}
              </p>
            </div>
          </div>

          {/* Card body */}
          <div className="p-5 flex flex-col gap-4" style={{ flex: 1 }}>
            {isSkipped ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center py-6" style={{ flex: 1 }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: MUTED_BG }}>
                  <SkipForward className="w-5 h-5" style={{ color: MUTED_TEXT }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "hsl(220 45% 20%)" }}>
                    This form doesn't apply to your case
                  </p>
                  <p className="text-xs mt-1" style={{ color: MUTED_TEXT }}>
                    {current.number} is only required for business cases. Since your case is filed as an individual, you can skip this form.
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
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: MUTED_TEXT }}>
                    About this form
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: BODY_TEXT }}>
                    {current.detailDesc}
                  </p>
                </div>

                {current.warnings.length > 0 && (
                  <div className="rounded-lg p-3.5 flex gap-2.5" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                    <div className="flex flex-col gap-1">
                      {current.warnings.map((w, i) => (
                        <p key={i} className="text-xs leading-relaxed" style={{ color: "#92400e" }}>{w}</p>
                      ))}
                    </div>
                  </div>
                )}

                {current.relatedForms.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: MUTED_TEXT }}>
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

                <div className="flex flex-wrap gap-2.5 mt-auto pt-2">
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium"
                    style={{ background: MUTED_BG, border: `1px solid hsl(220 13% 88%)`, color: "hsl(220 45% 20%)" }}
                  >
                    <Download className="w-4 h-4" />
                    Download blank PDF
                  </a>
                  {current.hasAI && (
                    <button
                      onClick={() => setAiOpen(true)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium"
                      style={{ background: "hsl(45 90% 50% / 0.12)", border: "1px solid hsl(45 90% 50% / 0.35)", color: "hsl(30 80% 30%)" }}
                    >
                      <Sparkles className="w-4 h-4" style={{ color: "hsl(45 90% 40%)" }} />
                      Fill with AI Assistant
                    </button>
                  )}
                  <button
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium"
                    style={{ background: MUTED_BG, border: `1px solid hsl(220 13% 88%)`, color: "hsl(220 15% 45%)" }}
                  >
                    <Info className="w-4 h-4" />
                    Filing guide
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-2">
          <button
            onClick={() => setCurrentIndex(Math.max(currentIndex - 1, 0))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "white", border: `1px solid hsl(220 13% 88%)`, color: "hsl(220 45% 20%)" }}
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
                  style={{ width: i === currentIndex ? 16 : 6 }}
                />
              );
            })}
          </div>

          <button
            onClick={() => setCurrentIndex(Math.min(currentIndex + 1, total - 1))}
            disabled={currentIndex === total - 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: NAVY, color: "white" }}
          >
            {currentIndex === total - 1 ? "Done" : "Next form"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── AI modal ─────────────────────────────────────────────────────────── */}
      {aiOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setAiOpen(false)}
        >
          <div
            className="rounded-xl max-w-md w-full p-6"
            style={{ background: "white", border: `1px solid ${BORDER}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" style={{ color: "hsl(45 90% 40%)" }} />
              <h3 className="text-base font-bold" style={{ color: NAVY }}>AI Form Assistant</h3>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(220 15% 40%)" }}>
              The assistant will use the information you've already entered about your case to pre-fill this form. Review everything carefully before downloading.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAiOpen(false)} className="px-3 py-1.5 text-sm rounded-lg" style={{ color: MUTED_TEXT }}>
                Cancel
              </button>
              <button onClick={() => setAiOpen(false)} className="px-4 py-1.5 text-sm rounded-lg font-semibold" style={{ background: NAVY, color: "white" }}>
                Fill form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
