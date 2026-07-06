import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

const SORO_EMBED_SRC = "https://app.trysoro.com/api/embed/e4dea211-234e-485c-b304-ce18ef8d21f0";

export default function Blog() {
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
              Guides and tips for navigating small claims court, straight from the Small Claims Genie team.
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
