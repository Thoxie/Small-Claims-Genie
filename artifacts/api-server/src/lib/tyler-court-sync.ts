/**
 * tyler-court-sync.ts
 *
 * Nightly scheduler that syncs Tyler EFM court location codes into the
 * efile_court_locations table. This keeps eligibility data current so the
 * eligibility endpoint can return `eligible: true` for covered courts.
 *
 * Behaviour:
 *   - Runs once at server startup (first sync), then every 24 hours.
 *   - Iterates every TylerState returned by getStatewideStates().
 *   - Skips states where EFM credentials are not configured (isEfmConfigured).
 *   - Calls getCourtLocationCodes() for each configured state.
 *   - Optionally calls getCourtPolicy() per CLI to capture filing fees.
 *   - Upserts rows into efile_court_locations by (cliCode, jurisdictionState).
 *   - On error for any state, logs and continues — never crashes the process.
 *
 * NOTE: getCourtLocationCodes() and getCourtPolicy() are currently Phase-0 stubs
 * that throw. The scheduler handles this gracefully: it skips any state/CLI that
 * throws and logs a warning. Once Tyler onboarding is complete and the stubs are
 * replaced with real SOAP calls, this scheduler will populate the table automatically
 * without any further changes.
 */

import { db } from "@workspace/db";
import { efileCourtLocationsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  isEfmConfigured,
  getStatewideStates,
  getCourtLocationCodes,
  getCourtPolicy,
  type TylerState,
} from "./tyler-efm/client";
import { logger } from "./logger";

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function syncStateLocations(state: TylerState): Promise<number> {
  const locations = await getCourtLocationCodes(state);

  if (locations.length === 0) {
    logger.info({ state }, "Tyler court sync: no locations returned for state");
    return 0;
  }

  let upserted = 0;

  for (const loc of locations) {
    let filingFeeAmount: number | null = null;
    let togaUrl: string | null = loc.togaUrl ?? null;

    if (loc.cliCode) {
      try {
        const policy = await getCourtPolicy(state, loc.cliCode);
        filingFeeAmount = policy.filingFeeAmount ?? null;
        togaUrl = policy.togaUrl ?? togaUrl;
      } catch (policyErr: unknown) {
        logger.warn(
          { state, cliCode: loc.cliCode, err: policyErr },
          "Tyler court sync: getCourtPolicy failed for CLI — using defaults"
        );
      }
    }

    await db
      .insert(efileCourtLocationsTable)
      .values({
        cliCode: loc.cliCode,
        jurisdictionState: loc.state,
        courtName: loc.courtName ?? null,
        supportsSmallClaims: loc.supportsSmallClaims,
        filingFeeAmount: filingFeeAmount !== null ? Math.round(filingFeeAmount) : null,
        togaUrl,
        lastRefreshed: new Date(),
      })
      .onConflictDoUpdate({
        target: [efileCourtLocationsTable.cliCode, efileCourtLocationsTable.jurisdictionState],
        set: {
          courtName: sql`excluded.court_name`,
          supportsSmallClaims: sql`excluded.supports_small_claims`,
          filingFeeAmount: sql`excluded.filing_fee_amount`,
          togaUrl: sql`excluded.toga_url`,
          lastRefreshed: sql`excluded.last_refreshed`,
          updatedAt: new Date(),
        },
      });

    upserted++;
  }

  return upserted;
}

async function runTylerCourtSync(): Promise<void> {
  const states = getStatewideStates();
  const configuredStates = states.filter((s) => isEfmConfigured(s));

  if (configuredStates.length === 0) {
    logger.debug(
      "Tyler court sync: no states have EFM credentials configured — skipping sync"
    );
    return;
  }

  logger.info(
    { configuredStates },
    "Tyler court sync: starting nightly sync"
  );

  let totalUpserted = 0;

  for (const state of configuredStates) {
    try {
      const count = await syncStateLocations(state);
      totalUpserted += count;
      logger.info({ state, upserted: count }, "Tyler court sync: state sync complete");
    } catch (err: unknown) {
      logger.warn(
        { state, err },
        "Tyler court sync: failed to sync state — skipping (Phase 0 stub or credentials error)"
      );
    }
  }

  logger.info(
    { totalUpserted, states: configuredStates },
    "Tyler court sync: nightly sync complete"
  );
}

export function startTylerCourtSync(): void {
  runTylerCourtSync().catch((err) => {
    logger.error({ err }, "Tyler court sync: initial sync error");
  });

  setInterval(() => {
    runTylerCourtSync().catch((err) => {
      logger.error({ err }, "Tyler court sync: scheduled sync error");
    });
  }, SYNC_INTERVAL_MS);

  logger.info("Tyler court sync scheduler started (runs every 24 hours)");
}
