import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "@clerk/express";
import { logger } from "../lib/logger";

async function verifyWithEitherKey(token: string): Promise<{ sub: string }> {
  const isProduction = process.env.APP_ENV === "production";
  const devKey = process.env.CLERK_SECRET_KEY_DEV;
  const prodKey = process.env.CLERK_SECRET_KEY;

  // In production, only ever use the production key — never attempt dev key verification.
  // In staging/development, try the dev key first and fall back to the prod key.
  if (isProduction) {
    if (prodKey) return await verifyToken(token, { secretKey: prodKey });
    throw new Error("No Clerk production secret key configured");
  }

  if (devKey) {
    try {
      return await verifyToken(token, { secretKey: devKey });
    } catch {
      // dev key failed — fall back to prod key
    }
  }

  if (prodKey) {
    return await verifyToken(token, { secretKey: prodKey });
  }

  throw new Error("No Clerk secret key configured");
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn({ url: req.url }, "requireAuth: missing or malformed Authorization header");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyWithEitherKey(token);
    (req as any).userId = payload.sub;
    next();
  } catch (err) {
    logger.warn({ url: req.url, err }, "requireAuth: token verification failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
