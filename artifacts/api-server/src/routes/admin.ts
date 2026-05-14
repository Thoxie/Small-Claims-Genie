import { Router, type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { db, casesTable, purchasesTable, aiRateLimitsTable } from "@workspace/db";
import { sql, count, sum, eq, gte, desc, and, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getErrors, clearErrors } from "../lib/errorLog";

const router = Router();

// In-memory notifications toggle — resets on server restart (acceptable for owner tool)
let notificationsEnabled = false;

// ── Auth middleware ───────────────────────────────────────────────────────────
const requireAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    res.status(503).json({ error: "Admin not configured — set ADMIN_API_KEY in Replit Secrets" });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${adminKey}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

// ── POST /admin/login (public — validates email + password, returns key) ──────
router.post("/admin/login", (req: Request, res: Response): void => {
  const adminKey = process.env.ADMIN_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminKey) {
    res.status(503).json({ error: "Admin not configured" });
    return;
  }

  const { email, password } = req.body as { email?: string; password?: string };

  const emailMatch = adminEmail
    ? email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()
    : true; // if ADMIN_EMAIL not set, skip email check (backward compat)

  const keyMatch = password?.trim() === adminKey;

  if (!emailMatch || !keyMatch) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json({ key: adminKey });
});

// Apply auth to all /admin/* routes
router.use("/admin", requireAdmin);

// ── Clerk helpers ─────────────────────────────────────────────────────────────
function clerkSecretKey(): string | undefined {
  return process.env.APP_ENV === "production"
    ? process.env.CLERK_SECRET_KEY
    : (process.env.CLERK_SECRET_KEY_DEV ?? process.env.CLERK_SECRET_KEY);
}

type ClerkUser = {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string | null;
  last_name: string | null;
  created_at: number;
  last_sign_in_at: number | null;
};

async function getAllClerkUsers(): Promise<ClerkUser[]> {
  const secretKey = clerkSecretKey();
  if (!secretKey) return [];
  try {
    const res = await fetch(
      "https://api.clerk.com/v1/users?limit=500&order_by=-created_at",
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    if (!res.ok) return [];
    return (await res.json()) as ClerkUser[];
  } catch {
    return [];
  }
}

async function getClerkEmails(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const secretKey = clerkSecretKey();
  if (!secretKey) return new Map();
  try {
    const params = new URLSearchParams();
    userIds.slice(0, 100).forEach((id) => params.append("user_id", id));
    params.set("limit", "100");
    const clerkRes = await fetch(`https://api.clerk.com/v1/users?${params}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!clerkRes.ok) return new Map();
    const users = (await clerkRes.json()) as ClerkUser[];
    return new Map(
      users.map((u) => [u.id, u.email_addresses[0]?.email_address ?? u.id])
    );
  } catch {
    return new Map();
  }
}

// ── GET /admin/overview ───────────────────────────────────────────────────────
router.get("/admin/overview", async (req: Request, res: Response): Promise<void> => {
  try {
    const [{ totalUsers }] = await db
      .select({ totalUsers: sql<number>`count(distinct ${casesTable.userId})` })
      .from(casesTable);

    const [{ totalCases }] = await db.select({ totalCases: count() }).from(casesTable);

    const [{ paidActivations }] = await db
      .select({ paidActivations: count() })
      .from(purchasesTable)
      .where(eq(purchasesTable.status, "complete"));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [mtdResult] = await db
      .select({ total: sum(purchasesTable.amountTotal) })
      .from(purchasesTable)
      .where(and(eq(purchasesTable.status, "complete"), gte(purchasesTable.createdAt, startOfMonth)));

    const [totalResult] = await db
      .select({ total: sum(purchasesTable.amountTotal) })
      .from(purchasesTable)
      .where(eq(purchasesTable.status, "complete"));

    const [{ hearingScheduled }] = await db
      .select({ hearingScheduled: count() })
      .from(casesTable)
      .where(isNotNull(casesTable.hearingDate));

    const [{ intakeComplete }] = await db
      .select({ intakeComplete: count() })
      .from(casesTable)
      .where(eq(casesTable.intakeComplete, true));

    res.json({
      totalUsers: Number(totalUsers),
      totalCases: Number(totalCases),
      paidActivations: Number(paidActivations),
      revenueMtd: Number(mtdResult?.total ?? 0) / 100,
      revenueTotal: Number(totalResult?.total ?? 0) / 100,
      hearingScheduled: Number(hearingScheduled),
      intakeComplete: Number(intakeComplete),
    });
  } catch (err) {
    logger.error({ err }, "Admin overview error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/users ──────────────────────────────────────────────────────────
router.get("/admin/users", async (req: Request, res: Response): Promise<void> => {
  try {
    const [cases, purchases, allClerkUsers] = await Promise.all([
      db
        .select({
          id: casesTable.id,
          userId: casesTable.userId,
          title: casesTable.title,
          status: casesTable.status,
          claimAmount: casesTable.claimAmount,
          claimType: casesTable.claimType,
          countyId: casesTable.countyId,
          hearingDate: casesTable.hearingDate,
          hearingTime: casesTable.hearingTime,
          hearingJudge: casesTable.hearingJudge,
          hearingCourtroom: casesTable.hearingCourtroom,
          hearingNotes: casesTable.hearingNotes,
          caseNumber: casesTable.caseNumber,
          courthouseName: casesTable.courthouseName,
          courthouseAddress: casesTable.courthouseAddress,
          courthouseCity: casesTable.courthouseCity,
          readinessScore: casesTable.readinessScore,
          intakeComplete: casesTable.intakeComplete,
          documentCount: casesTable.documentCount,
          createdAt: casesTable.createdAt,
          updatedAt: casesTable.updatedAt,
        })
        .from(casesTable)
        .orderBy(desc(casesTable.updatedAt)),
      db
        .select({ userId: purchasesTable.userId })
        .from(purchasesTable)
        .where(eq(purchasesTable.status, "complete")),
      getAllClerkUsers(),
    ]);

    const paidUserIds = new Set(purchases.map((p) => p.userId));
    const clerkMap = new Map(allClerkUsers.map((u) => [u.id, u]));

    type UserEntry = {
      userId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      signupDate: string | null;
      lastSignInAt: string | null;
      cases: typeof cases;
      hasPurchase: boolean;
      lastActivity: Date | null;
    };
    const usersMap = new Map<string, UserEntry>();

    // Seed from DB cases
    for (const c of cases) {
      const uid = c.userId ?? "unknown";
      if (!usersMap.has(uid)) {
        const cu = clerkMap.get(uid);
        usersMap.set(uid, {
          userId: uid,
          email: cu?.email_addresses[0]?.email_address ?? uid,
          firstName: cu?.first_name ?? null,
          lastName: cu?.last_name ?? null,
          signupDate: cu ? new Date(cu.created_at).toISOString() : null,
          lastSignInAt: cu?.last_sign_in_at ? new Date(cu.last_sign_in_at).toISOString() : null,
          cases: [],
          hasPurchase: paidUserIds.has(uid),
          lastActivity: c.updatedAt,
        });
      }
      usersMap.get(uid)!.cases.push(c);
    }

    // Add Clerk-only users who have no cases yet
    for (const cu of allClerkUsers) {
      if (!usersMap.has(cu.id)) {
        usersMap.set(cu.id, {
          userId: cu.id,
          email: cu.email_addresses[0]?.email_address ?? cu.id,
          firstName: cu.first_name,
          lastName: cu.last_name,
          signupDate: new Date(cu.created_at).toISOString(),
          lastSignInAt: cu.last_sign_in_at ? new Date(cu.last_sign_in_at).toISOString() : null,
          cases: [],
          hasPurchase: paidUserIds.has(cu.id),
          lastActivity: null,
        });
      }
    }

    // Sort: most recently active first, then most recently signed up
    const sorted = Array.from(usersMap.values()).sort((a, b) => {
      const aTime = a.lastActivity?.getTime() ?? new Date(a.signupDate ?? 0).getTime();
      const bTime = b.lastActivity?.getTime() ?? new Date(b.signupDate ?? 0).getTime();
      return bTime - aTime;
    });

    res.json(sorted);
  } catch (err) {
    logger.error({ err }, "Admin users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/case-analytics ─────────────────────────────────────────────────
router.get("/admin/case-analytics", async (req: Request, res: Response): Promise<void> => {
  try {
    const byStatus = await db
      .select({ status: casesTable.status, count: count() })
      .from(casesTable)
      .groupBy(casesTable.status)
      .orderBy(desc(count()));

    const byClaimType = await db
      .select({ type: casesTable.claimType, cnt: count() })
      .from(casesTable)
      .where(isNotNull(casesTable.claimType))
      .groupBy(casesTable.claimType)
      .orderBy(desc(count()));

    const byCounty = await db
      .select({ county: casesTable.countyId, cnt: count() })
      .from(casesTable)
      .where(isNotNull(casesTable.countyId))
      .groupBy(casesTable.countyId)
      .orderBy(desc(count()));

    const claimAmountRanges = await db
      .select({
        range: sql<string>`
          case
            when ${casesTable.claimAmount} is null then 'Unknown'
            when ${casesTable.claimAmount} < 500 then '$0–500'
            when ${casesTable.claimAmount} < 1500 then '$500–1,500'
            when ${casesTable.claimAmount} < 3000 then '$1,500–3,000'
            when ${casesTable.claimAmount} < 7500 then '$3,000–7,500'
            else '$7,500+'
          end
        `,
        cnt: count(),
      })
      .from(casesTable)
      .groupBy(sql`1`)
      .orderBy(sql`min(coalesce(${casesTable.claimAmount}, 0))`);

    res.json({
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      byClaimType: byClaimType
        .slice(0, 12)
        .map((r) => ({ type: r.type ?? "Unknown", count: Number(r.cnt) })),
      byCounty: byCounty
        .slice(0, 10)
        .map((r) => ({ county: r.county ?? "Unknown", count: Number(r.cnt) })),
      claimAmountRanges: claimAmountRanges.map((r) => ({
        range: r.range,
        count: Number(r.cnt),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Admin case-analytics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/revenue ────────────────────────────────────────────────────────
router.get("/admin/revenue", async (req: Request, res: Response): Promise<void> => {
  try {
    const purchases = await db
      .select()
      .from(purchasesTable)
      .where(eq(purchasesTable.status, "complete"))
      .orderBy(desc(purchasesTable.createdAt))
      .limit(50);

    const userIds = [...new Set(purchases.map((p) => p.userId))];
    const emailMap = await getClerkEmails(userIds);

    res.json(
      purchases.map((p) => ({
        ...p,
        email: emailMap.get(p.userId) ?? p.userId,
        amountDollars: (p.amountTotal ?? 0) / 100,
      }))
    );
  } catch (err) {
    logger.error({ err }, "Admin revenue error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/system ─────────────────────────────────────────────────────────
router.get("/admin/system", async (req: Request, res: Response): Promise<void> => {
  try {
    const rateLimits = await db
      .select()
      .from(aiRateLimitsTable)
      .where(gte(aiRateLimitsTable.count, 1))
      .orderBy(desc(aiRateLimitsTable.count))
      .limit(20);

    const [{ totalRLUsers }] = await db
      .select({ totalRLUsers: count() })
      .from(aiRateLimitsTable)
      .where(gte(aiRateLimitsTable.count, 1));

    const [{ usersAtLimit }] = await db
      .select({ usersAtLimit: count() })
      .from(aiRateLimitsTable)
      .where(gte(aiRateLimitsTable.count, 30));

    const [{ usersNearLimit }] = await db
      .select({ usersNearLimit: count() })
      .from(aiRateLimitsTable)
      .where(
        and(
          gte(aiRateLimitsTable.count, 20),
          sql`${aiRateLimitsTable.count} < 30`
        )
      );

    const rlUserIds = rateLimits.map((r) => r.userId);
    const emailMap = await getClerkEmails(rlUserIds);

    // Reminder stats
    const casesWithHearing = await db
      .select({
        reminder30DaySent: casesTable.reminder30DaySent,
        reminder14DaySent: casesTable.reminder14DaySent,
        reminder7DaySent: casesTable.reminder7DaySent,
        reminder3DaySent: casesTable.reminder3DaySent,
        reminder1DaySent: casesTable.reminder1DaySent,
      })
      .from(casesTable)
      .where(isNotNull(casesTable.hearingDate));

    res.json({
      aiRateLimit: {
        totalActiveUsers: Number(totalRLUsers),
        usersAtLimit: Number(usersAtLimit),
        usersNearLimit: Number(usersNearLimit),
        topUsers: rateLimits.map((r) => ({
          userId: r.userId,
          email: emailMap.get(r.userId) ?? r.userId,
          count: r.count,
          resetAt: r.resetAt,
        })),
      },
      reminders: {
        casesWithHearingDate: casesWithHearing.length,
        reminder30Sent: casesWithHearing.filter((c) => c.reminder30DaySent).length,
        reminder14Sent: casesWithHearing.filter((c) => c.reminder14DaySent).length,
        reminder7Sent: casesWithHearing.filter((c) => c.reminder7DaySent).length,
        reminder3Sent: casesWithHearing.filter((c) => c.reminder3DaySent).length,
        reminder1Sent: casesWithHearing.filter((c) => c.reminder1DaySent).length,
      },
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        env: process.env.APP_ENV ?? "development",
      },
    });
  } catch (err) {
    logger.error({ err }, "Admin system error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/signups ────────────────────────────────────────────────────────
router.get("/admin/signups", async (req: Request, res: Response): Promise<void> => {
  try {
    const secretKey =
      process.env.APP_ENV === "production"
        ? process.env.CLERK_SECRET_KEY
        : (process.env.CLERK_SECRET_KEY_DEV ?? process.env.CLERK_SECRET_KEY);

    if (!secretKey) {
      res.json([]);
      return;
    }

    const clerkRes = await fetch(
      "https://api.clerk.com/v1/users?limit=25&order_by=-created_at",
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    if (!clerkRes.ok) {
      res.json([]);
      return;
    }

    const users = (await clerkRes.json()) as Array<{
      id: string;
      email_addresses: Array<{ email_address: string }>;
      first_name: string | null;
      last_name: string | null;
      created_at: number;
      last_sign_in_at: number | null;
    }>;

    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email_addresses[0]?.email_address ?? "—",
        firstName: u.first_name,
        lastName: u.last_name,
        createdAt: new Date(u.created_at).toISOString(),
        lastSignInAt: u.last_sign_in_at
          ? new Date(u.last_sign_in_at).toISOString()
          : null,
      }))
    );
  } catch (err) {
    logger.error({ err }, "Admin signups error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/errors ─────────────────────────────────────────────────────────
router.get("/admin/errors", (req: Request, res: Response): void => {
  res.json(getErrors());
});

router.delete("/admin/errors", (_req: Request, res: Response): void => {
  clearErrors();
  res.json({ ok: true });
});

// ── GET /admin/status ─────────────────────────────────────────────────────────
router.get("/admin/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const secretKey = clerkSecretKey();
    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;

    // Active users in last 24h from Clerk
    let activeUsers24h = 0;
    let recentActiveUsers: Array<{ email: string; lastSignInAt: string }> = [];
    if (secretKey) {
      try {
        const clerkRes = await fetch(
          "https://api.clerk.com/v1/users?limit=500&order_by=-last_sign_in_at",
          { headers: { Authorization: `Bearer ${secretKey}` } }
        );
        if (clerkRes.ok) {
          const users = (await clerkRes.json()) as ClerkUser[];
          const active = users.filter(
            (u) => u.last_sign_in_at && u.last_sign_in_at > cutoff24h
          );
          activeUsers24h = active.length;
          recentActiveUsers = active.slice(0, 10).map((u) => ({
            email: u.email_addresses[0]?.email_address ?? u.id,
            lastSignInAt: new Date(u.last_sign_in_at!).toISOString(),
          }));
        }
      } catch {
        // non-fatal
      }
    }

    // Recent payments (last 5)
    const recentPayments = await db
      .select({
        amountTotal: purchasesTable.amountTotal,
        planKey: purchasesTable.planKey,
        createdAt: purchasesTable.createdAt,
        userId: purchasesTable.userId,
      })
      .from(purchasesTable)
      .where(eq(purchasesTable.status, "complete"))
      .orderBy(desc(purchasesTable.createdAt))
      .limit(5);

    const paymentUserIds = recentPayments.map((p) => p.userId);
    const emailMap = await getClerkEmails(paymentUserIds);

    const mem = process.memoryUsage();

    res.json({
      activeUsers24h,
      recentActiveUsers,
      recentPayments: recentPayments.map((p) => ({
        email: emailMap.get(p.userId) ?? p.userId,
        planKey: p.planKey,
        amountDollars: (p.amountTotal ?? 0) / 100,
        createdAt: p.createdAt,
      })),
      logLevel: process.env.LOG_LEVEL ?? "info",
      memoryMb: Math.round(mem.heapUsed / 1024 / 1024),
      memoryTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    });
  } catch (err) {
    logger.error({ err }, "Admin status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET/POST /admin/notifications ─────────────────────────────────────────────
router.get("/admin/notifications", async (_req: Request, res: Response): Promise<void> => {
  res.json({ enabled: notificationsEnabled });
});

router.post("/admin/notifications", async (req: Request, res: Response): Promise<void> => {
  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be a boolean" });
    return;
  }
  notificationsEnabled = enabled;
  logger.info({ enabled }, "Admin notifications toggle changed");
  res.json({ enabled: notificationsEnabled });
});

export default router;
