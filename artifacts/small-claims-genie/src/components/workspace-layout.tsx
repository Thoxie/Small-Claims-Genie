import { Fragment } from "react";
import { LogOut, CalendarDays } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";

export const WORKSPACE_STEPS = [
  { n: 1, label: "Enter The\nParties",  tab: "intake",        icon: null        },
  { n: 2, label: "Make Your\nClaim",    tab: "intake",        icon: null        },
  { n: 3, label: "Upload My\nEvidence", tab: "documents",     icon: null        },
  { n: 4, label: "Send Demand\nLetter", tab: "demand-letter", icon: null        },
  { n: 5, label: "Review\nYour Case",   tab: "chat",          icon: null        },
  { n: 6, label: "Create Court\nForms", tab: "forms",         icon: null        },
  { n: 7, label: "Prep for\nHearing",   tab: "prep",          icon: null        },
  { n: 8, label: "Deadlines",           tab: "deadlines",     icon: CalendarDays },
] as const;

// Kept for any legacy reference; real nav now uses WORKSPACE_STEPS
export const WORKSPACE_TABS = WORKSPACE_STEPS.map((s) => ({
  value: s.tab,
  label: s.label,
}));

export type WorkspaceTab = (typeof WORKSPACE_STEPS)[number]["tab"];

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  currentOuterStep: number;   // 1–8
  completedSteps?: Set<number>;
  setActiveTab: (t: string) => void;
  onStepClick: (stepN: number) => void;
}

export function WorkspaceLayout({
  children,
  activeTab: _activeTab,
  currentOuterStep,
  completedSteps,
  setActiveTab: _setActiveTab,
  onStepClick,
}: WorkspaceLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">

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

          {/* ── Numbered stepper ── */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {/* min-w-max always prevents Firefox from collapsing below content size */}
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl p-2 min-w-max">
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
                      <span className={`text-sm font-bold mx-0.5 md:mx-1 shrink-0 select-none ${isDone ? "text-[#14b8a6]" : "text-gray-300"}`}>
                        —
                      </span>
                    )}

                    {/* Step button — fixed shrink-0 width so Firefox matches Chrome */}
                    <button
                      onClick={() => onStepClick(step.n)}
                      className={[
                        "flex items-center gap-1.5 shrink-0 px-2 md:px-2.5 py-2.5 rounded-lg transition-all text-left border-2",
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

                      {/* Label — no break-words; whitespace-pre-line only for \n splits */}
                      <div className="hidden sm:flex flex-col items-start w-[56px] md:w-[62px]">
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
      <main className="flex-1 flex flex-col bg-white">
        {children}
      </main>

      {/* Sitewide disclaimer */}
      <footer className="border-t border-gray-100 py-2.5 bg-white">
        <p className="text-center text-[11px] text-gray-400">
          © {new Date().getFullYear()} Small Claims Genie. AI-powered legal guidance.
        </p>
      </footer>

    </div>
  );
}
