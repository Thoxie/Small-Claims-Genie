const API_BASE = "/api";

export function getStoredKey(): string {
  return localStorage.getItem("admin_api_key") ?? "";
}

export function setStoredKey(key: string): void {
  localStorage.setItem("admin_api_key", key);
}

export function clearStoredKey(): void {
  localStorage.removeItem("admin_api_key");
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const key = getStoredKey();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 503) {
    clearStoredKey();
    window.location.reload();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchOverview(): Promise<Overview> {
  return apiFetch<Overview>("/admin/overview");
}

export async function fetchUsers(): Promise<UserRow[]> {
  return apiFetch<UserRow[]>("/admin/users");
}

export async function fetchCaseAnalytics(): Promise<CaseAnalytics> {
  return apiFetch<CaseAnalytics>("/admin/case-analytics");
}

export async function fetchRevenue(): Promise<RevenueRow[]> {
  return apiFetch<RevenueRow[]>("/admin/revenue");
}

export async function fetchSystem(): Promise<SystemHealth> {
  return apiFetch<SystemHealth>("/admin/system");
}

export async function fetchSignups(): Promise<SignupRow[]> {
  return apiFetch<SignupRow[]>("/admin/signups");
}

export async function fetchNotifications(): Promise<{ enabled: boolean }> {
  return apiFetch<{ enabled: boolean }>("/admin/notifications");
}

export async function setNotifications(enabled: boolean): Promise<{ enabled: boolean }> {
  return apiFetch<{ enabled: boolean }>("/admin/notifications", {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

export async function validateKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Overview {
  totalUsers: number;
  totalCases: number;
  paidActivations: number;
  revenueMtd: number;
  revenueTotal: number;
  hearingScheduled: number;
  intakeComplete: number;
}

export interface CaseRow {
  id: number;
  userId: string | null;
  title: string;
  status: string;
  claimAmount: number | null;
  claimType: string | null;
  countyId: string | null;
  hearingDate: string | null;
  hearingTime: string | null;
  hearingJudge: string | null;
  hearingCourtroom: string | null;
  hearingNotes: string | null;
  caseNumber: string | null;
  courthouseName: string | null;
  courthouseAddress: string | null;
  courthouseCity: string | null;
  readinessScore: number | null;
  intakeComplete: boolean | null;
  documentCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRow {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  signupDate: string | null;
  lastSignInAt: string | null;
  cases: CaseRow[];
  hasPurchase: boolean;
  lastActivity: string | null;
}

export interface CaseAnalytics {
  byStatus: { status: string; count: number }[];
  byClaimType: { type: string; count: number }[];
  byCounty: { county: string; count: number }[];
  claimAmountRanges: { range: string; count: number }[];
}

export interface RevenueRow {
  id: number;
  userId: string;
  email: string;
  stripeSessionId: string;
  stripePriceId: string | null;
  planKey: string | null;
  amountTotal: number | null;
  amountDollars: number;
  currency: string | null;
  status: string;
  createdAt: string;
}

export interface RateLimitUser {
  userId: string;
  email: string;
  count: number;
  resetAt: string;
}

export interface SystemHealth {
  aiRateLimit: {
    totalActiveUsers: number;
    usersAtLimit: number;
    usersNearLimit: number;
    topUsers: RateLimitUser[];
  };
  reminders: {
    casesWithHearingDate: number;
    reminder30Sent: number;
    reminder14Sent: number;
    reminder7Sent: number;
    reminder3Sent: number;
    reminder1Sent: number;
  };
  server: {
    uptimeSeconds: number;
    nodeVersion: string;
    env: string;
  };
}

export interface SignupRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
}
