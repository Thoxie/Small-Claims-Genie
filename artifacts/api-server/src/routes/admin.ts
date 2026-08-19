import { Router, type Request, type Response } from "express";
import { Readable } from "stream";
import { db, casesTable, purchasesTable, aiRateLimitsTable, betaAccessTable, genieConversionsTable, documentsTable, countiesTable } from "@workspace/db";
import { sql, count, sum, eq, gte, lt, desc, asc, and, isNotNull, like } from "drizzle-orm";
import { CALIFORNIA_COUNTIES, FLORIDA_COUNTIES } from "./counties";
import { logger } from "../lib/logger";
import { FormRegistry } from "../forms/registry";
import type { CaseData } from "../forms/types";
import { getErrors, clearErrors } from "../lib/errorLog";
import { BETA_LIMIT, grantBetaAccess } from "../lib/beta";
import { requireAdmin } from "../lib/admin-auth";
import { ObjectStorageService } from "../lib/objectStorage";

const objectStorage = new ObjectStorageService();

const router = Router();

// In-memory notifications toggle — resets on server restart (acceptable for owner tool)
let notificationsEnabled = false;

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

// ── GET /admin/documents/:docId/view (no Bearer — key in ?key= for window.open) ─
router.get("/admin/documents/:docId/view", async (req: Request, res: Response): Promise<void> => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = req.query.key as string | undefined;
  if (!adminKey || !providedKey || providedKey !== adminKey) {
    res.status(401).send("Unauthorized");
    return;
  }
  const docId = parseInt(req.params.docId as string, 10);
  if (isNaN(docId)) { res.status(400).send("Invalid document ID"); return; }
  try {
    const [doc] = await db
      .select({
        id: documentsTable.id,
        originalName: documentsTable.originalName,
        mimeType: documentsTable.mimeType,
        storageObjectPath: documentsTable.storageObjectPath,
        fileData: documentsTable.fileData,
      })
      .from(documentsTable)
      .where(eq(documentsTable.id, docId))
      .limit(1);
    if (!doc) { res.status(404).send("Document not found"); return; }
    const mime = doc.mimeType ?? "application/octet-stream";
    const safeName = doc.originalName ?? `document-${docId}`;
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    if (doc.storageObjectPath) {
      const objectFile = await objectStorage.getObjectEntityFile(doc.storageObjectPath);
      const gcsRes = await objectStorage.downloadObject(objectFile);
      if (!gcsRes.body) { res.status(500).send("Empty response from storage"); return; }
      Readable.fromWeb(gcsRes.body as import("stream/web").ReadableStream<Uint8Array>).pipe(res);
    } else if (doc.fileData) {
      res.send(Buffer.from(doc.fileData, "base64"));
    } else {
      res.status(404).send("File data not found");
    }
  } catch (err) {
    logger.error({ err, docId }, "Admin document view error");
    res.status(500).send("Internal server error");
  }
});

// ── GET /admin/cases/:caseId/forms/:formId/view (no Bearer — key in ?key= for window.open) ─
router.get("/admin/cases/:caseId/forms/:formId/view", async (req: Request, res: Response): Promise<void> => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = req.query.key as string | undefined;
  if (!adminKey || !providedKey || providedKey !== adminKey) {
    res.status(401).send("Unauthorized");
    return;
  }
  const caseId = parseInt(req.params.caseId as string, 10);
  const formId = req.params.formId as string;
  if (isNaN(caseId)) { res.status(400).send("Invalid case ID"); return; }
  const def = FormRegistry.get(formId);
  if (!def) { res.status(404).send(`Form '${formId}' not found`); return; }
  try {
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
    if (!caseRow) { res.status(404).send("Case not found"); return; }
    const pdfBuf = await def.generate(caseRow as CaseData, {}, undefined);
    const filename = `${formId}-Case-${caseId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.send(pdfBuf);
  } catch (err) {
    logger.error({ err, caseId, formId }, "Admin form view error");
    res.status(500).send("Form generation failed");
  }
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
  email_addresses: Array<{ id?: string; email_address: string }>;
  primary_email_address_id?: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: number;
  last_sign_in_at: number | null;
};

function clerkPrimaryEmail(user: ClerkUser): string | null {
  const primary = user.primary_email_address_id
    ? user.email_addresses.find((address) => address.id === user.primary_email_address_id)
    : undefined;
  return primary?.email_address ?? user.email_addresses[0]?.email_address ?? null;
}

async function getClerkUserById(userId: string): Promise<ClerkUser | null> {
  const secretKey = clerkSecretKey();
  if (!secretKey) {
    throw new Error("Clerk management API is not configured");
  }

  const clerkRes = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  if (clerkRes.status === 404) return null;
  if (!clerkRes.ok) {
    throw new Error(`Clerk user lookup failed with status ${clerkRes.status}`);
  }
  return (await clerkRes.json()) as ClerkUser;
}

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
      users.map((u) => [u.id, clerkPrimaryEmail(u) ?? u.id])
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
    const [cases, purchases, betaAccess, allClerkUsers] = await Promise.all([
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
      db.select({ userId: betaAccessTable.userId }).from(betaAccessTable),
      getAllClerkUsers(),
    ]);

    const paidUserIds = new Set(purchases.map((p) => p.userId));
    const betaUserIds = new Set(betaAccess.map((row) => row.userId));
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
      hasBetaAccess: boolean;
      hasClerkAccount: boolean;
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
          hasBetaAccess: betaUserIds.has(uid),
          hasClerkAccount: Boolean(cu),
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
          hasBetaAccess: betaUserIds.has(cu.id),
          hasClerkAccount: true,
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
router.get("/admin/errors", (_req: Request, res: Response): void => {
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

// ── GET /admin/beta ───────────────────────────────────────────────────────────
router.get("/admin/beta", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(betaAccessTable)
      .orderBy(desc(betaAccessTable.claimedAt));
    res.json({ total: rows.length, limit: BETA_LIMIT, rows });
  } catch (err) {
    logger.error({ err }, "Admin beta error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/genie-conversions ──────────────────────────────────────────────
router.get("/admin/genie-conversions", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(genieConversionsTable)
    .orderBy(desc(genieConversionsTable.createdAt))
    .limit(200);
  res.json(rows);
});

// ── Test Case seed data helpers ───────────────────────────────────────────────
const CA_CLAIM_TYPES = ["Property Damage", "Breach of Contract", "Security Deposit", "Unpaid Wages", "Loan Repayment"];
const FL_CLAIM_TYPES = ["Auto Negligence", "Goods Sold", "Work Done / Materials Furnished", "Money Lent", "Promissory Note", "Stolen Property from Pawnbroker", "Return of Property from Government", "Account Stated", "General / Other"];

const CA_SAMPLE_DEFENDANTS = [
  { name: "Pacific Properties LLC", address: "500 Commerce Dr", isBusinessOrEntity: true },
  { name: "John Michael Turner", address: "1422 Maple Ave", isBusinessOrEntity: false },
  { name: "Westside Auto Repair Inc", address: "8801 Industrial Blvd", isBusinessOrEntity: true },
  { name: "Maria Elena Sanchez", address: "3311 Park Blvd", isBusinessOrEntity: false },
];

const FL_SAMPLE_DEFENDANTS = [
  { name: "Sunshine Realty LLC", address: "200 Brickell Ave", isBusinessOrEntity: true },
  { name: "James William Carter", address: "456 Palm Dr", isBusinessOrEntity: false },
  { name: "Gulf Coast Auto Group Inc", address: "9900 US Highway 19", isBusinessOrEntity: true },
  { name: "Ashley Nicole Brooks", address: "712 Beach Rd", isBusinessOrEntity: false },
];

const CA_DESCRIPTIONS = [
  "Defendant failed to return my $2,500 security deposit after I vacated the premises on time and left the unit in excellent condition. Multiple written requests for return of the deposit have been ignored.",
  "Defendant caused significant damage to my vehicle while it was parked in front of my residence. The vehicle sustained $2,500 in damages which defendant refuses to pay despite repeated requests.",
  "Defendant borrowed $2,500 and agreed to repay within 30 days under a written agreement. Despite the due date having passed months ago, defendant has made no payment and stopped responding to communication.",
];

const FL_DESCRIPTIONS = [
  "Defendant failed to return my $2,500 security deposit after I vacated the rental unit on time and in clean condition. Florida Statute 83.49 requires the deposit be returned within 15 days; defendant has not complied.",
  "Defendant caused $2,500 in damage to my personal property and refuses to compensate me despite written demand. The damage is documented with photographs and repair estimates.",
  "Defendant owes $2,500 under a written contract for services rendered. Despite completing all contracted work and submitting multiple invoices, defendant has not paid any amount owed.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildTestCaseData(state: string, countyId: string, userId: string) {
  const allCounties = state === "FL" ? FLORIDA_COUNTIES : CALIFORNIA_COUNTIES;
  const county = allCounties.find((c) => c.id === countyId);
  if (!county) return null;
  const cityName = county.courthouseCity;
  const stateAbbr = state === "FL" ? "FL" : "CA";

  const defendants = state === "FL" ? FL_SAMPLE_DEFENDANTS : CA_SAMPLE_DEFENDANTS;
  const defendant = pick(defendants);
  const claimTypes = state === "FL" ? FL_CLAIM_TYPES : CA_CLAIM_TYPES;
  const descriptions = state === "FL" ? FL_DESCRIPTIONS : CA_DESCRIPTIONS;

  const incidentDate = new Date();
  incidentDate.setMonth(incidentDate.getMonth() - 3);
  const incidentDateStr = incidentDate.toISOString().slice(0, 10);

  const priorDemandDate = new Date();
  priorDemandDate.setMonth(priorDemandDate.getMonth() - 1);
  const priorDemandDateStr = priorDemandDate.toISOString().slice(0, 10);

  const countyDisplayName = county.name;
  const title = `[TEST] ${countyDisplayName} ${stateAbbr} — ${pick(claimTypes)} QA Case`;

  return {
    userId,
    title,
    status: "draft" as const,
    countyId: county.id,
    jurisdictionState: stateAbbr,
    claimAmount: 2500,
    claimType: pick(claimTypes),
    claimDescription: pick(descriptions),
    incidentDate: incidentDateStr,
    plaintiffName: "Alex Jordan Rivera",
    plaintiffAddress: "123 Test Lane",
    plaintiffCity: cityName,
    plaintiffState: stateAbbr,
    plaintiffZip: county.courthouseZip,
    plaintiffPhone: "(555) 010-0001",
    plaintiffEmail: "test-plaintiff@example.com",
    defendantName: defendant.name,
    defendantAddress: defendant.address,
    defendantCity: cityName,
    defendantState: stateAbbr,
    defendantZip: county.courthouseZip,
    defendantIsBusinessOrEntity: defendant.isBusinessOrEntity,
    priorDemandMade: true,
    priorDemandDate: priorDemandDateStr,
    priorDemandMethod: "Email and certified mail",
    priorDemandDescription: "Sent written demand letter requesting $2,500. Defendant did not respond within the required timeframe.",
    howAmountCalculated: "Direct damages: $2,500 based on documented receipts and estimates.",
    courthouseName: county.courthouseName,
    courthouseAddress: county.courthouseAddress,
    courthouseCity: county.courthouseCity,
    courthouseZip: county.courthouseZip,
    courthousePhone: county.phone,
    venueReason: `The incident occurred in ${countyDisplayName} County.`,
    venueBasis: "where_defendant_lives",
    intakeStep: 5,
    intakeComplete: true,
    readinessScore: 62,
  };
}

// ── GET /admin/test-cases ─────────────────────────────────────────────────────
router.get("/admin/test-cases", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: casesTable.id,
        title: casesTable.title,
        countyId: casesTable.countyId,
        jurisdictionState: casesTable.jurisdictionState,
        userId: casesTable.userId,
        claimType: casesTable.claimType,
        createdAt: casesTable.createdAt,
      })
      .from(casesTable)
      .where(like(casesTable.title, "[TEST]%"))
      .orderBy(desc(casesTable.createdAt))
      .limit(20);
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "Admin test-cases list error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /admin/test-cases ────────────────────────────────────────────────────
router.post("/admin/test-cases", async (req: Request, res: Response): Promise<void> => {
  const { state, countyId, targetUserId } = req.body as {
    state?: string;
    countyId?: string;
    targetUserId?: string;
  };

  if (!state || !countyId || !targetUserId) {
    res.status(400).json({ error: "state, countyId, and targetUserId are required" });
    return;
  }

  if (state !== "CA" && state !== "FL") {
    res.status(400).json({ error: "state must be CA or FL" });
    return;
  }

  try {
    const data = buildTestCaseData(state, countyId, targetUserId);
    if (!data) {
      res.status(400).json({ error: `County '${countyId}' not found for state '${state}'` });
      return;
    }
    const [inserted] = await db.insert(casesTable).values(data).returning();
    res.json(inserted);
  } catch (err) {
    logger.error({ err }, "Admin test-cases create error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/my-clerk-id ────────────────────────────────────────────────────
router.get("/admin/my-clerk-id", async (_req: Request, res: Response): Promise<void> => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    res.json({ clerkId: null });
    return;
  }
  const secretKey = clerkSecretKey();
  if (!secretKey) {
    res.json({ clerkId: null });
    return;
  }
  try {
    const params = new URLSearchParams({ email_address: adminEmail, limit: "1" });
    const clerkRes = await fetch(`https://api.clerk.com/v1/users?${params}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!clerkRes.ok) {
      res.json({ clerkId: null });
      return;
    }
    const users = (await clerkRes.json()) as ClerkUser[];
    res.json({ clerkId: users[0]?.id ?? null });
  } catch {
    res.json({ clerkId: null });
  }
});

// ── DELETE /admin/test-cases/:id ──────────────────────────────────────────────
router.delete("/admin/test-cases/:id", async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }
  try {
    const [existing] = await db
      .select({ id: casesTable.id, title: casesTable.title })
      .from(casesTable)
      .where(eq(casesTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    if (!existing.title.startsWith("[TEST]")) {
      res.status(403).json({ error: "Only [TEST] cases can be deleted via this endpoint" });
      return;
    }

    await db.delete(casesTable).where(eq(casesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Admin test-cases delete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/cases/:caseId ──────────────────────────────────────────────────
router.get("/admin/cases/:caseId", async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;
  const caseId = parseInt(rawId, 10);
  if (isNaN(caseId)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }
  try {
    const [caseRow] = await db
      .select({
        id: casesTable.id,
        userId: casesTable.userId,
        title: casesTable.title,
        status: casesTable.status,
        claimAmount: casesTable.claimAmount,
        claimType: casesTable.claimType,
        claimDescription: casesTable.claimDescription,
        incidentDate: casesTable.incidentDate,
        countyId: casesTable.countyId,
        jurisdictionState: casesTable.jurisdictionState,
        caseNumber: casesTable.caseNumber,
        hearingDate: casesTable.hearingDate,
        hearingTime: casesTable.hearingTime,
        hearingJudge: casesTable.hearingJudge,
        hearingCourtroom: casesTable.hearingCourtroom,
        hearingNotes: casesTable.hearingNotes,
        courthouseName: casesTable.courthouseName,
        courthouseAddress: casesTable.courthouseAddress,
        courthouseCity: casesTable.courthouseCity,
        courthouseZip: casesTable.courthouseZip,
        plaintiffName: casesTable.plaintiffName,
        plaintiffAddress: casesTable.plaintiffAddress,
        plaintiffCity: casesTable.plaintiffCity,
        plaintiffState: casesTable.plaintiffState,
        plaintiffZip: casesTable.plaintiffZip,
        plaintiffPhone: casesTable.plaintiffPhone,
        plaintiffEmail: casesTable.plaintiffEmail,
        plaintiffIsBusiness: casesTable.plaintiffIsBusiness,
        plaintiffDbaName: casesTable.plaintiffDbaName,
        defendantName: casesTable.defendantName,
        defendantAddress: casesTable.defendantAddress,
        defendantCity: casesTable.defendantCity,
        defendantState: casesTable.defendantState,
        defendantZip: casesTable.defendantZip,
        defendantPhone: casesTable.defendantPhone,
        defendantIsBusinessOrEntity: casesTable.defendantIsBusinessOrEntity,
        priorDemandMade: casesTable.priorDemandMade,
        priorDemandDate: casesTable.priorDemandDate,
        howAmountCalculated: casesTable.howAmountCalculated,
        readinessScore: casesTable.readinessScore,
        intakeComplete: casesTable.intakeComplete,
        documentCount: casesTable.documentCount,
        demandLetterText: casesTable.demandLetterText,
        // intake fields needed to compute the proportional sub-score
        venueBasis: casesTable.venueBasis,
        hasAdditionalPlaintiff: casesTable.hasAdditionalPlaintiff,
        additionalPlaintiffIsFictitious: casesTable.additionalPlaintiffIsFictitious,
        additionalPlaintiffName: casesTable.additionalPlaintiffName,
        secondPlaintiffDbaName: casesTable.secondPlaintiffDbaName,
        createdAt: casesTable.createdAt,
        updatedAt: casesTable.updatedAt,
      })
      .from(casesTable)
      .where(eq(casesTable.id, caseId))
      .limit(1);

    if (!caseRow) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const docs = await db
      .select({
        id: documentsTable.id,
        originalName: documentsTable.originalName,
        label: documentsTable.label,
        mimeType: documentsTable.mimeType,
        fileSize: documentsTable.fileSize,
        ocrStatus: documentsTable.ocrStatus,
        createdAt: documentsTable.createdAt,
      })
      .from(documentsTable)
      .where(eq(documentsTable.caseId, caseId))
      .orderBy(desc(documentsTable.createdAt));

    // Compute sub-scores using the exact same formula as recalcReadiness() in cases.ts
    // so intakeScore + docScore + demandScore == readinessScore (no rounding drift).
    const intakeRequired: Array<unknown> = [
      caseRow.plaintiffName,
      caseRow.plaintiffAddress,
      caseRow.defendantName,
      caseRow.defendantAddress,
      caseRow.claimAmount,
      caseRow.claimDescription,
      caseRow.incidentDate,
      caseRow.howAmountCalculated,
      caseRow.priorDemandMade != null ? true : null,
      caseRow.countyId,
      caseRow.venueBasis,
    ];
    if (caseRow.hasAdditionalPlaintiff && caseRow.additionalPlaintiffIsFictitious) {
      intakeRequired.push(caseRow.additionalPlaintiffName);
      intakeRequired.push(caseRow.secondPlaintiffDbaName);
    }
    const intakeFilled = intakeRequired.filter(Boolean).length;
    const intakeScore = Math.round((intakeFilled / intakeRequired.length) * 60);
    const docScore = Math.min(docs.length * 10, 30);
    const demandScore = caseRow.priorDemandMade ? 10 : 0;

    res.json({
      ...caseRow,
      hasDemandLetter: !!caseRow.demandLetterText,
      // intake fields stripped — only needed for sub-score computation above
      venueBasis: undefined,
      hasAdditionalPlaintiff: undefined,
      additionalPlaintiffIsFictitious: undefined,
      additionalPlaintiffName: undefined,
      secondPlaintiffDbaName: undefined,
      intakeScore,
      docScore,
      demandScore,
      documents: docs,
    });
  } catch (err) {
    logger.error({ err }, "Admin case detail error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/cases/:caseId/form/:formId ────────────────────────────────────
router.get("/admin/cases/:caseId/form/:formId", async (req: Request, res: Response): Promise<void> => {
  const caseId = parseInt(req.params.caseId as string, 10);
  const formId = req.params.formId as string;
  if (isNaN(caseId)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }
  const def = FormRegistry.get(formId);
  if (!def) {
    res.status(404).json({ error: `Form '${formId}' not found in registry` });
    return;
  }
  try {
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
    if (!caseRow) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    const pdfBuf = await def.generate(caseRow as CaseData, {}, undefined);
    const filename = `${formId}-Case-${caseId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuf);
  } catch (err) {
    logger.error({ err }, "Admin form generation error");
    res.status(500).json({ error: "Form generation failed" });
  }
});

// ── GET /admin/documents/:docId/file ─────────────────────────────────────────
router.get("/admin/documents/:docId/file", async (req: Request, res: Response): Promise<void> => {
  const docId = parseInt(req.params.docId as string, 10);
  if (isNaN(docId)) {
    res.status(400).json({ error: "Invalid document ID" });
    return;
  }
  const download = req.query.download === "1";
  try {
    const [doc] = await db
      .select({
        id: documentsTable.id,
        originalName: documentsTable.originalName,
        mimeType: documentsTable.mimeType,
        storageObjectPath: documentsTable.storageObjectPath,
        fileData: documentsTable.fileData,
      })
      .from(documentsTable)
      .where(eq(documentsTable.id, docId))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const mime = doc.mimeType ?? "application/octet-stream";
    const safeName = doc.originalName ?? `document-${docId}`;
    const disposition = download
      ? `attachment; filename="${safeName}"`
      : `inline; filename="${safeName}"`;

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", disposition);

    if (doc.storageObjectPath) {
      const objectFile = await objectStorage.getObjectEntityFile(doc.storageObjectPath);
      const gcsRes = await objectStorage.downloadObject(objectFile);
      if (!gcsRes.body) {
        res.status(500).json({ error: "Empty response from storage" });
        return;
      }
      Readable.fromWeb(gcsRes.body as import("stream/web").ReadableStream<Uint8Array>).pipe(res);
    } else if (doc.fileData) {
      const buffer = Buffer.from(doc.fileData, "base64");
      res.send(buffer);
    } else {
      res.status(404).json({ error: "File data not found" });
    }
  } catch (err) {
    logger.error({ err, docId }, "Admin document file error");
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

// ── GET /admin/hearings ───────────────────────────────────────────────────────
router.get("/admin/hearings", async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const hearings = await db
      .select({
        id: casesTable.id,
        title: casesTable.title,
        userId: casesTable.userId,
        caseNumber: casesTable.caseNumber,
        hearingDate: casesTable.hearingDate,
        hearingTime: casesTable.hearingTime,
        hearingCourtroom: casesTable.hearingCourtroom,
        hearingJudge: casesTable.hearingJudge,
        courthouseName: casesTable.courthouseName,
        courthouseCity: casesTable.courthouseCity,
        claimAmount: casesTable.claimAmount,
        readinessScore: casesTable.readinessScore,
        status: casesTable.status,
      })
      .from(casesTable)
      .where(and(isNotNull(casesTable.hearingDate), gte(casesTable.hearingDate, today)))
      .orderBy(casesTable.hearingDate);

    const userIds = [...new Set(hearings.map((h) => h.userId).filter(Boolean) as string[])];
    const emailMap = await getClerkEmails(userIds);

    res.json(
      hearings.map((h) => ({
        ...h,
        email: emailMap.get(h.userId ?? "") ?? h.userId,
      }))
    );
  } catch (err) {
    logger.error({ err }, "Admin hearings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/stuck-cases ────────────────────────────────────────────────────
router.get("/admin/stuck-cases", async (_req: Request, res: Response): Promise<void> => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    const stuck = await db
      .select({
        id: casesTable.id,
        title: casesTable.title,
        userId: casesTable.userId,
        status: casesTable.status,
        claimAmount: casesTable.claimAmount,
        claimType: casesTable.claimType,
        intakeComplete: casesTable.intakeComplete,
        readinessScore: casesTable.readinessScore,
        updatedAt: casesTable.updatedAt,
        createdAt: casesTable.createdAt,
      })
      .from(casesTable)
      .where(
        and(
          lt(casesTable.updatedAt, cutoff),
          sql`${casesTable.status} NOT IN ('complete', 'won', 'lost')`
        )
      )
      .orderBy(casesTable.updatedAt);

    const userIds = [...new Set(stuck.map((c) => c.userId).filter(Boolean) as string[])];
    const emailMap = await getClerkEmails(userIds);

    res.json(
      stuck.map((c) => ({
        ...c,
        email: emailMap.get(c.userId ?? "") ?? c.userId,
        daysSinceActivity: Math.floor((Date.now() - (c.updatedAt?.getTime() ?? Date.now())) / 86400000),
      }))
    );
  } catch (err) {
    logger.error({ err }, "Admin stuck-cases error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /admin/beta/grant ────────────────────────────────────────────────────
router.post("/admin/beta/grant", async (req: Request, res: Response): Promise<void> => {
  const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  try {
    const clerkUser = await getClerkUserById(userId);
    if (!clerkUser) {
      res.status(404).json({ error: "Clerk user not found" });
      return;
    }
    const email = clerkPrimaryEmail(clerkUser);
    if (!email) {
      res.status(400).json({ error: "Clerk user does not have an email address" });
      return;
    }

    const result = await grantBetaAccess({ userId, email });
    if (result === "full") {
      res.status(409).json({ error: "Beta is full", message: "All beta spots have been claimed." });
      return;
    }

    const rows = await db.select().from(betaAccessTable).orderBy(desc(betaAccessTable.claimedAt));
    logger.info({ userId, email, alreadyClaimed: result === "alreadyClaimed" }, "Admin granted beta access");
    res.json({ total: rows.length, limit: BETA_LIMIT, rows, alreadyClaimed: result === "alreadyClaimed" });
  } catch (err) {
    logger.error({ err }, "Admin beta grant error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /admin/beta/:userId ────────────────────────────────────────────────
router.delete("/admin/beta/:userId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  try {
    await db.delete(betaAccessTable).where(eq(betaAccessTable.userId, userId));
    const rows = await db.select().from(betaAccessTable).orderBy(desc(betaAccessTable.claimedAt));
    logger.info({ userId }, "Admin revoked beta access");
    res.json({ total: rows.length, limit: BETA_LIMIT, rows });
  } catch (err) {
    logger.error({ err }, "Admin beta revoke error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /admin/counties ───────────────────────────────────────────────────────
router.get("/admin/counties", async (req: Request, res: Response): Promise<void> => {
  const { state } = req.query as { state?: string };
  try {
    const rows = state
      ? await db.select().from(countiesTable).where(eq(countiesTable.state, state)).orderBy(asc(countiesTable.name))
      : await db.select().from(countiesTable).orderBy(asc(countiesTable.state), asc(countiesTable.name));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "Admin counties fetch error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /admin/counties/import ───────────────────────────────────────────────
router.post("/admin/counties/import", async (req: Request, res: Response): Promise<void> => {
  const { counties } = req.body as { counties?: unknown[] };
  if (!Array.isArray(counties) || counties.length === 0) {
    res.status(400).json({ error: "Expected { counties: [...] }" });
    return;
  }
  try {
    const rows = counties as Array<typeof countiesTable.$inferInsert>;
    await db
      .insert(countiesTable)
      .values(rows)
      .onConflictDoUpdate({
        target: countiesTable.id,
        set: {
          name:               sql`excluded.name`,
          state:              sql`excluded.state`,
          courthouseName:     sql`excluded.courthouse_name`,
          courthouseAddress:  sql`excluded.courthouse_address`,
          courthouseCity:     sql`excluded.courthouse_city`,
          courthouseZip:      sql`excluded.courthouse_zip`,
          filingFeeUnder1500: sql`excluded.filing_fee_under1500`,
          filingFee1500to5000: sql`excluded.filing_fee_1500to5000`,
          filingFeeOver5000:  sql`excluded.filing_fee_over5000`,
          phone:              sql`excluded.phone`,
          clerkWebsite:       sql`excluded.clerk_website`,
          notes:              sql`excluded.notes`,
          updatedAt:          sql`now()`,
        },
      });
    logger.info({ count: counties.length }, "Admin imported counties");
    res.json({ imported: counties.length });
  } catch (err) {
    logger.error({ err }, "Admin counties import error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
