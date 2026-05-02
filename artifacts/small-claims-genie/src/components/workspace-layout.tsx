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

          {/* Exit button — visible with icon + label */}
          <a
            href="https://smallclaimsgenie.com/"
            onClick={(e) => { e.stopPropagation(); window.location.href = 'https://smallclaimsgenie.com/'; }}
            title="Exit case and return to home"
            className="shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="h-4 w-4 md:h-[18px] md:w-[18px]" />
            <span className="text-[10px] md:text-[11px] font-semibold leading-none">Exit</span>
          </a>

          {/* ── Numbered stepper ── */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl p-1.5 min-w-max md:min-w-0">
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
                      <span className={`text-xs font-bold mx-0.5 md:mx-1 shrink-0 select-none ${isDone ? "text-[#14b8a6]" : "text-gray-300"}`}>
                        —
                      </span>
                    )}

                    {/* Step button */}
                    <button
                      onClick={() => onStepClick(step.n)}
                      className={[
                        "flex items-center gap-2 flex-1 min-w-0 px-2 md:px-3 rounded-lg transition-all text-left",
                        isActive
                          ? "bg-[#14b8a6] text-white border-2 border-black shadow-md py-2.5"
                          : isDone
                          ? "text-[#0d6b5e] hover:bg-white/60 py-2"
                          : "text-gray-500 hover:text-gray-700 hover:bg-white/60 py-2",
                      ].join(" ")}
                    >
                      {/* Circle */}
                      <span
                        className={[
                          "inline-flex items-center justify-center rounded-full font-bold shrink-0 transition-all",
                          isActive
                            ? "w-8 h-8 md:w-9 md:h-9 bg-white text-[#14b8a6] text-sm md:text-base"
                            : isDone
                            ? "w-7 h-7 md:w-8 md:h-8 bg-[#14b8a6] text-white text-xs md:text-sm"
                            : "w-7 h-7 md:w-8 md:h-8 bg-gray-200 text-gray-500 text-xs md:text-sm",
                        ].join(" ")}
                      >
                        {step.n}
                      </span>

                      {/* Label */}
                      <div className="hidden sm:flex flex-col items-start min-w-0">
                        {Icon && <Icon className={`h-3 w-3 mb-0.5 ${isActive ? "text-white/80" : "text-gray-400"}`} />}
                        <span
                          className={[
                            "text-[11px] md:text-xs leading-snug whitespace-pre-line font-semibold",
                            isActive ? "font-bold" : "",
                          ].join(" ")}
                        >
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
