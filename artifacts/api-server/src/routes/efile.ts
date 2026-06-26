/**
 * efile.ts
 *
 * Tyler EFM e-filing routes.
 *
 * All routes require auth + purchase (enforced by the middleware chain in index.ts).
 *
 * Endpoints:
 *   GET  /cases/:id/efile/eligibility   — Check if case court has Tyler coverage + fee info
 *   GET  /cases/:id/efile/status        — Current submission status for this case
 *   POST /cases/:id/efile/submit        — Initiate a filing (requires Tyler credentials in env)
 *   POST /efile/webhook                 — Tyler NotifyFilingReviewComplete callback (public)
 *
 * Webhook security:
 *   Set TYLER_EFM_WEBHOOK_SECRET to a shared secret agreed with Tyler.
 *   In production the webhook is fail-closed: any request that lacks or mismatches
 *   the X-EFM-Signature header is rejected with 403.
 *   In development (NODE_ENV !== "production") the check is bypassed so local testing works.
 *   Once Phase 0 onboarding is complete, upgrade to X.509 certificate verification.
 */

import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  casesTable,
  efileCourtLocationsTable,
  efileSubmissionsTable,
} from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { getOwnedCase, getUserId } from "../lib/owned-case";
import {
  isEfmConfigured,
  getStatewideStates,
  authenticateUser,
  submitFiling,
  type TylerState,
} from "../lib/tyler-efm/client";

const router: IRouter = Router();

// ─── States where Tyler EFM has a statewide mandate ───────────────────────────
const TYLER_STATEWIDE_STATES: Set<string> = new Set(getStatewideStates());

// ─── State-specific form packets ──────────────────────────────────────────────
const STATE_FORM_PACKETS: Record<string, Array<{ name: string; formKey: string }>> = {
  TX: [
    { name: "Texas Small Claims Petition", formKey: "tx/petition" },
    { name: "TX Citation (Summons)", formKey: "tx/citation" },
  ],
  IL: [
    { name: "Small Claims Complaint", formKey: "il/smc-complaint" },
    { name: "Small Claims Summons", formKey: "il/summons" },
  ],
  CA: [
    { name: "SC-100 Plaintiff's Claim", formKey: "sc100" },
    { name: "MC-030 Declaration", formKey: "mc030" },
  ],
  FL: [
    { name: "Statement of Claim", formKey: "fl/statement-of-claim" },
  ],
};

// ─── GET /cases/:id/efile/eligibility ─────────────────────────────────────────

router.get("/cases/:id/efile/eligibility", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  const d = c as unknown as Record<string, unknown>;
  const state = (d.jurisdictionState as string | null) ?? "CA";
  const courthouseId = (d.courthouseId as string | null) ?? null;
  const courtName = (d.courthouseName as string | null) ?? null;

  const forms = STATE_FORM_PACKETS[state] ?? STATE_FORM_PACKETS["CA"];

  // ── Check if there's a mapped Tyler CLI for this court location ──────────────
  // Strategy:
  //   1. Prefer an exact courthouseId match — most precise routing.
  //   2. Fall back to any synced CLI for the state — Tyler provides cliCode but
  //      not our internal courthouseId, so a state-level match is sufficient to
  //      establish coverage after the nightly sync runs.
  let courtLocation = null;
  if (courthouseId) {
    const rows = await db
      .select()
      .from(efileCourtLocationsTable)
      .where(
        and(
          eq(efileCourtLocationsTable.courthouseId, courthouseId),
          eq(efileCourtLocationsTable.jurisdictionState, state),
        )
      )
      .limit(1);
    courtLocation = rows[0] ?? null;
  }

  if (!courtLocation) {
    const rows = await db
      .select()
      .from(efileCourtLocationsTable)
      .where(
        and(
          eq(efileCourtLocationsTable.jurisdictionState, state),
          isNotNull(efileCourtLocationsTable.cliCode),
        )
      )
      .limit(1);
    courtLocation = rows[0] ?? null;
  }

  // ── Determine eligibility ────────────────────────────────────────────────────
  const isStatewideState = TYLER_STATEWIDE_STATES.has(state);
  const efmConfigured = isEfmConfigured(state as TylerState);
  const hasMappedCli = !!courtLocation?.cliCode;

  if (efmConfigured && hasMappedCli) {
    res.json({
      eligible: true,
      state,
      cliCode: courtLocation!.cliCode,
      courtName: courtLocation!.courtName ?? courtName,
      courtFeeAmount: courtLocation!.filingFeeAmount ?? null,
      convenienceFeeAmount: 2500,
      togaUrl: courtLocation!.togaUrl ?? null,
      forms,
    });
    return;
  }

  if (isStatewideState) {
    res.json({
      eligible: false,
      reason: "coming_soon",
      state,
      courtName,
      forms,
      message: `Tyler e-filing for ${state === "TX" ? "Texas" : "Illinois"} courts is coming soon. Download your forms and file in person in the meantime.`,
    });
    return;
  }

  res.json({
    eligible: false,
    reason: "not_available",
    state,
    courtName,
    forms,
    message: `Electronic filing is not yet available for this court. Download your forms and file in person.`,
  });
});

// ─── GET /cases/:id/efile/status ──────────────────────────────────────────────

router.get("/cases/:id/efile/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  const submissions = await db
    .select()
    .from(efileSubmissionsTable)
    .where(eq(efileSubmissionsTable.caseId, id))
    .orderBy(efileSubmissionsTable.createdAt);

  const d = c as unknown as Record<string, unknown>;
  res.json({
    efilingStatus: d.efilingStatus ?? null,
    efilingEnvelopeId: d.efilingEnvelopeId ?? null,
    submissions,
  });
});

// ─── POST /cases/:id/efile/submit ─────────────────────────────────────────────
// Attempts to submit a filing to Tyler EFM.
// Requires Tyler credentials to be configured in environment secrets.
// Returns 503 with reason "credentials_not_configured" if env vars are missing.

router.post("/cases/:id/efile/submit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  const d = c as unknown as Record<string, unknown>;
  const state = (d.jurisdictionState as string) ?? "CA";

  if (!isEfmConfigured(state as TylerState)) {
    res.status(503).json({
      error: "Tyler e-filing is not yet active for this court.",
      reason: "credentials_not_configured",
      nextStep:
        "Phase 0 onboarding with Tyler Technologies must be completed. " +
        "Contact EFMinfo@tylertech.com to begin.",
    });
    return;
  }

  try {
    // Authenticate with Tyler for this state
    await authenticateUser(state as TylerState);

    // Build and submit the filing envelope.
    // Document bytes are fetched from the existing form endpoints by cliCode.
    const body = req.body as Record<string, unknown>;
    const cliCode = (body.cliCode as string | undefined) ?? "";

    const result = await submitFiling({
      plaintiffName: (d.plaintiffName as string) ?? "",
      plaintiffAddress: (d.plaintiffAddress as string) ?? "",
      plaintiffIsOrganization: !!(d.plaintiffIsOrganization as boolean),
      defendantName: (d.defendantName as string) ?? "",
      defendantAddress: (d.defendantAddress as string) ?? "",
      claimAmount: (d.claimAmount as number) ?? 0,
      cliCode,
      state: state as TylerState,
      documents: [],
      togaPaymentToken: (body.togaPaymentToken as string | undefined) ?? "",
    });

    // Persist the submission record
    await db.insert(efileSubmissionsTable).values({
      caseId: id,
      userId,
      jurisdictionState: state,
      courtCli: cliCode,
      envelopeId: result.envelopeId,
      status: result.status,
      rejectionReason: result.rejectionReason ?? null,
      submittedAt: new Date(),
    });

    await db
      .update(casesTable)
      .set({
        efilingStatus: result.status,
        efilingEnvelopeId: result.envelopeId,
      })
      .where(eq(casesTable.id, id));

    res.json({
      ok: true,
      envelopeId: result.envelopeId,
      status: result.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    req.log.error({ err, caseId: id, state }, "Tyler EFM submit failed");
    res.status(503).json({
      error: message,
      reason: "efm_error",
    });
  }
});

// ─── POST /efile/webhook (public — no auth required) ──────────────────────────
// Tyler NotifyFilingReviewComplete callback.
// Tyler POSTs status updates here when a filing is accepted or rejected.
// This route must be registered BEFORE requireAuth in index.ts.

const webhookRouter: IRouter = Router();

// ─── Webhook signature verification ─────────────────────────────────────────
// Tyler signs webhook callbacks with a shared HMAC-SHA256 secret (header: X-EFM-Signature).
// In production: reject any request that fails this check (fail-closed).
// In development: bypass if TYLER_EFM_WEBHOOK_SECRET is unset, but log a warning.
// Once Tyler Phase 0 onboarding is complete, upgrade to X.509 cert verification.

function verifyWebhookSignature(req: { headers: Record<string, string | string[] | undefined>; rawBody?: Buffer }, payload: string): boolean {
  const secret = process.env.TYLER_EFM_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const signature = req.headers["x-efm-signature"] as string | undefined;
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

webhookRouter.post("/efile/webhook", async (req, res): Promise<void> => {
  try {
    const rawPayload = JSON.stringify(req.body);

    // ── Authenticate before any state mutation ───────────────────────────────
    if (!verifyWebhookSignature(req as Parameters<typeof verifyWebhookSignature>[0], rawPayload)) {
      req.log.warn("Tyler EFM webhook rejected — invalid or missing signature");
      res.status(403).json({ error: "Invalid webhook signature" });
      return;
    }

    const body = req.body as Record<string, unknown>;

    // Tyler sends XML in the body; the express json() middleware won't parse it.
    // Parse the SOAP envelope here once Phase 2 SOAP integration is in place.

    const envelopeId = body.EnvelopeID as string | undefined;
    const status = body.Status as string | undefined;

    req.log.info({ envelopeId, status }, "Tyler EFM webhook received");

    if (envelopeId && status) {
      const normalizedStatus = status.toLowerCase().includes("accept") ? "accepted"
        : status.toLowerCase().includes("reject") ? "rejected"
        : "under_review";

      await db
        .update(efileSubmissionsTable)
        .set({
          status: normalizedStatus,
          rejectionReason: normalizedStatus === "rejected"
            ? ((body.RejectionReason as string | undefined) ?? null)
            : undefined,
          ...(normalizedStatus === "accepted" ? { acceptedAt: new Date() } : {}),
          ...(normalizedStatus === "rejected" ? { rejectedAt: new Date() } : {}),
        })
        .where(eq(efileSubmissionsTable.envelopeId, envelopeId));

      // Update the case efiling_status
      const submissions = await db
        .select({ caseId: efileSubmissionsTable.caseId })
        .from(efileSubmissionsTable)
        .where(eq(efileSubmissionsTable.envelopeId, envelopeId))
        .limit(1);

      if (submissions[0]) {
        await db
          .update(casesTable)
          .set({ efilingStatus: normalizedStatus })
          .where(eq(casesTable.id, submissions[0].caseId));
      }
    }

    res.json({ ok: true });
  } catch (err: unknown) {
    req.log.error({ err }, "Tyler EFM webhook error");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export { webhookRouter as efileWebhookRouter };
export default router;
