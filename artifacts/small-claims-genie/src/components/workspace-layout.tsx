import { Link } from "wouter";
import {
  X,
  ClipboardList,
  FileText,
  MessageSquare,
  Mail,
  Scale,
  Gavel,
  CalendarDays,
} from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";

export const WORKSPACE_TABS = [
  { value: "intake",        label: "Intake",         icon: ClipboardList },
  { value: "documents",     label: "Docs",            icon: FileText },
  { value: "chat",          label: "Ask Genie AI",    icon: MessageSquare },
  { value: "demand-letter", label: "Demand Letter",   icon: Mail },
  { value: "forms",         label: "Court Forms",     icon: Scale },
  { value: "prep",          label: "Prep for\nHearing", icon: Gavel },
  { value: "deadlines",     label: "Deadlines",       icon: CalendarDays },
] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number]["value"];

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (t: string) => void;
}

export function WorkspaceLayout({ children, activeTab, setActiveTab }: WorkspaceLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-100">

      {/* ── Workspace nav header ── */}
      <header className="sticky top-0 z-40 w-full bg-gray-100 border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 h-[70px] md:h-[88px]">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <img
              src={logoPath}
              alt="Small Claims Genie"
              className="h-[50px] md:h-[68px] w-auto"
            />
          </Link>

          {/* Tabs — scrolls horizontally on small screens */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-0.5 min-w-max md:min-w-0 md:justify-center py-1">
              {WORKSPACE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={[
                    "flex flex-col items-center justify-center gap-0.5",
                    "px-2.5 md:px-3.5 py-2 rounded-lg",
                    "text-[10px] md:text-[11px] font-semibold leading-tight",
                    "min-w-[58px] md:min-w-[78px] transition-all",
                    activeTab === tab.value
                      ? "bg-[#1e293b] text-white shadow-md"
                      : "text-gray-500 hover:bg-gray-200 hover:text-gray-800",
                  ].join(" ")}
                >
                  <tab.icon className="h-[17px] w-[17px] md:h-5 md:w-5 shrink-0 mb-0.5" />
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

          {/* Right: user avatar + X close */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <UserButton afterSignOutUrl="/sign-in" />
            <Link
              href="/dashboard"
              title="Back to your cases"
              className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
