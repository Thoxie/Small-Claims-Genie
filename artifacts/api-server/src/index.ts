import app from "./app";
import { logger } from "./lib/logger";
import { startReminderScheduler } from "./lib/reminder-scheduler";
import { warmupBrowser } from "./forms/chromium-pool";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { ensurePurchasesTable } from "./lib/purchases";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe init");
    return;
  }
  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl } as Parameters<typeof runMigrations>[0]);
    await ensurePurchasesTable();
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    // Prefer a custom domain (e.g. smallclaimsgenie.com) over the .replit.app dev domain.
    const allDomains = (process.env.REPLIT_DOMAINS ?? "").split(",").filter(Boolean);
    const preferredDomain = allDomains.find((d) => !d.includes(".replit.app")) ?? allDomains[0] ?? "";
    const webhookBaseUrl = `https://${preferredDomain}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    // Sync existing Stripe data in background — don't block server startup
    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe backfill complete"))
      .catch((err) => logger.error({ err }, "Stripe backfill error"));
  } catch (err) {
    logger.error({ err }, "Stripe init error — payments may be unavailable");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startReminderScheduler();
  warmupBrowser();
  initStripe();
});
