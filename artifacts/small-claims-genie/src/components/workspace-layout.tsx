import { useState } from "react";
import { Link, useLocation } from "wouter";
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
  X,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { useListCases } from "@workspace/api-client-react";
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
  const [panelOpen, setPanelOpen] = useState(false);
  const { data: cases } = useListCases();
  const [location] = useLocation();

  const currentCaseId = location.match(/^\/cases\/(\d+)/)?.[1];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">

      {/* ── Workspace nav header ── */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-[70px] md:h-[84px]">

          {/* Logo */}
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

          {/* Nav buttons */}
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

              {/* My Cases — opens slide-in panel, never navigates away */}
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                title="View all your cases"
                className="flex flex-col items-center justify-center gap-1 px-2 md:px-4 py-2 rounded-lg text-[10px] md:text-[11px] font-semibold leading-tight min-w-[60px] md:min-w-[80px] transition-all text-gray-500 hover:bg-blue-50 hover:text-blue-600"
              >
                <LayoutDashboard className="h-[17px] w-[17px] md:h-5 md:w-5 shrink-0" />
                <span className="whitespace-nowrap">My Cases</span>
              </button>

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

      {/* ── My Cases slide-in panel ── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={() => setPanelOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-0 left-0 z-50 h-full w-[320px] bg-white shadow-2xl flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-base">My Cases</h2>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Case list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {!cases || cases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No cases yet.</p>
              ) : (
                cases.map((c: any) => {
                  const isActive = String(c.id) === currentCaseId;
                  return (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      onClick={() => setPanelOpen(false)}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all cursor-pointer ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {c.caseTitle || c.caseName || `Case #${c.id}`}
                        </p>
                        {c.defendantName && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">vs. {c.defendantName}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  );
                })
              )}
            </div>

            {/* New case link */}
            <div className="px-4 py-4 border-t">
              <Link
                href="/cases/new"
                onClick={() => setPanelOpen(false)}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                + Start a New Case
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
