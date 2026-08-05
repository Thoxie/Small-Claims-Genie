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
                  className="soro-blog-article-content prose prose-sm max-w-none text-foreground"
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
