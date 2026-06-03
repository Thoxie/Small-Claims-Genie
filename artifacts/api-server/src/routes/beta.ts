import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { betaAccessTable } from "@workspace/db";
import { sql, eq, count } from "drizzle-orm";
import { getBetaSlotCount, BETA_LIMIT } from "../lib/beta";
import { getUserId } from "../lib/owned-case";
import { getUncachableResendClient } from "../lib/resend";
import { logger } from "../lib/logger";

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
    await client.emails.send({
      from: fromEmail,
      to: ADMIN_EMAIL,
      subject: `New beta sign-up — ${slotsClaimed} of ${BETA_LIMIT} spots claimed`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #2563eb;">New beta tester signed up</h2>
          <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600; width: 140px;">Time (PT)</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600;">User email</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${userEmail ?? "(not provided)"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600;">Spots claimed</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${slotsClaimed} / ${BETA_LIMIT}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600;">Spots remaining</td>
              <td style="padding: 8px 12px;">${slotsRemaining}</td>
            </tr>
          </table>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err }, "[beta] Failed to send admin notification email");
  }
}

async function sendBetaWelcomeEmail(email: string): Promise<void> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: "You're in — welcome to the Small Claims Genie beta!",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #2563eb;">You've claimed your beta spot!</h2>
          <p>Hi there,</p>
          <p>Your beta access is active. You can start building your first small claims case right now.</p>
          <p style="margin: 24px 0;">
            <a href="https://smallclaimsgenie.com/cases/new"
               style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Start my first case &rarr;
            </a>
          </p>
          <h3 style="margin-top: 32px;">What to expect</h3>
          <ul style="line-height: 1.8;">
            <li>AI-powered case preparation, demand letters, and court form generation.</li>
            <li>This is a beta — you may run into rough edges. We appreciate your patience.</li>
            <li>Features and workflows may change as we improve the product.</li>
          </ul>
          <p style="margin-top: 24px;">
            Have feedback or questions? Reply to this email or reach us at
            <a href="mailto:hello@smallclaimsgenie.com">hello@smallclaimsgenie.com</a>.
          </p>
          <p>Thanks for being an early supporter,<br/>The Small Claims Genie team</p>
        </div>
      `,
    });
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
