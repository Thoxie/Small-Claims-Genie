/**
 * Post-build pre-render script.
 *
 * Uses the Playwright Chromium binary already installed by the api-server
 * package to visit each public marketing route on a local static file server,
 * then saves the fully-rendered HTML so search crawlers receive real content
 * on first request without needing to execute JavaScript.
 *
 * Invoked automatically via the "postbuild" npm script.
 * All failures are non-fatal — if anything goes wrong the script exits 0 so
 * the production build never breaks due to a pre-render issue.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist", "public");
const apiServerDir = path.join(__dirname, "..", "api-server");

const PUBLIC_ROUTES = [
  "/",
  "/how-it-works",
  "/pricing",
  "/types-of-cases",
  "/faq",
  "/blog",
  "/resources",
  "/counties",
  "/startup",
  "/terms",
  "/copyright",
  "/payment-terms",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

// ── 1. Resolve Playwright chromium path ──────────────────────────────────────

function resolveChromiumPath() {
  // Primary: Replit provides this env var pointing to a pre-installed Nix binary.
  const replitPath = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (replitPath && fs.existsSync(replitPath)) return replitPath;

  // Secondary: ask the api-server's playwright-core for the bundled binary path.
  try {
    const out = execSync(
      `node -e "const pw = require('./node_modules/playwright-core'); process.stdout.write(pw.chromium.executablePath())"`,
      { cwd: apiServerDir, timeout: 10_000 }
    )
      .toString()
      .trim();
    if (out && fs.existsSync(out)) return out;
  } catch { /* fall through */ }

  // Tertiary: glob the ms-playwright cache.
  try {
    for (const base of [
      path.join(process.env.HOME ?? "/home/runner", ".cache", "ms-playwright"),
      path.join(__dirname, "..", "..", ".cache", "ms-playwright"),
    ]) {
      if (!fs.existsSync(base)) continue;
      for (const entry of fs.readdirSync(base)) {
        if (!entry.startsWith("chromium-")) continue;
        for (const bin of [
          path.join(base, entry, "chrome-linux64", "chrome"),
          path.join(base, entry, "chrome-linux", "chrome"),
        ]) {
          if (fs.existsSync(bin)) return bin;
        }
      }
    }
  } catch { /* fall through */ }

  // Quaternary: system Chromium from Nix or OS package manager.
  // This is the most reliable fallback in Replit production builds where the
  // env var is not forwarded and the playwright browser cache is absent.
  for (const cmd of ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome"]) {
    try {
      const out = execSync(`which ${cmd}`, { timeout: 5_000 }).toString().trim();
      if (out && fs.existsSync(out)) {
        console.log(`[prerender] Found system Chromium via 'which ${cmd}': ${out}`);
        return out;
      }
    } catch { /* not found, try next */ }
  }

  return null;
}

// ── 2. Load playwright-core from the api-server's node_modules ───────────────

function loadPlaywright() {
  try {
    const req = createRequire(path.join(apiServerDir, "package.json"));
    return req("playwright-core");
  } catch { /* fall through */ }
  return null;
}

// ── 3. Static file server ────────────────────────────────────────────────────

function createStaticServer(port) {
  const server = http.createServer((req, res) => {
    const urlPath = new URL(req.url, "http://localhost").pathname;
    const rel = path.normalize(urlPath === "/" ? "/index.html" : urlPath);
    const filePath = path.join(distDir, rel);

    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end();
      return;
    }

    let stat;
    try { stat = fs.statSync(filePath); } catch { /* not found */ }

    if (stat?.isFile()) {
      res.setHeader("Content-Type", MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream");
      res.writeHead(200);
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA fallback — serve root index.html
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.writeHead(200);
    fs.createReadStream(path.join(distDir, "index.html")).pipe(res);
  });

  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

// ── Main ─────────────────────────────────────────────────────────────────────

const chromiumPath = resolveChromiumPath();
if (!chromiumPath) {
  console.warn("[prerender] Chromium binary not found — skipping pre-render.");
  process.exit(0);
}

const pw = loadPlaywright();
if (!pw) {
  console.warn("[prerender] playwright-core not available — skipping pre-render.");
  process.exit(0);
}

console.log(`[prerender] Chromium: ${chromiumPath}`);

const PORT = 19876;
const server = await createStaticServer(PORT);
console.log(`[prerender] Static server on http://127.0.0.1:${PORT}`);

let browser;
try {
  browser = await pw.chromium.launch({
    executablePath: chromiumPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
} catch (err) {
  console.warn(`[prerender] Browser launch failed: ${err.message} — skipping pre-render.`);
  server.close();
  process.exit(0);
}

let success = 0;
let failed = 0;

for (const route of PUBLIC_ROUTES) {
  const url = `http://127.0.0.1:${PORT}${route}`;
  const page = await browser.newPage();

  // Block network calls that would slow the snapshot or require auth.
  await page.route("**", async (r) => {
    const u = r.request().url();
    if (
      u.includes("/api/") ||
      u.includes("clerk.") ||
      u.includes("googleapis") ||
      u.includes("google-analytics") ||
      u.includes("googletagmanager") ||
      u.includes("heygen") ||
      u.includes("stripe.com") ||
      u.includes("resend.com")
    ) {
      await r.abort();
    } else {
      await r.continue();
    }
  });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 12_000 });
  } catch {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8_000 });
    } catch (err) {
      console.warn(`[prerender] ⚠ ${route}: ${err.message}`);
      failed++;
      await page.close();
      continue;
    }
  }

  // Brief pause so React has time to finish rendering after navigation settles.
  await page.waitForTimeout(400);

  // Deduplicate head tags: react-helmet-async can leave stale tags from prior
  // route renders in the DOM snapshot.  Keep the first <title> (page-specific
  // Helmet title is injected first) and the last canonical / description
  // (the page-specific Helmet tags are appended after the template defaults).
  await page.evaluate(() => {
    Array.from(document.querySelectorAll("title")).slice(1).forEach(el => el.remove());
    const descs = Array.from(document.querySelectorAll("meta[name='description']"));
    descs.slice(0, -1).forEach(el => el.remove());
    const canonicals = Array.from(document.querySelectorAll("link[rel='canonical']"));
    canonicals.slice(0, -1).forEach(el => el.remove());
  });

  const html = await page.content();

  const outDir = route === "/" ? distDir : path.join(distDir, route.slice(1));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf-8");
  console.log(`[prerender] ✓ ${route}`);
  success++;

  await page.close();
}

await browser.close();
server.close();

console.log(`[prerender] Done — ${success} rendered, ${failed} skipped.`);
