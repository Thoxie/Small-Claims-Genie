import { Calendar } from "lucide-react";

const STEPS = [
  { n: 1, label: "Enter The\nParties" },
  { n: 2, label: "Make Your\nClaim" },
  { n: 3, label: "Upload My\nEvidence" },
  { n: 4, label: "Send Demand\nLetter" },
  { n: 5, label: "Review\nYour Case" },
  { n: 6, label: "Create Court\nForms" },
  { n: 7, label: "Prep for\nHearing" },
  { n: 8, label: "Deadlines", icon: true },
];

const ACTIVE = 3;

export function VariantD() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

      {/* ── Full workspace header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm w-full sticky top-0 z-40">
        <div className="flex items-center h-[82px] px-5 gap-3">

          {/* Logo */}
          <a href="/" className="shrink-0 flex items-center mr-1">
            <img
              src="/scg-logo.png"
              alt="Small Claims Genie"
              className="h-[62px] w-auto"
            />
          </a>

          {/* Stepper — fills all space between logo and avatar */}
          <div className="flex-1 flex items-center justify-center min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-0">
              {STEPS.map((step, i) => {
                const isActive = step.n === ACTIVE;
                const isDone = step.n < ACTIVE;

                return (
                  <div key={step.n} className="flex items-center">
                    {/* Dash separator */}
                    {i > 0 && (
                      <span className={`text-base font-bold mx-1.5 ${isDone ? "text-[#0d9488]" : "text-gray-300"}`}>
                        —
                      </span>
                    )}

                    {/* Step */}
                    <button
                      className={[
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all",
                        isActive
                          ? "border-2 border-[#0d4f3c] bg-white shadow-sm"
                          : "border-2 border-transparent",
                      ].join(" ")}
                    >
                      {/* Circle */}
                      <div
                        className={[
                          "flex items-center justify-center rounded-full font-black text-[11px] shrink-0",
                          isActive
                            ? "w-7 h-7 bg-[#0d9488] text-white"
                            : isDone
                            ? "w-6 h-6 bg-[#0d9488] text-white"
                            : "w-6 h-6 border-2 border-gray-300 text-gray-400 bg-white",
                        ].join(" ")}
                      >
                        {isDone ? "✓" : step.n}
                      </div>

                      {/* Label + optional icon */}
                      <div className="flex flex-col items-start">
                        {step.icon && (
                          <Calendar className="h-3 w-3 text-gray-400 mb-0.5" />
                        )}
                        <span
                          className={[
                            "text-[10px] font-semibold leading-tight whitespace-pre-line text-left",
                            isActive
                              ? "text-[#0d4f3c]"
                              : isDone
                              ? "text-[#0d9488]"
                              : "text-gray-400",
                          ].join(" ")}
                        >
                          {step.label}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User avatar */}
          <div className="shrink-0 ml-1">
            <div className="w-9 h-9 rounded-full bg-[#0d4f3c] flex items-center justify-center text-white text-xs font-bold shadow">
              JD
            </div>
          </div>

        </div>
      </header>

      {/* ── Simulated page content ── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0d4f3c] mb-1">Step 3 — Upload My Evidence</h1>
          <p className="text-gray-500 text-sm">Upload receipts, contracts, photos, and any documents that support your case.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="border-2 border-dashed border-gray-200 rounded-xl h-36 flex items-center justify-center text-gray-400 text-sm">
            Drag & drop files here or click to upload
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <div className="h-10 w-36 rounded-lg bg-gray-100" />
            <div className="h-10 w-40 rounded-lg bg-[#0d4f3c]" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-2.5 bg-white">
        <p className="text-center text-[11px] text-gray-400">© 2026 Small Claims Genie. AI-powered legal guidance.</p>
      </footer>
    </div>
  );
}
