const STEPS = [
  { n: 1, label: "Enter\nParties" },
  { n: 2, label: "Make Your\nClaim" },
  { n: 3, label: "Upload\nEvidence" },
  { n: 4, label: "Send\nDemand" },
  { n: 5, label: "Review\nCase" },
  { n: 6, label: "Court\nForms" },
  { n: 7, label: "Prep\nHearing" },
  { n: 8, label: "Deadlines" },
];

const ACTIVE = 2;

export function VariantB() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm w-full">
        <div className="flex items-center h-[72px] px-6">

          {/* Step track — full width */}
          <div className="flex items-center w-full justify-between relative">
            {/* Background line */}
            <div className="absolute top-[18px] left-0 right-0 h-[2px] bg-gray-200 z-0" />
            {/* Progress line */}
            <div
              className="absolute top-[18px] left-0 h-[2px] bg-[#0d9488] z-0 transition-all"
              style={{ width: `${((ACTIVE - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((step) => {
              const isActive = step.n === ACTIVE;
              const isDone = step.n < ACTIVE;
              return (
                <div key={step.n} className="flex flex-col items-center z-10 relative">
                  {/* Circle */}
                  <div
                    className={[
                      "flex items-center justify-center rounded-full font-black text-[11px] w-9 h-9 border-2 transition-all",
                      isActive
                        ? "bg-[#0d4f3c] border-[#0d4f3c] text-white shadow-lg scale-110"
                        : isDone
                        ? "bg-[#0d9488] border-[#0d9488] text-white"
                        : "bg-white border-gray-300 text-gray-400",
                    ].join(" ")}
                  >
                    {isDone ? "✓" : step.n}
                  </div>
                  {/* Label */}
                  <span
                    className={[
                      "mt-1 text-[9px] font-semibold leading-tight text-center whitespace-pre-line",
                      isActive ? "text-[#0d4f3c]" : isDone ? "text-[#0d9488]" : "text-gray-400",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
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
