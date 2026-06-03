const STEPS = [
  { n: 1, label: "Enter The\nParties" },
  { n: 2, label: "Make Your\nClaim" },
  { n: 3, label: "Upload My\nEvidence" },
  { n: 4, label: "Send Demand\nLetter" },
  { n: 5, label: "Review\nYour Case" },
  { n: 6, label: "Create Court\nForms" },
  { n: 7, label: "Prep for\nHearing" },
  { n: 8, label: "Deadlines" },
];

const ACTIVE = 2;

export function VariantC() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

      {/* ── Full workspace header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm w-full sticky top-0 z-40">
        <div className="flex items-center h-[80px] px-4 gap-4">

          {/* Logo placeholder */}
          <div className="shrink-0 flex items-center gap-1.5 mr-2">
            <div className="w-10 h-10 rounded-full bg-[#0d4f3c] flex items-center justify-center text-white text-xs font-black">SCG</div>
          </div>

          {/* Stepper — takes all remaining space */}
          <div className="flex-1 flex items-center relative min-w-0">
            {/* Track line behind circles */}
            <div className="absolute top-[18px] left-0 right-0 h-[2px] bg-gray-200 z-0" />
            {/* Progress fill */}
            <div
              className="absolute top-[18px] left-0 h-[2px] bg-[#0d9488] z-0 transition-all"
              style={{ width: `${((ACTIVE - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {/* Steps */}
            <div className="flex items-start justify-between w-full z-10 relative">
              {STEPS.map((step) => {
                const isActive = step.n === ACTIVE;
                const isDone = step.n < ACTIVE;
                return (
                  <button
                    key={step.n}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                    style={{ minWidth: 0 }}
                  >
                    {/* Circle */}
                    <div
                      className={[
                        "flex items-center justify-center rounded-full font-black text-[12px] w-9 h-9 border-2 transition-all",
                        isActive
                          ? "bg-[#0d4f3c] border-[#0d4f3c] text-white shadow-lg ring-4 ring-[#0d4f3c]/20 scale-110"
                          : isDone
                          ? "bg-[#0d9488] border-[#0d9488] text-white"
                          : "bg-white border-gray-300 text-gray-400 group-hover:border-[#0d9488] group-hover:text-[#0d9488]",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : step.n}
                    </div>
                    {/* Label */}
                    <span
                      className={[
                        "text-[10px] font-semibold leading-tight text-center whitespace-pre-line",
                        isActive
                          ? "text-[#0d4f3c]"
                          : isDone
                          ? "text-[#0d9488]"
                          : "text-gray-400 group-hover:text-[#0d9488]",
                      ].join(" ")}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Avatar placeholder */}
          <div className="shrink-0 ml-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold">
              JD
            </div>
          </div>

        </div>
      </header>

      {/* ── Simulated page content ── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0d4f3c] mb-1">Step 2 — Make Your Claim</h1>
          <p className="text-gray-500 text-sm">Describe what happened and what you're asking the court to award you.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">What happened?</label>
            <div className="w-full h-28 rounded-lg bg-gray-50 border border-gray-200" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Amount you're claiming ($)</label>
            <div className="w-48 h-10 rounded-lg bg-gray-50 border border-gray-200" />
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
