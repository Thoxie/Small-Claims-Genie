import { Router, type IRouter } from "express";
import * as path from "path";
import * as fs from "fs";

// Public download route for ad-hoc code-backup zips. Files live in
// artifacts/api-server/assets/backups/ and are accessed by the random token
// embedded in the filename (e.g. scg-20260428135519-027a4f988526831b.zip).
// Anyone with the URL can download — security relies on the unguessable token.
const router: IRouter = Router();
// __dirname inside the bundled dist/index.mjs is artifacts/api-server/dist,
// so one level up reaches artifacts/api-server/, matching app.ts's pattern.
const BACKUP_DIR = path.resolve(__dirname, "..", "assets", "backups");

router.get("/__backup-download/:filename", (req, res) => {
  const name = req.params.filename;
  // Reject anything with path traversal characters or that doesn't match our naming pattern.
  if (!/^scg-\d{14}-[a-f0-9]{16}\.zip$/.test(name)) {
    res.status(400).json({ error: "Invalid backup filename" });
    return;
  }
  const filePath = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Backup not found" });
    return;
  }
  res.download(filePath, name);
});

export default router;
