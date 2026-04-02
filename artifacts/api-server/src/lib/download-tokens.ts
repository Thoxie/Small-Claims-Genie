import { randomUUID } from "crypto";

interface DownloadToken {
  caseId: number;
  userId: string;
  expires: number;
}

const store = new Map<string, DownloadToken>();

const TTL_MS = 2 * 60 * 1000; // 2 minutes

export function createDownloadToken(caseId: number, userId: string): string {
  const token = randomUUID();
  store.set(token, { caseId, userId, expires: Date.now() + TTL_MS });
  // Lazy cleanup of expired tokens
  for (const [k, v] of store) {
    if (v.expires < Date.now()) store.delete(k);
  }
  return token;
}

export function redeemDownloadToken(token: string, caseId: number): string | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.caseId !== caseId) return null;
  if (entry.expires < Date.now()) { store.delete(token); return null; }
  store.delete(token); // single-use
  return entry.userId;
}
