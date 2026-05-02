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
        <div className="flex items-center h-[82px] px-3 md:px-5 gap-2">

          {/* Logo + Exit */}
          <div className="flex items-center gap-1 shrink-0">
            <a
              href="/"
              onClick={(e) => { e.stopPropagation(); window.location.href = '/'; }}
              className="flex items-center cursor-pointer"
              title="Exit to home"
            >
              <img
                src={logoPath}
                alt="Small Claims Genie"
                className="h-[56px] md:h-[66px] w-auto pointer-events-none"
              />
            </a>
            {/* Small exit button */}
            <a
              href="https://smallclaimsgenie.com/"
              onClick={(e) => { e.stopPropagation(); window.location.href = 'https://smallclaimsgenie.com/'; }}
              title="Exit case"
              className="hidden md:flex flex-col items-center text-[9px] font-semibold text-gray-400 hover:text-red-500 transition-colors ml-1 gap-0.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
            </a>
          </div>

          {/* ── Numbered stepper ── */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-center justify-center">
            <div className="flex items-center">
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
                      <span className={`text-sm font-bold mx-1 md:mx-1.5 shrink-0 ${isDone ? "text-[#14b8a6]" : "text-gray-300"}`}>
                        —
                      </span>
                    )}

                    {/* Step button */}
                    <button
                      onClick={() => onStepClick(step.n)}
                      className={[
                        "flex items-center gap-1.5 px-1.5 md:px-2.5 py-1.5 rounded-xl transition-all shrink-0",
                        isActive
                          ? "border-2 border-[#0d4f3c] bg-white shadow-sm"
                          : "border-2 border-transparent hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {/* Circle */}
                      <div
                        className={[
                          "flex items-center justify-center rounded-full font-black text-[11px] shrink-0",
                          isActive
                            ? "w-7 h-7 bg-[#0d9488] text-white"
                            : isDone
                            ? "w-6 h-6 bg-[#14b8a6] text-white"
                            : "w-6 h-6 border-2 border-gray-300 text-gray-400 bg-white",
                        ].join(" ")}
                      >
                        {isDone ? "✓" : step.n}
                      </div>

                      {/* Label */}
                      <div className="hidden sm:flex flex-col items-start">
                        {Icon && <Icon className="h-2.5 w-2.5 text-gray-400 mb-0.5" />}
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
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* User avatar */}
          <div className="flex items-center shrink-0 pl-1 md:pl-2">
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
