import { useState, type ElementType } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useGetCase } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ExternalLink,
  CheckCircle, MapPin, Camera, MessageSquare,
  FileCheck2, Shield, RefreshCw, Gavel, Clock,
  CalendarDays, UserCheck2, TrendingUp, Hourglass,
  Download, Loader2,
  Landmark, User, Building2, DollarSign, UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ExtendedCase } from "@/lib/types";
import { DeadlineCalculatorTab } from "@/pages/cases/tabs/deadline-calculator-tab";
import { WorkspaceLayout } from "@/components/workspace-layout";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCounty(id: string | undefined | null): string {
  if (!id) return "";
  return id.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " County";
}

function formatCourthouse(id: string | undefined | null): string {
  if (!id) return "";
  return id.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function buildAddress(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string | null {
  const cityStateZip = [city, state].filter(Boolean).join(", ");
  const parts = [street, cityStateZip, zip].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-[15px] text-foreground leading-snug">{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#0d6b5e] border-b border-[#0d6b5e]/20 pb-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── Court forms download section (all forms) ─────────────────────────────────

type GeneratedForm = {
  id: string; number: string; name: string; desc: string;
  notReadyMsg: string; type: "generated"; ready: boolean;
  onDownload: () => void;
};
type BlankForm = {
  id: string; number: string; name: string; desc: string;
  type: "blank"; blankUrl: string;
};
type FormEntry = GeneratedForm | BlankForm;

function CourtFormsSection({
  c,
  caseId,
  getToken,
}: {
  c: ExtendedCase | undefined;
  caseId: number;
  getToken: () => Promise<string | null>;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  const downloadForm = async (
    endpoint: string,
    options: { method?: "GET" | "POST"; body?: Record<string, unknown> } = {},
    stateId?: string,
  ) => {
    const { method = "POST", body = {} } = options;
    setDownloading(stateId ?? endpoint);
    const win = window.open("", "_blank");
    try {
      const token = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!tokenRes.ok) {
        win?.close();
        toast({ title: "Could not authorize download", description: "Please try again.", variant: "destructive" });
        return;
      }
      const { token: dlToken } = await tokenRes.json() as { token: string };
      let res: Response;
      if (method === "GET") {
        res = await fetch(`/api/cases/${caseId}/forms/${endpoint}?token=${encodeURIComponent(dlToken)}`);
      } else {
        res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, token: dlToken }),
        });
      }
      if (!res.ok) {
        win?.close();
        toast({ title: "Failed to generate PDF", description: "Please try again.", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
    } catch {
      win?.close();
      toast({ title: "Download failed", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const hasBasicInfo = !!c?.plaintiffName && !!c?.defendantName;
  const hasMC030 = !!c?.mc030DeclarationTitle;
  const isBusinessCase = c?.plaintiffIsBusiness === true;
  const showSC103 = isBusinessCase;
  const showSC103B = !!(c?.hasAdditionalPlaintiff && c?.additionalPlaintiffIsFictitious);
  const showSC100A = !!c?.hasAdditionalPlaintiff;

  const allForms: (FormEntry & { show: boolean })[] = [
    {
      id: "sc100", number: "SC-100", name: "Plaintiff's Claim and Order",
      desc: "Main filing form — pre-filled from your case details.",
      notReadyMsg: "Complete Step 1 (parties info) to enable",
      type: "generated", ready: hasBasicInfo, show: true,
      onDownload: () => downloadForm("sc100", { method: "GET" }),
    },
    {
      id: "mc030", number: "MC-030", name: "Declaration",
      desc: "AI-drafted sworn statement — ready to download.",
      notReadyMsg: "Generate AI Declaration in Step 6 first",
      type: "generated", ready: hasMC030, show: true,
      onDownload: () => downloadForm("mc030", {
        body: { declarationTitle: c?.mc030DeclarationTitle ?? "", declarationText: c?.mc030DeclarationText ?? "" },
      }),
    },
    {
      id: "sc103", number: "SC-103", name: "Fictitious Business Name",
      desc: "Pre-filled with your DBA business info from intake.",
      notReadyMsg: "Complete Step 1 (parties info) to enable",
      type: "generated", ready: hasBasicInfo, show: showSC103,
      onDownload: () => downloadForm("sc103", {}),
    },
    {
      id: "sc103b", number: "SC-103", name: "Fictitious Business Name — Plaintiff 2",
      desc: "Pre-filled for the additional plaintiff's DBA.",
      notReadyMsg: "Complete Step 1 (parties info) to enable",
      type: "generated", ready: hasBasicInfo, show: showSC103B,
      onDownload: () => downloadForm("sc103-secondary", {}, "sc103b"),
    },
    {
      id: "sc112a", number: "SC-112A", name: "Proof of Service by Mail",
      desc: "Case info pre-filled — mailer completes their details after mailing.",
      notReadyMsg: "Complete Step 1 (parties info) to enable",
      type: "generated", ready: hasBasicInfo, show: true,
      onDownload: () => downloadForm("sc112a", {
        body: {
          partiesServed: [
            { name: c?.defendantName ?? "", address: [c?.defendantAddress, c?.defendantCity].filter(Boolean).join(", ") },
          ],
        },
      }),
    },
    {
      id: "sc100a", number: "SC-100A", name: "Other Plaintiffs or Defendants",
      desc: "Pre-filled with additional party info from intake.",
      notReadyMsg: "Complete Step 1 (parties info) to enable",
      type: "generated", ready: hasBasicInfo, show: showSC100A,
      onDownload: () => downloadForm("sc100a", {}),
    },
    {
      id: "fw001", number: "FW-001", name: "Request to Waive Court Fees",
      desc: "Pre-filled with your name, address, and court info from intake.",
      notReadyMsg: "Complete Step 1 (parties info) to enable",
      type: "generated", ready: hasBasicInfo, show: true,
      onDownload: () => downloadForm("fw001", {}),
    },
  ];

  const forms = allForms.filter((f) => f.show) as FormEntry[];

  const prefillReady = forms.filter((f) => f.type === "generated" && (f as GeneratedForm).ready).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">Court Forms</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {prefillReady} of {forms.length} ready to download
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {forms.map((form) => {
          const isGenerated = form.type === "generated";
          const gForm = isGenerated ? (form as GeneratedForm) : null;
          const bForm = !isGenerated ? (form as BlankForm) : null;
          const ready = isGenerated ? gForm!.ready : true;
          const isDownloading = downloading === form.id;

          return (
            <div
              key={form.id}
              className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${isGenerated && !ready ? " opacity-60" : ""}`}
            >
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isGenerated ? "bg-[#0d6b5e]/10" : "bg-gray-50"}`}>
                  <FileCheck2 className={`h-4 w-4 ${isGenerated ? "text-[#0d6b5e]" : "text-gray-400"}`} />
                </div>
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded leading-none ${isGenerated ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"}`}>
                  {form.number}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-foreground truncate">{form.name}</p>
                  {isGenerated && (
                    <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
                      AI Pre-filled
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                  {isGenerated && !ready ? gForm!.notReadyMsg : form.desc}
                </p>
              </div>
              {isGenerated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 shrink-0 gap-1.5 text-xs${ready ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
                  onClick={gForm!.onDownload}
                  disabled={!ready || isDownloading}
                  title={ready ? `Download ${form.number}` : gForm!.notReadyMsg}
                >
                  {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  {isDownloading ? "Generating…" : "Download"}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => window.open(bForm!.blankUrl, "_blank", "noopener,noreferrer")}
                  title={`Open blank ${form.number}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Get Blank
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Case info (AI E-Filing System tab body) ──────────────────────────────────

function CaseInfoPanel({
  c,
  caseId,
  getToken,
}: {
  c: ExtendedCase | undefined;
  caseId: number;
  getToken: () => Promise<string | null>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* LEFT — Case info */}
      <div className="rounded-xl border bg-card p-5 space-y-6">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="h-7 w-7 rounded-md bg-[#0d6b5e]/10 flex items-center justify-center shrink-0">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground leading-tight">Filing Summary</h2>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Your case details for court</p>
          </div>
        </div>

        <Section title="Court" icon={Landmark}>
          <InfoRow label="Court Name" value={c?.courthouseName ?? formatCourthouse(c?.courthouseId)} />
          <InfoRow
            label="Address"
            value={
              c?.courthouseAddress
                ? `${c.courthouseAddress}, ${c.courthouseCity ?? ""}, CA ${c.courthouseZip ?? ""}`.replace(/, CA $/, ", CA").trim()
                : null
            }
          />
          <InfoRow label="Phone" value={c?.courthousePhone} />
          <InfoRow label="County" value={formatCounty(c?.countyId)} />
        </Section>

        <Section title="Plaintiff (You)" icon={User}>
          {c?.plaintiffIsBusiness ? (
            <>
              <InfoRow label="Business Name" value={c.plaintiffName} />
              <InfoRow label="Individual Name" value={c.secondPlaintiffName} />
              <InfoRow label="Title / Position" value={c.plaintiffTitle} />
            </>
          ) : (
            <InfoRow label="Full Name" value={c?.plaintiffName} />
          )}
          <InfoRow label="Phone" value={c?.plaintiffPhone} />
          <InfoRow label="Email" value={c?.plaintiffEmail} />
          <InfoRow
            label="Address"
            value={buildAddress(c?.plaintiffAddress, c?.plaintiffCity, c?.plaintiffState, c?.plaintiffZip)}
          />
          {c?.plaintiffMailingAddress && (
            <InfoRow
              label="Mailing Address"
              value={buildAddress(
                c.plaintiffMailingAddress,
                c.plaintiffMailingCity,
                c.plaintiffMailingState,
                c.plaintiffMailingZip,
              )}
            />
          )}
          {c?.hasAdditionalPlaintiff && c.additionalPlaintiffName && (
            <InfoRow label="Additional Plaintiff" value={c.additionalPlaintiffName} />
          )}
        </Section>

        {c?.plaintiffIsFictitious && c?.plaintiffDbaName && (
          <Section title="DBA / Fictitious Business Name" icon={Building2}>
            <InfoRow label="Business Name (DBA)" value={c.plaintiffDbaName} />
            <InfoRow label="Business Type" value={c.plaintiffBusinessType} />
            <InfoRow label="FBN Number" value={c.plaintiffFbnNumber} />
            <InfoRow
              label="Address"
              value={buildAddress(c.plaintiffDbaAddress, c.plaintiffDbaCity, c.plaintiffDbaState, c.plaintiffDbaZip)}
            />
          </Section>
        )}

        <Section title="Defendant" icon={UserMinus}>
          <InfoRow label="Name" value={c?.defendantName} />
          {c?.defendantIsBusinessOrEntity && (
            <>
              <InfoRow label="Agent for Service" value={c.defendantAgentName} />
              <InfoRow label="Agent Title" value={c.defendantAgentTitle} />
              <InfoRow
                label="Agent Address"
                value={buildAddress(
                  c.defendantAgentStreet,
                  c.defendantAgentCity,
                  c.defendantAgentState,
                  c.defendantAgentZip,
                )}
              />
            </>
          )}
          <InfoRow label="Phone" value={c?.defendantPhone} />
          <InfoRow
            label="Address"
            value={buildAddress(c?.defendantAddress, c?.defendantCity, c?.defendantState, c?.defendantZip)}
          />
          {c?.defendantMailingAddress && (
            <InfoRow label="Mailing Address" value={c.defendantMailingAddress} />
          )}
        </Section>

        <Section title="Claim Details" icon={DollarSign}>
          <InfoRow label="Claim Type" value={c?.claimType} />
          <InfoRow
            label="Amount Requested"
            value={c?.claimAmount != null ? formatCurrency(c.claimAmount) : undefined}
          />
        </Section>
      </div>

      {/* RIGHT — Court Forms */}
      <div className="space-y-6">
        <CourtFormsSection c={c} caseId={caseId} getToken={getToken} />
      </div>
    </div>
  );
}

// ─── Tab content panels ───────────────────────────────────────────────────────

function EFilingPanel({
  c,
  caseId,
  getToken,
}: {
  c: ExtendedCase | undefined;
  caseId: number;
  getToken: () => Promise<string | null>;
}) {
  return <CaseInfoPanel c={c} caseId={caseId} getToken={getToken} />;
}

function ProcessServerPanel() {
  const features = [
    {
      icon: MapPin,
      title: "Live GPS tracking",
      desc: "Every attempt logged with coordinates and a timestamp. See on a map where and when your server tried.",
    },
    {
      icon: Camera,
      title: "Photo proof",
      desc: "Servers upload a photo from the door. You see what they saw — no more 'just trust me'.",
    },
    {
      icon: MessageSquare,
      title: "Chat with the server",
      desc: "Direct in-app messaging. Add context, share gate codes, or ask for an attempt at a different time.",
    },
    {
      icon: FileCheck2,
      title: "Notarized affidavit",
      desc: "Once served, the notarized affidavit is signed, scanned, and ready to file within 24 hours.",
    },
    {
      icon: Shield,
      title: "Licensed & bonded",
      desc: "Every server is licensed in their jurisdiction and bonded. We never use random gig workers.",
    },
    {
      icon: RefreshCw,
      title: "Multiple attempts included",
      desc: "Routine includes 3 attempts at different times of day. Rush includes 5. Same-day prioritizes a first attempt within 4 hours.",
    },
  ];

  const served = [
    "Summons and complaints",
    "Subpoenas",
    "Small claims petitions",
    "Restraining orders",
    "Motions and notices",
    "Proofs of service",
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="bg-gradient-to-br from-[#f0fffe] to-white px-6 py-8 text-center space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-amber-500 rounded-full px-3 py-1">
            Find a Licensed and Bonded Process Server
          </span>
          <h2 className="text-2xl font-bold text-foreground leading-tight">
            Serve any defendant. Watch every attempt.
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A licensed, bonded process server is dispatched within hours. GPS coordinates, photo proof,
            and a notarized affidavit at the end.
          </p>
          <div className="pt-2">
            <a
              href="https://e-file-system.replit.app/jobs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white font-semibold px-6 py-2.5 text-sm transition-colors"
            >
              Start a Serve
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4 rounded-xl border bg-card px-4 py-4">
            <div className="h-9 w-9 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px] text-[#0d6b5e]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* What gets served */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
          What Gets Served
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {served.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <CheckCircle className="h-4 w-4 text-[#0d6b5e] shrink-0" />
              <p className="text-sm text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CollectPanel() {
  const steps = [
    {
      icon: Gavel,
      title: "Obtain your judgment",
      desc: "After you win, the court enters a judgment in your favor. Get a certified copy from the clerk — you will need it for every enforcement step.",
    },
    {
      icon: TrendingUp,
      title: "Locate the defendant's assets",
      desc: "You can file a Judgment Debtor Examination (EJ-125) to compel the defendant to appear and disclose bank accounts, employer, and property. Courts schedule this hearing within 30–45 days.",
    },
    {
      icon: FileCheck2,
      title: "Wage garnishment",
      desc: "File a Writ of Execution (EJ-130) with the court clerk, then serve the defendant's employer with an Earnings Withholding Order (WG-002). Up to 25% of disposable earnings can be withheld each pay period.",
    },
    {
      icon: Shield,
      title: "Bank levy",
      desc: "Use the same Writ of Execution to direct the sheriff or marshal to levy the defendant's bank account. You must identify the bank and branch — information gathered during the debtor examination.",
    },
    {
      icon: Clock,
      title: "Your judgment earns interest",
      desc: "California judgments accrue interest at 10% per year from the date of entry. Keep track — every dollar of unpaid principal continues to grow until collected.",
    },
    {
      icon: RefreshCw,
      title: "Renew your judgment",
      desc: "Small claims judgments are valid for 10 years and can be renewed before they expire. File an Application for Renewal of Judgment (EJ-190) to keep your collection rights alive.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="bg-gradient-to-br from-amber-50 to-white px-6 py-8 text-center space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-amber-500 rounded-full px-3 py-1">
            After You Win Your Case
          </span>
          <h2 className="text-2xl font-bold text-foreground leading-tight">
            Winning is step one. Getting paid is the goal.
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A judgment in your favor is a powerful legal tool — but it does not automatically put money
            in your pocket. California gives you several enforcement methods to collect what you are owed.
            Here is how to use them.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {steps.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4 rounded-xl border bg-card px-4 py-4">
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-[18px] w-[18px] text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3">
        <Hourglass className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">Coming soon:</span> AI-guided judgment collection workflow — the Genie will walk you through each enforcement step based on what you know about the defendant's assets and employer.
        </p>
      </div>
    </div>
  );
}

// ─── Top nav ──────────────────────────────────────────────────────────────────

type NavTab = "efile" | "process_server" | "collect" | "deadlines";

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ElementType }[] = [
  { id: "efile",          label: "AI E-Filing System",                    icon: FileCheck2  },
  { id: "process_server", label: "AI Process Server Select",               icon: UserCheck2  },
  { id: "collect",        label: "Collect After You Have Won Your Case",   icon: Gavel       },
  { id: "deadlines",      label: "Case Deadlines",                         icon: CalendarDays },
];

// ─── Main page ────────────────────────────────────────────────────────────────

// Steps 1–7 map to workspace tab hashes; step 8 is this page itself
const EFILE_STEP_HASH: Record<number, string> = {
  1: "intake",
  2: "intake",
  3: "documents",
  4: "demand-letter",
  5: "chat",
  6: "forms",
  7: "prep",
};

export function EFileServePage({ caseIdParam }: { caseIdParam: string }) {
  const caseId = parseInt(caseIdParam, 10);
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>("efile");

  const { data: caseData } = useGetCase(caseId, { query: { enabled: !!caseId } });
  const c = caseData as ExtendedCase | undefined;

  const handleStepClick = (stepN: number) => {
    if (stepN === 8) return;
    const hash = EFILE_STEP_HASH[stepN];
    navigate(`/cases/${caseIdParam}${hash ? `#${hash}` : ""}`);
  };

  return (
    <WorkspaceLayout
      activeTab="efile"
      currentOuterStep={8}
      setActiveTab={() => {}}
      onStepClick={handleStepClick}
    >
      <div className="min-h-screen bg-background">
        {/* ── Sticky sub-header ── */}
        <div className="border-b bg-white sticky top-0 z-10">
          <div className="flex items-stretch">
            {/* Back button */}
            <div className="flex items-center px-3 shrink-0 border-r">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => navigate(`/cases/${caseIdParam}`)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Case
              </Button>
            </div>

            {/* Tab nav — fills remaining width proportionally */}
            <div className="flex flex-1 overflow-x-auto scrollbar-hide">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-1 items-center justify-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-w-0 ${
                    activeTab === id
                      ? "border-[#0d6b5e] text-[#0d6b5e]"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          {activeTab === "efile" && (
            <EFilingPanel c={c} caseId={caseId} getToken={getToken} />
          )}
          {activeTab === "process_server" && <ProcessServerPanel />}
          {activeTab === "collect" && <CollectPanel />}
          {activeTab === "deadlines" && c && (
            <DeadlineCalculatorTab caseId={caseId} currentCase={c} />
          )}
          {activeTab === "deadlines" && !c && (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              Loading case data…
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
