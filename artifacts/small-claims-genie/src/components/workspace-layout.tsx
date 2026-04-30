import {
  LogOut,
  BookOpen,
  FolderOpen,
  MessageSquare,
  Mail,
  FilePlus2,
  Gavel,
  CalendarDays,
} from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";

export const WORKSPACE_TABS = [
  { value: "intake",        label: "Tell Your\nStory",      icon: BookOpen  },
  { value: "documents",     label: "Upload\nMy Evidence",   icon: FolderOpen },
  { value: "chat",          label: "Ask\nGenie AI",         icon: MessageSquare },
  { value: "demand-letter", label: "Send a\nDemand",        icon: Mail },
  { value: "forms",         label: "Create Court\nForms",   icon: FilePlus2 },
  { value: "prep",          label: "Prep for\nHearing",     icon: Gavel },
  { value: "deadlines",     label: "Deadlines",             icon: CalendarDays },
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

          {/* Logo */}
          <a
            href="/"
            onClick={(e) => { e.stopPropagation(); window.location.href = '/'; }}
            className="flex items-center shrink-0 ml-6 md:ml-10 mr-2 md:mr-3 relative z-50 cursor-pointer"
            title="Small Claims Genie"
          >
            <img
              src={logoPath}
              alt="Small Claims Genie"
              className="h-[54px] md:h-[68px] w-auto pointer-events-none"
            />
          </a>

          {/* Nav buttons */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-center gap-1 md:gap-2 min-w-max md:min-w-0 py-1 px-2">

              {/* Exit Case */}
              <a
                href="/dashboard"
                title="Exit case and return to dashboard"
                className="flex flex-col items-center justify-center gap-1 px-2 md:px-4 py-2 rounded-lg text-[10px] md:text-[11px] font-semibold leading-tight min-w-[60px] md:min-w-[80px] transition-all text-gray-500 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-[17px] w-[17px] md:h-5 md:w-5 shrink-0" />
                <span className="whitespace-nowrap">Exit Case</span>
              </a>

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
                  <span className="text-center whitespace-pre-line leading-[1.2]">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User avatar */}
          <div className="flex items-center shrink-0 pr-4 md:pr-6">
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
          © {new Date().getFullYear()} Small Claims Genie. Not a law firm. Not legal advice.
        </p>
      </footer>

    </div>
  );
}
