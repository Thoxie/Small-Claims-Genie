import { Helmet } from 'react-helmet-async';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Wand2 } from "lucide-react";
import { gtagReportConversion } from "@/lib/gtag";

const howItWorksSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://smallclaimsgenie.com/how-it-works",
  "name": "How Small Claims Genie Works | Small Claims Court Preparation",
  "description": "See how Small Claims Genie helps you organize evidence, build a timeline, calculate damages, create a demand letter, prepare court-ready materials, and practice for your small claims hearing.",
  "isPartOf": { "@id": "https://smallclaimsgenie.com/#website" },
};

const howItWorksFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do I need to know legal terms to use Small Claims Genie?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Small Claims Genie uses plain-English questions to help you explain what happened, upload your evidence, and prepare your case materials.",
      },
    },
    {
      "@type": "Question",
      "name": "Can I use Small Claims Genie before I file?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Small Claims Genie is designed to help you prepare before filing by organizing your facts, evidence, damages, demand letter, and filing checklist.",
      },
    },
    {
      "@type": "Question",
      "name": "Can I use Small Claims Genie after I already filed?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. You can still use Genie to organize evidence, build a timeline, prepare your court statement, review possible defenses, and practice for your hearing.",
      },
    },
    {
      "@type": "Question",
      "name": "Does Small Claims Genie replace a lawyer?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Small Claims Genie is legal self-help software. It does not provide legal advice, legal representation, or attorney services.",
      },
    },
    {
      "@type": "Question",
      "name": "What makes Small Claims Genie different from a blank form website?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Small Claims Genie does more than provide blank forms. It guides you through the facts, evidence, timeline, damages, demand letter, court-ready statement, and hearing preparation.",
      },
    },
  ],
};

const steps = [
  {
    num: "01",
    title: "Tell the Genie What Happened",
    desc: "Start with plain-English questions about your dispute. Genie asks who is involved, what happened, when it happened, what you are owed, and what evidence you have.",
    benefit: "You do not need to know legal terms to start building your small claims case.",
  },
  {
    num: "02",
    title: "Upload Your Evidence",
    desc: "Add receipts, invoices, contracts, photos, screenshots, emails, text messages, payment records, and other documents. Genie helps organize the materials around your claim.",
    benefit: "Your evidence becomes part of the case structure instead of a pile of disconnected files.",
  },
  {
    num: "03",
    title: "Genie Reviews the Case",
    desc: "Genie looks for key facts, missing information, important dates, possible weaknesses, and common defenses the other side may raise.",
    benefit: "You can see what helps your case and what still needs work before filing.",
  },
  {
    num: "04",
    title: "Build the Timeline",
    desc: "Genie turns your facts into a clear sequence of events. The timeline helps show the judge what happened and why the claim makes sense.",
    benefit: "A clean timeline makes your small claims case easier to understand.",
  },
  {
    num: "05",
    title: "Calculate What You Are Owed",
    desc: "Break down your damages into clear categories. Genie helps connect the amount you are asking for to the evidence you uploaded.",
    benefit: "You can explain your number instead of just asking for money.",
  },
  {
    num: "06",
    title: "Generate a Demand Letter",
    desc: "Before filing, Genie can help prepare a demand letter that explains the problem, states what you want, and gives the other side a deadline to respond.",
    benefit: "A strong demand letter may help resolve the dispute before court.",
  },
  {
    num: "07",
    title: "Prepare Court-Ready Materials",
    desc: "Genie helps organize the information needed for your small claims forms, case summary, evidence list, filing checklist, and service instructions.",
    benefit: "You are better prepared before you file.",
  },
  {
    num: "08",
    title: "Practice for the Hearing",
    desc: "Use mock trial practice to rehearse your story, answer likely questions, prepare for defenses, and improve your court presentation.",
    benefit: "You can walk into the hearing with more confidence and less confusion.",
  },
  {
    num: "09",
    title: "Present Your Case Clearly",
    desc: "Use your court-ready statement, timeline, evidence checklist, and damages breakdown to stay organized at the hearing.",
    benefit: "You are not just showing up. You are presenting a prepared case.",
  },
];

const howItWorksFaqs = [
  {
    q: "Do I need to know legal terms to use Small Claims Genie?",
    a: "No. Small Claims Genie uses plain-English questions to help you explain what happened, upload your evidence, and prepare your case materials.",
  },
  {
    q: "Can I use Small Claims Genie before I file?",
    a: "Yes. Small Claims Genie is designed to help you prepare before filing by organizing your facts, evidence, damages, demand letter, and filing checklist.",
  },
  {
    q: "Can I use Small Claims Genie after I already filed?",
    a: "Yes. You can still use Genie to organize evidence, build a timeline, prepare your court statement, review possible defenses, and practice for your hearing.",
  },
  {
    q: "Does Small Claims Genie replace a lawyer?",
    a: "No. Small Claims Genie is legal self-help software. It does not provide legal advice, legal representation, or attorney services.",
  },
  {
    q: "What makes Small Claims Genie different from a blank form website?",
    a: "Small Claims Genie does more than provide blank forms. It guides you through the facts, evidence, timeline, damages, demand letter, court-ready statement, and hearing preparation.",
  },
];

export default function HowItWorks() {
  return (
    <>
    <div className="flex flex-col w-full bg-[#f5fdfb] pb-[80px]">
      <Helmet>
        <title>How Small Claims Genie Works | Small Claims Court Preparation</title>
        <meta name="description" content="See how Small Claims Genie helps you organize evidence, build a timeline, calculate damages, create a demand letter, prepare court-ready materials, and practice for your small claims hearing." />
        <link rel="canonical" href="https://smallclaimsgenie.com/how-it-works" />
        <meta property="og:url" content="https://smallclaimsgenie.com/how-it-works" />
        <meta property="og:title" content="How Small Claims Genie Works | Small Claims Court Preparation" />
        <meta property="og:description" content="See how Small Claims Genie helps you organize evidence, build a timeline, calculate damages, create a demand letter, prepare court-ready materials, and practice for your small claims hearing." />
        <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
        <script type="application/ld+json">{JSON.stringify(howItWorksSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howItWorksFaqSchema)}</script>
      </Helmet>

      {/* ── Hero ── */}
      <section className="px-4 pt-8 pb-7 text-center bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3 text-primary">
            How Small Claims Genie Works
          </h1>
          <p className="text-base font-semibold text-primary/70 mb-4">
            From messy facts to a court-ready case plan, Genie walks you through the small claims court preparation process step by step.
          </p>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-xl mx-auto">
            Small claims court is designed for people to represent themselves. Small Claims Genie gives you the structure, documents, and practice you need to walk in prepared — without paying for a lawyer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              onClick={() => gtagReportConversion()}
              className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
            >
              <Link href="/cases/new"><Wand2 className="mr-2 h-4 w-4" />Start Your Case Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
              className="h-12 px-8 text-base rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5"
            >
              Ask the Genie Free
            </Button>
          </div>
        </div>
      </section>

      {/* ── 9 Workflow Steps ── */}
      <section className="px-4 pb-10 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map(({ num, title, desc, benefit }) => (
              <div key={num} className="border-2 border-gray-200 rounded-xl p-5 bg-white hover:border-amber-200 hover:shadow-md transition-all">
                <div className="text-3xl font-black text-amber-400/40 mb-2 leading-none">{num}</div>
                <h3 className="text-sm font-bold text-primary mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{desc}</p>
                <p className="text-xs text-primary/60 italic border-t border-gray-100 pt-2">→ {benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Banner ── */}
      <section className="px-4 py-10 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">
            Prepare smarter. File correctly. Present confidently.
          </h2>
          <p className="text-sm text-primary-foreground/70 mb-6">
            Small Claims Genie is free to start. Pay only when you are ready to download your court-ready forms.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              onClick={() => gtagReportConversion()}
              className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
            >
              <Link href="/cases/new"><Wand2 className="mr-2 h-4 w-4" />Start Your Case Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
              className="h-12 px-8 text-base rounded-full font-bold border-white/30 text-white hover:bg-white/10"
            >
              Ask the Genie Free
            </Button>
          </div>
        </div>
      </section>

      {/* ── How It Works FAQ ── */}
      <section className="px-4 py-12 bg-[#f5fdfb]">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">How It Works FAQ</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {howItWorksFaqs.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`hiw-faq-${idx}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-2 data-[state=open]:border-amber-200"
              >
                <AccordionTrigger className="px-4 py-4 text-sm font-semibold text-primary hover:no-underline text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-8">
            <Link href="/" className="text-sm text-primary/60 hover:text-primary underline underline-offset-4 transition-colors">
              ← Back to Home
            </Link>
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
