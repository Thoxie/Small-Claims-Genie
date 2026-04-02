import { Router, type IRouter } from "express";
import { getUserId } from "../lib/owned-case";
import { createDownloadToken } from "../lib/download-tokens";

const router: IRouter = Router();

router.post("/cases/:id/forms/download-token", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const caseId = parseInt(raw, 10);
  if (isNaN(caseId)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const token = createDownloadToken(caseId, userId);
  res.json({ token });
});

export default router;
