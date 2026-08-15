import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wand2 } from "lucide-react";

const YOUTUBE_URL    = "https://www.youtube.com/watch?v=EkzyvijKN6E";
const YOUTUBE_EMBED  = "https://www.youtube.com/embed/EkzyvijKN6E";
const THUMBNAIL_URL  = "https://img.youtube.com/vi/EkzyvijKN6E/maxresdefault.jpg";
const CANONICAL      = "https://smallclaimsgenie.com/blog/paul-andrew-small-claims-genie-podcast";
const LOGO_URL       = "https://smallclaimsgenie.com/opengraph.jpg";
const UPLOAD_DATE    = "2026-08-15";
const TITLE          = "Why Small Claims Founder Podcast — Legal AI Founder and Applications";

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": TITLE,
    "description": "Paul Andrew, founder of SmallClaimsGenie.com, discusses the experiences and ideas behind Small Claims Genie — a purpose-built AI platform designed to make small claims preparation clearer, more organized, and more accessible. This podcast covers legal AI applications and how purpose-built tools help self-represented litigants.",
    "thumbnailUrl": THUMBNAIL_URL,
    "uploadDate": UPLOAD_DATE,
    "duration": "PT15M44S",
    "contentUrl": YOUTUBE_URL,
    "embedUrl": YOUTUBE_EMBED,
    "publisher": {
      "@type": "Organization",
      "name": "Small Claims Genie",
      "url": "https://smallclaimsgenie.com",
      "logo": { "@type": "ImageObject", "url": LOGO_URL },
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": TITLE,
    "description": "Watch Paul Andrew, founder of Small Claims Genie, discuss legal AI applications and how purpose-built tools help people organize evidence and prepare for small claims court.",
    "url": CANONICAL,
    "datePublished": UPLOAD_DATE,
    "image": THUMBNAIL_URL,
    "publisher": {
      "@type": "Organization",
      "name": "Small Claims Genie",
      "url": "https://smallclaimsgenie.com",
      "logo": { "@type": "ImageObject", "url": LOGO_URL },
    },
    "about": {
      "@type": "Person",
      "name": "Paul Andrew",
      "jobTitle": "Founder",
      "worksFor": { "@type": "Organization", "name": "Small Claims Genie", "url": "https://smallclaimsgenie.com" },
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://smallclaimsgenie.com/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://smallclaimsgenie.com/blog" },
      { "@type": "ListItem", "position": 3, "name": TITLE, "item": CANONICAL },
    ],
  },
];

export default function PodcastPage() {
  const [, setLocation] = useLocation();

  return (
    <>
      <Helmet>
        <title>{TITLE} | Small Claims Genie</title>
        <meta
          name="description"
          content="Watch Paul Andrew, founder of Small Claims Genie, discuss legal AI applications and how purpose-built tools help people organize evidence and prepare for small claims court."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta name="robots" content="index, follow" />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:title" content={`${TITLE} | Small Claims Genie`} />
        <meta
          property="og:description"
          content="Watch Paul Andrew, founder of Small Claims Genie, discuss legal AI applications and how purpose-built tools help people organize evidence and prepare for small claims court."
        />
        <meta property="og:image" content={THUMBNAIL_URL} />
        <meta property="og:type" content="video.other" />
        <meta property="og:video" content={YOUTUBE_URL} />
        {structuredData.map((sd, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(sd)}</script>
        ))}
      </Helmet>

      <div className="flex flex-col w-full bg-[#f5fdfb] pb-[80px]">
        {/* ── Back nav ── */}
        <section className="px-6 pt-8 pb-2 bg-[#f5fdfb]">
          <div className="max-w-[1100px] mx-auto">
            <button
              onClick={() => setLocation("/blog")}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </button>
          </div>
        </section>

        {/* ── Header ── */}
        <section className="px-6 pt-6 pb-4 bg-[#f5fdfb]">
          <div className="max-w-[1100px] mx-auto">
            <p className="text-xs font-bold tracking-widest text-primary/60 uppercase mb-3">
              FOUNDER PODCAST
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-primary mb-4 leading-tight max-w-3xl">
              {TITLE}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Paul Andrew, founder of SmallClaimsGenie.com, discusses the experiences and ideas behind
              Small Claims Genie — a purpose-built AI platform designed to make small claims preparation
              clearer, more organized, and more accessible. The conversation covers legal AI applications
              and how guided tools differ from general-purpose chatbots.
            </p>
          </div>
        </section>

        {/* ── YouTube embed ── */}
        <section className="px-4 sm:px-6 pb-6 bg-[#f5fdfb]">
          <div className="max-w-[1100px] mx-auto">
            <div className="relative w-full rounded-xl overflow-hidden shadow-lg bg-black" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={YOUTUBE_EMBED}
                title={TITLE}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-6 pb-8 bg-[#f5fdfb]">
          <div className="max-w-[1100px] mx-auto flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={() => setLocation("/cases/new")}
              className="h-12 px-10 text-base bg-primary text-white hover:bg-primary/90 rounded-full font-bold shadow-md"
            >
              <Wand2 className="mr-2 h-5 w-5" />
              START MY CASE FREE
            </Button>
          </div>
        </section>

        {/* ── Expandable description ── */}
        <section className="px-6 pb-10 bg-[#f5fdfb]">
          <div className="max-w-[1100px] mx-auto">
            <details className="border border-border rounded-xl overflow-hidden">
              <summary className="cursor-pointer px-6 py-4 font-semibold text-primary text-sm select-none hover:bg-primary/5 transition-colors list-none flex items-center gap-2">
                <span className="flex-1">About This Podcast</span>
                <span className="text-muted-foreground text-xs shrink-0">Read more ↓</span>
              </summary>
              <div className="px-6 pb-6 pt-2 space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  In this podcast interview, Paul Andrew, founder of SmallClaimsGenie.com, explains why he
                  created Small Claims Genie and discusses some of the challenges people face when
                  representing themselves in small claims court. Understanding the dispute is only the
                  beginning. People must also identify relevant evidence, organize the facts, prepare the
                  required documents, and explain their position clearly.
                </p>
                <p>
                  The conversation examines how purpose-built legal AI can provide a more guided experience
                  than a general-purpose chatbot. Small Claims Genie is designed around the practical small
                  claims process, helping users evaluate their situations, organize supporting evidence,
                  prepare demand letters and court documents, and get ready to present their cases.
                </p>
                <p>
                  Paul also discusses the broader need for affordable and accessible legal preparation tools.
                  Small Claims Genie was created to help self-represented litigants approach the small claims
                  process with better organization, greater clarity, and more confidence.
                </p>
                <p className="text-xs text-muted-foreground/70 border-t border-border pt-4 mt-2">
                  Small Claims Genie provides legal information and document-preparation support. It is not
                  a law firm and does not provide legal representation.
                </p>
              </div>
            </details>
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
