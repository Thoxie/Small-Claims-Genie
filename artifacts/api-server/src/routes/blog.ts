/**
 * Blog proxy routes — thin server-side cache over the Soro embed API so the
 * frontend can fetch article metadata and HTML content without exposing the
 * Soro token in client-side code, and so the pre-render step can hydrate
 * article pages with real content before JavaScript executes.
 */

import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SORO_EMBED_TOKEN = "e4dea211-234e-485c-b304-ce18ef8d21f0";
const SORO_API_BASE = "https://app.trysoro.com";
const EMBED_SCRIPT_URL = `${SORO_API_BASE}/api/embed/${SORO_EMBED_TOKEN}`;

// ── In-memory cache ──────────────────────────────────────────────────────────

interface SoroArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  isoDate: string;
  image: string | null;
}

let articlesCache: SoroArticle[] | null = null;
let articlesCachedAt = 0;
const ARTICLES_TTL_MS = 10 * 60 * 1000; // 10 minutes

const contentCache = new Map<string, { html: string; cachedAt: number }>();
const CONTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchArticleList(): Promise<SoroArticle[]> {
  const now = Date.now();
  if (articlesCache && now - articlesCachedAt < ARTICLES_TTL_MS) {
    return articlesCache;
  }

  const res = await fetch(EMBED_SCRIPT_URL, {
    headers: { "User-Agent": "SmallClaimsGenie/1.0 (prerender)" },
  });
  if (!res.ok) throw new Error(`Soro embed fetch failed: ${res.status}`);

  const js = await res.text();
  const match = js.match(/var SORO_ARTICLES = (\[[\s\S]*?\]);/);
  if (!match) throw new Error("SORO_ARTICLES not found in embed script");

  const articles: SoroArticle[] = JSON.parse(match[1]);
  articlesCache = articles;
  articlesCachedAt = now;
  return articles;
}

async function fetchArticleContent(articleId: string): Promise<string> {
  const now = Date.now();
  const cached = contentCache.get(articleId);
  if (cached && now - cached.cachedAt < CONTENT_TTL_MS) {
    return cached.html;
  }

  const url = `${SORO_API_BASE}/api/embed/${SORO_EMBED_TOKEN}/article/${articleId}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "SmallClaimsGenie/1.0 (prerender)" },
  });
  if (!res.ok) throw new Error(`Soro content fetch failed: ${res.status} for ${articleId}`);

  const data = (await res.json()) as { content: string };
  contentCache.set(articleId, { html: data.content, cachedAt: now });
  return data.content;
}

// ── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/blog/articles — returns the full article list (metadata only, no body HTML) */
router.get("/api/blog/articles", async (_req, res) => {
  try {
    const articles = await fetchArticleList();
    res.json({ articles });
  } catch (err) {
    console.error("[blog] fetchArticleList error:", err);
    res.status(502).json({ error: "Failed to fetch article list" });
  }
});

/** GET /api/blog/articles/:slug — returns metadata + full HTML content for one article */
router.get("/api/blog/articles/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const articles = await fetchArticleList();
    const article = articles.find((a) => a.slug === slug);
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    const content = await fetchArticleContent(article.id);
    res.json({ article: { ...article, content } });
  } catch (err) {
    console.error("[blog] fetchArticle error:", err);
    res.status(502).json({ error: "Failed to fetch article content" });
  }
});

export default router;
