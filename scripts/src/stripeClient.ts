import Stripe from "stripe";

async function getCredentials(): Promise<{ secretKey: string }> {
  const directSecret = process.env.STRIPE_SECRET_KEY;
  if (directSecret) return { secretKey: directSecret };

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Missing Replit env vars. Run this script inside the Replit environment."
    );
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", "development");

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
  });

  if (!resp.ok) throw new Error(`Failed to fetch Stripe credentials: ${resp.status}`);

  const data = await resp.json();
  const settings = data.items?.[0]?.settings;
  if (!settings?.secret) throw new Error("Stripe integration not connected or missing secret key.");

  return { secretKey: settings.secret };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: "2025-08-27.basil" as any });
}
