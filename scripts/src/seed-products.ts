/**
 * Seed Stripe products for Small Claims Genie.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 *
 * Safe to run multiple times — checks for existing products before creating.
 */
import { getUncachableStripeClient } from "./stripeClient";

const PRODUCTS = [
  {
    name: "Personal Case",
    description: "For person-versus-person disputes such as neighbor, roommate, or acquaintance conflicts.",
    amount: 6900, // $69.00
    metadata: { plan: "personal" },
  },
  {
    name: "Business Case",
    description: "For any case involving a business on either side — individual suing a business or vice versa.",
    amount: 8900, // $89.00
    metadata: { plan: "business" },
  },
  {
    name: "Genie Plus: Paralegal Review",
    description: "Small Claims Genie AI tools plus personalized document review and hearing prep from a trained paralegal.",
    amount: 15900, // $159.00
    metadata: { plan: "paralegal" },
  },
  {
    name: "Post-Judgment Collection (up to $5,000)",
    description: "Every enforcement tool California law provides — writs, levies, garnishments, and liens — for judgments up to $5,000.",
    amount: 8900, // $89.00
    metadata: { plan: "collection_low" },
  },
  {
    name: "Post-Judgment Collection ($5,000 and above)",
    description: "Every enforcement tool California law provides — writs, levies, garnishments, and liens — for judgments of $5,000 or more.",
    amount: 9900, // $99.00
    metadata: { plan: "collection_high" },
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("Seeding Stripe products for Small Claims Genie...\n");

  for (const product of PRODUCTS) {
    // Check if already exists
    const existing = await stripe.products.search({
      query: `name:'${product.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      const prod = existing.data[0];
      const prices = await stripe.prices.list({ product: prod.id, active: true });
      console.log(`✓ Already exists: ${product.name} (${prod.id})`);
      if (prices.data.length > 0) {
        console.log(`  Price: $${prices.data[0].unit_amount! / 100} (${prices.data[0].id})\n`);
      }
      continue;
    }

    // Create product
    const prod = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: product.metadata,
    });

    // Create one-time price
    const price = await stripe.prices.create({
      product: prod.id,
      unit_amount: product.amount,
      currency: "usd",
    });

    console.log(`+ Created: ${product.name}`);
    console.log(`  Product ID: ${prod.id}`);
    console.log(`  Price ID:   ${price.id}  ($${product.amount / 100})\n`);
  }

  console.log("Done! Webhooks will sync these to your local database automatically.");
  console.log("\nNext: Create a promo code in the Stripe dashboard:");
  console.log("  Stripe Dashboard → Products → Coupons → Create coupon → 100% off → Generate promotion codes");
}

seedProducts().catch((err) => {
  console.error("Error seeding products:", err.message);
  process.exit(1);
});
