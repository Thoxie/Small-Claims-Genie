// Resend email client via Replit Connectors
import { Resend } from "resend";

async function getResendCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  // Primary: use RESEND_API_KEY env var if set
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || "reminders@smallclaimsgenie.com",
    };
  }

  // Fallback: Replit connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error("Resend not configured — set RESEND_API_KEY secret");
  }

  const data = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((d) => d.items?.[0]);

  if (!data?.settings?.api_key) {
    throw new Error("Resend not connected — check Replit integration or set RESEND_API_KEY");
  }

  return {
    apiKey: data.settings.api_key,
    fromEmail: data.settings.from_email || "reminders@smallclaimsgenie.com",
  };
}

// WARNING: Never cache this client — tokens expire.
export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getResendCredentials();
  return { client: new Resend(apiKey), fromEmail };
}
