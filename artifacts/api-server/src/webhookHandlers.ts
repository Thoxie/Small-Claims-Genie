import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { recordPurchase } from "./lib/purchases";
import { logger } from "./lib/logger";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "This usually means express.json() parsed the body before reaching this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    // Let stripe-replit-sync mirror the event into its tables first
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Also parse the event ourselves to record confirmed purchases
    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: any;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        // No webhook secret configured — parse without verification (dev/staging only)
        event = JSON.parse(payload.toString("utf8"));
        logger.warn("STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;

        // Only record payment-mode sessions that were paid
        if (session.mode === "payment" && session.payment_status === "paid") {
          const userId: string | null =
            session.client_reference_id ||
            session.metadata?.userId ||
            null;

          if (!userId) {
            logger.warn({ sessionId: session.id }, "checkout.session.completed: no userId found");
            return;
          }

          // Pull line items to get price/product info
          let priceId: string | null = null;
          let productId: string | null = null;
          let planKey: string | null = null;

          try {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
            const firstItem = lineItems.data[0];
            if (firstItem) {
              priceId = typeof firstItem.price === "string" ? firstItem.price : firstItem.price?.id ?? null;
              const prod = firstItem.price?.product;
              productId = typeof prod === "string" ? prod : prod?.id ?? null;
              planKey = firstItem.price?.metadata?.plan ?? firstItem.price?.product?.metadata?.plan ?? null;
            }
          } catch (err) {
            logger.warn({ err, sessionId: session.id }, "Could not fetch line items — recording without product detail");
          }

          await recordPurchase({
            userId,
            stripeSessionId: session.id,
            stripePriceId: priceId,
            stripeProductId: productId,
            planKey,
            amountTotal: session.amount_total,
            currency: session.currency,
          });
        }
      }
    } catch (err) {
      // Log but don't throw — we already let stripe-replit-sync process the event
      logger.error({ err }, "Failed to process purchase recording from webhook");
    }
  }
}
