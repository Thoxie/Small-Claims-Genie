/**
 * Update Stripe product prices for Small Claims Genie.
 *
 * Stripe prices are immutable — this script creates new prices at the new
 * amounts and archives the old ones. Safe to run multiple times.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/update-prices.ts
 */
import { getUncachableStripeClient } from "./stripeClient";

const NEW_PRICES: Record<string, number> = {
  personal_low: 3900,   // $39
  personal_high: 5900,  // $59
  business_low: 5900,   // $59
  business_high: 7900,  // $79
  paralegal: 15900,     // $159 — unchanged
  collection_low: 6900, // $69
  collection_high: 9900, // $99
};

async function updatePrices() {
  const stripe = await getUncachableStripeClient();
  console.log("Updating Stripe prices for Small Claims Genie...\n");

  const allProducts = await stripe.products.list({ active: true, limit: 100 });

  for (const product of allProducts.data) {
    const planKey = product.metadata?.plan;
    if (!planKey || !(planKey in NEW_PRICES)) continue;

    const newAmount = NEW_PRICES[planKey];

    // Get existing active prices
    const existingPrices = await stripe.prices.list({ product: product.id, active: true });

    // Check if a price at the new amount already exists
    const alreadyExists = existingPrices.data.find(p => p.unit_amount === newAmount);
    if (alreadyExists) {
      console.log(`✓ ${product.name} — price already at $${newAmount / 100} (${alreadyExists.id})`);
      continue;
    }

    // Create new price
    const newPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: newAmount,
      currency: "usd",
    });
    console.log(`+ ${product.name}`);
    console.log(`  New price: $${newAmount / 100} → ${newPrice.id}`);

    // Archive old prices
    for (const old of existingPrices.data) {
      await stripe.prices.update(old.id, { active: false });
      console.log(`  Archived:  $${(old.unit_amount ?? 0) / 100} → ${old.id}`);
    }
    console.log();
  }

  console.log("Done! Restart the API server so StripeSync picks up the new prices.");
}

updatePrices().catch((err) => {
  console.error("Error updating prices:", err.message);
  process.exit(1);
});
