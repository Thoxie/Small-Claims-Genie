import { useState, type ElementType } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useGetCase } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ExternalLink,
  CheckCircle, MapPin, Camera, MessageSquare,
  FileCheck2, Shield, RefreshCw, Gavel, Clock,
  CalendarDays, UserCheck2, TrendingUp, Hourglass,
  Download, Loader2, AlertCircle, Info,
  Landmark, User, Building2, DollarSign, UserMinus,
  Mail, Car, Briefcase,
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

// ─── Shared filing summary left panel ─────────────────────────────────────────

function FilingSummaryPanel({
  c,
  jurisdictionState,
}: {
  c: ExtendedCase | undefined;
  jurisdictionState: "CA" | "FL" | "TX";
}) {
  const stateAbbr = jurisdictionState;
  return (
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
              ? `${c.courthouseAddress}, ${c.courthouseCity ?? ""}, ${stateAbbr} ${c.courthouseZip ?? ""}`.trim()
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
  );
}

// ─── CA court forms download section ─────────────────────────────────────────

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

// ─── FL court forms section ───────────────────────────────────────────────────

function FlCourtFormsSection({
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

  const downloadFlForm = async (endpoint: string, filename: string, stateId: string) => {
    setDownloading(stateId);
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
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: dlToken }),
      });
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
  const countyId = c?.countyId ?? "";
  const isMiamiDade = countyId === "fl-miami-dade";
  const isVolusia = countyId === "fl-volusia";

  const formLabel = isMiamiDade ? "CLK/CT. 333" : isVolusia ? "CL-219" : null;
  const filingAddress = isMiamiDade
    ? "73 W. Flagler St., Suite 133, Miami"
    : isVolusia
    ? "101 N. Alabama Ave., DeLand"
    : "your county court clerk's office";
  const endpoint = isMiamiDade ? "fl/clkct333" : isVolusia ? "fl/cl219-volusia" : "fl/statement-of-claim";
  const filename = isMiamiDade
    ? `Statement-of-Claim-Miami-Dade-Case-${caseId}.pdf`
    : isVolusia
    ? `Statement-of-Claim-Volusia-Case-${caseId}.pdf`
    : `Florida-Statement-of-Claim-Case-${caseId}.pdf`;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Court Form</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Pre-filled Florida Statement of Claim</p>
      </div>

      {/* Statement of Claim card */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          {formLabel && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
              {formLabel}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">Statement of Claim</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo
              ? `File at ${filingAddress}`
              : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => downloadFlForm(endpoint, filename, endpoint)}
          disabled={!hasBasicInfo || downloading === endpoint}
          title={hasBasicInfo ? "Download Statement of Claim" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === endpoint ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === endpoint ? "Generating…" : "Download"}
        </Button>
      </div>

      {/* Summons info card */}
      <div className="rounded-xl border bg-card px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">Summons — Issued by the Court Clerk</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            In Florida, the Summons is prepared and issued by the court clerk after you file the Statement of Claim and pay the filing fee. You do not create the Summons yourself — the clerk will issue it and arrange service.
          </p>
        </div>
      </div>

      {/* Filing fees quick reference */}
      <div className="rounded-xl border bg-amber-50 border-amber-200 px-4 py-3">
        <p className="text-xs font-semibold text-amber-800 mb-1.5">FL Filing Fees (Fla. Stat. 34.041)</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {[
            ["Under $100", "$55"],
            ["$101 – $500", "$80"],
            ["$501 – $2,500", "$175"],
            ["Over $2,500", "$300"],
          ].map(([range, fee]) => (
            <div key={range} className="flex justify-between text-[11px] text-amber-900">
              <span>{range}</span>
              <span className="font-semibold">{fee}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-amber-700 mt-1.5">Additional fees apply for summons, sheriff service, and certified mail.</p>
      </div>
    </div>
  );
}

// ─── FL service options section ───────────────────────────────────────────────

function FlServiceOptionsSection() {
  const options = [
    {
      icon: Car,
      title: "Sheriff Service",
      badge: "Most Reliable",
      badgeColor: "bg-[#0d6b5e]/10 text-[#0d6b5e]",
      desc: "Request the county sheriff to personally deliver the Summons and Statement of Claim to the defendant. The sheriff's fee is recoverable if you win your case.",
    },
    {
      icon: Mail,
      title: "Certified Mail",
      badge: "Cheapest Option",
      badgeColor: "bg-blue-50 text-blue-700",
      desc: "The court clerk mails the papers by certified mail. Service is only completed if the defendant signs — if they refuse or don't pick it up, service fails and you must try another method.",
    },
    {
      icon: Briefcase,
      title: "Process Server",
      badge: "Fast & Flexible",
      badgeColor: "bg-amber-50 text-amber-700",
      desc: "A licensed, certified process server handles personal delivery. Must be a certified process server under Fla. Stat. 48.021. Their fee is recoverable if you win.",
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Service of Process</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Proof of service must be filed at least 5 days before the pretrial conference
        </p>
      </div>
      <div className="space-y-2">
        {options.map(({ icon: Icon, title, badge, badgeColor, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-[#0d6b5e]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${badgeColor}`}>{badge}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FL deadlines section ─────────────────────────────────────────────────────

function FlDeadlinesSection() {
  const deadlines = [
    {
      icon: CalendarDays,
      title: "Pretrial Conference — within 50 days of filing",
      desc: "The court schedules a pretrial conference within 50 days of filing. Both parties must appear. Mediation may be offered at this conference — come prepared with full authority to settle.",
    },
    {
      icon: AlertCircle,
      title: "Service deadline — 5 days before pretrial conference",
      desc: "Proof of service must be filed with the court at least 5 days before the pretrial conference. If you are running short on time, contact the clerk immediately to discuss options.",
    },
    {
      icon: Clock,
      title: "Trial — within 60 days of pretrial conference",
      desc: "If the case is not resolved at the pretrial conference, the court schedules trial within 60 days. Total timeline from filing to trial is typically under 4 months.",
    },
    {
      icon: Shield,
      title: "Post-judgment collection window",
      desc: "A Florida judgment is valid for 20 years and can be enforced through wage garnishment, bank levy, writ of execution, and judgment lien certificate.",
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Key FL Deadlines</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Timeline from filing to trial</p>
      </div>
      <div className="space-y-2">
        {deadlines.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-[#0d6b5e]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight mb-0.5">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FL E-Filing panel ────────────────────────────────────────────────────────

function FlEFilingPanel({
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
      <FilingSummaryPanel c={c} jurisdictionState="FL" />

      {/* RIGHT — FL-specific content */}
      <div className="space-y-6">
        <FlCourtFormsSection c={c} caseId={caseId} getToken={getToken} />
        <FlServiceOptionsSection />
        <FlDeadlinesSection />
      </div>
    </div>
  );
}

// ─── TX court forms section ───────────────────────────────────────────────────

function TxCourtFormsSection({
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

  const downloadTxForm = async (endpoint: string, stateId: string) => {
    setDownloading(stateId);
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
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: dlToken }),
      });
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

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Court Form</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Pre-filled Texas Small Claims Petition</p>
      </div>

      {/* TX Petition card */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            TX Petition
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">Texas Small Claims Petition</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo
              ? "File with the Justice of the Peace court clerk in your precinct"
              : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => downloadTxForm("tx/petition", "tx-petition")}
          disabled={!hasBasicInfo || downloading === "tx-petition"}
          title={hasBasicInfo ? "Download TX Petition" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "tx-petition" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "tx-petition" ? "Generating…" : "Download"}
        </Button>
      </div>

      {/* Filing steps */}
      <div className="rounded-xl border bg-card px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight mb-1.5">Filing in Texas — Next Steps</p>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Print the petition and bring it to the Justice of the Peace court in the correct precinct.</li>
            <li>File in the precinct where the defendant lives, or where the contract or incident occurred.</li>
            <li>Pay the filing fee at the clerk's window (see fee schedule below). Ask about fee waivers if needed.</li>
            <li>The court will issue a citation (summons) served by constable or sheriff.</li>
            <li>Your trial date will be set — typically 20–45 days after service.</li>
          </ol>
        </div>
      </div>

      {/* Filing fees quick reference */}
      <div className="rounded-xl border bg-amber-50 border-amber-200 px-4 py-3">
        <p className="text-xs font-semibold text-amber-800 mb-1.5">TX Filing Fees — Tex. Gov't Code § 118.121</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {[
            ["$0 – $200", "$46"],
            ["$201 – $500", "$71"],
            ["$501 – $1,000", "$121"],
            ["$1,001 – $5,000", "$221"],
            ["$5,001 – $10,000", "$271"],
            ["$10,001 – $20,000", "$321"],
          ].map(([range, fee]) => (
            <div key={range} className="flex justify-between text-[11px] text-amber-900">
              <span>{range}</span>
              <span className="font-semibold">{fee}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-amber-700 mt-1.5">Claim limit: $20,000 (exclusive of attorneys' fees, interest, and court costs)</p>
      </div>
    </div>
  );
}

// ─── TX service of process section ───────────────────────────────────────────

function TxServiceSection() {
  const options = [
    {
      icon: Car,
      title: "Constable Service",
      badge: "Most Common",
      badgeColor: "bg-[#0d6b5e]/10 text-[#0d6b5e]",
      desc: "After you file, the JP court issues a citation that is served by the precinct constable or county sheriff. You do not arrange service yourself — the court handles it as part of the filing process.",
    },
    {
      icon: Briefcase,
      title: "Sheriff Service",
      badge: "Also Available",
      badgeColor: "bg-amber-50 text-amber-700",
      desc: "In some precincts the county sheriff serves the citation instead of the constable. The clerk will tell you which officer handles service for your precinct. The service fee is set by Tex. Gov't Code § 118.131.",
    },
    {
      icon: Info,
      title: "No Private Process Server Needed",
      badge: "TX Only",
      badgeColor: "bg-blue-50 text-blue-700",
      desc: "Unlike California, Texas Justice of the Peace courts do not allow private process servers for the initial citation. Service is exclusively through the court's constable or sheriff — you pay the service fee at the clerk's window when you file.",
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Service of Process</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          The court issues and serves the citation — you don't arrange it
        </p>
      </div>
      <div className="space-y-2">
        {options.map(({ icon: Icon, title, badge, badgeColor, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-[#0d6b5e]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${badgeColor}`}>{badge}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* If service fails — alias citation guidance */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <RefreshCw className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900 leading-tight mb-1">If the Defendant Can't Be Located or Refuses Service</p>
          <ol className="text-xs text-amber-800 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li><span className="font-medium">Clerk notification:</span> The constable or sheriff files a return showing the attempted service. The court clerk will notify you that service was unsuccessful.</li>
            <li><span className="font-medium">Request an alias citation:</span> Go back to the clerk's window and ask for an alias citation — a new citation issued to try service again. There is typically a small re-issuance fee.</li>
            <li><span className="font-medium">Re-service timeline:</span> The alias citation goes back to the constable or sheriff for another service attempt. Once served, your 20–45 day trial window restarts from the new service date.</li>
          </ol>
          <p className="text-[11px] text-amber-700 mt-2 leading-relaxed">
            If the defendant remains impossible to locate, ask the clerk about substitute service or posting — additional steps that require a court order under Tex. R. Civ. P. 106.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── TX deadlines section ─────────────────────────────────────────────────────

function TxDeadlinesSection() {
  const deadlines = [
    {
      icon: CalendarDays,
      title: "Citation issued — same day or next business day",
      desc: "After you file, the court clerk prepares the citation (summons). In most JP courts it is issued the same day or the next business day and handed to the constable or sheriff for service.",
    },
    {
      icon: AlertCircle,
      title: "Service window — within ~3 days of issuance",
      desc: "The constable or sheriff is required to attempt service promptly. Most citations are served within 3 business days of issuance. If service fails, the clerk will notify you and you may request an alias citation.",
    },
    {
      icon: Clock,
      title: "Trial date set — 20 to 45 days after service",
      desc: "Once the defendant is served, the court sets a trial date. Under Tex. R. Civ. P. 503.4, the trial must be scheduled no earlier than 20 days and no later than 45 days after the date of service.",
    },
    {
      icon: Shield,
      title: "Judgment enforceable for 10 years",
      desc: "A Texas judgment is valid and enforceable for 10 years from the date it is signed (Tex. Civ. Prac. & Rem. Code § 34.001). You can renew it before expiration to preserve your collection rights for another decade.",
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Key TX Deadlines</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Timeline from filing to trial</p>
      </div>
      <div className="space-y-2">
        {deadlines.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-[#0d6b5e]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight mb-0.5">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CA case info (AI E-Filing System tab body) ───────────────────────────────

function CaEFilingPanel({
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
      <FilingSummaryPanel c={c} jurisdictionState="CA" />

      {/* RIGHT — Court Forms */}
      <div className="space-y-6">
        <CourtFormsSection c={c} caseId={caseId} getToken={getToken} />
      </div>
    </div>
  );
}

// ─── TX case info (AI E-Filing System tab body) ───────────────────────────────

function TxEFilingPanel({
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
      <FilingSummaryPanel c={c} jurisdictionState="TX" />

      {/* RIGHT — TX-specific content */}
      <div className="space-y-6">
        <TxCourtFormsSection c={c} caseId={caseId} getToken={getToken} />
        <TxServiceSection />
        <TxDeadlinesSection />
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
  if (c?.jurisdictionState === "FL") {
    return <FlEFilingPanel c={c} caseId={caseId} getToken={getToken} />;
  }
  if (c?.jurisdictionState === "TX") {
    return <TxEFilingPanel c={c} caseId={caseId} getToken={getToken} />;
  }
  return <CaEFilingPanel c={c} caseId={caseId} getToken={getToken} />;
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

function CollectPanel({ jurisdictionState }: { jurisdictionState: "CA" | "FL" | "TX" }) {
  const isFL = jurisdictionState === "FL";
  const isTX = jurisdictionState === "TX";

  const caSteps = [
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

  const flSteps = [
    {
      icon: Gavel,
      title: "Obtain your judgment",
      desc: "After you win, the court enters a judgment in your favor. Get a certified copy from the clerk — you will need it for every collection step.",
    },
    {
      icon: TrendingUp,
      title: "Fact Information Sheet (Form 7.343)",
      desc: "File this form with the court to compel the defendant to disclose their bank accounts, employer, and assets. The court can sanction a defendant who refuses to cooperate.",
    },
    {
      icon: FileCheck2,
      title: "Wage garnishment",
      desc: "File a Writ of Execution with the circuit court, then serve the defendant's employer. Florida law limits garnishment to 25% of disposable earnings — head of household exemptions may apply.",
    },
    {
      icon: Shield,
      title: "Bank levy (Writ of Execution)",
      desc: "Direct the county sheriff to levy the defendant's bank account using a Writ of Execution. You must identify the bank and branch — gathered from the Fact Information Sheet.",
    },
    {
      icon: FileCheck2,
      title: "Judgment lien certificate",
      desc: "File a Judgment Lien Certificate with the Florida Department of State to create a lien on the defendant's personal property. This can also be recorded as a lien on real estate in the county where the defendant owns property.",
    },
    {
      icon: RefreshCw,
      title: "Your judgment is valid for 20 years",
      desc: "Florida judgments are valid for 20 years and can be renewed. Post-judgment interest accrues at the statutory rate set by Fla. Stat. 55.03 — check the current rate at the Florida Department of Financial Services.",
    },
  ];

  const txSteps = [
    {
      icon: Gavel,
      title: "Obtain your judgment",
      desc: "After you win, the court enters a judgment in your favor. Get a certified copy from the Justice of the Peace court clerk — you will need it for every collection step.",
    },
    {
      icon: TrendingUp,
      title: "Locate the defendant's assets",
      desc: "You can request a post-judgment deposition or written interrogatories to compel the defendant to disclose bank accounts, employer, and property. The court can sanction a defendant who refuses to cooperate.",
    },
    {
      icon: Shield,
      title: "Writ of Execution (personal property & bank accounts)",
      desc: "Direct the constable or sheriff to seize the defendant's non-exempt personal property or levy a bank account using a Writ of Execution. You must identify the bank and branch.",
    },
    {
      icon: FileCheck2,
      title: "Abstract of Judgment (real property lien)",
      desc: "Record an Abstract of Judgment with the county clerk's real property records to create a lien on any real estate the defendant owns in that county — now or in the future.",
    },
    {
      icon: Clock,
      title: "Post-judgment interest",
      desc: "Texas judgments earn interest at the rate set by Tex. Fin. Code § 304.003 from the date of judgment. The rate is published quarterly — check with the clerk or the Office of Consumer Credit Commissioner.",
    },
    {
      icon: RefreshCw,
      title: "Your judgment is valid for 10 years",
      desc: "Texas judgments are dormant after 10 years, but you can revive them by filing a scire facias motion before expiration. Keep your certified copy and act before the deadline.",
    },
  ];

  const steps = isTX ? txSteps : isFL ? flSteps : caSteps;
  const iconBg = "bg-amber-100";
  const iconColor = "text-amber-700";

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
            in your pocket. {isTX ? "Texas" : isFL ? "Florida" : "California"} gives you several enforcement methods to collect what you are owed.
            Here is how to use them.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {steps.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4 rounded-xl border bg-card px-4 py-4">
            <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
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

  const jurisdictionState: "CA" | "FL" | "TX" = c?.jurisdictionState === "FL" ? "FL" : c?.jurisdictionState === "TX" ? "TX" : "CA";

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
          {activeTab === "collect" && <CollectPanel jurisdictionState={jurisdictionState} />}
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
