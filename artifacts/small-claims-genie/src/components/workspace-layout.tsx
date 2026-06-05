import { Fragment } from "react";
import { ContactDialog } from "@/components/contact-dialog";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";
import { WORKSPACE_STEPS } from "@/lib/workspace-steps";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  currentOuterStep: number;   // 1–8
  completedSteps?: Set<number>;
  setActiveTab: (t: string) => void;
  onStepClick: (stepN: number) => void;
  onTouchStart?: React.TouchEventHandler<HTMLElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLElement>;
}

export function WorkspaceLayout({
  children,
  activeTab,
  currentOuterStep,
  completedSteps,
  setActiveTab: _setActiveTab,
  onStepClick,
  onTouchStart,
  onTouchEnd,
}: WorkspaceLayoutProps) {
  return (
    <div className={`flex flex-col bg-white overflow-x-hidden ${activeTab === 'chat' ? 'h-[100dvh] overflow-y-hidden' : 'min-h-[100dvh]'}`}>

      {/* ── Workspace nav header ── */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-[92px] px-3 md:px-4 gap-2 md:gap-3">

          {/* Logo */}
          <a
            href="/"
            onClick={(e) => { e.stopPropagation(); window.location.href = '/'; }}
            className="flex items-center shrink-0 cursor-pointer"
            title="Exit to home"
          >
            <img
              src={logoPath}
              alt="Small Claims Genie"
              className="h-[58px] md:h-[68px] w-auto pointer-events-none"
            />
          </a>

          {/* Exit button — darker text so it's legible */}
          <a
            href="https://smallclaimsgenie.com/"
            onClick={(e) => { e.stopPropagation(); window.location.href = 'https://smallclaimsgenie.com/'; }}
            title="Exit case and return to home"
            className="shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="h-5 w-5 md:h-[22px] md:w-[22px]" />
            <span className="text-[11px] md:text-xs font-bold leading-none">Exit</span>
          </a>

          {/* ── Mobile step indicator (hidden on sm+) ── */}
          <div className="flex-1 min-w-0 sm:hidden flex items-center justify-center gap-1">
            <button
              onClick={() => currentOuterStep > 1 && onStepClick(currentOuterStep - 1)}
              disabled={currentOuterStep <= 1}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#0d6b5e] disabled:text-gray-300 hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Previous step"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <div className="flex flex-col items-center min-w-0 px-1">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-8 h-8 rounded-full bg-[#14b8a6] text-white text-sm font-black flex items-center justify-center shrink-0">
                  {currentOuterStep}
                </span>
                <span className="text-sm text-gray-700 font-semibold">of 8</span>
              </div>
              <p className="text-[12px] font-bold text-gray-800 leading-tight text-center mt-0.5 truncate max-w-[120px]">
                {WORKSPACE_STEPS[currentOuterStep - 1]?.label.replace('\n', ' ')}
              </p>
            </div>
            <button
              onClick={() => currentOuterStep < 8 && onStepClick(currentOuterStep + 1)}
              disabled={currentOuterStep >= 8}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#0d6b5e] disabled:text-gray-300 hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Next step"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>

          {/* ── Full numbered stepper (desktop only, hidden on mobile) ── */}
          <div className="hidden sm:block flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {/* min-w-max always prevents Firefox from collapsing below content size */}
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl p-1 min-w-max">
              {WORKSPACE_STEPS.map((step, idx) => {
                const isActive = step.n === currentOuterStep;
                const isDone = completedSteps
                  ? completedSteps.has(step.n)
                  : step.n < currentOuterStep;
                const Icon = step.icon;

                return (
                  <Fragment key={step.n}>
                    {/* Dash separator */}
                    {idx > 0 && (
                      <span className={`text-xs font-bold mx-px shrink-0 select-none ${isDone ? "text-[#14b8a6]" : "text-gray-300"}`}>
                        –
                      </span>
                    )}

                    {/* Step button — fixed shrink-0 width so Firefox matches Chrome */}
                    <button
                      onClick={() => onStepClick(step.n)}
                      className={[
                        "flex items-center gap-1 shrink-0 px-1.5 py-2 rounded-lg transition-all text-left border-2",
                        isActive
                          ? "bg-[#14b8a6] text-white border-black shadow-md"
                          : isDone
                          ? "border-transparent text-[#0d6b5e] hover:bg-white/60"
                          : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-white/60",
                      ].join(" ")}
                    >
                      {/* Circle — uniform w-8 h-8 across all states */}
                      <span
                        className={[
                          "inline-flex items-center justify-center rounded-full text-xs font-bold shrink-0",
                          isActive
                            ? "w-8 h-8 bg-white text-[#14b8a6]"
                            : isDone
                            ? "w-8 h-8 bg-[#14b8a6] text-white"
                            : "w-8 h-8 bg-gray-200 text-gray-600",
                        ].join(" ")}
                      >
                        {step.n}
                      </span>

                      {/* Label */}
                      <div className="flex flex-col items-start w-[50px] md:w-[54px]">
                        {Icon && <Icon className={`h-3 w-3 mb-0.5 shrink-0 ${isActive ? "text-white/80" : "text-gray-400"}`} />}
                        <span className="text-[10px] md:text-[11px] font-semibold leading-tight whitespace-pre-line w-full">
                          {step.label}
                        </span>
                      </div>
                    </button>
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* User avatar */}
          <div className="flex items-center shrink-0">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>

        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 min-h-0 flex flex-col bg-white" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {children}
      </main>

      {/* Sitewide disclaimer — hidden on chat tab so the sticky action bar sits flush at the viewport bottom */}
      {activeTab !== 'chat' && (
        <footer className="border-t border-gray-100 py-2.5 bg-white">
          <div className="flex items-center justify-center gap-3">
            <p className="text-[11px] text-gray-400">
              © {new Date().getFullYear()} Small Claims Genie. AI-powered legal guidance.
            </p>
            <span className="text-gray-300 text-[11px]">·</span>
            <ContactDialog triggerClassName="text-[11px] text-gray-400 hover:text-[#0d6b5e] underline underline-offset-2 transition-colors" />
          </div>
        </footer>
      )}

    </div>
  );
}
