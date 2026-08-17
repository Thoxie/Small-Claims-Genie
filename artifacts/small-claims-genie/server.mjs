/**
 * Production static file server for Small Claims Genie.
 *
 * Cache-Control strategy:
 *   - /sitemap.xml  → served dynamically; refreshed at midnight Pacific daily
 *   - /assets/*     → immutable, 1-year (Vite content-hashes guarantee safety)
 *   - index.html    → no-store (ensures redeploys are instant)
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

// ── Sitemap: static page definitions ─────────────────────────────────────────

const DEPLOY_DATE = new Date().toISOString().slice(0, 10); // YYYY-MM-DD at startup

const STATIC_SITEMAP_PAGES = [
  {
    loc: "https://smallclaimsgenie.com/",
    priority: "1.0",
    changefreq: "weekly",
    extra: `    <video:video>
      <video:thumbnail_loc>https://smallclaimsgenie.com/opengraph.jpg</video:thumbnail_loc>
      <video:title>Small Claims Genie Introduction — Win in Small Claims Court</video:title>
      <video:description>Small Claims Genie walks you through every step — intake, evidence, AI chat, demand letters and your court-ready forms, ready to file. No lawyer needed.</video:description>
      <video:player_loc>https://app.heygen.com/embeds/b789b4bb9ad646b2bed4b078e2d9c6e2</video:player_loc>
      <video:duration>120</video:duration>
      <video:publication_date>2026-05-01T00:00:00+00:00</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:live>no</video:live>
    </video:video>`,
  },
  { loc: "https://smallclaimsgenie.com/pricing",        priority: "0.9", changefreq: "monthly" },
  { loc: "https://smallclaimsgenie.com/how-it-works",   priority: "0.9", changefreq: "monthly" },
  { loc: "https://smallclaimsgenie.com/faq",            priority: "0.9", changefreq: "monthly" },
  { loc: "https://smallclaimsgenie.com/blog",           priority: "0.8", changefreq: "weekly"  },
  {
    loc: "https://smallclaimsgenie.com/blog/paul-andrew-small-claims-genie-podcast",
    priority: "0.8",
    changefreq: "monthly",
    extra: `    <video:video>
      <video:thumbnail_loc>https://img.youtube.com/vi/EkzyvijKN6E/maxresdefault.jpg</video:thumbnail_loc>
      <video:title>Why Legal AI and Benefits Work In Your Favor Podcast — Legal AI Applications Understanding</video:title>
      <video:description>Paul Andrew joins the podcast to discuss how Small Claims Genie uses legal AI to help everyday people navigate small claims court without a lawyer — from intake to court-ready forms.</video:description>
      <video:player_loc>https://www.youtube.com/embed/EkzyvijKN6E</video:player_loc>
      <video:duration>944</video:duration>
      <video:publication_date>2026-08-15</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:live>no</video:live>
    </video:video>`,
  },
  { loc: "https://smallclaimsgenie.com/counties",       priority: "0.8", changefreq: "monthly" },
  { loc: "https://smallclaimsgenie.com/types-of-cases", priority: "0.8", changefreq: "monthly" },
  { loc: "https://smallclaimsgenie.com/resources",      priority: "0.7", changefreq: "monthly" },
  { loc: "https://smallclaimsgenie.com/startup",        priority: "0.7", changefreq: "monthly" },
];

// ── Sitemap: Soro article fetch ───────────────────────────────────────────────

const SORO_EMBED_TOKEN = "e4dea211-234e-485c-b304-ce18ef8d21f0";
const SORO_API_BASE    = "https://app.trysoro.com";

async function fetchSoroArticles() {
  try {
    const url = `${SORO_API_BASE}/api/embed/${SORO_EMBED_TOKEN}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SmallClaimsGenie/1.0 (sitemap)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Soro returned ${res.status}`);
    const js = await res.text();
    const match = js.match(/var SORO_ARTICLES = (\[[\s\S]*?\]);/);
    if (!match) throw new Error("SORO_ARTICLES not found in embed script");
    return JSON.parse(match[1]);
  } catch (err) {
    console.warn(`[sitemap] Soro fetch failed: ${err.message} — using empty article list`);
    return [];
  }
}

// ── Sitemap: XML generation ───────────────────────────────────────────────────

async function buildSitemapXml() {
  const articles = await fetchSoroArticles();

  const staticEntries = STATIC_SITEMAP_PAGES.map((p) => `
  <url>
    <loc>${p.loc}</loc>
    <lastmod>${DEPLOY_DATE}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>${p.extra ? `\n${p.extra}` : ""}
  </url>`).join("");

  const articleEntries = articles.map((a) => {
    const lastmod = (a.isoDate ?? a.date ?? DEPLOY_DATE).slice(0, 10);
    return `
  <url>
    <loc>https://smallclaimsgenie.com/blog/${a.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${staticEntries}

  <!-- Blog articles — refreshed daily at midnight Pacific -->
${articleEntries}
</urlset>`;
}

// ── Sitemap: in-memory cache ──────────────────────────────────────────────────

let sitemapCache    = null;
let sitemapCachedAt = 0;

async function getCachedSitemap() {
  if (sitemapCache) return sitemapCache; // scheduler handles daily expiry
  sitemapCache    = await buildSitemapXml();
  sitemapCachedAt = Date.now();
  console.log(`[sitemap] Generated — ${sitemapCache.length} bytes`);
  return sitemapCache;
}

async function refreshSitemap() {
  try {
    const xml       = await buildSitemapXml();
    sitemapCache    = xml;
    sitemapCachedAt = Date.now();
    console.log(`[sitemap] Refreshed at ${new Date().toISOString()} — ${xml.length} bytes`);
  } catch (err) {
    console.error(`[sitemap] Refresh failed: ${err.message}`);
  }
}

// ── Sitemap: midnight Pacific scheduler ──────────────────────────────────────
//
// Uses Intl.DateTimeFormat with America/Los_Angeles so DST is handled
// automatically — no hardcoded UTC offsets needed.

function msUntilMidnightPacific() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric", minute: "numeric", second: "numeric",
    hour12: false,
  }).formatToParts(now);

  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  const h = get("hour") % 24; // Intl can return 24 for midnight; normalise
  const m = get("minute");
  const s = get("second");

  const elapsedSeconds      = h * 3600 + m * 60 + s;
  const secondsUntilMidnight = 86400 - elapsedSeconds;
  return secondsUntilMidnight * 1000;
}

function scheduleMidnightRefresh() {
  const delay  = msUntilMidnightPacific();
  const fireAt = new Date(Date.now() + delay).toISOString();
  console.log(`[sitemap] Next midnight-Pacific refresh scheduled at ${fireAt}`);
  setTimeout(async () => {
    await refreshSitemap();
    scheduleMidnightRefresh(); // reschedule for the following midnight
  }, delay);
}

// ── Static file helpers ───────────────────────────────────────────────────────

function sendFile(res, filePath, isAsset) {
  let data;
  try {
    data = fs.readFileSync(filePath);
  } catch {
    return false;
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";

  if (isAsset) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
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

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url      = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  // ── Dynamic sitemap ──────────────────────────────────────────────────────
  if (pathname === "/sitemap.xml") {
    try {
      const xml = await getCachedSitemap();
      // Allow Google to cache for up to 1 hour; we control freshness server-side
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.writeHead(200);
      res.end(xml);
    } catch (err) {
      console.error(`[sitemap] Serve error: ${err.message}`);
      res.writeHead(500);
      res.end("Failed to generate sitemap");
    }
    return;
  }

  // Security: block path traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(distDir, safePath);

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const isAsset = safePath.startsWith("/assets/");

  let stat;
  try { stat = fs.statSync(filePath); } catch { /* not found */ }

  if (stat && stat.isFile()) {
    sendFile(res, filePath, isAsset);
    return;
  }

  if (stat && stat.isDirectory()) {
    const indexInDir = path.join(filePath, "index.html");
    if (sendFile(res, indexInDir, false)) return;
  }

  serveIndex(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Small Claims Genie serving dist/public on port ${port}`);
  // Warm the sitemap cache on startup, then schedule nightly midnight-Pacific refresh
  getCachedSitemap().catch((err) => console.error(`[sitemap] Initial build failed: ${err.message}`));
  scheduleMidnightRefresh();
});
