/**
 * Production static file server for Small Claims Genie.
 *
 * Replaces Replit's built-in static server so we can set precise
 * Cache-Control headers:
 *   - index.html  → no-store (never cached — ensures redeploys are instant)
 *   - /assets/*   → immutable, 1-year (safe because Vite adds content hashes)
 *   - everything else → no-store
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist", "public");
const port = parseInt(process.env.PORT ?? "18304", 10);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".eot":  "application/vnd.ms-fontobject",
  ".map":  "application/json",
  ".txt":  "text/plain; charset=utf-8",
  ".xml":  "application/xml",
};

function sendFile(res, filePath, isAsset) {
  let data;
  try {
    data = fs.readFileSync(filePath);
  } catch {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";

  if (isAsset) {
    // Hashed filenames — safe to cache for 1 year
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    // index.html and all other files — never cache
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  res.setHeader("Content-Type", mime);
  res.writeHead(200);
  res.end(data);
  return true;
}

function serveIndex(res) {
  const indexPath = path.join(distDir, "index.html");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  let data;
  try {
    data = fs.readFileSync(indexPath);
  } catch {
    res.writeHead(500);
    res.end("Server error: index.html not found in dist/public");
    return;
  }
  res.writeHead(200);
  res.end(data);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const pathname = decodeURIComponent(url.pathname);

  // Security: block path traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(distDir, safePath);

  // Must stay within distDir
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const isAsset = safePath.startsWith("/assets/");

  // Try the exact file
  let stat;
  try { stat = fs.statSync(filePath); } catch { /* not found */ }

  if (stat && stat.isFile()) {
    sendFile(res, filePath, isAsset);
    return;
  }

  // Try index.html inside a directory
  if (stat && stat.isDirectory()) {
    const indexInDir = path.join(filePath, "index.html");
    if (sendFile(res, indexInDir, false)) return;
  }

  // SPA fallback — all unmatched routes serve index.html
  serveIndex(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Small Claims Genie serving dist/public on port ${port}`);
});
