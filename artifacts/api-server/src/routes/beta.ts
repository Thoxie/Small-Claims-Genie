import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { betaAccessTable } from "@workspace/db";
import { sql, eq, count } from "drizzle-orm";
import { getBetaSlotCount, BETA_LIMIT } from "../lib/beta";
import { getUserId } from "../lib/owned-case";
import { getUncachableResendClient } from "../lib/resend";
import { logger } from "../lib/logger";
import { buildAdminBetaSignupEmail, buildBetaWelcomeEmail } from "../lib/email-templates";

const ADMIN_EMAIL = "hello@smallclaimsgenie.com";

async function sendAdminNotificationEmail(
  userEmail: string | null,
  slotsClaimed: number
): Promise<void> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const slotsRemaining = Math.max(0, BETA_LIMIT - slotsClaimed);
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const { subject, html } = buildAdminBetaSignupEmail({ userEmail, slotsClaimed, slotsRemaining, timestamp, betaLimit: BETA_LIMIT });
    await client.emails.send({ from: fromEmail, to: ADMIN_EMAIL, subject, html });
  } catch (err) {
    logger.error({ err }, "[beta] Failed to send admin notification email");
  }
}

async function sendBetaWelcomeEmail(email: string): Promise<void> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const { subject, html } = buildBetaWelcomeEmail();
    await client.emails.send({ from: fromEmail, to: email, subject, html });
  } catch (err) {
    // Fire-and-forget — log the error but never block the claim response
    logger.error({ err }, "[beta] Failed to send welcome email");
  }
}

const publicRouter: IRouter = Router();
const protectedRouter: IRouter = Router();

publicRouter.get("/beta/slots", async (_req, res): Promise<void> => {
  try {
    const slots = await getBetaSlotCount();
    res.json(slots);
  } catch {
    res.status(500).json({ error: "Could not fetch slot count" });
  }
});

protectedRouter.post("/beta/claim", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const email = typeof req.body?.email === "string" ? req.body.email : null;

    // All reads and the insert run inside a single transaction with an
    // exclusive table lock.  The lock is acquired before any count or
    // duplicate check, so concurrent claim requests are fully serialized —
    // only one can proceed at a time, eliminating the TOCTOU race that
    // previously let multiple accounts exceed BETA_LIMIT.
    type ClaimResult =
      | { status: "inserted"; claimed: number }
      | { status: "alreadyClaimed" }
      | { status: "full" };

    const result = await db.transaction(async (tx): Promise<ClaimResult> => {
      // Exclusive lock serializes all concurrent writers for this table.
      // Readers (e.g. GET /beta/slots) are not blocked but will wait for
      // the lock to be released before seeing the new row.
      await tx.execute(sql`LOCK TABLE beta_access IN EXCLUSIVE MODE`);

      // 1. Idempotency: user already has a row.
      const existing = await tx
        .select({ id: betaAccessTable.id })
        .from(betaAccessTable)
        .where(eq(betaAccessTable.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        return { status: "alreadyClaimed" };
      }

      // 2. Global cap check — evaluated while the lock is held so the count
      //    cannot change between this read and the insert below.
      const [row] = await tx.select({ claimed: count() }).from(betaAccessTable);
      const claimed = Number(row?.claimed ?? 0);

      if (claimed >= BETA_LIMIT) {
        return { status: "full" };
      }

      // 3. Insert — safe because no other transaction can have changed the
      //    count since we acquired the exclusive lock.
      await tx.insert(betaAccessTable).values({ userId, email });
      return { status: "inserted", claimed: claimed + 1 };
    });

    if (result.status === "alreadyClaimed") {
      res.json({ success: true, alreadyClaimed: true });
      return;
    }

    if (result.status === "full") {
      res.status(409).json({ error: "Beta is full", message: "All beta spots have been claimed." });
      return;
    }

    // New row inserted successfully.
    res.json({ success: true, alreadyClaimed: false });

    // Send emails async — does not block the response.
    if (email) {
      void sendBetaWelcomeEmail(email);
    }
    void sendAdminNotificationEmail(email, result.claimed);
  } catch (err) {
    logger.error({ err, userId }, "[beta] Failed to claim beta slot");
    res.status(500).json({ error: "Could not claim beta slot" });
  }
});

export { publicRouter as betaPublicRouter, protectedRouter as betaProtectedRouter };
