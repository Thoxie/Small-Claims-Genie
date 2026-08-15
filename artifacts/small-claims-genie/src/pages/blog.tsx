import { useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const SORO_EMBED_SRC = "https://app.trysoro.com/api/embed/e4dea211-234e-485c-b304-ce18ef8d21f0";
const YOUTUBE_EMBED  = "https://www.youtube.com/embed/EkzyvijKN6E";
const PODCAST_PAGE   = "/blog/paul-andrew-small-claims-genie-podcast";

export default function Blog() {
  const [, setLocation] = useLocation();
  const { lang } = useLanguage();
  const es = lang === "es";

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SORO_EMBED_SRC}"]`);
    if (existing) return;
    const script = document.createElement("script");
    script.src = SORO_EMBED_SRC;
    script.defer = true;
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  return (
    <>
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

      <div className="flex flex-col w-full bg-[#f5fdfb] pb-[80px]">

        {/* ── Blog header ── */}
        <section className="px-6 pt-10 pb-4 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black text-primary mb-2">
              {es ? "Blog" : "Blog"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {es
                ? "Guías y consejos para navegar el tribunal de reclamaciones menores, directamente del equipo de Small Claims Genie."
                : "Guides and tips to navigate small claims court, directly from the Small Claims Genie team."}
            </p>
          </div>
        </section>

        {/* ── Featured Podcast — compact card with smaller YouTube embed ── */}
        <section className="px-6 pb-8 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden max-w-xl">

              {/* Card header */}
              <div className="px-5 pt-5 pb-3">
                <p className="text-[10px] font-bold tracking-widest text-primary/50 uppercase mb-1">
                  {es ? "EPISODIO DE PODCAST DESTACADO" : "FEATURED PODCAST EPISODE"}
                </p>
                <h2 className="text-sm sm:text-base font-bold text-primary leading-snug">
                  {es
                    ? "Why Small Claims Founder Podcast — Legal AI Founder and Applications"
                    : "Why Small Claims Founder Podcast — Legal AI Founder and Applications"}
                </h2>
              </div>

              {/* YouTube embed */}
              <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
                <iframe
                  src={YOUTUBE_EMBED}
                  title="Why Small Claims Founder Podcast — Legal AI Founder and Applications"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  loading="lazy"
                />
              </div>

              {/* Card footer */}
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {es ? "Conversación con el fundador" : "Founder conversation"}
                </p>
                <a
                  href={PODCAST_PAGE}
                  onClick={(e) => { e.preventDefault(); setLocation(PODCAST_PAGE); }}
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  {es ? "Ver página completa →" : "Full episode page →"}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Soro Blog Embed ── */}
        <section className="px-4 sm:px-6 pb-10 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto">
            <div id="soro-blog" />
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="px-6 pb-12 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto rounded-xl px-8 py-10 text-center bg-[#0f1b2d]">
            <h2 className="text-xl sm:text-2xl font-black text-white mb-3">
              {es ? "¿Tienes preguntas sobre tu situación?" : "Have a question about your situation?"}
            </h2>
            <p className="text-sm text-white/70 mb-6 max-w-2xl mx-auto leading-relaxed">
              {es
                ? "Describe qué pasó — por voz o texto. El Genie te dirá si tienes un caso, qué evidencia necesitas y cómo ganar. Sin necesidad de cuenta."
                : "Describe what happened — by voice or text. The Genie will tell you if you have a case, what evidence you need, and how to win. No account required."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
                className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                {es ? "Pregunta al Genie — Gratis" : "Ask the Genie — Free"}
              </Button>
              <Button
                size="lg"
                onClick={() => setLocation("/cases/new")}
                className="h-12 px-8 text-base bg-white/10 hover:bg-white/20 text-white rounded-full font-bold border border-white/30"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                {es ? "Comenzar tu Caso" : "Start Your Case"}
              </Button>
            </div>
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
          {es ? "Pregunta al Genie — Gratis" : "Ask the Genie — Free"}
        </Button>
      </div>
    </>
  );
}
