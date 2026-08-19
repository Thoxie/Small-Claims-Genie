import type { NextFunction, Request, RequestHandler, Response } from "express";

export const requireAdmin: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    res.status(503).json({ error: "Admin not configured — set ADMIN_API_KEY in Replit Secrets" });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${adminKey}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};