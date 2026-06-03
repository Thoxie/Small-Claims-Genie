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

export function VariantA() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm w-full">
        <div className="flex items-center h-[80px] px-4 gap-3 overflow-x-auto no-scrollbar">

          {/* Steps */}
          <div className="flex items-center flex-1 gap-0 min-w-max">
            {STEPS.map((step, i) => {
              const isActive = step.n === ACTIVE;
              const isDone = step.n < ACTIVE;
              return (
                <div key={step.n} className="flex items-center">
                  {/* Connector */}
                  {i > 0 && (
                    <div className={`w-6 h-[2px] shrink-0 ${isDone ? "bg-[#0d9488]" : "bg-gray-200"}`} />
                  )}
                  {/* Step pill */}
                  <button
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-full transition-all shrink-0",
                      isActive
                        ? "bg-[#0d4f3c] text-white shadow-md"
                        : isDone
                        ? "bg-[#d1fae5] text-[#065f46]"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex items-center justify-center rounded-full text-[11px] font-black w-5 h-5 shrink-0",
                        isActive
                          ? "bg-white text-[#0d4f3c]"
                          : isDone
                          ? "bg-[#0d9488] text-white"
                          : "bg-gray-300 text-gray-600",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : step.n}
                    </span>
                    <span className="text-[10px] font-semibold leading-tight whitespace-pre-line text-left">
                      {step.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content hint */}
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Step 2 — Make Your Claim content area
      </div>
    </div>
  );
}
