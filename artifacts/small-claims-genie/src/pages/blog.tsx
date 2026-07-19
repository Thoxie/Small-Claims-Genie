import { useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const SORO_EMBED_SRC = "https://app.trysoro.com/api/embed/e4dea211-234e-485c-b304-ce18ef8d21f0";

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

    return () => {
      script.remove();
    };
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

        {/* ── Header ── */}
        <section className="px-6 pt-10 pb-6 bg-[#f5fdfb]">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black text-primary mb-2">Blog</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {es
                ? "Guías y consejos para navegar el tribunal de reclamaciones menores, directamente del equipo de Small Claims Genie."
                : "Guides and tips for navigating small claims court, straight from the Small Claims Genie team."}
            </p>
          </div>
        </section>

        {/* ── Soro Blog Embed ── */}
        <section className="px-6 pb-10 bg-[#f5fdfb]">
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
