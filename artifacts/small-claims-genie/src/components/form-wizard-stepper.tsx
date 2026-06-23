export interface WizardStep {
  id: string;
  number: string;
  shortLabel: string;
  status: "required" | "optional" | "skipped";
}

export function FormWizardStepper({
  steps,
  currentIndex,
  onStepClick,
  stepLabel = "Step",
}: {
  steps: WizardStep[];
  currentIndex: number;
  onStepClick: (index: number) => void;
  stepLabel?: string;
}) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">
          {stepLabel} {currentIndex + 1} of {steps.length}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-3">
        {steps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => onStepClick(i)}
            className="flex flex-col items-center gap-1.5 group flex-1 min-w-0"
            title={step.number}
          >
            <div className={`w-4 h-4 rounded-full transition-all shrink-0 ${
              step.status === "required" ? "bg-primary" : "bg-amber-400"
            } ${i === currentIndex ? "ring-2 ring-offset-2 ring-primary/50 scale-125" : ""}`} />
            <span className={`text-[11px] font-bold leading-none ${i === currentIndex ? "text-foreground" : "text-muted-foreground/60"}`}>
              {i + 1}. {step.number}
            </span>
            <span className={`text-[11px] leading-tight text-center px-0.5 max-w-[72px] break-words ${i === currentIndex ? "text-foreground/70 font-bold" : "text-muted-foreground/40"}`}>
              {step.shortLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
