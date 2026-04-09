import { Link } from "wouter";
import {
  LogOut,
  LayoutDashboard,
  ClipboardList,
  FileText,
  MessageSquare,
  Mail,
  Scale,
  Gavel,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";

export const WORKSPACE_TABS = [
  { value: "intake",        label: "Intake",            icon: ClipboardList },
  { value: "documents",     label: "Docs",              icon: FileText },
  { value: "chat",          label: "Ask Genie AI",      icon: MessageSquare },
  { value: "demand-letter", label: "Demand Letter",     icon: Mail },
  { value: "forms",         label: "Court Forms",       icon: Scale },
  { value: "prep",          label: "Prep for\nHearing", icon: Gavel },
  { value: "deadlines",     label: "Deadlines",         icon: CalendarDays },
] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number]["value"];

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (t: string) => void;
}

export function WorkspaceLayout({ children, activeTab, setActiveTab }: WorkspaceLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">

      {/* ── Workspace nav header ── */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-[70px] md:h-[84px]">

          {/* Logo — larger, pushed ~1 inch right */}
          <Link
            href="/dashboard"
            className="flex items-center shrink-0 ml-6 md:ml-10 mr-2 md:mr-3"
            title="Small Claims Genie"
          >
            <img
              src={logoPath}
              alt="Small Claims Genie"
              className="h-[54px] md:h-[68px] w-auto"
            />
          </Link>

          {/* All nav buttons in one equidistant row: Exit Case + 7 tabs */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-center gap-1 md:gap-2 min-w-max md:min-w-0 py-1 px-2">

              {/* Exit Case */}
              <Link
                href="/dashboard"
                title="Exit case and return to dashboard"
                className="flex flex-col items-center justify-center gap-1 px-2 md:px-4 py-2 rounded-lg text-[10px] md:text-[11px] font-semibold leading-tight min-w-[60px] md:min-w-[80px] transition-all text-gray-500 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-[17px] w-[17px] md:h-5 md:w-5 shrink-0" />
                <span className="whitespace-nowrap">Exit Case</span>
              </Link>

              {/* My Cases */}
              <Link
                href="/dashboard"
                title="View all your cases"
                className="flex flex-col items-center justify-center gap-1 px-2 md:px-4 py-2 rounded-lg text-[10px] md:text-[11px] font-semibold leading-tight min-w-[60px] md:min-w-[80px] transition-all text-gray-500 hover:bg-blue-50 hover:text-blue-600"
              >
                <LayoutDashboard className="h-[17px] w-[17px] md:h-5 md:w-5 shrink-0" />
                <span className="whitespace-nowrap">My Cases</span>
              </Link>

              {/* 7 workspace tabs */}
              {WORKSPACE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={[
                    "flex flex-col items-center justify-center gap-1",
                    "px-2 md:px-4 py-2 rounded-lg",
                    "text-[10px] md:text-[11px] font-semibold leading-tight",
                    "min-w-[60px] md:min-w-[80px] transition-all",
                    activeTab === tab.value
                      ? "bg-[#1e293b] text-white shadow-md"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
                  ].join(" ")}
                >
                  <tab.icon className="h-[17px] w-[17px] md:h-5 md:w-5 shrink-0" />
                  {tab.value === "prep" ? (
                    <span className="text-center whitespace-pre-line leading-none">
                      {"Prep for\nHearing"}
                    </span>
                  ) : (
                    <span className="text-center">{tab.label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Ask Genie + user avatar — far right */}
          <div className="flex items-center gap-2 shrink-0 pr-4 md:pr-6">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-help-genie"))}
              className="hidden sm:flex items-center gap-1 h-7 md:h-8 px-2.5 md:px-3 rounded-full border border-[#14b8a6] text-[#0d6b5e] bg-[#f0fffe] hover:bg-[#ddf6f3] font-semibold text-[10px] md:text-xs transition-colors"
              title="Quick Help"
            >
              <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
              <span>Quick Help</span>
            </button>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>

        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex flex-col bg-white">
        {children}
      </main>
    </div>
  );
}
