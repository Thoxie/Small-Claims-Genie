import { type Request, type Response, type NextFunction } from "express";
import { userHasPurchase } from "../lib/purchases";
import { userHasBetaAccess } from "../lib/beta";
import { logger } from "../lib/logger";
import { getUserId } from "../lib/owned-case";

export async function requiresPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [hasBeta, hasPaid] = await Promise.all([
      userHasBetaAccess(userId),
      userHasPurchase(userId),
    ]);
    if (hasBeta || hasPaid) {
      next();
      return;
    }
    res.status(402).json({
      error: "Payment required",
      message: "Please purchase a plan to access this feature.",
      redirect: "/pricing",
    });
  } catch (err) {
    logger.error({ err, userId }, "requiresPurchase check failed");
    res.status(500).json({ error: "Could not verify payment status" });
  }
}
