import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOverview,
  fetchUsers,
  fetchCaseAnalytics,
  fetchRevenue,
  fetchSystem,
  fetchSignups,
  fetchNotifications,
  fetchErrors,
  fetchStatus,
  fetchBeta,
  fetchGenieConversions,
  fetchTestCases,
  fetchAdminClerkId,
  fetchCaseDetail,
  fetchAdminDocumentBlob,
  fetchHearings,
  fetchStuckCases,
  grantBeta,
  revokeBeta,
  createTestCase,
  deleteTestCase,
  clearErrors,
  setNotifications,
  clearStoredKey,
  type UserRow,
  type CaseRow,
  type CaseDetail,
  type ErrorEntry,
  type StatusData,
  type BetaData,
  type BetaRow,
  type HearingRow,
  type StuckCaseRow,
  type GenieConversionRow,
  type TestCaseRow,
} from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  FileText,
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle,
  RefreshCw,
  LogOut,
  Bell,
  BellOff,
  Activity,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Search,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Database,
  Cpu,
  UserCheck,
  ShieldCheck,
  FlaskConical,
  ExternalLink,
  Plus,
  Filter,
  Eye,
  Mail,
  MapPin,
  Phone,
  Clock,
  UserPlus,
  UserMinus,
  XCircle,
  Download,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  intake_complete: "Intake Complete",
  documents_uploaded: "Docs Uploaded",
  ready_to_file: "Ready to File",
  filed: "Filed",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  intake_complete: "bg-blue-100 text-blue-700",
  documents_uploaded: "bg-yellow-100 text-yellow-700",
  ready_to_file: "bg-green-100 text-green-700",
  filed: "bg-purple-100 text-purple-700",
};

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function fmtUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: "blue" | "green" | "purple" | "amber";
}) {
  const bg = { blue: "bg-blue-50", green: "bg-green-50", purple: "bg-purple-50", amber: "bg-amber-50" }[color];
  const ic = { blue: "text-blue-600", green: "text-green-600", purple: "text-purple-600", amber: "text-amber-600" }[color];
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
          <Icon className={`h-6 w-6 ${ic}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
          {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Case Detail Drawer ────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b pb-1">{title}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
    </div>
  );
}

function ReadinessBar({ value, max, label, earned }: { value: number; max: number; label: string; earned: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-medium text-gray-700">{earned} / {max} pts</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ReadinessSection({
  readinessScore,
  intakeScore,
  docScore,
  demandScore,
  documentCount,
}: {
  readinessScore: number;
  intakeScore: number;
  docScore: number;
  demandScore: number;
  documentCount: number;
}) {
  const score = readinessScore;

  const barColor =
    score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-400" : "bg-red-500";
  const labelColor =
    score >= 80 ? "text-green-700" : score >= 50 ? "text-amber-700" : "text-red-600";

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b pb-1">Readiness</h4>

      {/* Overall bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-gray-500">Overall score</span>
          <span className={`text-sm font-bold ${labelColor}`}>{score} / 100</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Sub-score breakdown */}
      <div className="space-y-2 pt-1">
        <ReadinessBar label="Intake" max={60} value={intakeScore} earned={intakeScore} />
        <ReadinessBar label={`Documents (${documentCount} uploaded)`} max={30} value={docScore} earned={docScore} />
        <ReadinessBar label="Demand letter" max={10} value={demandScore} earned={demandScore} />
      </div>
    </div>
  );
}

function CaseDetailDrawer({ caseId, onClose }: { caseId: number | null; onClose: () => void }) {
  const { data, isLoading, error } = useQuery<CaseDetail>({
    queryKey: ["case-detail", caseId],
    queryFn: () => fetchCaseDetail(caseId!),
    enabled: caseId !== null,
  });

  const [docLoading, setDocLoading] = useState<Set<string>>(new Set());
  const [demandOpen, setDemandOpen] = useState(false);

  const openDoc = async (docId: number) => {
    const key = `view-${docId}`;
    setDocLoading((s) => new Set(s).add(key));
    try {
      const { blob, filename } = await fetchAdminDocumentBlob(docId, false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = "";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      alert(`Could not open document ${docId}.`);
    } finally {
      setDocLoading((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const downloadDoc = async (docId: number, filename: string) => {
    const key = `dl-${docId}`;
    setDocLoading((s) => new Set(s).add(key));
    try {
      const { blob, filename: serverName } = await fetchAdminDocumentBlob(docId, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = serverName || filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      alert(`Could not download document ${docId}.`);
    } finally {
      setDocLoading((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const mainAppBase = window.location.origin.replace(/\/admin.*$/, "");

  return (
    <Sheet open={caseId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">
            {isLoading ? "Loading case…" : data ? data.title : "Case Detail"}
          </SheetTitle>
          {data && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs ${STATUS_COLORS[data.status] ?? "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABELS[data.status] ?? data.status}
              </Badge>
              {data.caseNumber && (
                <span className="text-xs text-gray-500 font-mono">#{data.caseNumber}</span>
              )}
              <a
                href={`${mainAppBase}/cases/${data.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline ml-auto"
              >
                Open in App <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </SheetHeader>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
            Failed to load case details.
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* Claimant */}
            <DetailSection title="Claimant (Plaintiff)">
              <DetailRow label="Name" value={data.plaintiffName} />
              <DetailRow label="Email" value={data.plaintiffEmail} />
              <DetailRow label="Phone" value={data.plaintiffPhone} />
              <DetailRow
                label="Address"
                value={
                  [data.plaintiffAddress, data.plaintiffCity, data.plaintiffState, data.plaintiffZip]
                    .filter(Boolean).join(", ") || null
                }
              />
              {data.plaintiffIsBusiness && (
                <DetailRow label="Business / DBA" value={data.plaintiffDbaName ?? "Yes"} />
              )}
            </DetailSection>

            {/* Defendant */}
            <DetailSection title="Defendant">
              <DetailRow label="Name" value={data.defendantName} />
              <DetailRow label="Phone" value={data.defendantPhone} />
              <DetailRow
                label="Type"
                value={data.defendantIsBusinessOrEntity ? "Business / Entity" : "Individual"}
              />
              <DetailRow
                label="Address"
                value={
                  [data.defendantAddress, data.defendantCity, data.defendantState, data.defendantZip]
                    .filter(Boolean).join(", ") || null
                }
              />
            </DetailSection>

            {/* Claim Details */}
            <DetailSection title="Claim Details">
              <DetailRow label="Type" value={data.claimType} />
              <DetailRow label="Amount" value={data.claimAmount ? fmtMoney(data.claimAmount) : null} />
              <DetailRow label="Incident Date" value={fmtDate(data.incidentDate)} />
              <DetailRow label="County" value={data.countyId} />
              <DetailRow label="State" value={data.jurisdictionState} />
              <DetailRow label="Prior Demand" value={data.priorDemandMade ? `Yes${data.priorDemandDate ? ` (${fmtDate(data.priorDemandDate)})` : ""}` : "No"} />
              {data.claimDescription && (
                <div className="col-span-2">
                  <span className="text-gray-400 text-xs">Description</span>
                  <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{data.claimDescription}</p>
                </div>
              )}
              {data.howAmountCalculated && (
                <div className="col-span-2">
                  <span className="text-gray-400 text-xs">How Amount Calculated</span>
                  <p className="text-sm text-gray-800 mt-0.5">{data.howAmountCalculated}</p>
                </div>
              )}
            </DetailSection>

            {/* Hearing & Court */}
            {(data.hearingDate || data.courthouseName) && (
              <DetailSection title="Hearing & Court">
                <DetailRow label="Date" value={fmtDate(data.hearingDate)} />
                <DetailRow label="Time" value={data.hearingTime} />
                <DetailRow label="Dept / Courtroom" value={data.hearingCourtroom} />
                <DetailRow label="Judge" value={data.hearingJudge} />
                <DetailRow label="Courthouse" value={data.courthouseName} />
                <DetailRow
                  label="Court Address"
                  value={[data.courthouseAddress, data.courthouseCity, data.courthouseZip].filter(Boolean).join(", ") || null}
                />
                {data.hearingNotes && (
                  <div className="col-span-2">
                    <span className="text-gray-400 text-xs">Notes</span>
                    <p className="text-sm text-gray-800 mt-0.5">{data.hearingNotes}</p>
                  </div>
                )}
              </DetailSection>
            )}

            {/* Readiness */}
            <ReadinessSection
              readinessScore={data.readinessScore ?? 0}
              intakeScore={data.intakeScore}
              docScore={data.docScore}
              demandScore={data.demandScore}
              documentCount={data.documentCount ?? 0}
            />

            {/* Documents */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b pb-1">
                Documents ({data.documents.length})
              </h4>
              {data.documents.length === 0 ? (
                <p className="text-sm text-gray-400">No documents uploaded.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.documents.map((doc) => (
                    <div key={doc.id} className="bg-gray-50 rounded-lg px-3 py-2 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.originalName}</p>
                          {doc.label && <p className="text-xs text-gray-500">{doc.label}</p>}
                          <p className="text-xs text-gray-400">{fmtDateTime(doc.createdAt)}</p>
                        </div>
                        <Badge
                          className={`text-xs shrink-0 ${
                            doc.ocrStatus === "done"
                              ? "bg-green-100 text-green-700"
                              : doc.ocrStatus === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          OCR: {doc.ocrStatus}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 px-2"
                          disabled={docLoading.has(`view-${doc.id}`)}
                          onClick={() => openDoc(doc.id)}
                        >
                          <Eye className="h-3 w-3" />
                          {docLoading.has(`view-${doc.id}`) ? "Opening…" : "View"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 px-2"
                          disabled={docLoading.has(`dl-${doc.id}`)}
                          onClick={() => downloadDoc(doc.id, doc.originalName)}
                        >
                          <Download className="h-3 w-3" />
                          {docLoading.has(`dl-${doc.id}`) ? "Downloading…" : "Download"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Demand Letter */}
            {data.demandLetterText && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Demand Letter
                  </h4>
                  <button
                    onClick={() => setDemandOpen((v) => !v)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {demandOpen ? "Hide" : "Show"}
                  </button>
                </div>
                {demandOpen && (
                  <div className="bg-gray-50 rounded-lg p-3 max-h-72 overflow-y-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {data.demandLetterText}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Meta */}
            <div className="pt-2 border-t text-xs text-gray-400 space-y-0.5">
              <p>Case ID: {data.id}</p>
              <p>Created: {fmtDateTime(data.createdAt)}</p>
              <p>Updated: {fmtDateTime(data.updatedAt)}</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data, isLoading } = useQuery({ queryKey: ["overview"], queryFn: fetchOverview });
  if (isLoading || !data) return <LoadingSkeleton rows={2} cols={4} />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={fmt(data.totalUsers)} icon={Users} color="blue" />
        <KpiCard label="Total Cases" value={fmt(data.totalCases)} icon={FileText} color="blue" />
        <KpiCard label="Paid Activations" value={fmt(data.paidActivations)} icon={CreditCard} color="green" />
        <KpiCard label="Revenue MTD" value={fmtMoney(data.revenueMtd)} sub={`${fmtMoney(data.revenueTotal)} all-time`} icon={DollarSign} color="green" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Hearings Scheduled" value={fmt(data.hearingScheduled)} icon={Calendar} color="purple" />
        <KpiCard label="Intake Complete" value={fmt(data.intakeComplete)} icon={CheckCircle} color="amber" />
        <KpiCard
          label="Conversion Rate"
          value={data.totalUsers > 0 ? `${Math.round((data.paidActivations / data.totalUsers) * 100)}%` : "—"}
          sub="paid activations ÷ users"
          icon={TrendingUp}
          color="amber"
        />
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function HearingBadge({ c }: { c: CaseRow }) {
  if (!c.hearingDate) return null;
  const d = new Date(c.hearingDate);
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return <Badge className="bg-gray-100 text-gray-600 text-xs">Hearing passed</Badge>;
  if (days <= 7) return <Badge className="bg-red-100 text-red-700 text-xs">Hearing in {days}d</Badge>;
  if (days <= 30) return <Badge className="bg-amber-100 text-amber-700 text-xs">Hearing in {days}d</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 text-xs">Hearing {fmtDate(c.hearingDate)}</Badge>;
}

function UserRow({ user, onOpenCase }: { user: UserRow; onOpenCase: (caseId: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const upcoming = user.cases.find((c) => c.hearingDate && new Date(c.hearingDate) >= new Date());
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
  const mainAppBase = window.location.origin.replace(/\/admin.*$/, "");

  return (
    <div className="border rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900 truncate">{user.email}</span>
            {displayName && (
              <span className="text-xs text-gray-500">({displayName})</span>
            )}
            {user.hasPurchase && (
              <Badge className="bg-green-100 text-green-700 text-xs">Paid</Badge>
            )}
            {user.cases.length === 0 && (
              <Badge className="bg-gray-100 text-gray-500 text-xs">No cases</Badge>
            )}
            {upcoming && <HearingBadge c={upcoming} />}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {user.cases.length} case{user.cases.length !== 1 ? "s" : ""}
            {user.lastActivity
              ? ` · Last active ${fmtDate(user.lastActivity)}`
              : user.signupDate
              ? ` · Joined ${fmtDate(user.signupDate)}`
              : ""}
            {user.lastSignInAt && ` · Last login ${fmtDateTime(user.lastSignInAt)}`}
          </p>
        </div>
        <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[180px]" title={user.userId}>
          {user.userId.slice(0, 16)}…
        </span>
      </button>

      {expanded && (
        <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
          {/* Account info for no-case users */}
          {user.cases.length === 0 && (
            <div className="bg-white rounded-lg border p-3 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700 mb-1">Account Info</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-400">Signed up</span>
                  <p className="font-medium">{fmtDate(user.signupDate)}</p>
                </div>
                <div>
                  <span className="text-gray-400">Last login</span>
                  <p className="font-medium">{fmtDateTime(user.lastSignInAt)}</p>
                </div>
                <div>
                  <span className="text-gray-400">Status</span>
                  <p className="font-medium text-gray-500">No cases started</p>
                </div>
              </div>
            </div>
          )}

          {user.cases.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border p-3">
              <div className="flex items-start gap-2 flex-wrap mb-2">
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900 truncate">{c.title}</span>
                  <Badge className={`text-xs ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </Badge>
                  {c.caseNumber && (
                    <span className="text-xs text-gray-500 font-mono">#{c.caseNumber}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => onOpenCase(c.id)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Details
                  </Button>
                  <a
                    href={`${mainAppBase}/cases/${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    App
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400">Claim Amount</span>
                  <p className="font-medium">{c.claimAmount ? fmtMoney(c.claimAmount) : "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400">Claim Type</span>
                  <p className="font-medium">{c.claimType ?? "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400">County</span>
                  <p className="font-medium">{c.countyId ?? "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400">Readiness</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[48px]">
                      <div
                        className={`h-full rounded-full ${
                          (c.readinessScore ?? 0) >= 80
                            ? "bg-green-500"
                            : (c.readinessScore ?? 0) >= 50
                            ? "bg-amber-400"
                            : "bg-red-400"
                        }`}
                        style={{ width: `${c.readinessScore ?? 0}%` }}
                      />
                    </div>
                    <span className="font-medium shrink-0">{c.readinessScore ?? 0}/100</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Documents</span>
                  <p className="font-medium">{c.documentCount ?? 0}</p>
                </div>
                <div>
                  <span className="text-gray-400">Intake</span>
                  <p className="font-medium">{c.intakeComplete ? "✓ Complete" : "In progress"}</p>
                </div>
                {(c.courthouseName || c.courthouseAddress || c.courthouseCity) && (
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-gray-400">Court Address</span>
                    <p className="font-medium">
                      {[c.courthouseName, c.courthouseAddress, c.courthouseCity]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                )}
              </div>

              {c.hearingDate && (
                <div className="mt-2 pt-2 border-t border-dashed">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Hearing Details</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-400">Date</span>
                      <p className="font-medium">{fmtDate(c.hearingDate)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Time</span>
                      <p className="font-medium">{c.hearingTime ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Dept / Courtroom</span>
                      <p className="font-medium">{c.hearingCourtroom ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Judge</span>
                      <p className="font-medium">{c.hearingJudge ?? "—"}</p>
                    </div>
                    {c.hearingNotes && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-gray-400">Notes</span>
                        <p className="font-medium">{c.hearingNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab({
  search,
  setSearch,
  onOpenCase,
}: {
  search: string;
  setSearch: (s: string) => void;
  onOpenCase: (caseId: number) => void;
}) {
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const { data: betaData } = useQuery<BetaData>({ queryKey: ["beta"], queryFn: fetchBeta });
  const [betaOnly, setBetaOnly] = useState(false);
  const [caseSearch, setCaseSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [claimTypeFilter, setClaimTypeFilter] = useState("all");
  const [caseSort, setCaseSort] = useState<"newest" | "oldest" | "amount" | "readiness">("newest");

  if (isLoading || !data) return <LoadingSkeleton rows={5} cols={1} />;

  const betaUserIds = new Set((betaData?.rows ?? []).map((r) => r.userId));

  const filtered = data.filter((u) => {
    if (betaOnly && !betaUserIds.has(u.userId)) return false;
    if (!search) return true;
    return (
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.userId.toLowerCase().includes(search.toLowerCase())
    );
  });

  const withHearing = data.filter((u) => u.cases.some((c) => c.hearingDate)).length;
  const paid = data.filter((u) => u.hasPurchase).length;
  const betaCount = betaData?.total ?? 0;

  // Build flat case list for case search
  const allCasesWithUser = data.flatMap((u) =>
    u.cases.map((c) => ({ case: c, user: u }))
  );

  // Derive unique claim types from real data for the filter dropdown
  const claimTypes = Array.from(
    new Set(allCasesWithUser.map(({ case: c }) => c.claimType).filter(Boolean) as string[])
  ).sort();

  const caseQ = caseSearch.trim().toLowerCase();
  const filtersActive = statusFilter !== "all" || claimTypeFilter !== "all";

  const filteredCases = (caseQ || filtersActive)
    ? allCasesWithUser.filter(({ case: c }) => {
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (claimTypeFilter !== "all" && c.claimType !== claimTypeFilter) return false;
        if (!caseQ) return true;
        return (
          c.title.toLowerCase().includes(caseQ) ||
          (c.claimType ?? "").toLowerCase().includes(caseQ) ||
          (c.countyId ?? "").toLowerCase().includes(caseQ) ||
          (c.caseNumber ?? "").toLowerCase().includes(caseQ) ||
          String(c.id).includes(caseQ)
        );
      })
    : [];

  const matchedCases = [...filteredCases].sort((a, b) => {
    const ca = a.case;
    const cb = b.case;
    if (caseSort === "newest") return new Date(cb.createdAt).getTime() - new Date(ca.createdAt).getTime();
    if (caseSort === "oldest") return new Date(ca.createdAt).getTime() - new Date(cb.createdAt).getTime();
    if (caseSort === "amount") return (cb.claimAmount ?? 0) - (ca.claimAmount ?? 0);
    if (caseSort === "readiness") return (cb.readinessScore ?? 0) - (ca.readinessScore ?? 0);
    return 0;
  });

  const mainAppBase = window.location.origin.replace(/\/admin.*$/, "");

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 text-sm text-gray-600 flex-wrap">
          <span><strong>{data.length}</strong> users</span>
          <span>·</span>
          <span><strong>{paid}</strong> paid</span>
          <span>·</span>
          <span><strong>{withHearing}</strong> with hearing</span>
          {betaOnly && (
            <>
              <span>·</span>
              <span><strong>{filtered.length}</strong> of {betaCount} beta shown</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => exportUsersCSV(data)}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
          <button
            onClick={() => setBetaOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              betaOnly
                ? "bg-amber-100 border-amber-300 text-amber-800 font-medium"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <Filter className="h-3 w-3" />
            Beta users only
          </button>
          <div className="relative w-52">
            <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Search email or user ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-52">
            <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Search cases…"
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="intake_complete">Intake Complete</SelectItem>
              <SelectItem value="ready_to_file">Ready to File</SelectItem>
              <SelectItem value="filed">Filed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={claimTypeFilter} onValueChange={setClaimTypeFilter}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="All claim types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All claim types</SelectItem>
              {claimTypes.map((ct) => (
                <SelectItem key={ct} value={ct}>{ct}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Case search / filter results */}
      {(caseQ || filtersActive) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {caseQ ? "Case search" : "Filtered cases"} — {matchedCases.length} result{matchedCases.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              {filtersActive && (
                <button
                  onClick={() => { setStatusFilter("all"); setClaimTypeFilter("all"); }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              )}
              <Select value={caseSort} onValueChange={(v) => setCaseSort(v as typeof caseSort)}>
                <SelectTrigger className="h-7 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="amount">Amount (high → low)</SelectItem>
                  <SelectItem value="readiness">Readiness (high → low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {matchedCases.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No cases match{caseQ ? ` "${caseSearch}"` : ""}{filtersActive ? " the selected filters" : ""}.
            </p>
          ) : (
            <div className="space-y-2">
              {matchedCases.map(({ case: c, user: u }) => (
                <div key={c.id} className="border rounded-lg bg-white px-4 py-3">
                  <div className="flex items-start gap-2 flex-wrap mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 truncate">{c.title}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </Badge>
                        {c.caseNumber && (
                          <span className="text-xs text-gray-500 font-mono">#{c.caseNumber}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <span className="text-gray-400">Owner:</span>
                        <span className="font-medium">{u.email}</span>
                        {u.hasPurchase && (
                          <Badge className="bg-green-100 text-green-700 text-xs ml-1">Paid</Badge>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => onOpenCase(c.id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View Details
                      </Button>
                      <a
                        href={`${mainAppBase}/cases/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 h-7 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        App
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-400">Claim Type</span>
                      <p className="font-medium">{c.claimType ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">County</span>
                      <p className="font-medium">{c.countyId ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Amount</span>
                      <p className="font-medium">{c.claimAmount ? fmtMoney(c.claimAmount) : "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Case ID</span>
                      <p className="font-medium font-mono">{c.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 mb-3">All users</p>
          </div>
        </div>
      )}

      {/* User rows */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          {betaOnly ? "No beta users found." : "No users found."}
        </p>
      ) : (
        <div>
          {filtered.map((u) => (
            <UserRow key={u.userId} user={u} onOpenCase={onOpenCase} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["case-analytics"], queryFn: fetchCaseAnalytics });
  if (isLoading || !data) return <LoadingSkeleton rows={2} cols={2} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Cases by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byStatus} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => STATUS_LABELS[v] ?? v}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, "Cases"]} labelFormatter={(l) => STATUS_LABELS[l] ?? l} />
                <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Claim Amount Ranges</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.claimAmountRanges} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, "Cases"]} />
                <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Claim Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.byClaimType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ type, percent }) =>
                    percent > 0.05 ? `${type?.slice(0, 12)} ${(percent * 100).toFixed(0)}%` : ""
                  }
                  labelLine={false}
                >
                  {data.byClaimType.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Top Counties</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.byCounty}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="county" tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v) => [v, "Cases"]} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Revenue Tab ───────────────────────────────────────────────────────────────
function RevenueTab() {
  const { data, isLoading } = useQuery({ queryKey: ["revenue"], queryFn: fetchRevenue });
  if (isLoading || !data) return <LoadingSkeleton rows={6} cols={1} />;

  const total = data.reduce((s, r) => s + r.amountDollars, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm text-gray-600">
        <span><strong>{data.length}</strong> transactions shown</span>
        <span>·</span>
        <span>Shown total <strong>{fmtMoney(total)}</strong></span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 font-medium">Customer</th>
              <th className="pb-2 pr-4 font-medium">Plan</th>
              <th className="pb-2 pr-4 font-medium text-right">Amount</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((r) => (
              <tr key={r.id} className="py-2 hover:bg-gray-50">
                <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                <td className="py-2 pr-4 text-gray-900 truncate max-w-[200px]" title={r.email}>{r.email}</td>
                <td className="py-2 pr-4 text-gray-600">{r.planKey ?? "—"}</td>
                <td className="py-2 pr-4 text-right font-medium text-gray-900">{fmtMoney(r.amountDollars)}</td>
                <td className="py-2">
                  <Badge className="bg-green-100 text-green-700 text-xs">{r.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <p className="text-center text-gray-400 py-8">No revenue records yet.</p>
        )}
      </div>
    </div>
  );
}

// ── System Tab ────────────────────────────────────────────────────────────────
function SystemTab() {
  const { data, isLoading } = useQuery({ queryKey: ["system"], queryFn: fetchSystem });
  if (isLoading || !data) return <LoadingSkeleton rows={4} cols={1} />;

  const { aiRateLimit, reminders, server } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Server Uptime</p>
            <p className="text-xl font-bold">{fmtUptime(server.uptimeSeconds)}</p>
            <p className="text-xs text-gray-400 mt-1">Node {server.nodeVersion} · {server.env}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">AI Rate Limit</p>
            <p className="text-xl font-bold">{aiRateLimit.usersAtLimit} at limit</p>
            <p className="text-xs text-gray-400 mt-1">{aiRateLimit.usersNearLimit} near · {aiRateLimit.totalActiveUsers} active users</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Upcoming Hearings</p>
            <p className="text-xl font-bold">{reminders.casesWithHearingDate}</p>
            <p className="text-xs text-gray-400 mt-1">Cases with hearing date set</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Rate Limit Top Users */}
      {aiRateLimit.topUsers.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Top AI Usage (this hour)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 pr-4 font-medium text-center">Calls</th>
                    <th className="pb-2 font-medium">Resets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aiRateLimit.topUsers.map((u) => (
                    <tr key={u.userId}>
                      <td className="py-1.5 pr-4 truncate max-w-[220px] text-gray-900" title={u.email}>{u.email}</td>
                      <td className="py-1.5 pr-4 text-center">
                        <span className={`font-semibold ${u.count >= 30 ? "text-red-600" : u.count >= 20 ? "text-amber-600" : "text-gray-700"}`}>
                          {u.count}/30
                        </span>
                      </td>
                      <td className="py-1.5 text-xs text-gray-400">{fmtDateTime(u.resetAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminder Status */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Email Reminders Sent</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {reminders.casesWithHearingDate === 0 ? (
            <p className="text-sm text-gray-400">No cases with hearing dates yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(
                [
                  { label: "30-day", val: reminders.reminder30Sent },
                  { label: "14-day", val: reminders.reminder14Sent },
                  { label: "7-day", val: reminders.reminder7Sent },
                  { label: "3-day", val: reminders.reminder3Sent },
                  { label: "1-day", val: reminders.reminder1Sent },
                ] as const
              ).map(({ label, val }) => (
                <div key={label} className="text-center bg-gray-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-gray-900">{val}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xs text-gray-400">of {reminders.casesWithHearingDate}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Beta Tab ──────────────────────────────────────────────────────────────────
function exportUsersCSV(users: UserRow[]) {
  const headers = ["Email", "User ID", "Signup Date", "Last Login", "Case Count", "Paid"];

  const rows = users.map((u) => [
    u.email,
    u.userId,
    u.signupDate ? new Date(u.signupDate).toISOString().slice(0, 10) : "",
    u.lastSignInAt ? new Date(u.lastSignInAt).toISOString().slice(0, 10) : "",
    String(u.cases.length),
    u.hasPurchase ? "Yes" : "No",
  ]);

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csvContent = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportBetaCSV(betaRows: BetaRow[], users: UserRow[]) {
  const userMap = new Map(users.map((u) => [u.userId, u]));

  const headers = ["Email", "User ID", "Claimed Date", "Case Count", "Avg Readiness Score", "Next Hearing Date"];

  const rows = betaRows.map((r) => {
    const user = userMap.get(r.userId);
    const cases = user?.cases ?? [];
    const caseCount = cases.length;

    const scores = cases.map((c) => c.readinessScore ?? 0);
    const avgReadiness = caseCount > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / caseCount) : "";

    const now = Date.now();
    const upcomingHearings = cases
      .filter((c) => c.hearingDate && new Date(c.hearingDate).getTime() >= now)
      .map((c) => c.hearingDate as string)
      .sort();
    const nextHearing = upcomingHearings[0] ?? "";

    return [
      r.email ?? "",
      r.userId,
      r.claimedAt ? new Date(r.claimedAt).toISOString().slice(0, 10) : "",
      String(caseCount),
      String(avgReadiness),
      nextHearing ? new Date(nextHearing).toISOString().slice(0, 10) : "",
    ];
  });

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csvContent = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `beta-testers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function BetaTab({ onNavigateToUser }: { onNavigateToUser: (email: string) => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<BetaData>({ queryKey: ["beta"], queryFn: fetchBeta });
  const [grantUserId, setGrantUserId] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const grantMutation = useMutation({
    mutationFn: () => grantBeta(grantUserId.trim(), grantEmail.trim() || null),
    onSuccess: (updated) => {
      qc.setQueryData<BetaData>(["beta"], updated);
      setGrantUserId("");
      setGrantEmail("");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => revokeBeta(userId),
    onSuccess: (updated) => {
      qc.setQueryData<BetaData>(["beta"], updated);
      setRevoking(null);
    },
    onError: () => setRevoking(null),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserRow[]>({ queryKey: ["users"], queryFn: fetchUsers });
  if (isLoading || !data) return <LoadingSkeleton rows={2} cols={1} />;
  const slotsRemaining = Math.max(0, data.limit - data.total);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Slots Claimed" value={`${data.total} / ${data.limit}`} icon={UserCheck} color="amber" />
        <KpiCard
          label="Slots Remaining"
          value={slotsRemaining}
          sub={slotsRemaining === 0 ? "Beta is full" : "Still available"}
          icon={ShieldCheck}
          color={slotsRemaining === 0 ? "amber" : "green"}
        />
      </div>

      {/* Grant beta access */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-600" />
            Grant Beta Access
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Clerk User ID</label>
              <Input
                placeholder="user_2abc..."
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                className="h-8 text-xs w-56"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Email (optional)</label>
              <Input
                placeholder="user@example.com"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                className="h-8 text-xs w-52"
              />
            </div>
            <Button
              size="sm"
              className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
              disabled={!grantUserId.trim() || grantMutation.isPending}
              onClick={() => grantMutation.mutate()}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              {grantMutation.isPending ? "Granting…" : "Grant Access"}
            </Button>
          </div>
          {grantMutation.isError && (
            <p className="text-xs text-red-600 mt-2">{(grantMutation.error as Error).message}</p>
          )}
          {grantMutation.isSuccess && (
            <p className="text-xs text-green-600 mt-2">Beta access granted.</p>
          )}
        </CardContent>
      </Card>

      {/* Beta tester list */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">Beta Testers ({data.total})</CardTitle>
            {data.rows.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => exportBetaCSV(data.rows, users)}
                disabled={usersLoading}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                {usersLoading ? "Loading…" : "Export CSV"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {data.rows.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No beta testers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 pr-4 font-medium">#</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Claimed</th>
                    <th className="pb-2 pr-4 font-medium">User ID</th>
                    <th className="pb-2 pr-4 font-medium text-right">Cases</th>
                    <th className="pb-2 pr-4 font-medium text-right">Readiness</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => { const userMap = new Map(users.map((u) => [u.userId, u])); return data.rows.map((r, i) => {
                    const userRecord = userMap.get(r.userId);
                    const cases = userRecord?.cases ?? [];
                    const caseCount = cases.length;
                    const scores = cases.map((c) => c.readinessScore ?? 0);
                    const avgReadinessRaw = caseCount > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / caseCount) : null;
                    const avgReadiness = avgReadinessRaw != null && avgReadinessRaw > 0 ? avgReadinessRaw : null;
                    return (
                    <tr key={r.id}>
                      <td className="py-2 pr-4 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-2 pr-4 text-gray-900 truncate max-w-[220px]">{r.email ?? <span className="text-gray-400 italic">no email</span>}</td>
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap text-xs">{fmtDateTime(r.claimedAt)}</td>
                      <td className="py-2 pr-4 text-xs text-gray-400 font-mono">{r.userId.slice(0, 18)}…</td>
                      <td className="py-2 pr-4 text-right text-xs text-gray-700">{caseCount > 0 ? caseCount : "—"}</td>
                      <td className="py-2 pr-4 text-right text-xs">
                        {avgReadiness != null ? (
                          <span className={avgReadiness >= 70 ? "text-green-600 font-medium" : avgReadiness >= 40 ? "text-amber-600 font-medium" : "text-red-600 font-medium"}>
                            {avgReadiness}/100
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2 flex items-center gap-1">
                        {r.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => onNavigateToUser(r.email!)}
                          >
                            <Users className="h-3.5 w-3.5 mr-1" />
                            View Cases
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={revoking === r.userId || revokeMutation.isPending}
                          onClick={() => {
                            if (confirm(`Revoke beta access for ${r.email ?? r.userId}?`)) {
                              setRevoking(r.userId);
                              revokeMutation.mutate(r.userId);
                            }
                          }}
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-1" />
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ); }); })()}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Hearings Tab ──────────────────────────────────────────────────────────────
function HearingsTab({ onOpenCase }: { onOpenCase: (caseId: number) => void }) {
  const { data, isLoading } = useQuery<HearingRow[]>({ queryKey: ["hearings"], queryFn: fetchHearings });
  if (isLoading || !data) return <LoadingSkeleton rows={3} cols={1} />;

  function hearingUrgency(dateStr: string) {
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (days <= 7) return { color: "bg-red-100 text-red-700 border-red-200", label: `${days}d` };
    if (days <= 30) return { color: "bg-amber-100 text-amber-700 border-amber-200", label: `${days}d` };
    return { color: "bg-green-100 text-green-700 border-green-200", label: `${days}d` };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-700">Upcoming Hearings ({data.length})</h3>
      </div>
      {data.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-gray-400 text-sm">No upcoming hearings scheduled.</CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-0 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">In</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Case</th>
                    <th className="px-4 py-3 font-medium">Courthouse</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Ready</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((h) => {
                    const urg = hearingUrgency(h.hearingDate);
                    return (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{fmtDate(h.hearingDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${urg.color}`}>
                            {urg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{h.hearingTime ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-700 truncate max-w-[160px]">{h.email}</td>
                        <td className="px-4 py-3 text-gray-700 truncate max-w-[180px]">{h.title}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[160px]">
                          {[h.courthouseName, h.courthouseCity].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {h.claimAmount != null ? `$${fmt(h.claimAmount)}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {h.readinessScore != null ? (
                            <span className={`text-xs font-semibold ${h.readinessScore >= 70 ? "text-green-600" : h.readinessScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                              {h.readinessScore}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700" onClick={() => onOpenCase(h.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Stuck Cases Tab ────────────────────────────────────────────────────────────
function StuckCasesTab({ onOpenCase }: { onOpenCase: (caseId: number) => void }) {
  const { data, isLoading } = useQuery<StuckCaseRow[]>({ queryKey: ["stuck-cases"], queryFn: fetchStuckCases });
  if (isLoading || !data) return <LoadingSkeleton rows={3} cols={1} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-700">Stuck Cases — no activity in 14+ days ({data.length})</h3>
      </div>
      {data.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-gray-400 text-sm">No stuck cases right now.</CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-0 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-3 font-medium">Idle</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Case</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Intake</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Ready</th>
                    <th className="px-4 py-3 font-medium">Last Active</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${c.daysSinceActivity >= 60 ? "bg-red-100 text-red-700 border-red-200" : c.daysSinceActivity >= 30 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                          {c.daysSinceActivity}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 truncate max-w-[160px]">{c.email}</td>
                      <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]">{c.title}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.intakeComplete ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {c.claimAmount != null ? `$${fmt(c.claimAmount)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {c.readinessScore != null ? (
                          <span className={`text-xs font-semibold ${c.readinessScore >= 70 ? "text-green-600" : c.readinessScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                            {c.readinessScore}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(c.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700" onClick={() => onOpenCase(c.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Signups Tab ───────────────────────────────────────────────────────────────
function SignupsTab() {
  const { data: signups, isLoading: loadingSignups } = useQuery({
    queryKey: ["signups"],
    queryFn: fetchSignups,
  });
  const { data: notifs, isLoading: loadingNotifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });
  const qc = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => setNotifications(enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="space-y-6">
      {/* Notification toggle */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {notifs?.enabled ? (
              <Bell className="h-5 w-5 text-blue-600" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">New Signup Notifications</p>
              <p className="text-xs text-gray-400">
                {notifs?.enabled
                  ? "You'll be notified when new users sign up"
                  : "Notifications are off — toggles apply until next server restart"}
              </p>
            </div>
          </div>
          {loadingNotifs ? (
            <Skeleton className="h-6 w-11 rounded-full" />
          ) : (
            <Switch
              checked={notifs?.enabled ?? false}
              onCheckedChange={(v) => toggleMutation.mutate(v)}
              disabled={toggleMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      {/* Recent signups list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Signups (last 25)</h3>
        {loadingSignups ? (
          <LoadingSkeleton rows={5} cols={1} />
        ) : signups?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No signups yet.</p>
        ) : (
          <div className="space-y-2">
            {signups?.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 bg-white border rounded-lg">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm shrink-0">
                  {u.email[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.email}</p>
                  <p className="text-xs text-gray-400">
                    {u.firstName && u.lastName ? `${u.firstName} ${u.lastName} · ` : ""}
                    Joined {fmtDate(u.createdAt)}
                    {u.lastSignInAt && ` · Last login ${fmtDate(u.lastSignInAt)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status Tab ────────────────────────────────────────────────────────────────
function StatusTab() {
  const qc = useQueryClient();
  const { data: errors, isLoading: errLoading } = useQuery({
    queryKey: ["errors"],
    queryFn: fetchErrors,
    refetchInterval: 30000,
  });
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["status"],
    queryFn: fetchStatus,
    refetchInterval: 60000,
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const clearMutation = useMutation({
    mutationFn: clearErrors,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["errors"] }),
  });

  const errorCount = errors?.filter((e) => e.level === "error").length ?? 0;
  const warnCount = errors?.filter((e) => e.level === "warn").length ?? 0;

  return (
    <div className="space-y-6">

      {/* ── Health Strip ── */}
      {statusLoading ? (
        <LoadingSkeleton rows={1} cols={4} />
      ) : status ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-gray-500">Active Users (24h)</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{status.activeUsers24h}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-xs text-gray-500">Errors (session)</p>
              </div>
              <p className={`text-2xl font-bold ${errorCount > 0 ? "text-red-600" : "text-gray-900"}`}>
                {errorCount}
                {warnCount > 0 && <span className="text-base font-normal text-amber-500 ml-1">+{warnCount} warn</span>}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-4 w-4 text-purple-500" />
                <p className="text-xs text-gray-500">Memory</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{status.memoryMb}<span className="text-sm font-normal text-gray-400"> / {status.memoryTotalMb} MB</span></p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <p className="text-xs text-gray-500">Log Level</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 capitalize">{status.logLevel}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ── Active Users 24h ── */}
      {status && status.recentActiveUsers.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Recently Active Users (last 24h)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {status.recentActiveUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
                  <span className="text-gray-800 truncate">{u.email}</span>
                  <span className="text-xs text-gray-400 ml-4 whitespace-nowrap">{fmtDateTime(u.lastSignInAt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Payment Activity ── */}
      {status && status.recentPayments.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Recent Payment Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {status.recentPayments.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <CreditCard className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="text-gray-800 truncate">{p.email}</span>
                    {p.planKey && <Badge className="bg-green-50 text-green-700 text-xs">{p.planKey}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="font-semibold text-green-700">{fmtMoney(p.amountDollars)}</span>
                    <span className="text-xs text-gray-400 hidden sm:block">{fmtDate(p.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Error Feed ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Server Error Log
              <span className="ml-2 text-xs font-normal text-gray-400">(last 100 · resets on restart)</span>
            </CardTitle>
            {errors && errors.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-400 hover:text-red-600"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {errLoading ? (
            <LoadingSkeleton rows={3} cols={1} />
          ) : !errors || errors.length === 0 ? (
            <div className="flex items-center gap-2 py-6 justify-center text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">No errors recorded this session</span>
            </div>
          ) : (
            <div className="space-y-1">
              {errors.map((e) => (
                <div key={e.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  >
                    {e.level === "error" ? (
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${e.level === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          {e.statusCode ? `${e.statusCode} ` : ""}{e.level}
                        </Badge>
                        {e.method && e.route && (
                          <span className="text-xs font-mono text-gray-500">{e.method} {e.route}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 mt-0.5 truncate">{e.message}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2 mt-0.5">{fmtDateTime(e.timestamp)}</span>
                  </button>
                  {expandedId === e.id && e.stack && (
                    <div className="border-t bg-gray-950 px-3 py-2">
                      <pre className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono leading-relaxed">{e.stack}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Database Backup Info ── */}
      <Card className="shadow-sm border-blue-100">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-semibold text-gray-700">Database Backup Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 text-sm text-gray-600">
          <p>
            Small Claims Genie uses Replit's managed PostgreSQL. Replit maintains automatic daily
            snapshots at the infrastructure level — these are not accessible as downloadable files
            from the dashboard, but can be requested through Replit support.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
            <p className="font-semibold text-blue-800 text-xs uppercase tracking-wide">Manual Backup Procedure</p>
            <p className="text-xs text-blue-700">
              Run this command from the workspace terminal to create a timestamped SQL dump:
            </p>
            <pre className="text-xs bg-blue-900 text-blue-100 rounded p-2 overflow-x-auto font-mono">
              {`pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql`}
            </pre>
            <p className="text-xs text-blue-700">
              Store the output file off-platform (e.g., download it or copy to cloud storage).
              The existing on-disk backups in <code className="bg-blue-100 px-1 rounded">assets/backups/</code> are ZIP exports created manually — they are not automated.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="font-semibold text-amber-800 text-xs uppercase tracking-wide mb-1">Pre-Beta Recommendation</p>
            <p className="text-xs text-amber-700">
              Before launching beta, run a manual backup and verify you can restore it to a fresh database.
              Test the restore with: <code className="bg-amber-100 px-1 rounded">psql $DATABASE_URL {"<"} your-backup.sql</code>
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// ── Genie Conversions Tab ─────────────────────────────────────────────────────
const TOPIC_KEYWORDS: { label: string; terms: string[] }[] = [
  { label: "Security deposit", terms: ["deposit", "security deposit"] },
  { label: "Sue / suing", terms: ["sue", "suing", "lawsuit", "file a claim", "small claims"] },
  { label: "Evidence", terms: ["evidence", "proof", "document", "photo", "receipt"] },
  { label: "Landlord / tenant", terms: ["landlord", "tenant", "rent", "lease", "evict"] },
  { label: "Contractor / repairs", terms: ["contractor", "repair", "work done", "paid for"] },
  { label: "Car / vehicle", terms: ["car", "vehicle", "accident", "auto", "damage"] },
  { label: "Refund", terms: ["refund", "money back", "reimburse"] },
  { label: "Hearing / court date", terms: ["hearing", "court date", "appear", "judge"] },
  { label: "Limit / max amount", terms: ["limit", "maximum", "how much", "cap"] },
  { label: "Deadline / timeline", terms: ["deadline", "how long", "time limit", "statute", "days"] },
  { label: "Business / company", terms: ["business", "company", "corporation", "llc"] },
  { label: "Wage / employment", terms: ["wage", "salary", "pay", "employer", "work"] },
];

function computeTopQuestions(rows: GenieConversionRow[], topN = 10) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.question.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key, count]) => ({
      question: rows.find((r) => r.question.trim().toLowerCase() === key)?.question ?? key,
      count,
    }));
}

function computeTopicClusters(rows: GenieConversionRow[]) {
  return TOPIC_KEYWORDS.map(({ label, terms }) => ({
    label,
    count: rows.filter((r) =>
      terms.some((t) => r.question.toLowerCase().includes(t))
    ).length,
  }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

function GenieConversionsTab() {
  const { data, isLoading } = useQuery<GenieConversionRow[]>({
    queryKey: ["genie-conversions"],
    queryFn: fetchGenieConversions,
  });

  const topQuestions = data && data.length > 0 ? computeTopQuestions(data) : [];
  const topicClusters = data && data.length > 0 ? computeTopicClusters(data) : [];

  const questionChartData = topQuestions.map((q) => ({
    label: q.question.length > 48 ? q.question.slice(0, 48) + "…" : q.question,
    fullQuestion: q.question,
    count: q.count,
  }));

  return (
    <div className="space-y-4">
      {/* Summary charts — only shown when there is data */}
      {!isLoading && data && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top questions bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Questions by Frequency</CardTitle>
              <p className="text-xs text-gray-500">Most-asked questions that led to a sign-up click.</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(topQuestions.length * 36 + 16, 80)}>
                <BarChart
                  data={questionChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={200}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "conversions"]}
                    labelFormatter={(_label: string, payload) => {
                      const entry = payload?.[0]?.payload as { fullQuestion?: string } | undefined;
                      return entry?.fullQuestion ?? _label;
                    }}
                    wrapperStyle={{ fontSize: 12, maxWidth: 340 }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Topic cluster bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Topic Clusters</CardTitle>
              <p className="text-xs text-gray-500">Questions grouped by keyword theme.</p>
            </CardHeader>
            <CardContent>
              {topicClusters.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No topic matches yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(topicClusters.length * 36 + 16, 80)}>
                  <BarChart
                    data={topicClusters}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={148}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <Tooltip formatter={(value: number) => [value, "questions"]} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Raw list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Genie → Sign-up Conversions</CardTitle>
          <p className="text-xs text-gray-500">Questions that led visitors to click "Get started free →". Last 200 events, newest first.</p>
        </CardHeader>
        <CardContent>
          {isLoading && <LoadingSkeleton rows={5} />}
          {!isLoading && (!data || data.length === 0) && (
            <p className="text-sm text-gray-400 py-6 text-center">No conversions recorded yet.</p>
          )}
          {!isLoading && data && data.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium">{data.length} event{data.length !== 1 ? "s" : ""} total</p>
              {data.map((row) => (
                <div key={row.id} className="border rounded-lg p-3 bg-white text-sm space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">Question</Badge>
                    <span className="text-gray-900 font-medium leading-snug">{row.question}</span>
                  </div>
                  {row.answerSnippet && (
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5 bg-teal-50 border-teal-200 text-teal-700">Answer</Badge>
                      <span className="text-gray-500 text-xs leading-snug line-clamp-3">{row.answerSnippet}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">{new Date(row.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Test Cases Tab ────────────────────────────────────────────────────────────
type CountyOption = { id: string; name: string };

async function fetchCountiesForState(state: string): Promise<CountyOption[]> {
  const res = await fetch(`/api/counties?state=${state}`);
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ id: string; name: string }>;
  return data.map((c) => ({ id: c.id, name: c.name }));
}

function TestCasesTab() {
  const qc = useQueryClient();
  const [state, setState] = useState<"CA" | "FL">("CA");
  const [countyId, setCountyId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<number | null>(null);

  const { data: counties = [], isLoading: countiesLoading } = useQuery<CountyOption[]>({
    queryKey: ["counties", state],
    queryFn: () => fetchCountiesForState(state),
  });

  useQuery<string | null>({
    queryKey: ["admin-clerk-id"],
    queryFn: fetchAdminClerkId,
    staleTime: Infinity,
    select: (clerkId) => {
      if (clerkId && !targetUserId) setTargetUserId(clerkId);
      return clerkId;
    },
  });

  const { data: testCases = [], isLoading: listLoading } = useQuery<TestCaseRow[]>({
    queryKey: ["test-cases"],
    queryFn: fetchTestCases,
  });

  const createMut = useMutation({
    mutationFn: createTestCase,
    onSuccess: (row) => {
      setCreateSuccess(row.id);
      setCreateError(null);
      void qc.invalidateQueries({ queryKey: ["test-cases"] });
    },
    onError: (err: Error) => {
      setCreateError(err.message);
      setCreateSuccess(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteTestCase,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["test-cases"] }),
  });

  function handleStateChange(newState: "CA" | "FL") {
    setState(newState);
    setCountyId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!countyId || !targetUserId.trim()) return;
    setCreateSuccess(null);
    setCreateError(null);
    createMut.mutate({ state, countyId, targetUserId: targetUserId.trim() });
  }

  const mainAppBase = window.location.origin;

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-violet-500" />
            Create Test Case
          </CardTitle>
          <p className="text-xs text-gray-500">
            Creates a fully pre-filled QA case tagged [TEST] under the specified user account. Log in to the main app as that user to test forms, AI, and county-specific behavior.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* State */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">State</label>
                <Select value={state} onValueChange={(v) => handleStateChange(v as "CA" | "FL")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CA">California (CA)</SelectItem>
                    <SelectItem value="FL">Florida (FL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* County */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">County</label>
                <Select
                  value={countyId}
                  onValueChange={setCountyId}
                  disabled={countiesLoading || counties.length === 0}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={countiesLoading ? "Loading…" : "Select county"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    {counties.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target User ID */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Target User ID (Clerk)</label>
                <Input
                  className="h-9 text-sm font-mono"
                  placeholder="user_…"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white"
                disabled={!countyId || !targetUserId.trim() || createMut.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                {createMut.isPending ? "Creating…" : "Create Test Case"}
              </Button>

              {createSuccess && (
                <span className="text-xs text-green-600 font-medium">
                  ✓ Case #{createSuccess} created — open it in the main app below
                </span>
              )}
              {createError && (
                <span className="text-xs text-red-600">{createError}</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent test cases */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Recent Test Cases{" "}
            <span className="font-normal text-gray-400 text-xs">(last 20)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <LoadingSkeleton rows={3} cols={1} />
          ) : testCases.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No test cases yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {testCases.map((tc) => (
                <div
                  key={tc.id}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-white"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-violet-100 text-violet-700 text-xs shrink-0">
                        {tc.jurisdictionState}
                      </Badge>
                      <span className="text-sm font-medium text-gray-800 truncate">{tc.title}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ID #{tc.id}
                      {tc.countyId && ` · ${tc.countyId}`}
                      {tc.claimType && ` · ${tc.claimType}`}
                      {` · Created ${fmtDateTime(tc.createdAt)}`}
                    </p>
                    {tc.userId && (
                      <p className="text-xs text-gray-400 font-mono truncate" title={tc.userId}>
                        {tc.userId}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`${mainAppBase}/cases/${tc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => deleteMut.mutate(tc.id)}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton({ rows = 3, cols = 1 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [usersSearch, setUsersSearch] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  }

  function handleNavigateToUser(email: string) {
    setUsersSearch(email);
    setActiveTab("users");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Admin Dashboard</h1>
              <p className="text-xs text-gray-400 leading-tight">Small Claims Genie</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-gray-500 h-8"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline ml-1">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-gray-500 h-8"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Sign out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap gap-1 h-auto bg-gray-100">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue</TabsTrigger>
            <TabsTrigger value="hearings" className="text-xs sm:text-sm">Hearings</TabsTrigger>
            <TabsTrigger value="stuck" className="text-xs sm:text-sm">Stuck Cases</TabsTrigger>
            <TabsTrigger value="system" className="text-xs sm:text-sm">System</TabsTrigger>
            <TabsTrigger value="beta" className="text-xs sm:text-sm">Beta</TabsTrigger>
            <TabsTrigger value="signups" className="text-xs sm:text-sm">Signups</TabsTrigger>
            <TabsTrigger value="status" className="text-xs sm:text-sm">Status</TabsTrigger>
            <TabsTrigger value="conversions" className="text-xs sm:text-sm">Conversions</TabsTrigger>
            <TabsTrigger value="test-cases" className="text-xs sm:text-sm">🧪 Test Cases</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="users">
            <UsersTab
              search={usersSearch}
              setSearch={setUsersSearch}
              onOpenCase={setSelectedCaseId}
            />
          </TabsContent>
          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
          <TabsContent value="revenue"><RevenueTab /></TabsContent>
          <TabsContent value="hearings"><HearingsTab onOpenCase={setSelectedCaseId} /></TabsContent>
          <TabsContent value="stuck"><StuckCasesTab onOpenCase={setSelectedCaseId} /></TabsContent>
          <TabsContent value="system"><SystemTab /></TabsContent>
          <TabsContent value="beta">
            <BetaTab onNavigateToUser={handleNavigateToUser} />
          </TabsContent>
          <TabsContent value="signups"><SignupsTab /></TabsContent>
          <TabsContent value="status"><StatusTab /></TabsContent>
          <TabsContent value="conversions"><GenieConversionsTab /></TabsContent>
          <TabsContent value="test-cases"><TestCasesTab /></TabsContent>
        </Tabs>
      </div>

      {/* Case Detail Drawer */}
      <CaseDetailDrawer caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
    </div>
  );
}
