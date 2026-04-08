import { Link } from "wouter";
import {
  LogOut,
  Home,
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
    <div className="min-h-[100dvh] flex flex-col bg-white">

      {/* ── Workspace nav header ── */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center px-3 md:px-4 h-[70px] md:h-[84px]">

          {/* Left: logo mark + Home tab — mirrors right side exactly */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0 w-[120px] md:w-[180px]">
            <Link href="/" className="flex items-center shrink-0" title="Small Claims Genie home">
              <img
                src={logoPath}
                alt="Small Claims Genie"
                className="h-8 w-auto md:h-9"
              />
            </Link>
            <Link
              href="/"
              title="Go to Home"
              className="flex flex-col items-center justify-center gap-1 px-2 md:px-3 py-2 rounded-lg text-[10px] md:text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all min-w-[48px]"
            >
              <Home className="h-[17px] w-[17px] md:h-5 md:w-5 shrink-0" />
              <span>Home</span>
            </Link>
          </div>

          {/* Tabs — centered, scrollable on mobile */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-center gap-1 md:gap-2 min-w-max md:min-w-0 mx-auto py-1 px-2">
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

          {/* Right: Exit Case tab + user avatar — mirrors left side */}
          <div className="flex items-center justify-end gap-1 md:gap-2 shrink-0 w-[120px] md:w-[180px]">
            <Link
              href="/dashboard"
              title="Exit case and return to dashboard"
              className="flex flex-col items-center justify-center gap-1 px-2 md:px-3 py-2 rounded-lg text-[10px] md:text-[11px] font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all min-w-[48px]"
            >
              <LogOut className="h-[17px] w-[17px] md:h-5 md:w-5 shrink-0" />
              <span className="whitespace-nowrap">Exit Case</span>
            </Link>
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
