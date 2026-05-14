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
  setNotifications,
  clearStoredKey,
  type UserRow,
  type CaseRow,
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
} from "lucide-react";

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

function UserRow({ user }: { user: UserRow }) {
  const [expanded, setExpanded] = useState(false);
  const upcoming = user.cases.find((c) => c.hearingDate && new Date(c.hearingDate) >= new Date());
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

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
            {user.lastSignInAt && ` · Last login ${fmtDate(user.lastSignInAt)}`}
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
                  <p className="font-medium">{fmtDate(user.lastSignInAt)}</p>
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
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-medium text-sm text-gray-900 truncate">{c.title}</span>
                <Badge className={`text-xs ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </Badge>
                {c.caseNumber && (
                  <span className="text-xs text-gray-500 font-mono">#{c.caseNumber}</span>
                )}
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
                  <p className="font-medium">{c.readinessScore ?? 0}/100</p>
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

function UsersTab() {
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const [search, setSearch] = useState("");

  if (isLoading || !data) return <LoadingSkeleton rows={5} cols={1} />;

  const filtered = data.filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.userId.toLowerCase().includes(search.toLowerCase())
  );

  const withHearing = data.filter((u) => u.cases.some((c) => c.hearingDate)).length;
  const paid = data.filter((u) => u.hasPurchase).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 text-sm text-gray-600">
          <span><strong>{data.length}</strong> users</span>
          <span>·</span>
          <span><strong>{paid}</strong> paid</span>
          <span>·</span>
          <span><strong>{withHearing}</strong> with hearing</span>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search email or user ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No users found.</p>
      ) : (
        <div>
          {filtered.map((u) => (
            <UserRow key={u.userId} user={u} />
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

  async function handleRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
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
        <Tabs defaultValue="overview">
          <TabsList className="mb-6 flex flex-wrap gap-1 h-auto bg-gray-100">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue</TabsTrigger>
            <TabsTrigger value="system" className="text-xs sm:text-sm">System</TabsTrigger>
            <TabsTrigger value="signups" className="text-xs sm:text-sm">Signups</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
          <TabsContent value="revenue"><RevenueTab /></TabsContent>
          <TabsContent value="system"><SystemTab /></TabsContent>
          <TabsContent value="signups"><SignupsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
