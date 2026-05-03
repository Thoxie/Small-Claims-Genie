import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

// Simple HTML page with a download button — open in Replit preview
router.get("/source-download", (req, res): void => {
  const accept = req.headers.accept ?? "";
  const filePath = path.resolve(process.cwd(), "small-claims-genie-source.tar.gz");
  const fileExists = fs.existsSync(filePath);
  const fileStat = fileExists ? fs.statSync(filePath) : null;
  const fileSizeMB = fileStat ? (fileStat.size / 1024 / 1024).toFixed(1) : "?";
  const fileDate = fileStat ? fileStat.mtime.toDateString() : "unknown";

  // If the request wants a file download (e.g. from ?download=1), stream the file
  if (req.query.download === "1") {
    if (!fileExists) {
      res.status(404).json({ error: "Backup file not found" });
      return;
    }
    res.setHeader("Content-Disposition", "attachment; filename=\"small-claims-genie-source.tar.gz\"");
    res.setHeader("Content-Type", "application/gzip");
    res.sendFile(filePath);
    return;
  }

  // Otherwise serve the HTML download page
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Source Code Backup — Small Claims Genie</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f0fdf9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(13,107,94,0.10);
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      border: 1px solid #ddf6f3;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #0d6b5e; margin-bottom: 8px; }
    p { font-size: 14px; color: #64748b; margin-bottom: 6px; }
    .meta { font-size: 12px; color: #94a3b8; margin-bottom: 32px; }
    a.btn {
      display: inline-block;
      background: #0d6b5e;
      color: white;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 999px;
      text-decoration: none;
      transition: background 0.2s;
    }
    a.btn:hover { background: #14b8a6; }
    .note { margin-top: 20px; font-size: 11px; color: #94a3b8; }
    ${!fileExists ? ".btn { opacity: 0.4; pointer-events: none; }" : ""}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📦</div>
    <h1>Source Code Backup</h1>
    <p>Small Claims Genie — complete source archive</p>
    <p class="meta">${fileSizeMB} MB &nbsp;·&nbsp; Generated ${fileDate}</p>
    ${fileExists
      ? `<a class="btn" href="/api/source-download?download=1">⬇&nbsp; Download .tar.gz</a>`
      : `<p style="color:#ef4444;font-weight:600;">Backup file not found on server.</p>`
    }
    <p class="note">Opens natively on Mac. Use 7-Zip or WinRAR on Windows.</p>
  </div>
</body>
</html>`);
});

export default router;
