import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { logger } from "../lib/logger";
import { userHasPurchase } from "../lib/purchases";
import { userHasBetaAccess } from "../lib/beta";

// ─── Public router — no auth required ────────────────────────────────────────
export const stripePublicRouter = Router();

// Get publishable key (used by frontend to init Stripe.js if needed)
stripePublicRouter.get("/stripe/config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err) {
    logger.error({ err }, "stripe/config error");
    res.status(500).json({ error: "Failed to load Stripe config" });
  }
});

// In-memory cache for Stripe products — avoids hammering the Stripe API on
// every pricing page visit while ensuring prices are always current.
// TTL is short (60s) so price changes are reflected quickly without a deploy.
let productsCache: { products: any[]; expiresAt: number } | null = null;
const PRODUCTS_CACHE_TTL_MS = 60_000;

// List all active products with their prices.
// Always reads from Stripe API directly so prices are never stale (e.g. after
// a price update in the Stripe dashboard). Falls back to DB cache if Stripe
// is unreachable.
stripePublicRouter.get("/stripe/products", async (_req, res) => {
  try {
    // Serve from in-memory cache if still fresh
    if (productsCache && Date.now() < productsCache.expiresAt) {
      res.json({ products: productsCache.products });
      return;
    }

    // Fetch live from Stripe
    const stripe = await getUncachableStripeClient();
    const [stripeProducts, stripePrices] = await Promise.all([
      stripe.products.list({ active: true, limit: 100 }),
      stripe.prices.list({ active: true, limit: 100 }),
    ]);

    const pricesByProduct = new Map<string, any[]>();
    for (const price of stripePrices.data) {
      const pid = typeof price.product === "string" ? price.product : price.product.id;
      if (!pricesByProduct.has(pid)) pricesByProduct.set(pid, []);
      pricesByProduct.get(pid)!.push({
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
      });
    }

    const products = stripeProducts.data
      .filter((p) => p.metadata?.plan)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        metadata: p.metadata,
        prices: (pricesByProduct.get(p.id) ?? []).sort(
          (a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0)
        ),
      }));

    productsCache = { products, expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS };
    res.json({ products });
  } catch (stripeErr) {
    // Stripe unreachable — fall back to DB so the pricing page still loads
    logger.warn({ err: stripeErr }, "stripe/products: Stripe API failed, falling back to DB");
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
          pr.currency
        FROM stripe.products p
        JOIN latest_products lp ON lp.id = p.id
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC NULLS LAST
      `);

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
    } catch (dbErr) {
      logger.error({ err: dbErr }, "stripe/products: DB fallback also failed");
      res.status(500).json({ error: "Failed to load products" });
    }
  }
});

// ─── Protected router — requireAuth must run before this ─────────────────────
export const stripeProtectedRouter = Router();

// Create a Stripe Checkout session and return the URL.
// Body: { priceIds: string[], successPath?: string, cancelPath?: string }
// Also accepts legacy { priceId: string } for backward compatibility.
stripeProtectedRouter.post("/stripe/checkout", async (req: any, res) => {
  try {
    const userId = req.userId as string;

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

    // Validate all submitted price IDs against active prices in our Stripe catalog.
    // Check the local DB first (fast); fall back to the Stripe API for any IDs
    // not yet synced to the DB (e.g. when stripe.prices table is empty on a fresh
    // production deploy before the StripeSync backfill has run).
    const validIds = new Set<string>();
    for (const id of ids) {
      const result = await db.execute(
        sql`SELECT id FROM stripe.prices WHERE id = ${id} AND active = true LIMIT 1`
      );
      if ((result.rows as any[]).length > 0) validIds.add(id);
    }

    // For any IDs not found in the DB, verify directly against the Stripe API.
    const idsNotInDb = ids.filter((id) => !validIds.has(id));
    if (idsNotInDb.length > 0) {
      const stripeForValidation = await getUncachableStripeClient();
      for (const id of idsNotInDb) {
        try {
          const price = await stripeForValidation.prices.retrieve(id);
          if (price.active) validIds.add(id);
        } catch {
          // Price not found in Stripe — will be caught as invalid below
        }
      }
    }

    const invalidIds = ids.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      logger.warn({ userId, invalidIds }, "stripe/checkout: invalid price IDs submitted");
      res.status(400).json({ error: "One or more price IDs are not valid" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    const host = `${req.protocol}://${req.get("host")}`;
    const successUrl = `${host}${successPath ?? "/dashboard?payment=success"}`;
    const cancelUrl  = `${host}${cancelPath  ?? "/pricing?payment=cancelled"}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: ids.map((id) => ({ price: id, quantity: 1 })),
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      client_reference_id: userId,
      metadata: { userId },
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "stripe/checkout error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Check whether the authenticated user has confirmed access (purchase or beta).
stripeProtectedRouter.get("/stripe/purchase-status", async (req: any, res) => {
  const userId = req.userId as string;
  try {
    const [hasPurchase, hasBeta] = await Promise.all([
      userHasPurchase(userId),
      userHasBetaAccess(userId),
    ]);
    res.json({ hasPurchase: hasPurchase || hasBeta });
  } catch (err) {
    logger.error({ err }, "stripe/purchase-status error");
    res.status(500).json({ error: "Could not check purchase status" });
  }
});
