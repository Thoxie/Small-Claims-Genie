import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Wand2, ArrowLeft, Loader2 } from "lucide-react";

interface ArticleMeta {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  isoDate: string;
  image: string | null;
  content: string;
}

export default function BlogArticle() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [, setLocation] = useLocation();

  const [article, setArticle] = useState<ArticleMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetch(`/api/blog/articles/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<{ article: ArticleMeta }>;
      })
      .then(({ article }) => {
        if (!cancelled) {
          setArticle(article);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("This article could not be loaded. Please try again.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const canonicalUrl = `https://smallclaimsgenie.com/blog/${slug}`;

  return (
    <>
      <Helmet>
        <title>{article ? `${article.title} — Small Claims Genie` : "Blog — Small Claims Genie"}</title>
        <meta
          name="description"
          content={article?.excerpt ?? "Guides, tips, and insights on filing and winning small claims court cases."}
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={article ? `${article.title} — Small Claims Genie` : "Blog — Small Claims Genie"} />
        <meta
          property="og:description"
          content={article?.excerpt ?? "Guides, tips, and insights on filing and winning small claims court cases."}
        />
        {article?.image && <meta property="og:image" content={article.image} />}
        {!article?.image && <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />}
        <meta property="og:type" content="article" />
        {article && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": article.title,
            "description": article.excerpt,
            "datePublished": article.isoDate,
            "url": canonicalUrl,
            ...(article.image ? { "image": article.image } : {}),
            "publisher": {
              "@type": "Organization",
              "name": "Small Claims Genie",
              "url": "https://smallclaimsgenie.com",
            },
            "author": {
              "@type": "Organization",
              "name": "Small Claims Genie",
            },
          })}</script>
        )}
      </Helmet>

      <div className="flex flex-col w-full bg-[#f5fdfb] pb-[80px]">
        {/* ── Back nav ── */}
        <section className="px-6 pt-8 pb-2 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setLocation("/blog")}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </button>
          </div>
        </section>

        {/* ── Article body ── */}
        <section className="px-6 pt-4 pb-10 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto">
            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            )}

            {error && !loading && (
              <div className="py-16 text-center">
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" onClick={() => setLocation("/blog")}>
                  Return to Blog
                </Button>
              </div>
            )}

            {article && !loading && (
              <article>
                {/*
                  Soro's embed script normally injects CSS for .soro-blog-article-content
                  via a <style> tag at runtime. Since we render article HTML directly from
                  the API (without loading the Soro embed script), we inject equivalent
                  styles here, adapted to the site's typography and color system.
                */}
                <style>{`
                  .soro-blog-article-content {
                    font-size: 1rem;
                    line-height: 1.75;
                    color: hsl(220 45% 15%);
                  }
                  .soro-blog-article-content h1,
                  .soro-blog-article-content h2,
                  .soro-blog-article-content h3,
                  .soro-blog-article-content h4,
                  .soro-blog-article-content h5,
                  .soro-blog-article-content h6 {
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    line-height: 1.3;
                    font-weight: 700;
                    color: hsl(220 45% 15%);
                  }
                  .soro-blog-article-content h2 { font-size: 1.5rem; }
                  .soro-blog-article-content h3 { font-size: 1.25rem; }
                  .soro-blog-article-content h4 { font-size: 1.125rem; }
                  .soro-blog-article-content p {
                    margin: 0 0 1rem 0;
                  }
                  .soro-blog-article-content ul,
                  .soro-blog-article-content ol {
                    margin: 0 0 1rem 0;
                    padding-left: 1.5rem;
                  }
                  .soro-blog-article-content ul { list-style-type: disc; }
                  .soro-blog-article-content ol { list-style-type: decimal; }
                  .soro-blog-article-content li {
                    margin-bottom: 0.5rem;
                  }
                  .soro-blog-article-content a {
                    color: #0066cc;
                  }
                  .soro-blog-article-content a:hover {
                    text-decoration: underline;
                  }
                  .soro-blog-article-content strong {
                    font-weight: 700;
                    color: hsl(220 45% 15%);
                  }
                  .soro-blog-article-content em {
                    font-style: italic;
                  }
                  .soro-blog-article-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                    margin: 1rem 0;
                  }
                  .soro-blog-article-content blockquote {
                    border-left: 4px solid hsl(220 15% 80%);
                    padding-left: 1rem;
                    margin: 1.5rem 0;
                    color: hsl(220 15% 32%);
                    font-style: italic;
                  }
                  .soro-blog-article-content code {
                    background: hsl(220 15% 94%);
                    padding: 0.15em 0.4em;
                    border-radius: 4px;
                    font-size: 0.875em;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                  }
                  .soro-blog-article-content pre {
                    background: hsl(220 15% 94%);
                    padding: 1rem 1.25rem;
                    border-radius: 8px;
                    overflow-x: auto;
                    margin: 1rem 0;
                  }
                  .soro-blog-article-content pre code {
                    background: none;
                    padding: 0;
                    font-size: 0.875rem;
                  }
                  .soro-blog-article-content hr {
                    border: none;
                    border-top: 1px solid hsl(220 15% 88%);
                    margin: 2rem 0;
                  }
                  .soro-blog-article-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1.5rem 0;
                    font-size: 0.9375rem;
                  }
                  .soro-blog-article-content th,
                  .soro-blog-article-content td {
                    border: 1px solid hsl(220 15% 88%);
                    padding: 0.5rem 0.75rem;
                    text-align: left;
                  }
                  .soro-blog-article-content th {
                    background: hsl(220 15% 96%);
                    font-weight: 600;
                  }
                `}</style>

                {/* Hero image */}
                {article.image && (
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full rounded-xl mb-6 object-cover"
                    style={{ maxHeight: "360px" }}
                  />
                )}

                <h1 className="text-2xl sm:text-3xl font-black text-primary mb-3 leading-tight">
                  {article.title}
                </h1>

                <p className="text-xs text-muted-foreground mb-6">{article.date}</p>

                {/* Article HTML from Soro */}
                <div
                  className="soro-blog-article-content max-w-none"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              </article>
            )}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="px-6 pb-12 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto rounded-xl px-8 py-10 text-center bg-[#0f1b2d]">
            <h2 className="text-xl sm:text-2xl font-black text-white mb-3">
              Have a question about your situation?
            </h2>
            <p className="text-sm text-white/70 mb-6 max-w-2xl mx-auto leading-relaxed">
              Describe what happened — by voice or text. The Genie will tell you if you have a case,
              what evidence you need, and how to win. No account required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
                className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                Ask the Genie — Free
              </Button>
              <Button
                size="lg"
                onClick={() => setLocation("/cases/new")}
                className="h-12 px-8 text-base bg-white/10 hover:bg-white/20 text-white rounded-full font-bold border border-white/30"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                Start Your Case
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* ── Sticky Genie button ── */}
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
