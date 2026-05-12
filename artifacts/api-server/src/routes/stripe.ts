import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

// Get publishable key (used by frontend to init Stripe.js if needed)
router.get("/stripe/config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err) {
    logger.error({ err }, "stripe/config error");
    res.status(500).json({ error: "Failed to load Stripe config" });
  }
});

// List all active products with their prices
router.get("/stripe/products", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      WITH latest_products AS (
        SELECT DISTINCT ON (metadata->>'plan') id
        FROM stripe.products
        WHERE active = true AND metadata->>'plan' IS NOT NULL
        ORDER BY metadata->>'plan', created DESC
      )
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.metadata AS product_metadata,
        pr.id AS price_id,
        pr.unit_amount,
        pr.currency,
        pr.active AS price_active
      FROM stripe.products p
      JOIN latest_products lp ON lp.id = p.id
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = true
      ORDER BY pr.unit_amount ASC NULLS LAST
    `);

    // Group prices by product
    const map = new Map<string, any>();
    for (const row of result.rows as any[]) {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata ?? {},
          prices: [],
        });
      }
      if (row.price_id) {
        map.get(row.product_id).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
        });
      }
    }

    res.json({ products: Array.from(map.values()) });
  } catch (err) {
    logger.error({ err }, "stripe/products error");
    res.status(500).json({ error: "Failed to load products" });
  }
});

// Create a Stripe Checkout session and return the URL
// Body: { priceIds: string[], successPath?: string, cancelPath?: string }
// Also accepts legacy { priceId: string } for backward compatibility
router.post("/stripe/checkout", async (req: any, res) => {
  try {
    const { priceId, priceIds, successPath, cancelPath } = req.body as {
      priceId?: string;
      priceIds?: string[];
      successPath?: string;
      cancelPath?: string;
    };

    const ids: string[] = priceIds ?? (priceId ? [priceId] : []);

    if (ids.length === 0) {
      res.status(400).json({ error: "priceId or priceIds is required" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    // Build absolute URLs from the request host
    const host = `${req.protocol}://${req.get("host")}`;
    const successUrl = `${host}${successPath ?? "/dashboard?payment=success"}`;
    const cancelUrl = `${host}${cancelPath ?? "/pricing?payment=cancelled"}`;

    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: ids.map((id) => ({ price: id, quantity: 1 })),
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    };

    // Attach the Clerk user ID as client_reference_id so we can track the purchase
    if (req.userId) {
      sessionParams.client_reference_id = req.userId;
      sessionParams.metadata = { userId: req.userId };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "stripe/checkout error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
