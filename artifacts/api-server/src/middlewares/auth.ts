import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "@clerk/express";
import { logger } from "../lib/logger";

async function verifyClerkToken(token: string): Promise<{ sub: string }> {
  const isProduction = process.env.APP_ENV === "production";
  const prodKey = process.env.CLERK_SECRET_KEY;
  const devKey  = process.env.CLERK_SECRET_KEY_DEV;

  if (isProduction) {
    // Production: accept ONLY production Clerk tokens. Never fall back to dev key.
    if (!prodKey) throw new Error("CLERK_SECRET_KEY is not configured in production");
    return await verifyToken(token, { secretKey: prodKey });
  }

  // Staging / development: prefer dev key, fall back to prod key only if dev key absent.
  if (devKey) {
    try {
      return await verifyToken(token, { secretKey: devKey });
    } catch {
      // dev key failed — try prod key below
    }
  }

  if (prodKey) {
    try {
      return await verifyToken(token, { secretKey: prodKey });
    } catch {
      // prod key also failed
    }
  }

  throw new Error("No Clerk secret key configured or token invalid");
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
    const payload = await verifyClerkToken(token);
    (req as any).userId = payload.sub;
    next();
  } catch (err) {
    logger.warn({ url: req.url, err }, "requireAuth: token verification failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
