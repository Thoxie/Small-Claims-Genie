import { type Request, type Response, type NextFunction } from "express";
import { userHasPurchase } from "../lib/purchases";
import { logger } from "../lib/logger";

export async function requiresPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as any).userId as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const paid = await userHasPurchase(userId);
    if (!paid) {
      res.status(402).json({
        error: "Payment required",
        message: "Please purchase a plan to access this feature.",
        redirect: "/pricing",
      });
      return;
    }
    next();
  } catch (err) {
    logger.error({ err, userId }, "requiresPurchase check failed");
    res.status(500).json({ error: "Could not verify payment status" });
  }
}
