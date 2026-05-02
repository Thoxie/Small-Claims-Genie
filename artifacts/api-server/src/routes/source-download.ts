import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

router.get("/source-download", (req, res): void => {
  const filePath = path.resolve(process.cwd(), "small-claims-genie-source.zip");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.setHeader("Content-Disposition", "attachment; filename=\"small-claims-genie-source.zip\"");
  res.setHeader("Content-Type", "application/zip");
  res.sendFile(filePath);
});

export default router;
