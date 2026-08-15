import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Wand2, Play } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const SORO_EMBED_SRC  = "https://app.trysoro.com/api/embed/e4dea211-234e-485c-b304-ce18ef8d21f0";
const VIDEO_URL       = "/form-assets/media/paul-andrew-podcast.mp4";
const POSTER_URL      = "/form-assets/media/paul-andrew-podcast-poster.webp";
const PODCAST_PAGE    = "/blog/paul-andrew-small-claims-genie-podcast";

export default function Blog() {
  const [, setLocation] = useLocation();
  const { lang } = useLanguage();
  const es = lang === "es";
  const [videoError, setVideoError] = useState(false);

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

        {/* ── Featured Podcast — compact, proportionate ── */}
        <section className="px-6 pb-8 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="px-5 pt-5 pb-3">
                <p className="text-[10px] font-bold tracking-widest text-primary/50 uppercase mb-1">
                  {es ? "EPISODIO DE PODCAST DESTACADO" : "FEATURED PODCAST EPISODE"}
                </p>
                <h2 className="text-base sm:text-lg font-bold text-primary leading-snug">
                  {es
                    ? "Paul Andrew: Por qué creé Small Claims Genie"
                    : "Paul Andrew: Why I Created Small Claims Genie"}
                </h2>
              </div>

              {/* Video player */}
              <div className="relative w-full bg-[#0f1b2d]" style={{ aspectRatio: "16/9" }}>
                {!videoError ? (
                  <video
                    className="w-full h-full"
                    controls
                    playsInline
                    preload="metadata"
                    poster={POSTER_URL}
                    onError={() => setVideoError(true)}
                    aria-label={es
                      ? "Entrevista de podcast con Paul Andrew, fundador de Small Claims Genie"
                      : "Podcast interview with Paul Andrew, founder of Small Claims Genie"}
                  >
                    <source src={VIDEO_URL} type="video/mp4" />
                  </video>
                ) : (
                  /* Fallback when video can't load */
                  <button
                    onClick={() => setLocation(PODCAST_PAGE)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 hover:text-white transition-colors"
                    aria-label={es ? "Ver episodio completo del podcast" : "Watch full podcast episode"}
                  >
                    <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
                      <Play className="h-7 w-7 fill-white text-white" />
                    </div>
                    <p className="text-sm font-medium">
                      {es ? "Ver episodio completo →" : "Watch full episode →"}
                    </p>
                  </button>
                )}
              </div>

              {/* Card footer */}
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {es ? "16 minutos • Conversación con el fundador" : "16 minutes • Founder conversation"}
                </p>
                <a
                  href={PODCAST_PAGE}
                  onClick={(e) => { e.preventDefault(); setLocation(PODCAST_PAGE); }}
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  {es ? "Descripción completa →" : "Full description →"}
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
