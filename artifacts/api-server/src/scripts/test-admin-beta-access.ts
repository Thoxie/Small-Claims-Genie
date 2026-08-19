import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { db, betaAccessTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import express, { type NextFunction, type Request, type Response } from "express";
import { getBetaSlotCount, grantBetaAccess, userHasBetaAccess } from "../lib/beta";
import { getPaidAccessStatus } from "../lib/paid-access";
import { requiresPurchase } from "../middlewares/requiresPurchase";
import adminRouter from "../routes/admin";

type MiddlewareResult = {
  nextCalled: boolean;
  statusCode: number | null;
  body: unknown;
};

async function runGate(userId: string): Promise<MiddlewareResult> {
  const result: MiddlewareResult = { nextCalled: false, statusCode: null, body: null };
  const request = { userId } as unknown as Request;
  const response = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as unknown as Response;
  const next = (() => { result.nextCalled = true; }) as NextFunction;

  await requiresPurchase(request, response, next);
  return result;
}

const userId = `beta-access-check-${process.pid}-${Date.now()}`;
const httpUserId = `${userId}-http`;
const authoritativeEmail = `${httpUserId}@example.invalid`;
const adminKey = "beta-access-http-test";
let server: Server | null = null;
const originalFetch = globalThis.fetch;

try {
  const slots = await getBetaSlotCount();
  assert.ok(slots.available >= 2, "beta access test requires two available beta slots");

  const unpaidStatus = await getPaidAccessStatus(userId);
  assert.equal(unpaidStatus.hasAccess, false, "ordinary unpaid user must not have access");
  assert.equal(unpaidStatus.accessSource, null);

  const unpaidGate = await runGate(userId);
  assert.equal(unpaidGate.nextCalled, false, "ordinary unpaid user must not pass the gate");
  assert.equal(unpaidGate.statusCode, 402, "ordinary unpaid user must receive payment required");

  assert.equal(
    await grantBetaAccess({ userId, email: `${userId}@example.invalid` }),
    "inserted",
    "beta grant must use an available shared slot",
  );
  assert.equal(await userHasBetaAccess(userId), true, "beta grant must activate access");

  const betaStatus = await getPaidAccessStatus(userId);
  assert.equal(betaStatus.hasAccess, true);
  assert.equal(betaStatus.hasPurchase, false, "beta access must not create a purchase");
  assert.equal(betaStatus.hasBetaAccess, true);
  assert.equal(betaStatus.accessSource, "beta");

  const betaGate = await runGate(userId);
  assert.equal(betaGate.nextCalled, true, "beta user must pass the paid gate");

  await db.delete(betaAccessTable).where(eq(betaAccessTable.userId, userId));
  const revokedGate = await runGate(userId);
  assert.equal(revokedGate.nextCalled, false, "revoked beta user must not pass the paid gate");
  assert.equal(revokedGate.statusCode, 402, "revoked beta user must need payment again");

  process.env.ADMIN_API_KEY = adminKey;
  process.env.ADMIN_EMAIL = "automated-test@example.invalid";
  process.env.CLERK_SECRET_KEY_DEV = "clerk-test-key";

  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url === `https://api.clerk.com/v1/users/${httpUserId}`) {
      return new Response(JSON.stringify({
        id: httpUserId,
        email_addresses: [{ id: "email_primary", email_address: authoritativeEmail }],
        primary_email_address_id: "email_primary",
        first_name: "Beta",
        last_name: "Tester",
        created_at: Date.now(),
        last_sign_in_at: null,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.startsWith("https://api.clerk.com/v1/users/")) {
      return new Response(JSON.stringify({ errors: [{ message: "Not found" }] }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(input, init);
  };

  const testApp = express();
  testApp.use(express.json());
  testApp.use("/api", adminRouter);
  server = testApp.listen(0);
  await new Promise<void>((resolve, reject) => {
    server!.once("listening", resolve);
    server!.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const authorizedHeaders = {
    Authorization: `Bearer ${adminKey}`,
    "Content-Type": "application/json",
  };

  const unauthorizedList = await originalFetch(`${baseUrl}/api/admin/beta`);
  assert.equal(unauthorizedList.status, 401, "beta management must require admin auth");

  const missingUserGrant = await originalFetch(`${baseUrl}/api/admin/beta/grant`, {
    method: "POST",
    headers: authorizedHeaders,
    body: JSON.stringify({ userId: `${httpUserId}-missing` }),
  });
  assert.equal(missingUserGrant.status, 404, "grant must reject a missing Clerk user");

  const grantResponse = await originalFetch(`${baseUrl}/api/admin/beta/grant`, {
    method: "POST",
    headers: authorizedHeaders,
    body: JSON.stringify({ userId: httpUserId, email: "caller-controlled@example.invalid" }),
  });
  assert.equal(grantResponse.status, 200, "admin beta grant endpoint must succeed");
  const grantBody = await grantResponse.json() as {
    rows: Array<{ userId: string; email: string | null }>;
  };
  const grantedRow = grantBody.rows.find((row) => row.userId === httpUserId);
  assert.ok(grantedRow, "grant endpoint must return the beta account");
  assert.equal(
    grantedRow.email,
    authoritativeEmail,
    "grant must store Clerk's email instead of caller-controlled input",
  );
  assert.equal(await userHasBetaAccess(httpUserId), true);

  const revokeResponse = await originalFetch(
    `${baseUrl}/api/admin/beta/${encodeURIComponent(httpUserId)}`,
    { method: "DELETE", headers: authorizedHeaders },
  );
  assert.equal(revokeResponse.status, 200, "admin beta revoke endpoint must succeed");
  assert.equal(await userHasBetaAccess(httpUserId), false);

  const httpRevokedGate = await runGate(httpUserId);
  assert.equal(httpRevokedGate.nextCalled, false);
  assert.equal(httpRevokedGate.statusCode, 402);

  process.stdout.write("Admin beta access checks passed.\n");
} finally {
  globalThis.fetch = originalFetch;
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => err ? reject(err) : resolve());
    });
  }
  await db.delete(betaAccessTable).where(eq(betaAccessTable.userId, userId));
  await db.delete(betaAccessTable).where(eq(betaAccessTable.userId, httpUserId));
}