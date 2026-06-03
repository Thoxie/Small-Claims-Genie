import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

const howItWorksSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://smallclaimsgenie.com/how-it-works",
  "name": "How Small Claims Genie Works",
  "description": "See how Small Claims Genie walks you through every step: intake, evidence, AI chat, demand letters, and court-ready forms for California small claims court.",
  "isPartOf": { "@id": "https://smallclaimsgenie.com/#website" },
};

const features = [
  {
    title: "Why Small Claims Genie Exists",
    bullets: [
      "Lawyers are not allowed in Small Claims Court",
      "AI-powered full-service legal guidance",
      "No need to retain a lawyer for advice",
    ],
  },
  {
    title: "AI-Guided Case Preparation",
    bullets: [
      "Instantly identifies what matters",
      "Know what to do next",
      "No legal jargon or guessing",
    ],
  },
  {
    title: "Avoid Costly Mistakes",
    bullets: [
      "Court-specific document builder",
      "Organized, credible paperwork",
      "Avoid rejections and delays",
    ],
  },
  {
    title: "Evidence Organization",
    bullets: [
      "Turns emails, texts, and receipts into a timeline",
      "Builds a clear narrative",
      "Presents a clean case judges can follow",
    ],
  },
  {
    title: "Step-by-Step Roadmap",
    bullets: [
      "Know what to do and when",
      "Prevent missed deadlines",
      "Stay organized from start to hearing",
    ],
  },
  {
    title: "Fast, Clear Answers",
    bullets: [
      "Understand options and risks",
      "No hourly legal fees",
      "Make confident decisions quickly",
    ],
  },
];

export default function HowItWorks() {
  return (
    <>
    <div className="flex flex-col w-full bg-[#f5fdfb] pb-[80px]">
      <Helmet>
        <title>How It Works — Small Claims Genie</title>
        <meta name="description" content="See how Small Claims Genie walks you through every step: intake, evidence, AI chat, demand letters, and court-ready forms for California small claims court." />
        <link rel="canonical" href="https://smallclaimsgenie.com/how-it-works" />
        <meta property="og:url" content="https://smallclaimsgenie.com/how-it-works" />
        <meta property="og:title" content="How It Works — Small Claims Genie" />
        <meta property="og:description" content="See how Small Claims Genie walks you through every step: intake, evidence, AI chat, demand letters, and court-ready forms for California small claims court." />
        <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
        <script type="application/ld+json">{JSON.stringify(howItWorksSchema)}</script>
      </Helmet>

      {/* ── Hero ── */}
      <section className="px-4 pt-7 pb-5 text-center bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg sm:text-xl md:text-2xl font-black leading-tight mb-1 text-primary whitespace-nowrap">
            Lawyers aren't allowed in Small Claims Court.
          </h1>
          <p className="text-base font-semibold text-primary/70 mb-4">Win with the power of AI.</p>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Don't retain a lawyer for advice when you can use Small Claims Genie — an AI-powered system
            built to guide your case from start to hearing. Get your money back.
          </p>
        </div>
      </section>

      {/* ── Six Feature Boxes ── */}
      <section className="px-4 pb-0 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(({ title, bullets }) => (
              <div key={title} className="border-2 border-gray-300 rounded-xl p-5 bg-white">
                <h3 className="text-sm font-bold text-primary mb-3">{title}</h3>
                <ul className="space-y-1.5">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Banner ── */}
      <section className="px-4 pt-4 pb-8 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <div className="border-2 border-gray-300 rounded-xl px-8 py-10 text-center bg-gray-50">
            <h2 className="text-2xl sm:text-3xl font-black text-primary mb-2">
              Don't pay a lawyer. Use Small Claims Genie.
            </h2>
            <p className="text-sm text-muted-foreground">
              Prepare smarter. File correctly. Present confidently.
            </p>
          </div>
        </div>
      </section>

    </div>

    {/* ── Sticky Bottom Genie Button ── */}
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-end pointer-events-none"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))', paddingRight: '72px', paddingTop: '12px' }}
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
