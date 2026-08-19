import { Router, type IRouter } from "express";
import { getBetaSlotCount, BETA_LIMIT, grantBetaAccess } from "../lib/beta";
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

    const result = await grantBetaAccess({ userId, email });

    if (result === "alreadyClaimed") {
      res.json({ success: true, alreadyClaimed: true });
      return;
    }

    if (result === "full") {
      res.status(409).json({ error: "Beta is full", message: "All beta spots have been claimed." });
      return;
    }

    // New row inserted successfully.
    res.json({ success: true, alreadyClaimed: false });

    // Send emails async — does not block the response.
    if (email) {
      void sendBetaWelcomeEmail(email);
    }
    const slots = await getBetaSlotCount();
    void sendAdminNotificationEmail(email, slots.claimed);
  } catch (err) {
    logger.error({ err, userId }, "[beta] Failed to claim beta slot");
    res.status(500).json({ error: "Could not claim beta slot" });
  }
});

export { publicRouter as betaPublicRouter, protectedRouter as betaProtectedRouter };
