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
  "/blog/paul-andrew-small-claims-genie-podcast",
  "/resources",
  "/counties",
  "/startup",
  "/terms",
  "/copyright",
  "/payment-terms",
];

const SORO_EMBED_TOKEN = "e4dea211-234e-485c-b304-ce18ef8d21f0";
const SORO_API_BASE = "https://app.trysoro.com";

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

// ── 3. Soro article helpers ──────────────────────────────────────────────────

/** In-memory cache of Soro article metadata keyed by slug */
const soroArticleCache = new Map();

async function fetchSoroArticleList() {
  const url = `${SORO_API_BASE}/api/embed/${SORO_EMBED_TOKEN}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "SmallClaimsGenie/prerender" } });
    if (!res.ok) return [];
    const js = await res.text();
    const m = js.match(/var SORO_ARTICLES = (\[[\s\S]*?\]);/);
    if (!m) return [];
    return JSON.parse(m[1]);
  } catch {
    return [];
  }
}

async function fetchSoroArticleContent(article) {
  if (soroArticleCache.has(article.slug)) return soroArticleCache.get(article.slug);
  const url = `${SORO_API_BASE}/api/embed/${SORO_EMBED_TOKEN}/article/${article.id}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "SmallClaimsGenie/prerender" } });
    if (!res.ok) return null;
    const data = await res.json();
    const full = { ...article, content: data.content ?? "" };
    soroArticleCache.set(article.slug, full);
    return full;
  } catch {
    return null;
  }
}

// ── 4. Static file server (with local blog API proxy) ────────────────────────

function createStaticServer(port) {
  const server = http.createServer(async (req, res) => {
    const urlPath = new URL(req.url, "http://localhost").pathname;

    // ── Local blog API mock so the BlogArticle React component can fetch
    //    article data during pre-render without the real API server running.
    if (urlPath === "/api/blog/articles") {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      const articles = [...soroArticleCache.values()].map(({ content: _c, ...meta }) => meta);
      res.end(JSON.stringify({ articles }));
      return;
    }

    const articleSlugMatch = urlPath.match(/^\/api\/blog\/articles\/(.+)$/);
    if (articleSlugMatch) {
      const slug = decodeURIComponent(articleSlugMatch[1]);
      const article = soroArticleCache.get(slug);
      if (article) {
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        res.end(JSON.stringify({ article }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Article not found" }));
      }
      return;
    }

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

// ── 4a. Sitemap updater ──────────────────────────────────────────────────────

/**
 * Regenerates the /blog/* entries in sitemap.xml from the live Soro article
 * list. Replaces the block between the "Blog articles" XML comment and the
 * first non-blog <url> that follows it, so static entries (home, pricing, etc.)
 * are left untouched.
 *
 * Writes to two locations:
 *   • public/sitemap.xml  — the committed source file (kept fresh for next build)
 *   • dist/public/sitemap.xml — the copy that is actually served in production
 */
function updateSitemapBlogEntries(articles) {
  if (!articles || articles.length === 0) {
    console.warn("[prerender] ⚠ No articles — sitemap blog entries not updated.");
    return;
  }

  const SITE = "https://smallclaimsgenie.com";

  const blogXml = [
    "  <!-- Blog articles — individual indexable pages -->",
    ...articles.map((a) => {
      // isoDate is "2026-08-05T00:00:00Z" or similar; take the date part only
      const lastmod = (a.isoDate ?? a.date ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
      return [
        "  <url>",
        `    <loc>${SITE}/blog/${a.slug}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        "    <changefreq>monthly</changefreq>",
        "    <priority>0.7</priority>",
        "  </url>",
      ].join("\n");
    }),
  ].join("\n");

  // Regex: match from the blog-articles comment up to (but not including) the
  // next <url> block that does NOT belong to /blog/ (i.e. the /startup entry).
  const BLOG_SECTION_RE =
    /[ \t]*<!--\s*Blog articles[^>]*-->\s*\n(?:[\s\S]*?<url>[\s\S]*?<\/url>\s*\n)*(?=\s*<url>)/;

  for (const dest of [
    path.join(__dirname, "public", "sitemap.xml"),
    path.join(distDir, "sitemap.xml"),
  ]) {
    try {
      if (!fs.existsSync(dest)) {
        console.warn(`[prerender] sitemap not found at ${dest} — skipping.`);
        continue;
      }
      const original = fs.readFileSync(dest, "utf-8");
      const updated = original.replace(BLOG_SECTION_RE, `${blogXml}\n\n`);
      if (updated === original) {
        console.warn(`[prerender] ⚠ Blog section pattern not matched in ${dest} — sitemap unchanged.`);
        continue;
      }
      fs.writeFileSync(dest, updated, "utf-8");
      console.log(`[prerender] ✓ sitemap updated with ${articles.length} blog entries → ${dest}`);
    } catch (err) {
      console.warn(`[prerender] ⚠ Failed to update sitemap at ${dest}: ${err.message}`);
    }
  }
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

// ── Fetch Soro article list before starting the server so the mock API is
//    populated when Playwright requests it during blog article pre-renders.
console.log("[prerender] Fetching Soro article list…");
const soroArticles = await fetchSoroArticleList();
if (soroArticles.length === 0) {
  console.warn("[prerender] ⚠ Could not fetch Soro article list — blog articles will not be pre-rendered.");
} else {
  console.log(`[prerender] Found ${soroArticles.length} articles — fetching content…`);
  await Promise.all(soroArticles.map((a) => fetchSoroArticleContent(a)));
  console.log(`[prerender] Article content cached for ${soroArticleCache.size} articles.`);
}

// Regenerate sitemap.xml blog entries from the live article list.
updateSitemapBlogEntries(soroArticles);

const blogArticleRoutes = soroArticles.map((a) => `/blog/${a.slug}`);
const allRoutes = [...PUBLIC_ROUTES, ...blogArticleRoutes];

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

for (const route of allRoutes) {
  const url = `http://127.0.0.1:${PORT}${route}`;
  const page = await browser.newPage();

  // Block network calls that would slow the snapshot or require auth.
  // Allow local /api/blog/* so the blog article component can fetch content
  // from the local static server's mock API handler.
  await page.route("**", async (r) => {
    const u = r.request().url();
    if (u.includes(`127.0.0.1:${PORT}/api/blog/`)) {
      // Allow — served by our local mock handler
      await r.continue();
    } else if (
      u.includes("/api/") ||
      u.includes("clerk.") ||
      u.includes("googleapis") ||
      u.includes("google-analytics") ||
      u.includes("googletagmanager") ||
      u.includes("heygen") ||
      u.includes("stripe.com") ||
      u.includes("resend.com") ||
      u.includes("trysoro.com")
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
