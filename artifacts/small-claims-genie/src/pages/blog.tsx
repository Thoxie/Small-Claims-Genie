import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Wand2, Play, X, ExternalLink } from "lucide-react";

const YT_THUMB = "https://img.youtube.com/vi/EkzyvijKN6E/maxresdefault.jpg";
const YT_EMBED = "https://www.youtube.com/embed/EkzyvijKN6E";

interface ArticleMeta {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  isoDate: string;
  image: string | null;
}

export default function Blog() {
  const [enlarged, setEnlarged] = useState(false);
  const [, setLocation] = useLocation();
  const [articles, setArticles] = useState<ArticleMeta[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  // Fetch article list from our API proxy (no Soro client-side embed script needed)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/blog/articles")
      .then((r) => r.ok ? r.json() as Promise<{ articles: ArticleMeta[] }> : Promise.reject())
      .then(({ articles }) => { if (!cancelled) { setArticles(articles); setArticlesLoading(false); } })
      .catch(() => { if (!cancelled) setArticlesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Close lightbox on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setEnlarged(false);
  }, []);
  useEffect(() => {
    if (enlarged) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [enlarged, handleKeyDown]);

  return (
    <>
      {/* ── Lightbox ── */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 sm:p-10"
          onClick={() => setEnlarged(false)}
        >
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setEnlarged(false)}
              className="absolute -top-9 right-0 text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-medium"
              aria-label="Close"
            >
              <X className="h-4 w-4" /> Close
            </button>
            <div className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-black" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={`${YT_EMBED}?autoplay=1`}
                title="Paul Andrew: Why I Created Small Claims Genie — Founder Podcast Interview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full bg-[#f5fdfb] pb-[80px]">
        <Helmet>
          <title>Blog — Small Claims Genie</title>
          <meta
            name="description"
            content="Guides, tips, and insights on filing and winning small claims court cases — from Small Claims Genie."
          />
          <link rel="canonical" href="https://smallclaimsgenie.com/blog" />
          <meta property="og:url" content="https://smallclaimsgenie.com/blog" />
          <meta property="og:title" content="Blog — Small Claims Genie" />
          <meta
            property="og:description"
            content="Guides, tips, and insights on filing and winning small claims court cases — from Small Claims Genie."
          />
          <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
        </Helmet>

        {/* ── Header ── */}
        <section className="px-6 pt-10 pb-6 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black text-primary mb-2">Blog</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Guides and tips for navigating small claims court, straight from the Small Claims Genie team.
            </p>
          </div>
        </section>

        {/* ── Video post — first item, styled like a blog article card ── */}
        <section className="px-6 pb-4 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setEnlarged(true)}
              className="w-full text-left bg-white rounded-xl border border-border shadow-sm overflow-hidden flex hover:shadow-md transition-shadow group"
              aria-label="Watch: Paul Andrew: Why I Created Small Claims Genie — Founder Podcast Interview"
            >
              {/* Thumbnail */}
              <div className="relative shrink-0 w-[110px] sm:w-[152px] bg-black self-stretch">
                <img
                  src={YT_THUMB}
                  alt="Podcast video thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center">
                    <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col justify-between p-4 min-w-0">
                <div>
                  <p className="text-sm font-bold text-primary leading-snug mb-1.5">
                    Paul Andrew: Why I Created Small Claims Genie
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    Paul Andrew, founder of Small Claims Genie, discusses legal AI applications and how
                    purpose-built tools help people prepare for small claims court.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-3">August 15, 2026</p>
              </div>
            </button>
          </div>
        </section>

        {/* ── Blog article list ── */}
        <section className="px-6 pb-10 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto space-y-3">
            {articlesLoading && (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading articles…</div>
            )}
            {!articlesLoading && articles.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">No articles found.</div>
            )}
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() => setLocation(`/blog/${article.slug}`)}
                className="w-full text-left bg-white rounded-xl border border-border shadow-sm overflow-hidden flex hover:shadow-md transition-shadow group"
              >
                {article.image && (
                  <div className="relative shrink-0 w-[110px] sm:w-[152px] bg-muted self-stretch">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col justify-between p-4 min-w-0">
                  <div>
                    <p className="text-sm font-bold text-primary leading-snug mb-1.5 group-hover:underline">
                      {article.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-3">{article.date}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="px-6 pb-12 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto border-2 border-[#a8e6df] rounded-xl px-8 py-8 text-center bg-[#f0fffe]">
            <h2 className="text-lg font-black text-primary mb-1.5">Have a small claims question?</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Describe your situation in plain English — by voice or text. The Genie will tell you if you have a
              case, what evidence you need, and exactly how Small Claims Genie can help you win.
            </p>
            <p className="text-xs text-[#0d6b5e] font-semibold">Free to use — no account required.</p>
          </div>
        </section>
      </div>

      {/* ── Sticky Bottom Genie Button ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-end pointer-events-none"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))", paddingRight: "72px", paddingTop: "12px" }}
      >
        <Button
          size="lg"
          onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
          className="h-[43px] px-[29px] text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg pointer-events-auto"
        >
          <Wand2 className="mr-2 h-[18px] w-[18px]" />
          Ask the Genie — Free
        </Button>
      </div>
    </>
  );
}
