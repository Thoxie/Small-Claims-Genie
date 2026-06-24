---
name: Stripe connection
description: How Stripe is wired in this project — do NOT use the Replit OAuth connector or call proposeIntegration for Stripe
---

# Stripe Connection

## The rule
**Never call `proposeIntegration` for Stripe. Never ask the user to "reconnect" Stripe.**

## Why
This app uses `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` Replit secrets directly — it does NOT use the Replit Stripe OAuth connector. The connector (`conn_stripe_01KQND7GR4W4NN4WNJXW2DPS0B`) shows as `status: added` in `searchIntegrations` but is irrelevant to the app's function. Calling `proposeIntegration` on it sends the user to a broken Replit homepage link, not a real Stripe auth flow.

## How to apply
- To verify Stripe is working: hit `GET /api/stripe/products` — if it returns 7 products, everything is fine.
- To verify products exist: query `SELECT name, metadata->>'plan' FROM stripe.products WHERE active = true` — should return 7 rows (personal_low, personal_high, business_low, business_high, paralegal, collection_low, collection_high).
- If products are missing after a key rotation: run `pnpm --filter @workspace/scripts exec tsx src/seed-products.ts` per the Stripe key rotation protocol in replit.md.
- The Replit connector UI always shows "Paused" — permanently ignore it.
