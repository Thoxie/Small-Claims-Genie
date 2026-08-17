import { useState, useEffect, type ElementType, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useGetCase, useListCounties, type County } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ExternalLink,
  CheckCircle, MapPin, Camera, MessageSquare,
  FileCheck2, Shield, RefreshCw, Gavel, Clock,
  CalendarDays, UserCheck2, TrendingUp, Hourglass,
  Download, Loader2, AlertCircle, Info,
  Landmark, User, Building2, DollarSign, UserMinus,
  Mail, Car, Briefcase, Send, X, ChevronRight,
  CreditCard, PackageCheck, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ExtendedCase } from "@/lib/types";
import { DeadlineCalculatorTab } from "@/pages/cases/tabs/deadline-calculator-tab";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { SignaturePadModal } from "@/pages/cases/tabs/forms-tab";

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
  jurisdictionState: "CA" | "FL" | "TX" | "IL" | "NC" | "AZ";
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
        <InfoRow
          label="Service Method"
          value={c?.notifyMethod ? ({
            certified_mail: "Certified Mail by Court Clerk",
            adult_service: "Service by Adult (18+, non-party)",
            sheriff: "Sheriff / Marshal Service",
            process_server: "Registered Process Server",
            constable: "Constable Service",
          } as Record<string, string>)[c.notifyMethod] ?? c.notifyMethod : undefined}
        />
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
  const [feeWaiverSignOpen, setFeeWaiverSignOpen] = useState(false);
  const [proofSignOpen, setProofSignOpen] = useState(false);
  const { toast } = useToast();

  const downloadFlProofOfService = async (signatureDataUrl?: string) => {
    const endpoint = signatureDataUrl ? "fl/proof-of-service/signed" : "fl/proof-of-service";
    setDownloading("fl/proof-of-service");
    setProofSignOpen(false);
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
      const body: Record<string, string> = { token: dlToken };
      if (signatureDataUrl) body.signatureDataUrl = signatureDataUrl;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const downloadFlFeeWaiver = async (signatureDataUrl?: string) => {
    const endpoint = signatureDataUrl ? "fl/fee-waiver/signed" : "fl/fee-waiver";
    setDownloading("fl/fee-waiver");
    setFeeWaiverSignOpen(false);
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
      const body: Record<string, string> = { token: dlToken };
      if (signatureDataUrl) body.signatureDataUrl = signatureDataUrl;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      {/* Proof of Service card */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            7.340
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">Proof of Service</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo
              ? "File after serving the defendant — complete service details by hand"
              : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => setProofSignOpen(true)}
          disabled={!hasBasicInfo || downloading === "fl/proof-of-service"}
          title={hasBasicInfo ? "Sign & Download Proof of Service" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "fl/proof-of-service" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "fl/proof-of-service" ? "Generating…" : "Download"}
        </Button>
      </div>

      <SignaturePadModal
        open={proofSignOpen}
        onClose={() => setProofSignOpen(false)}
        onSign={(dataUrl) => downloadFlProofOfService(dataUrl)}
        onSkipSign={() => downloadFlProofOfService()}
        formTitle="FL Proof of Service"
        disclaimer="By signing, you declare under penalty of perjury under the laws of the State of Florida that the information on your Proof of Service is true and correct."
      />

      {/* Fee Waiver card */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            §57.082
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">Fee Waiver Application</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo
              ? "Application for Determination of Civil Indigent Status — complete financial info by hand"
              : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => setFeeWaiverSignOpen(true)}
          disabled={!hasBasicInfo || downloading === "fl/fee-waiver"}
          title={hasBasicInfo ? "Sign &amp; Download Fee Waiver Application" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "fl/fee-waiver" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "fl/fee-waiver" ? "Generating…" : "Download"}
        </Button>
      </div>

      <SignaturePadModal
        open={feeWaiverSignOpen}
        onClose={() => setFeeWaiverSignOpen(false)}
        onSign={(dataUrl) => downloadFlFeeWaiver(dataUrl)}
        onSkipSign={() => downloadFlFeeWaiver()}
        formTitle="FL Fee Waiver Application"
        disclaimer="By signing, you declare under penalty of perjury under the laws of the State of Florida that the information on your Fee Waiver Application is true and correct."
      />

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

function FlServiceOptionsSection({
  certifiedMailAvailable,
  certifiedMailFee,
  sheriffServiceFee,
  sheriffOfficeAddress,
  sheriffOfficePhone,
  sheriffOfficeUrl,
  serviceRequestFormUrl,
  onProcessServerClick,
  serviceMethod,
  onSelectService,
}: {
  certifiedMailAvailable: boolean;
  certifiedMailFee: string | null | undefined;
  sheriffServiceFee: string | null | undefined;
  sheriffOfficeAddress: string | null | undefined;
  sheriffOfficePhone: string | null | undefined;
  sheriffOfficeUrl: string | null | undefined;
  serviceRequestFormUrl: string | null | undefined;
  onProcessServerClick: () => void;
  serviceMethod: string | null | undefined;
  onSelectService: (method: string) => void;
}) {
  type OptionDef = {
    key: string;
    icon: ElementType;
    title: string;
    badge: string;
    badgeColor: string;
    desc: string;
    show: boolean;
    extra?: ReactNode;
  };

  const sheriffContactBlock = (sheriffOfficeAddress || sheriffOfficePhone || sheriffOfficeUrl) ? (
    <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 space-y-0.5">
      {sheriffOfficeAddress && (
        <p className="text-[11px] text-muted-foreground">📍 {sheriffOfficeAddress}</p>
      )}
      {sheriffOfficePhone && (
        <p className="text-[11px] text-muted-foreground">
          📞 <a href={`tel:${sheriffOfficePhone.replace(/\D/g, "")}`} className="underline underline-offset-2">{sheriffOfficePhone}</a>
        </p>
      )}
      {sheriffOfficeUrl && (
        <p className="text-[11px] text-muted-foreground">
          🔗 <a href={sheriffOfficeUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{sheriffOfficeUrl.replace(/^https?:\/\//, "")}</a>
        </p>
      )}
    </div>
  ) : null;

  const options: OptionDef[] = [
    {
      key: "sheriff",
      icon: Car,
      title: "Sheriff Service",
      badge: sheriffServiceFee ? `Most Reliable — ${sheriffServiceFee}` : "Most Reliable",
      badgeColor: "bg-[#0d6b5e]/10 text-[#0d6b5e]",
      desc: "Request the county sheriff to personally deliver the Summons and Statement of Claim to the defendant. The sheriff's fee is recoverable if you win your case.",
      show: true,
      extra: (
        <>
          {sheriffContactBlock}
          {serviceRequestFormUrl && (
            <a href={serviceRequestFormUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1.5">
                <Download className="h-3 w-3" />
                Download Request Form
              </Button>
            </a>
          )}
        </>
      ),
    },
    {
      key: "certified_mail",
      icon: Mail,
      title: "Certified Mail",
      badge: certifiedMailFee ? `Cheapest — ${certifiedMailFee}` : "Cheapest Option",
      badgeColor: "bg-blue-50 text-blue-700",
      desc: "The court clerk mails the papers by certified mail. Service is only completed if the defendant signs — if they refuse or don't pick it up, service fails and you must try another method.",
      show: certifiedMailAvailable,
    },
    {
      key: "process_server",
      icon: Briefcase,
      title: "Process Server",
      badge: "Fast & Flexible",
      badgeColor: "bg-amber-50 text-amber-700",
      desc: "A licensed, certified process server handles personal delivery. Must be a certified process server under Fla. Stat. 48.021. Their fee is recoverable if you win.",
      show: true,
      extra: (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 text-xs gap-1.5"
          onClick={onProcessServerClick}
        >
          Use a Process Server →
        </Button>
      ),
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
        {options.filter((o) => o.show).map(({ key, icon: Icon, title, badge, badgeColor, desc, extra }) => {
          const selected = serviceMethod === key;
          return (
            <div
              key={title}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => onSelectService(key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectService(key); }}
              className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${selected ? "border-[#0d6b5e] bg-[#0d6b5e]/5" : "border-border bg-card hover:bg-muted/30"}`}
            >
              {selected && (
                <CheckCircle className="absolute top-2.5 right-2.5 h-4 w-4 text-[#0d6b5e] shrink-0" />
              )}
              <div className="h-8 w-8 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-[#0d6b5e]" />
              </div>
              <div className="flex-1 min-w-0 pr-5">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${badgeColor}`}>{badge}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                {extra}
              </div>
            </div>
          );
        })}
      </div>
      {serviceMethod && (
        <p className="text-[11px] text-[#0d6b5e] font-medium px-1">
          ✓ Service method saved
        </p>
      )}
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
  onProcessServerClick,
  serviceMethod,
  onSelectService,
}: {
  c: ExtendedCase | undefined;
  caseId: number;
  getToken: () => Promise<string | null>;
  onProcessServerClick: () => void;
  serviceMethod: string | null | undefined;
  onSelectService: (method: string) => void;
}) {
  const { data: counties } = useListCounties({ state: "FL" });
  const countyData = counties?.find((co: County) => co.id === c?.countyId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* LEFT — Case info */}
      <FilingSummaryPanel c={c} jurisdictionState="FL" />

      {/* RIGHT — FL-specific content */}
      <div className="space-y-6">
        <FlCourtFormsSection c={c} caseId={caseId} getToken={getToken} />
        <FlServiceOptionsSection
          certifiedMailAvailable={countyData?.certifiedMailAvailable ?? true}
          certifiedMailFee={countyData?.certifiedMailFee ?? null}
          sheriffServiceFee={countyData?.sheriffServiceFee ?? null}
          sheriffOfficeAddress={countyData?.sheriffOfficeAddress ?? null}
          sheriffOfficePhone={countyData?.sheriffOfficePhone ?? null}
          sheriffOfficeUrl={countyData?.sheriffOfficeUrl ?? null}
          serviceRequestFormUrl={countyData?.serviceRequestFormUrl ?? null}
          onProcessServerClick={onProcessServerClick}
          serviceMethod={serviceMethod}
          onSelectService={onSelectService}
        />
        <FlDeadlinesSection />
      </div>
    </div>
  );
}

// ─── IL service options section ───────────────────────────────────────────────

function IlServiceOptionsSection({
  onProcessServerClick,
  sheriffServiceFee,
  sheriffOfficeAddress,
  sheriffOfficePhone,
  sheriffOfficeUrl,
}: {
  onProcessServerClick: () => void;
  sheriffServiceFee?: string | null;
  sheriffOfficeAddress?: string | null;
  sheriffOfficePhone?: string | null;
  sheriffOfficeUrl?: string | null;
}) {
  type OptionDef = {
    icon: ElementType;
    title: string;
    badge: string;
    badgeColor: string;
    desc: string;
    extra?: ReactNode;
  };

  const sheriffContactBlock = (sheriffOfficeAddress || sheriffOfficePhone || sheriffOfficeUrl) ? (
    <div className="mt-1.5 space-y-0.5">
      {sheriffOfficeAddress && (
        <p className="text-[11px] text-muted-foreground">📍 {sheriffOfficeAddress}</p>
      )}
      {sheriffOfficePhone && (
        <p className="text-[11px] text-muted-foreground">
          📞 <a href={`tel:${sheriffOfficePhone.replace(/\D/g, "")}`} className="underline underline-offset-2">{sheriffOfficePhone}</a>
        </p>
      )}
      {sheriffOfficeUrl && (
        <p className="text-[11px] text-muted-foreground">
          🔗 <a href={sheriffOfficeUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{sheriffOfficeUrl.replace(/^https?:\/\//, "")}</a>
        </p>
      )}
    </div>
  ) : null;

  const options: OptionDef[] = [
    {
      icon: Car,
      title: "Sheriff Service",
      badge: sheriffServiceFee ? `Most Reliable — ${sheriffServiceFee}` : "Most Reliable",
      badgeColor: "bg-[#0d6b5e]/10 text-[#0d6b5e]",
      desc: "The county sheriff personally delivers the summons and complaint to the defendant. Service is complete upon personal delivery or substitute service at the defendant's usual place of abode. The sheriff's fee is recoverable if you win your case.",
      extra: sheriffContactBlock,
    },
    {
      icon: Mail,
      title: "Certified Mail",
      badge: "Cheapest Option",
      badgeColor: "bg-blue-50 text-blue-700",
      desc: "The court clerk sends the summons by certified mail, return receipt requested. Service is complete only if the defendant signs — if they refuse or the mail is unclaimed, you must use a different method.",
    },
    {
      icon: Briefcase,
      title: "Process Server",
      badge: "Fast & Flexible",
      badgeColor: "bg-amber-50 text-amber-700",
      desc: "A licensed Illinois process server handles personal delivery. Must be a person 18 or older who is not a party to the case. Service must be completed at least 3 days before the return date. Their fee is recoverable if you win.",
      extra: (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 text-xs gap-1.5"
          onClick={onProcessServerClick}
        >
          Use a Process Server →
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Service of Process</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Defendant must be served at least 3 days before the return date
        </p>
      </div>
      <div className="space-y-2">
        {options.map(({ icon: Icon, title, badge, badgeColor, desc, extra }) => (
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
              {extra}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── IL deadlines section ─────────────────────────────────────────────────────

function IlDeadlinesSection() {
  const deadlines = [
    {
      icon: CalendarDays,
      title: "Return date — 14 to 40 days after filing",
      desc: "The court clerk sets a return date when you file. Under 735 ILCS 5/2-204, the return date is typically 14 to 40 days after the summons is issued. The defendant must appear on or before this date.",
    },
    {
      icon: AlertCircle,
      title: "Service deadline — 3 days before return date",
      desc: "The defendant must be served at least 3 days before the return date. If service cannot be completed in time, contact the clerk to request a new return date.",
    },
    {
      icon: Clock,
      title: "Trial date set — at or after the return date",
      desc: "If the defendant appears and disputes the claim, the court schedules a trial. Small claims trials in Illinois are typically set within 60–90 days of the return date depending on the county's docket.",
    },
    {
      icon: Shield,
      title: "Judgment enforceable for 7 years (renewable)",
      desc: "An Illinois small claims judgment is valid for 7 years from the date of entry and may be renewed for additional 7-year periods before expiration (735 ILCS 5/12-108).",
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Key IL Deadlines</h2>
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

// ─── IL court forms section ───────────────────────────────────────────────────

const IL_CLERK_URLS: Record<string, { name: string; url: string }> = {
  "il-cook":       { name: "Cook County",       url: "https://www.cookcountyclerkofcourt.org" },
  "il-dupage":     { name: "DuPage County",     url: "https://www.dupagecounty.gov/courts/circuit_clerk/" },
  "il-lake":       { name: "Lake County",       url: "https://www.19thcircuitcourt.state.il.us/1028/Clerk-of-Court" },
  "il-will":       { name: "Will County",       url: "https://willcountyclerk.gov" },
  "il-kane":       { name: "Kane County",       url: "https://www.kanecountyclerkofcourt.org" },
  "il-winnebago":  { name: "Winnebago County",  url: "https://www.win17th.com/clerk/" },
  "il-mchenry":    { name: "McHenry County",    url: "https://www.co.mchenry.il.us/county-government/departments-j-z/p-r/circuit-court-clerk" },
  "il-kendall":    { name: "Kendall County",    url: "https://www.co.kendall.il.us/government/departments/circuit-clerk" },
  "il-champaign":  { name: "Champaign County",  url: "https://www.co.champaign.il.us/circuitclerk/" },
  "il-sangamon":   { name: "Sangamon County",   url: "https://sangamoncountycircuitclerk.com" },
  "il-peoria":     { name: "Peoria County",     url: "https://www.peoriacounty.org/circuit-clerk" },
  "il-madison":    { name: "Madison County",    url: "https://www.co.madison.il.us/government/departments/circuit_clerk/" },
  "il-st-clair":   { name: "St. Clair County",  url: "https://www.co.st-clair.il.us/departments/circuit-clerk" },
  "il-mclean":     { name: "McLean County",     url: "https://www.mcleancountyil.gov/171/Circuit-Clerk" },
  "il-rock-island":{ name: "Rock Island County",url: "https://www.rockislandcounty.org/circuitclerk/" },
};

function IlCourtFormsSection({
  c,
  caseId,
  getToken,
}: {
  c: ExtendedCase | undefined;
  caseId: number;
  getToken: () => Promise<string | null>;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [feeWaiverSignOpen, setFeeWaiverSignOpen] = useState(false);
  const [proofSignOpen, setProofSignOpen] = useState(false);
  const { toast } = useToast();
  const countyId = c?.countyId ?? "";
  const countyClerk = IL_CLERK_URLS[countyId] ?? null;
  const { data: ilCounties } = useListCounties({ state: "IL" });
  const countyData = ilCounties?.find((co: County) => co.id === countyId);

  const downloadIlProofOfService = async (signatureDataUrl?: string) => {
    const endpoint = signatureDataUrl ? "il/proof-of-service/signed" : "il/proof-of-service";
    setDownloading("il-proof-of-service");
    setProofSignOpen(false);
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
      const body: Record<string, string> = { token: dlToken };
      if (signatureDataUrl) body.signatureDataUrl = signatureDataUrl;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const downloadIlFeeWaiver = async (signatureDataUrl?: string) => {
    const endpoint = signatureDataUrl ? "il/fee-waiver/signed" : "il/fee-waiver";
    setDownloading("il-fee-waiver");
    setFeeWaiverSignOpen(false);
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
      const body: Record<string, string> = { token: dlToken };
      if (signatureDataUrl) body.signatureDataUrl = signatureDataUrl;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const downloadIlForm = async (endpoint: string, stateId: string) => {
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

  const courtName = countyData?.courthouseName ?? c?.courthouseName;
  const address = countyData?.courthouseAddress;
  const city = countyData?.courthouseCity;
  const zip = countyData?.courthouseZip;
  const phone = countyData?.phone ?? c?.courthousePhone;
  const website = countyData?.clerkWebsite ?? countyClerk?.url;
  const fullAddress = [address, city ? `${city}, IL` : null, zip].filter(Boolean).join(" ");

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Court Forms &amp; Filing</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Illinois small claims forms by county</p>
      </div>

      {/* Courthouse info block */}
      {(courtName || fullAddress || phone || website) && (
        <div className="rounded-xl border bg-card px-4 py-3 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[#0d6b5e] shrink-0" />
            <p className="text-sm font-semibold text-foreground leading-tight">
              {courtName ?? "Circuit Court"}
            </p>
          </div>
          {fullAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-snug">{fullAddress}</p>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-foreground"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.57a16 16 0 0 0 6.29 6.29l.94-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <p className="text-xs text-muted-foreground">{phone}</p>
            </div>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0d6b5e] hover:underline pl-0.5"
            >
              Court website
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* IL form cards */}
      {(
        [
          {
            id: "il-smc-complaint",
            endpoint: "il/smc-complaint",
            label: "Small Claims Complaint",
            desc: "Illinois Supreme Court statewide form — file with the circuit court clerk",
          },
          {
            id: "il-summons",
            endpoint: "il/summons",
            label: "Small Claims Summons",
            desc: "Served on the defendant with a copy of the complaint — clerk stamps and returns to you",
          },
        ] as const
      ).map(({ id, endpoint, label, desc }) => (
        <div
          key={id}
          className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}
        >
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
              <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
            </div>
            <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
              IL Form
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-foreground truncate">{label}</p>
              <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
                AI Pre-filled
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
              {hasBasicInfo ? desc : "Complete Step 1 (parties info) to enable"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
            onClick={() => downloadIlForm(endpoint, id)}
            disabled={!hasBasicInfo || downloading === id}
            title={hasBasicInfo ? `Download ${label}` : "Complete Step 1 (parties info) to enable"}
          >
            {downloading === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {downloading === id ? "Generating…" : "Download"}
          </Button>
        </div>
      ))}

      {/* IL Proof of Service card — rendered separately to support sign-before-download */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            IL Form
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">Proof of Service</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo
              ? "Completed by the server after serving the defendant — file with the clerk"
              : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => setProofSignOpen(true)}
          disabled={!hasBasicInfo || downloading === "il-proof-of-service"}
          title={hasBasicInfo ? "Sign & Download Proof of Service" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "il-proof-of-service" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "il-proof-of-service" ? "Generating…" : "Download"}
        </Button>
      </div>

      <SignaturePadModal
        open={proofSignOpen}
        onClose={() => setProofSignOpen(false)}
        onSign={(dataUrl) => downloadIlProofOfService(dataUrl)}
        onSkipSign={() => downloadIlProofOfService()}
        formTitle="IL Proof of Service"
        disclaimer="By signing, you declare that the information on your Proof of Service is true and correct to the best of your knowledge."
      />

      {/* IL Fee Waiver card — rendered separately to support sign-before-download */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            IL Form
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">Application for Waiver of Court Fees</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo ? "File with the complaint if you cannot afford the filing fee" : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => setFeeWaiverSignOpen(true)}
          disabled={!hasBasicInfo || downloading === "il-fee-waiver"}
          title={hasBasicInfo ? "Sign & Download IL Fee Waiver" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "il-fee-waiver" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "il-fee-waiver" ? "Generating…" : "Download"}
        </Button>
      </div>

      <SignaturePadModal
        open={feeWaiverSignOpen}
        onClose={() => setFeeWaiverSignOpen(false)}
        onSign={(dataUrl) => downloadIlFeeWaiver(dataUrl)}
        onSkipSign={() => downloadIlFeeWaiver()}
        formTitle="IL Fee Waiver Application"
        disclaimer="By signing, you declare that the information in your Application for Waiver of Court Fees is true and correct to the best of your knowledge."
      />

      <div className="rounded-xl border bg-card px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight mb-1.5">Filing in Illinois — Next Steps</p>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Print the complaint and bring it to the circuit court clerk in the county where the defendant lives or the dispute occurred.</li>
            <li>Pay the filing fee at the clerk's window (see amounts below). Ask about a fee waiver if needed.</li>
            <li>The clerk will issue a summons — you are responsible for arranging service on the defendant.</li>
            <li>Serve the defendant via sheriff, certified mail through the clerk, or a licensed process server at least 3 days before the return date.</li>
          </ol>
          {countyClerk && (
            <a
              href={countyClerk.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0d6b5e] hover:underline"
            >
              {countyClerk.name} Circuit Court Clerk
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Filing fees */}
      <div className="rounded-xl border bg-amber-50 border-amber-200 px-4 py-3">
        <p className="text-xs font-semibold text-amber-800 mb-1.5">IL Filing Fees — 735 ILCS 5/2-212</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {[
            ["$0 – $500",           "$30"],
            ["$501 – $2,500",       "$50"],
            ["$2,501 – $10,000",    "$75"],
          ].map(([range, fee]) => (
            <div key={range} className="flex justify-between text-[11px] text-amber-900">
              <span>{range}</span>
              <span className="font-semibold">{fee}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-amber-700 mt-1.5">Claim limit: $10,000 (735 ILCS 5/2-209)</p>
      </div>
    </div>
  );
}

// ─── IL E-Filing panel ────────────────────────────────────────────────────────

function IlEFilingPanel({
  c,
  caseId,
  getToken,
  onProcessServerClick,
}: {
  c: ExtendedCase | undefined;
  caseId: number;
  getToken: () => Promise<string | null>;
  onProcessServerClick: () => void;
}) {
  const { data: ilCounties } = useListCounties({ state: "IL" });
  const countyData = ilCounties?.find((co: County) => co.id === c?.countyId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* LEFT — Case info */}
      <FilingSummaryPanel c={c} jurisdictionState="IL" />

      {/* RIGHT — IL-specific content */}
      <div className="space-y-6">
        <IlCourtFormsSection c={c} caseId={caseId} getToken={getToken} />
        <IlServiceOptionsSection
          onProcessServerClick={onProcessServerClick}
          sheriffServiceFee={countyData?.sheriffServiceFee ?? null}
          sheriffOfficeAddress={countyData?.sheriffOfficeAddress ?? null}
          sheriffOfficePhone={countyData?.sheriffOfficePhone ?? null}
          sheriffOfficeUrl={countyData?.sheriffOfficeUrl ?? null}
        />
        <IlDeadlinesSection />
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
  const [feeWaiverSignOpen, setFeeWaiverSignOpen] = useState(false);
  const [returnSignOpen, setReturnSignOpen] = useState(false);
  const { toast } = useToast();

  const downloadTxReturnOfService = async (signatureDataUrl?: string) => {
    const endpoint = signatureDataUrl ? "tx/return-of-service/signed" : "tx/return-of-service";
    setDownloading("tx-return-of-service");
    setReturnSignOpen(false);
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
      const body: Record<string, string> = { token: dlToken };
      if (signatureDataUrl) body.signatureDataUrl = signatureDataUrl;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const downloadTxFeeWaiver = async (signatureDataUrl?: string) => {
    const endpoint = signatureDataUrl ? "tx/fee-waiver/signed" : "tx/fee-waiver";
    setDownloading("tx-fee-waiver");
    setFeeWaiverSignOpen(false);
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
      const body: Record<string, string> = { token: dlToken };
      if (signatureDataUrl) body.signatureDataUrl = signatureDataUrl;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        <h2 className="text-sm font-bold text-foreground">Court Forms</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Pre-filled Texas Small Claims forms</p>
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

      {/* TX Citation card */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            Citation
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">TX Citation (Summons)</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo
              ? "Issued by clerk — served by constable or sheriff (Tex. R. Civ. P. 502.5)"
              : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => downloadTxForm("tx/citation", "tx-citation")}
          disabled={!hasBasicInfo || downloading === "tx-citation"}
          title={hasBasicInfo ? "Download TX Citation" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "tx-citation" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "tx-citation" ? "Generating…" : "Download"}
        </Button>
      </div>

      {/* TX Return of Service card */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            Return
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">TX Return of Service</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo
              ? "Filed by constable/sheriff after serving the defendant (Tex. R. Civ. P. 107)"
              : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => setReturnSignOpen(true)}
          disabled={!hasBasicInfo || downloading === "tx-return-of-service"}
          title={hasBasicInfo ? "Sign & Download TX Return of Service" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "tx-return-of-service" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "tx-return-of-service" ? "Generating…" : "Download"}
        </Button>
      </div>

      <SignaturePadModal
        open={returnSignOpen}
        onClose={() => setReturnSignOpen(false)}
        onSign={(dataUrl) => downloadTxReturnOfService(dataUrl)}
        onSkipSign={() => downloadTxReturnOfService()}
        formTitle="TX Return of Service"
        disclaimer="By signing, you declare under penalty of perjury that the information on your Return of Service is true and correct to the best of your knowledge."
      />

      {/* TX Fee Waiver card */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            Fee Waiver
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">TX Fee Waiver (Rule 145)</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo
              ? "Affidavit of Inability to Pay — waives all filing and service fees"
              : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => setFeeWaiverSignOpen(true)}
          disabled={!hasBasicInfo || downloading === "tx-fee-waiver"}
          title={hasBasicInfo ? "Sign & Download TX Fee Waiver" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "tx-fee-waiver" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "tx-fee-waiver" ? "Generating…" : "Download"}
        </Button>
      </div>

      <SignaturePadModal
        open={feeWaiverSignOpen}
        onClose={() => setFeeWaiverSignOpen(false)}
        onSign={(dataUrl) => downloadTxFeeWaiver(dataUrl)}
        onSkipSign={() => downloadTxFeeWaiver()}
        formTitle="TX Fee Waiver (Rule 145)"
        disclaimer="By signing, you declare that the information in your Affidavit of Inability to Pay is true and correct to the best of your knowledge."
      />

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

function TxServiceSection({
  serviceMethod,
  onSelectService,
}: {
  serviceMethod: string | null | undefined;
  onSelectService: (method: string) => void;
}) {
  const selectableOptions = [
    {
      key: "constable",
      icon: Car,
      title: "Constable Service",
      badge: "Most Common",
      badgeColor: "bg-[#0d6b5e]/10 text-[#0d6b5e]",
      desc: "After you file, the JP court issues a citation that is served by the precinct constable or county sheriff. You do not arrange service yourself — the court handles it as part of the filing process.",
    },
    {
      key: "sheriff",
      icon: Briefcase,
      title: "Sheriff Service",
      badge: "Also Available",
      badgeColor: "bg-amber-50 text-amber-700",
      desc: "In some precincts the county sheriff serves the citation instead of the constable. The clerk will tell you which officer handles service for your precinct. The service fee is set by Tex. Gov't Code § 118.131.",
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Service of Process</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          The court issues and serves the citation — tap to mark which officer served your defendant
        </p>
      </div>
      <div className="space-y-2">
        {selectableOptions.map(({ key, icon: Icon, title, badge, badgeColor, desc }) => {
          const selected = serviceMethod === key;
          return (
            <div
              key={title}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => onSelectService(key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectService(key); }}
              className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${selected ? "border-[#0d6b5e] bg-[#0d6b5e]/5" : "border-border bg-card hover:bg-muted/30"}`}
            >
              {selected && (
                <CheckCircle className="absolute top-2.5 right-2.5 h-4 w-4 text-[#0d6b5e] shrink-0" />
              )}
              <div className="h-8 w-8 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-[#0d6b5e]" />
              </div>
              <div className="flex-1 min-w-0 pr-5">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${badgeColor}`}>{badge}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          );
        })}
        <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
          <div className="h-8 w-8 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <p className="text-sm font-semibold text-foreground leading-tight">No Private Process Server Needed</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none bg-blue-50 text-blue-700">TX Only</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Unlike California, Texas Justice of the Peace courts do not allow private process servers for the initial citation. Service is exclusively through the court's constable or sheriff — you pay the service fee at the clerk's window when you file.</p>
          </div>
        </div>
      </div>
      {serviceMethod && (
        <p className="text-[11px] text-[#0d6b5e] font-medium px-1">
          ✓ Service method saved
        </p>
      )}

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

// ─── NC court forms section ───────────────────────────────────────────────────

function NcCourtFormsSection({
  c,
  caseId,
  getToken,
}: {
  c: ExtendedCase | undefined;
  caseId: number;
  getToken: () => Promise<string | null>;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [complaintSignOpen, setComplaintSignOpen] = useState(false);
  const [feeWaiverSignOpen, setFeeWaiverSignOpen] = useState(false);
  const { toast } = useToast();

  const hasBasicInfo = !!c?.plaintiffName && !!c?.defendantName;

  const downloadNcForm = async (endpoint: string, stateId: string) => {
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

  const downloadNcComplaint = async (signatureDataUrl?: string) => {
    const endpoint = signatureDataUrl ? "nc/aoc-cvm-200/signed" : "nc/aoc-cvm-200";
    setDownloading("nc-complaint");
    setComplaintSignOpen(false);
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
      const body: Record<string, string> = { token: dlToken };
      if (signatureDataUrl) body.signatureDataUrl = signatureDataUrl;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const downloadNcFeeWaiver = async (signatureDataUrl?: string) => {
    const endpoint = signatureDataUrl ? "nc/aoc-g-106/signed" : "nc/aoc-g-106";
    setDownloading("nc-fee-waiver");
    setFeeWaiverSignOpen(false);
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
      const body: Record<string, string> = { token: dlToken };
      if (signatureDataUrl) body.signatureDataUrl = signatureDataUrl;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Court Forms &amp; Filing</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">North Carolina small claims (magistrate court)</p>
      </div>

      {/* AOC-CVM-200 Complaint */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            NC Form
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">Complaint for Money Owed</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo ? "AOC-CVM-200 — primary filing form, file with the clerk" : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => setComplaintSignOpen(true)}
          disabled={!hasBasicInfo || downloading === "nc-complaint"}
          title={hasBasicInfo ? "Sign & Download AOC-CVM-200" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "nc-complaint" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "nc-complaint" ? "Generating…" : "Download"}
        </Button>
      </div>

      <SignaturePadModal
        open={complaintSignOpen}
        onClose={() => setComplaintSignOpen(false)}
        onSign={(dataUrl) => downloadNcComplaint(dataUrl)}
        onSkipSign={() => downloadNcComplaint()}
        formTitle="NC Complaint for Money Owed (AOC-CVM-200)"
        disclaimer="By signing, you declare that the information in this Complaint is true and correct to the best of your knowledge."
      />

      {/* AOC-CVM-100 Summons */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            NC Form
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">Magistrate's Summons</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo ? "AOC-CVM-100 — bring to clerk; clerk completes and issues it" : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => downloadNcForm("nc/aoc-cvm-100", "nc-summons")}
          disabled={!hasBasicInfo || downloading === "nc-summons"}
          title={hasBasicInfo ? "Download AOC-CVM-100" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "nc-summons" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "nc-summons" ? "Generating…" : "Download"}
        </Button>
      </div>

      {/* AOC-G-106 Fee Waiver */}
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm${!hasBasicInfo ? " opacity-60" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#0d6b5e]/10">
            <FileCheck2 className="h-4 w-4 text-[#0d6b5e]" />
          </div>
          <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none bg-teal-100 text-teal-700">
            NC Form
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">Petition to Sue as Indigent</p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 leading-none">
              AI Pre-filled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
            {hasBasicInfo ? "AOC-G-106 — optional fee waiver if you cannot afford the $96 filing fee" : "Complete Step 1 (parties info) to enable"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 shrink-0 gap-1.5 text-xs${hasBasicInfo ? " text-[#0d6b5e] hover:text-[#0a5a4e]" : " text-muted-foreground"}`}
          onClick={() => setFeeWaiverSignOpen(true)}
          disabled={!hasBasicInfo || downloading === "nc-fee-waiver"}
          title={hasBasicInfo ? "Sign & Download AOC-G-106" : "Complete Step 1 (parties info) to enable"}
        >
          {downloading === "nc-fee-waiver" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloading === "nc-fee-waiver" ? "Generating…" : "Download"}
        </Button>
      </div>

      <SignaturePadModal
        open={feeWaiverSignOpen}
        onClose={() => setFeeWaiverSignOpen(false)}
        onSign={(dataUrl) => downloadNcFeeWaiver(dataUrl)}
        onSkipSign={() => downloadNcFeeWaiver()}
        formTitle="NC Petition to Sue as Indigent (AOC-G-106)"
        disclaimer="By signing, you declare under penalty of perjury that the information in this Petition is true and correct."
      />

      {/* Filing info */}
      <div className="rounded-xl border bg-card px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight mb-1.5">Filing in North Carolina — Next Steps</p>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Print the Complaint (AOC-CVM-200) and bring it — along with the pre-filled Summons (AOC-CVM-100) — to the clerk of court in the county where the defendant lives or the dispute occurred.</li>
            <li>Pay the $96 filing fee at the clerk's window (or file the AOC-G-106 fee waiver if you cannot afford it).</li>
            <li>The clerk completes and issues the Summons. The sheriff then serves the defendant automatically — no action needed on your part.</li>
            <li>The court will mail a hearing date notice to both parties within approximately 30 days. Attend the hearing before a magistrate.</li>
          </ol>
        </div>
      </div>

      {/* NC Filing fees */}
      <div className="rounded-xl border bg-amber-50 border-amber-200 px-4 py-3">
        <p className="text-xs font-semibold text-amber-800 mb-1.5">NC Filing &amp; Service Fees</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {[
            ["Filing fee",        "$96"],
            ["Sheriff service",   "$30"],
          ].map(([label, fee]) => (
            <div key={label} className="flex justify-between text-[11px] text-amber-900">
              <span>{label}</span>
              <span className="font-semibold">{fee}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-amber-700 mt-1.5">Both fees are recoverable as court costs if you win (G.S. 7A-305). Claim limit: $10,000.</p>
      </div>
    </div>
  );
}

// ─── NC case info (AI E-Filing System tab body) ───────────────────────────────

function NcEFilingPanel({
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
      <FilingSummaryPanel c={c} jurisdictionState="NC" />

      {/* RIGHT — NC-specific content */}
      <div className="space-y-6">
        <NcCourtFormsSection c={c} caseId={caseId} getToken={getToken} />
      </div>
    </div>
  );
}

// ─── AZ case info (E-File & Serve tab body — in-person only, no e-filing) ─────

function AzEFilingPanel({ c }: { c: ExtendedCase | undefined }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* LEFT — Case info */}
      <FilingSummaryPanel c={c} jurisdictionState="AZ" />

      {/* RIGHT — AZ-specific filing & service content */}
      <div className="space-y-5">
        {/* No e-filing notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-900">Arizona small claims — in-person filing only</p>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Arizona Justice Courts do not offer online e-filing for small claims cases. File your Complaint (LJSC00001F) in person at the justice court clerk's office in the precinct where the defendant lives or where the transaction occurred. Pay the $25 filing fee at the window.
          </p>
          <a
            href="https://www.azcourts.gov/selfservicecenter/small-claims"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
          >
            Arizona Courts Small Claims Self-Help ↗
          </a>
        </div>

        {/* Service methods */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#0d6b5e] border-b border-[#0d6b5e]/20 pb-1.5 flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" /> Serving the Defendant
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>You must arrange service — the court does not serve for you</strong> (A.R.S. § 22-513). File Proof of Service (LJSC00003F) within 45 days of filing your Complaint (Ariz. R. Small Claims P. 5).
          </p>
          {[
            { icon: Mail, title: "Certified / Registered Mail (easiest)", desc: "Send summons and complaint by registered or certified mail with return receipt. If refused or unclaimed, use personal service." },
            { icon: Shield, title: "Constable or Sheriff", desc: "Contact the constable or sheriff's office in the defendant's precinct or county to schedule personal service and pay the service fee." },
            { icon: User, title: "Licensed Process Server", desc: "Hire a licensed process server (must be 18+ and not a party). Get an affidavit of service for your records and file it with the court." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-3 items-start">
              <div className="h-7 w-7 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-3.5 w-3.5 text-[#0d6b5e]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Key rules */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#0d6b5e] border-b border-[#0d6b5e]/20 pb-1.5">Key Arizona Rules</h3>
          {[
            "Claim limit: $5,000 (A.R.S. § 22-503, excluding interest and court costs)",
            "Hearing typically within 30–70 days of filing",
            "No attorneys allowed unless all parties stipulate (A.R.S. § 22-512)",
            "Judgments are final — no appeal from a small claims decision (A.R.S. § 22-519)",
            "10-year judgment validity; post-judgment interest at 10%/yr (A.R.S. § 44-1201)",
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-[#0d6b5e] shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>
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
  serviceMethod,
  onSelectService,
}: {
  c: ExtendedCase | undefined;
  caseId: number;
  getToken: () => Promise<string | null>;
  serviceMethod: string | null | undefined;
  onSelectService: (method: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* LEFT — Case info */}
      <FilingSummaryPanel c={c} jurisdictionState="TX" />

      {/* RIGHT — TX-specific content */}
      <div className="space-y-6">
        <TxCourtFormsSection c={c} caseId={caseId} getToken={getToken} />
        <TxServiceSection serviceMethod={serviceMethod} onSelectService={onSelectService} />
        <TxDeadlinesSection />
      </div>
    </div>
  );
}

// ─── Tyler EFM types ──────────────────────────────────────────────────────────

type EligibilityResult = {
  eligible: boolean;
  reason?: "coming_soon" | "not_available";
  state: string;
  cliCode?: string;
  courtName?: string | null;
  courtFeeAmount?: number | null;
  convenienceFeeAmount?: number | null;
  togaUrl?: string | null;
  forms?: Array<{ name: string; formKey: string }>;
  message?: string;
};

type EfileStatusResult = {
  efilingStatus: string | null;
  efilingEnvelopeId: string | null;
  submissions: Array<{
    id: number;
    status: string;
    envelopeId: string | null;
    rejectionReason: string | null;
    submittedAt: string | null;
    acceptedAt: string | null;
    rejectedAt: string | null;
  }>;
};

// ─── File Now Modal ───────────────────────────────────────────────────────────

function FileNowModal({
  open,
  onClose,
  eligibility,
  caseId,
  getToken,
}: {
  open: boolean;
  onClose: () => void;
  eligibility: EligibilityResult;
  caseId: number;
  getToken: () => Promise<string | null>;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ reason: string; message: string } | null>(null);
  const [togaPaymentToken, setTogaPaymentToken] = useState<string | null>(null);

  // TOGA postMessage listener — PENDING VENDOR CONFIRMATION
  //
  // Tyler Technologies has not yet publicly documented the exact postMessage event shape
  // for TOGA (Tyler Online Gateway for Attorneys) payment tokenization.
  //
  // REQUIRED ACTION (Phase 0 onboarding):
  //   Ask Tyler (EFMinfo@tylertech.com) to confirm ALL of the following:
  //     1. Field name: is the payment token sent as `token`, `paymentToken`, `togaToken`,
  //        or something else entirely?
  //     2. Event type: does the message set event.data.type to a specific string
  //        (e.g. "TOGA_PAYMENT_COMPLETE") that we should check before reading the token?
  //     3. Allowed origin: what origin does the TOGA iframe postMessage from?
  //        (Currently derived from togaUrl — confirm this is correct.)
  //     4. Sandbox URL: request a Stage/sandbox TOGA URL so the full payment flow
  //        can be end-to-end tested before going live.
  //
  // Once Tyler confirms the spec, update this listener to:
  //   - Check event.data.type === "<confirmed type string>" (if applicable)
  //   - Read only the confirmed field name (remove the defensive ?? chain below)
  //   - Verify the confirmed origin matches the togaUrl pattern we use
  //   - Update FilingEnvelope.togaPaymentToken field in tyler-efm/client.ts with
  //     a comment referencing the confirmed Tyler spec document/ticket number.
  //
  // Current implementation: defensively tries all three candidate field names so the
  // flow works regardless of which one Tyler actually uses. This is intentional interim
  // behavior — do NOT remove the fallbacks until Tyler has confirmed the spec.
  useEffect(() => {
    if (!open) return;
    const handleMessage = (event: MessageEvent) => {
      if (!eligibility.togaUrl) return;
      try {
        const origin = new URL(eligibility.togaUrl).origin;
        if (event.origin !== origin) return;
      } catch {
        return;
      }
      const data = event.data as Record<string, unknown> | null;
      if (!data) return;
      // TODO(tyler-toga-spec): Once Tyler confirms the field name, keep only the
      // confirmed key here and remove the others.
      const token =
        (data.token as string | undefined) ??
        (data.paymentToken as string | undefined) ??
        (data.togaToken as string | undefined);
      if (token) {
        setTogaPaymentToken(token);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, eligibility.togaUrl]);

  if (!open) return null;

  const courtFee = eligibility.courtFeeAmount != null
    ? (eligibility.courtFeeAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
    : null;
  const convFee = eligibility.convenienceFeeAmount != null
    ? (eligibility.convenienceFeeAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "$25.00";
  const totalFee = (eligibility.courtFeeAmount ?? 0) + (eligibility.convenienceFeeAmount ?? 2500);
  const totalFeeStr = (totalFee / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/efile/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cliCode: eligibility.cliCode, togaPaymentToken: togaPaymentToken ?? "" }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; reason?: string; envelopeId?: string };
      if (!res.ok) {
        setSubmitError({
          reason: json.reason ?? "efm_error",
          message: json.error ?? "Submission failed. Please try again.",
        });
      } else {
        setStep(5);
      }
    } catch {
      setSubmitError({ reason: "network_error", message: "Network error. Please check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: "Packet Review" },
    { num: 2, label: "Court Fee" },
    { num: 3, label: "Service Fee" },
    { num: 4, label: "Confirm & File" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-background rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-[#0d6b5e]/10 flex items-center justify-center">
              <Send className="h-3.5 w-3.5 text-[#0d6b5e]" />
            </div>
            <span className="text-sm font-bold text-foreground">File with the Court</span>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Step progress */}
        {step <= 4 && (
          <div className="flex items-center gap-1 px-5 py-3 border-b shrink-0">
            {steps.map(({ num, label }) => (
              <div key={num} className="flex items-center gap-1 flex-1">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  step > num ? "bg-[#0d6b5e] text-white" :
                  step === num ? "bg-[#0d6b5e]/10 text-[#0d6b5e] border border-[#0d6b5e]" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {step > num ? <CheckCircle className="h-3 w-3" /> : num}
                </div>
                <span className={`text-[10px] font-medium truncate ${step === num ? "text-[#0d6b5e]" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {num < 4 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        )}

        {/* Step content */}
        <div className="overflow-y-auto flex-1 px-5 py-5">

          {/* Step 1: Packet review */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-0.5">Review Your Filing Packet</h3>
                <p className="text-xs text-muted-foreground">These documents will be submitted to the court electronically.</p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Landmark className="h-3.5 w-3.5 text-[#0d6b5e]" />
                  <span className="text-xs font-semibold text-foreground">{eligibility.courtName ?? "Your Court"}</span>
                </div>
                <div className="space-y-2">
                  {(eligibility.forms ?? []).map((f) => (
                    <div key={f.formKey} className="flex items-center gap-2">
                      <FileCheck2 className="h-3.5 w-3.5 text-[#0d6b5e] shrink-0" />
                      <span className="text-xs text-foreground">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-amber-50 border-amber-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-800">Fee Breakdown</p>
                <div className="space-y-1">
                  {courtFee && (
                    <div className="flex justify-between text-xs text-amber-900">
                      <span>Court filing fee</span>
                      <span className="font-medium">{courtFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-amber-900">
                    <span>Small Claims Genie service fee</span>
                    <span className="font-medium">{convFee}</span>
                  </div>
                  {courtFee && (
                    <div className="flex justify-between text-xs font-bold text-amber-900 border-t border-amber-200 pt-1 mt-1">
                      <span>Total</span>
                      <span>{totalFeeStr}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: TOGA court fee payment */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-0.5">Pay Court Filing Fee</h3>
                <p className="text-xs text-muted-foreground">
                  Court fees are paid through Tyler's secure payment system (TOGA).{courtFee ? ` Amount: ${courtFee}` : ""}
                </p>
              </div>

              {eligibility.togaUrl ? (
                togaPaymentToken ? (
                  <div className="rounded-xl border border-[#0d6b5e]/20 bg-[#0d6b5e]/5 p-6 flex flex-col items-center gap-3 text-center">
                    <div className="h-12 w-12 rounded-full bg-[#0d6b5e]/10 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-[#0d6b5e]" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Payment Received</p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                      Your court filing fee has been authorized. Click Continue to pay the service fee.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <iframe
                      src={eligibility.togaUrl}
                      title="Tyler TOGA Court Fee Payment"
                      className="w-full"
                      style={{ height: "420px", border: "none" }}
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                    />
                  </div>
                )
              ) : (
                <div className="rounded-xl border bg-card p-6 flex flex-col items-center gap-3 text-center">
                  <div className="h-12 w-12 rounded-full bg-[#0d6b5e]/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-[#0d6b5e]" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Tyler TOGA Payment</p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                    Tyler's secure court fee payment portal (TOGA) will open here once e-filing credentials are fully configured. Your payment information stays private and goes directly to the court.
                  </p>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 w-full text-left">
                    <p className="text-xs font-semibold text-blue-800 mb-1">What is TOGA?</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      TOGA (Tyler Online Gateway for Attorneys) is Tyler Technologies' payment tokenization system used by courts nationwide. Your card details are never stored on our servers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Stripe convenience fee */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-0.5">Small Claims Genie Service Fee</h3>
                <p className="text-xs text-muted-foreground">
                  Authorize the {convFee} service fee to cover e-filing preparation and submission.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-6 flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-[#0d6b5e]/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-[#0d6b5e]" />
                </div>
                <p className="text-sm font-semibold text-foreground">Stripe Secure Checkout</p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  Your Stripe checkout will open here to authorize the service fee. This covers AI form preparation, ECF 5 packet assembly, and submission monitoring.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">What's included</p>
                {[
                  "AI-assisted form pre-fill and review",
                  "ECF 5 compliant filing packet assembly",
                  "Electronic submission to court",
                  "Status tracking and notifications",
                  "Rejection reason guidance if needed",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-[#0d6b5e] shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Confirm & submit */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-0.5">Ready to File</h3>
                <p className="text-xs text-muted-foreground">
                  Review the summary below and confirm to submit your filing to the court.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Court</span>
                    <span className="font-medium text-foreground text-right max-w-[60%]">{eligibility.courtName ?? "Your Court"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documents</span>
                    <span className="font-medium text-foreground">{eligibility.forms?.length ?? 0} forms</span>
                  </div>
                  {courtFee && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Court fee</span>
                      <span className="font-medium text-foreground">{courtFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service fee</span>
                    <span className="font-medium text-foreground">{convFee}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#0d6b5e]/20 bg-[#0d6b5e]/5 px-4 py-3 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-[#0d6b5e] shrink-0 mt-0.5" />
                <p className="text-xs text-[#0d6b5e] leading-relaxed">
                  By clicking "File Now" you authorize Small Claims Genie to submit your filing packet to the court on your behalf. You will receive an email confirmation and status updates.
                </p>
              </div>
              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <p className="text-xs font-bold text-red-800">
                      {submitError.reason === "credentials_not_configured"
                        ? "E-filing is being activated for this court"
                        : "Submission error"}
                    </p>
                  </div>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {submitError.reason === "credentials_not_configured"
                      ? "Tyler e-filing credentials for this court are not yet active. Download your forms and file in person while we finish the integration."
                      : submitError.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Submitted */}
          {step === 5 && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="h-14 w-14 rounded-full bg-[#0d6b5e]/10 flex items-center justify-center">
                <PackageCheck className="h-7 w-7 text-[#0d6b5e]" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Filing Submitted</p>
                <p className="text-xs text-muted-foreground mt-1">Your filing packet has been sent to the court. You will receive an email with your envelope ID and status updates.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t shrink-0">
          {step > 1 && step <= 4 ? (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}
          {step === 5 ? (
            <Button size="sm" className="text-xs bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white" onClick={onClose}>
              Done
            </Button>
          ) : step < 4 ? (
            <Button
              size="sm"
              className="text-xs bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white gap-1.5"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 2 && !!eligibility.togaUrl && !togaPaymentToken}
            >
              Continue
              <ChevronRight className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white gap-1.5"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {submitting ? "Filing…" : "File Now"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── E-file status card ───────────────────────────────────────────────────────

function EfileStatusCard({ status }: {
  status: EfileStatusResult;
}) {
  const latest = status.submissions[status.submissions.length - 1];
  if (!latest) return null;

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
    submitted:    { label: "Submitted — Awaiting Review", color: "text-blue-700",  bg: "bg-blue-50",  border: "border-blue-200", icon: Clock },
    under_review: { label: "Under Clerk Review",          color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: RefreshCw },
    accepted:     { label: "Accepted by Court",           color: "text-[#0d6b5e]", bg: "bg-[#0d6b5e]/5", border: "border-[#0d6b5e]/20", icon: CheckCircle },
    rejected:     { label: "Rejected — Action Required",  color: "text-red-700",   bg: "bg-red-50",   border: "border-red-200", icon: AlertCircle },
  };

  const cfg = statusConfig[latest.status] ?? statusConfig["submitted"];
  const Icon = cfg.icon;

  const timestamp = latest.acceptedAt ?? latest.rejectedAt ?? latest.submittedAt;
  const dateStr = timestamp ? new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${cfg.color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
          {latest.envelopeId && (
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Envelope {latest.envelopeId}</p>
          )}
        </div>
        {dateStr && <p className="text-[10px] text-muted-foreground shrink-0">{dateStr}</p>}
      </div>
      {latest.status === "rejected" && latest.rejectionReason && (
        <div className="rounded-lg bg-red-100 border border-red-200 px-3 py-2 space-y-1">
          <p className="text-[11px] font-semibold text-red-800">Rejection reason:</p>
          <p className="text-[11px] text-red-700 leading-relaxed">{latest.rejectionReason}</p>
          <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
            <span className="font-semibold">What to do:</span> Review the reason above, correct your filing, and resubmit. Contact the court clerk if you need clarification.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tyler EFM eligibility + filing section ───────────────────────────────────

function TylerEFilingSection({
  caseId,
  getToken,
}: {
  caseId: number;
  getToken: () => Promise<string | null>;
}) {
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [efileStatus, setEfileStatus] = useState<EfileStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const token = await getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const [eligRes, statusRes] = await Promise.all([
          fetch(`/api/cases/${caseId}/efile/eligibility`, { headers }),
          fetch(`/api/cases/${caseId}/efile/status`, { headers }),
        ]);

        if (!cancelled) {
          if (eligRes.ok) setEligibility(await eligRes.json() as EligibilityResult);
          if (statusRes.ok) setEfileStatus(await statusRes.json() as EfileStatusResult);
        }
      } catch {
        // silently fail — eligibility block is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAll();
    return () => { cancelled = true; };
  }, [caseId, getToken]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3 animate-pulse">
        <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-40 bg-muted rounded" />
          <div className="h-2.5 w-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!eligibility) return null;

  if (eligibility.eligible) {
    const courtFee = eligibility.courtFeeAmount != null
      ? (eligibility.courtFeeAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
      : null;
    const convFee = eligibility.convenienceFeeAmount != null
      ? (eligibility.convenienceFeeAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
      : "$25.00";

    return (
      <div className="space-y-3">
        {/* Eligibility banner */}
        <div className="rounded-xl border border-[#0d6b5e]/30 bg-[#0d6b5e]/5 px-4 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#0d6b5e]/10 flex items-center justify-center shrink-0">
              <Send className="h-4 w-4 text-[#0d6b5e]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-foreground leading-tight">E-Filing Available</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0d6b5e] text-white leading-none">
                  Tyler EFM
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {eligibility.courtName} accepts electronic filings through Tyler's statewide e-filing system.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {courtFee && (
              <div className="rounded-lg bg-white/70 border px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Court fee</p>
                <p className="text-sm font-bold text-foreground">{courtFee}</p>
              </div>
            )}
            <div className="rounded-lg bg-white/70 border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Service fee</p>
              <p className="text-sm font-bold text-foreground">{convFee}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground">Documents in your packet:</p>
            {(eligibility.forms ?? []).map((f) => (
              <div key={f.formKey} className="flex items-center gap-1.5">
                <FileCheck2 className="h-3 w-3 text-[#0d6b5e] shrink-0" />
                <span className="text-[11px] text-foreground">{f.name}</span>
              </div>
            ))}
          </div>
          <Button
            className="w-full bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white gap-2"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            <Send className="h-3.5 w-3.5" />
            File Now — Submit Electronically
          </Button>
        </div>

        {/* Status card if there's a prior submission */}
        {efileStatus && <EfileStatusCard status={efileStatus} />}

        {showModal && (
          <FileNowModal
            open={showModal}
            onClose={() => setShowModal(false)}
            eligibility={eligibility}
            caseId={caseId}
            getToken={getToken}
          />
        )}
      </div>
    );
  }

  if (eligibility.reason === "coming_soon") {
    const stateName = eligibility.state === "TX" ? "Texas" : eligibility.state === "IL" ? "Illinois" : eligibility.state;
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-amber-900 leading-tight">E-Filing Coming Soon</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white leading-none">
                Tyler EFM
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              {stateName} has a statewide Tyler e-filing mandate. We are completing the Tyler onboarding process — e-filing will be available soon. Download your forms and file in person in the meantime.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Tab content panels ───────────────────────────────────────────────────────

function EFilingPanel({
  c,
  caseId,
  getToken,
  onProcessServerClick,
  serviceMethod,
  onSelectService,
}: {
  c: ExtendedCase | undefined;
  caseId: number;
  getToken: () => Promise<string | null>;
  onProcessServerClick: () => void;
  serviceMethod: string | null | undefined;
  onSelectService: (method: string) => void;
}) {
  const isAZ = (c?.jurisdictionState as string) === "AZ";

  const statePanel = (() => {
    if (c?.jurisdictionState === "FL") {
      return <FlEFilingPanel c={c} caseId={caseId} getToken={getToken} onProcessServerClick={onProcessServerClick} serviceMethod={serviceMethod} onSelectService={onSelectService} />;
    }
    if (c?.jurisdictionState === "TX") {
      return <TxEFilingPanel c={c} caseId={caseId} getToken={getToken} serviceMethod={serviceMethod} onSelectService={onSelectService} />;
    }
    if ((c?.jurisdictionState as string) === "IL") {
      return <IlEFilingPanel c={c} caseId={caseId} getToken={getToken} onProcessServerClick={onProcessServerClick} />;
    }
    if ((c?.jurisdictionState as string) === "NC") {
      return <NcEFilingPanel c={c} caseId={caseId} getToken={getToken} />;
    }
    if (isAZ) {
      return <AzEFilingPanel c={c} />;
    }
    return <CaEFilingPanel c={c} caseId={caseId} getToken={getToken} />;
  })();

  return (
    <div className="space-y-6">
      {!isAZ && <TylerEFilingSection caseId={caseId} getToken={getToken} />}
      {statePanel}
    </div>
  );
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

function CollectPanel({ jurisdictionState }: { jurisdictionState: "CA" | "FL" | "TX" | "IL" | "NC" | "AZ" }) {
  const isFL = jurisdictionState === "FL";
  const isTX = jurisdictionState === "TX";
  const isIL = jurisdictionState === "IL";
  const isNC = jurisdictionState === "NC";
  const isAZ = jurisdictionState === "AZ";

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

  const ilSteps = [
    {
      icon: Gavel,
      title: "Obtain your judgment",
      desc: "After you win, the court enters a judgment in your favor. Get a certified copy from the circuit court clerk — you will need it for every collection step.",
    },
    {
      icon: TrendingUp,
      title: "Citation to Discover Assets (735 ILCS 5/2-1402)",
      desc: "File a Citation to Discover Assets with the circuit court to compel the defendant to appear and disclose their bank accounts, employer, and property under oath. The court can hold a non-complying defendant in contempt.",
    },
    {
      icon: FileCheck2,
      title: "Wage Deduction Order",
      desc: "After serving a citation on the defendant's employer, the court issues a Wage Deduction Order directing the employer to withhold a portion of the defendant's wages each pay period and pay it to you (735 ILCS 5/12-801 et seq.).",
    },
    {
      icon: Shield,
      title: "Bank Account Citation (Non-Wage Garnishment)",
      desc: "Serve a citation directly on the defendant's bank to freeze and turn over funds in the account. You must identify the bank and branch — information gathered during the Citation to Discover Assets hearing.",
    },
    {
      icon: FileCheck2,
      title: "Judgment Lien on Real Estate",
      desc: "Record a certified copy of the judgment with the recorder of deeds in any Illinois county where the defendant owns real property to create a judgment lien (735 ILCS 5/12-101). The lien attaches to all non-exempt real estate the defendant owns or later acquires in that county.",
    },
    {
      icon: RefreshCw,
      title: "Judgment valid for 7 years — renewable",
      desc: "An Illinois judgment is enforceable for 7 years from entry and can be renewed for additional 7-year periods before expiration (735 ILCS 5/12-108). Post-judgment interest accrues at 9% per year (735 ILCS 5/2-1303).",
    },
  ];

  const ncSteps = [
    {
      icon: Gavel,
      title: "Obtain your judgment",
      desc: "After you win, the magistrate enters a judgment in your favor. Get a certified copy from the clerk of court — you will need it for every collection step.",
    },
    {
      icon: TrendingUp,
      title: "Supplemental proceedings (debtor examination)",
      desc: "You can file a motion to require the defendant to appear in court and disclose their bank accounts, employer, and assets under oath. The court can hold a non-complying defendant in contempt.",
    },
    {
      icon: Shield,
      title: "Writ of Execution (personal property &amp; bank accounts)",
      desc: "Direct the county sheriff to seize the defendant's non-exempt personal property or levy a bank account using a Writ of Execution issued by the clerk. You must identify the bank and branch.",
    },
    {
      icon: FileCheck2,
      title: "Judgment lien on real property",
      desc: "File an Abstract of Judgment (also called a transcript of judgment) with the Register of Deeds in any NC county where the defendant owns real estate to create a lien against that property.",
    },
    {
      icon: Clock,
      title: "No wage garnishment for private debt",
      desc: "North Carolina does not allow wage garnishment for private civil judgments. G.S. 110-136 restricts wage garnishment to child support and certain government debts only — do not attempt it.",
    },
    {
      icon: RefreshCw,
      title: "Your judgment is valid for 10 years",
      desc: "NC judgments are enforceable for 10 years and can be renewed (docketed anew) before expiration. Post-judgment interest accrues at the legal rate set by G.S. 24-1 (currently 8% per year).",
    },
  ];

  const azSteps = [
    {
      icon: Gavel,
      title: "Obtain your judgment",
      desc: "After you win, the justice court enters a judgment in your favor. Get a certified copy from the clerk — you will need it for every collection step.",
    },
    {
      icon: TrendingUp,
      title: "Debtor's Examination (A.R.S. § 12-1631)",
      desc: "File a request for a Debtor's Examination to compel the defendant to appear in court and disclose bank accounts, employer, and property under oath. The justice court schedules the hearing.",
    },
    {
      icon: FileCheck2,
      title: "Wage garnishment",
      desc: "File a Writ of Garnishment with the court and serve the defendant's employer. Arizona limits garnishment to 25% of disposable earnings per pay period (A.R.S. § 33-1131).",
    },
    {
      icon: Shield,
      title: "Bank levy",
      desc: "Use a Writ of Execution to direct the constable or sheriff to levy the defendant's bank account. Identify the bank and branch during the Debtor's Examination.",
    },
    {
      icon: MapPin,
      title: "Judgment lien on real estate",
      desc: "Record a certified copy of your judgment with the County Recorder in any Arizona county where the defendant owns real property to create a judgment lien on their real estate.",
    },
    {
      icon: RefreshCw,
      title: "Valid for 10 years — renew before expiration",
      desc: "Arizona judgments are enforceable for 10 years and may be renewed for an additional 10-year term before expiration (A.R.S. § 12-1551, § 12-1611). Post-judgment interest accrues at 10% per year (A.R.S. § 44-1201).",
    },
  ];

  const steps = isAZ ? azSteps : isNC ? ncSteps : isIL ? ilSteps : isTX ? txSteps : isFL ? flSteps : caSteps;
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
            in your pocket. {isAZ ? "Arizona" : isNC ? "North Carolina" : isIL ? "Illinois" : isTX ? "Texas" : isFL ? "Florida" : "California"} gives you several enforcement methods to collect what you are owed.
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
  const [serviceMethod, setServiceMethod] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: caseData, refetch: refetchCase } = useGetCase(caseId, { query: { enabled: !!caseId } });
  const c = caseData as ExtendedCase | undefined;

  const jurisdictionState: "CA" | "FL" | "TX" | "IL" | "NC" | "AZ" = c?.jurisdictionState === "FL" ? "FL" : c?.jurisdictionState === "TX" ? "TX" : (c?.jurisdictionState as string) === "IL" ? "IL" : (c?.jurisdictionState as string) === "NC" ? "NC" : (c?.jurisdictionState as string) === "AZ" ? "AZ" : "CA";

  // Sync local state from case data once loaded (only initialises — does not override in-flight changes)
  const [serviceMethodInitialised, setServiceMethodInitialised] = useState(false);
  useEffect(() => {
    if (!serviceMethodInitialised && c !== undefined) {
      setServiceMethod(c.notifyMethod ?? null);
      setServiceMethodInitialised(true);
    }
  }, [c, serviceMethodInitialised]);

  const saveServiceMethod = async (method: string) => {
    const newValue = serviceMethod === method ? null : method;
    const previous = serviceMethod;
    setServiceMethod(newValue);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ notifyMethod: newValue }),
      });
      if (!res.ok) throw new Error("Save failed");
      void refetchCase();
    } catch {
      toast({ title: "Could not save service method", description: "Please try again.", variant: "destructive" });
      setServiceMethod(previous);
    }
  };

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
            <EFilingPanel c={c} caseId={caseId} getToken={getToken} onProcessServerClick={() => setActiveTab("process_server")} serviceMethod={serviceMethod} onSelectService={saveServiceMethod} />
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
