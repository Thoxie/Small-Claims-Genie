import { useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const SORO_EMBED_SRC  = "https://app.trysoro.com/api/embed/e4dea211-234e-485c-b304-ce18ef8d21f0";
const VIDEO_URL       = "/form-assets/media/paul-andrew-podcast.mp4";
const POSTER_URL      = "/form-assets/media/paul-andrew-podcast-poster.webp";
const PODCAST_PAGE    = "/blog/paul-andrew-small-claims-genie-podcast";

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

        {/* ── Featured Podcast ── */}
        <section className="px-4 sm:px-6 pt-10 pb-6 bg-[#f5fdfb]">
          <div className="max-w-[1100px] mx-auto">

            {/* Eyebrow */}
            <p className="text-xs font-bold tracking-widest text-primary/60 uppercase mb-3">
              FEATURED PODCAST
            </p>

            {/* H1 — replaces the old standalone "Blog" heading */}
            <h1 className="text-2xl sm:text-3xl font-black text-primary mb-4 leading-tight max-w-3xl">
              {es
                ? "El Fundador de Small Claims Genie, Paul Andrew, sobre Facilitar los Tribunales de Reclamaciones Menores"
                : "Small Claims Genie Founder Paul Andrew on Making Small Claims Court Easier"}
            </h1>

            {/* Intro */}
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-6">
              {es
                ? "Ve esta entrevista de podcast de 16 minutos con Paul Andrew, fundador de SmallClaimsGenie.com, donde habla sobre por qué creó Small Claims Genie y cómo la IA diseñada específicamente puede ayudar a las personas a comprender sus disputas, organizar su evidencia, prepararse para el tribunal y presentar sus casos con mayor claridad y confianza."
                : "Watch this 16-minute podcast interview with Paul Andrew, founder of SmallClaimsGenie.com, discussing why he created Small Claims Genie and how purpose-built AI can help people understand their disputes, organize their evidence, prepare for court, and present their cases with greater clarity and confidence."}
            </p>

            {/* Video player — dominant, centered, max 1100px, 16:9 */}
            <div
              className="relative w-full rounded-xl overflow-hidden shadow-lg bg-black mb-4"
              style={{ aspectRatio: "16/9" }}
            >
              <video
                className="w-full h-full"
                controls
                playsInline
                preload="metadata"
                poster={POSTER_URL}
                aria-label="Podcast interview with Paul Andrew, founder of Small Claims Genie"
              >
                <source src={VIDEO_URL} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Meta line */}
            <p className="text-xs text-muted-foreground text-center mb-5">
              {es
                ? "Conversación de 16 minutos con el fundador • IA legal a medida • Preparación práctica para reclamaciones menores"
                : "16-minute founder conversation • Purpose-built legal AI • Practical small claims preparation"}
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <Button
                size="lg"
                onClick={() => setLocation("/cases/new")}
                className="h-12 px-10 text-base bg-primary text-white hover:bg-primary/90 rounded-full font-bold shadow-md"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                {es ? "COMENZAR MI CASO GRATIS" : "START MY CASE FREE"}
              </Button>
            </div>

            {/* Description link */}
            <p className="text-center text-sm">
              <a
                href={PODCAST_PAGE}
                onClick={(e) => { e.preventDefault(); setLocation(PODCAST_PAGE); }}
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              >
                {es
                  ? "Leer la descripción completa del podcast →"
                  : "Read the complete podcast description →"}
              </a>
            </p>
          </div>
        </section>

        {/* ── Divider + "Prefer to Read?" heading ── */}
        <section className="px-4 sm:px-6 pt-6 pb-3 bg-[#f5fdfb]">
          <div className="max-w-[1100px] mx-auto">
            <hr className="border-border mb-6" />
            <h2 className="text-lg sm:text-xl font-bold text-primary mb-4">
              {es
                ? "¿Prefieres Leer? Explora Nuestras Guías de Reclamaciones Menores"
                : "Prefer to Read? Explore Our Small Claims Guides"}
            </h2>
          </div>
        </section>

        {/* ── Soro Blog Embed ── */}
        <section className="px-4 sm:px-6 pb-10 bg-[#f5fdfb]">
          <div className="max-w-[1100px] mx-auto">
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
