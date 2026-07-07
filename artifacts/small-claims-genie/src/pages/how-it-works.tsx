import { Helmet } from 'react-helmet-async';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Wand2 } from "lucide-react";
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
      "acceptedAnswer": { "@type": "Answer", "text": "No. Small Claims Genie uses plain-English questions to help you explain what happened, upload your evidence, and prepare your case materials." },
    },
    {
      "@type": "Question",
      "name": "Can I use Small Claims Genie before I file?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Small Claims Genie is designed to help you prepare before filing by organizing your facts, evidence, damages, demand letter, and filing checklist." },
    },
    {
      "@type": "Question",
      "name": "Can I use Small Claims Genie after I already filed?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. You can still use Genie to organize evidence, build a timeline, prepare your court statement, review possible defenses, and practice for your hearing." },
    },
    {
      "@type": "Question",
      "name": "Does Small Claims Genie replace a lawyer?",
      "acceptedAnswer": { "@type": "Answer", "text": "No. Small Claims Genie is legal self-help software. It does not provide legal advice, legal representation, or attorney services." },
    },
    {
      "@type": "Question",
      "name": "What makes Small Claims Genie different from a blank form website?",
      "acceptedAnswer": { "@type": "Answer", "text": "Small Claims Genie does more than provide blank forms. It guides you through the facts, evidence, timeline, damages, demand letter, court-ready statement, and hearing preparation." },
    },
  ],
};

const steps = [
  {
    num: "01",
    title: "Tell the Genie What Happened",
    whatYouDo: "Answer plain-English questions about your dispute, who is involved, what happened, when it happened, what you are owed, and what evidence you have.",
    whatGenieDoes: "Turns your answers into the beginning of a structured small claims case file.",
    whatYouGet: "A clearer starting point for your claim without needing legal jargon.",
  },
  {
    num: "02",
    title: "Upload Your Evidence",
    whatYouDo: "Add receipts, invoices, contracts, photos, screenshots, emails, text messages, payment records, and other documents.",
    whatGenieDoes: "Helps organize the materials around the facts, dates, parties, and damages in your claim.",
    whatYouGet: "An evidence structure instead of a pile of disconnected files.",
  },
  {
    num: "03",
    title: "Genie Reviews the Case",
    whatYouDo: "Provide the facts and documents you have so Genie can identify the important parts of the dispute.",
    whatGenieDoes: "Looks for key facts, missing information, important dates, possible weaknesses, and common defenses the other side may raise.",
    whatYouGet: "A better understanding of what supports your case and what still needs work.",
  },
  {
    num: "04",
    title: "Build the Timeline",
    whatYouDo: "Confirm the dates, events, communications, payments, promises, and missed deadlines that matter.",
    whatGenieDoes: "Turns the events into a clean chronological timeline the court can follow.",
    whatYouGet: "A clearer story that helps explain what happened and why your claim makes sense.",
  },
  {
    num: "05",
    title: "Calculate What You Are Owed",
    whatYouDo: "Enter the amount you are asking for and connect it to invoices, receipts, deposits, property damage, payments, estimates, or money owed.",
    whatGenieDoes: "Breaks your damages into clearer categories and ties the amount to your evidence.",
    whatYouGet: "A damages breakdown that helps explain your number.",
  },
  {
    num: "06",
    title: "Generate a Demand Letter",
    whatYouDo: "Review the dispute summary, amount requested, deadline, and supporting facts before sending a demand letter.",
    whatGenieDoes: "Creates a plain-English demand letter that explains the problem, states what you want, and shows you are prepared.",
    whatYouGet: "A stronger pre-filing letter that may help resolve the dispute before court.",
  },
  {
    num: "07",
    title: "Prepare Court-Ready Materials",
    whatYouDo: "Review the case summary, filing information, evidence list, service details, and documents needed for your small claims process.",
    whatGenieDoes: "Organizes your information into court-ready preparation materials and checklists.",
    whatYouGet: "A cleaner, more complete case package before filing or before your hearing.",
  },
  {
    num: "08",
    title: "Practice for the Hearing",
    whatYouDo: "Practice explaining your case and answering likely questions from the judge or the other side.",
    whatGenieDoes: "Runs mock trial-style questions, identifies weak spots, and helps you prepare for defenses and follow-up questions.",
    whatYouGet: "More confidence and less confusion when it is time to speak.",
  },
  {
    num: "09",
    title: "Present Your Case Clearly",
    whatYouDo: "Use your court-ready statement, timeline, evidence checklist, and damages breakdown to stay organized.",
    whatGenieDoes: "Helps you focus on the facts, evidence, and amount you are asking for.",
    whatYouGet: "A prepared presentation instead of scattered notes and random documents.",
  },
];

const casePackage = [
  "Case summary",
  "Timeline",
  "Evidence checklist",
  "Damages breakdown",
  "Demand letter",
  "Filing checklist",
  "Service instructions",
  "Court-ready statement",
  "Hearing practice",
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
      <section className="px-4 pt-8 pb-6 text-center bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3 text-primary">
            How Small Claims Genie Works
          </h1>
          <p className="text-base font-semibold text-primary/70 mb-3">
            From messy facts to a court-ready case plan, Genie walks you through the small claims court preparation process step by step.
          </p>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-2xl mx-auto">
            Each step helps turn scattered information into something more useful: a case summary, organized evidence, a timeline, a damages breakdown, a demand letter, filing preparation, and hearing practice.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              onClick={() => gtagReportConversion()}
              className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
              aria-label="Start your small claims case for free"
            >
              <Link href="/cases/new"><Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />Start Your Case Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
              className="h-12 px-8 text-base rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5"
              aria-label="Ask the Genie a question for free"
            >
              Ask the Genie Free
            </Button>
          </div>
        </div>
      </section>

      {/* ── 9 Workflow Steps — Vertical Timeline ── */}
      <section className="px-4 pb-4 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Vertical connecting line — desktop only */}
            <div className="absolute left-[1.75rem] top-8 bottom-8 w-0.5 bg-gray-200 hidden md:block" aria-hidden="true" />

            {steps.map(({ num, title, whatYouDo, whatGenieDoes, whatYouGet }) => (
              <div key={num} className="relative flex items-start gap-5 mb-5">
                {/* Step number circle */}
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center z-10 mt-0.5">
                  <span className="text-sm font-black text-amber-500">{num}</span>
                </div>

                {/* Content card */}
                <div className="flex-1 bg-white rounded-xl border-2 border-gray-200 p-5 hover:border-amber-200 hover:shadow-md transition-all">
                  <h2 className="text-sm font-bold text-primary mb-4">{title}</h2>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mb-1.5">What you do</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{whatYouDo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-1.5">What Genie does</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{whatGenieDoes}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mb-1.5">What you get</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{whatYouGet}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── At the End, You Have a Case Package ── */}
      <section className="px-4 py-10 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">At the End, You Have a Case Package</h2>
            <p className="text-primary-foreground/70 text-base max-w-xl mx-auto leading-relaxed">
              Small Claims Genie helps you leave the process with organized materials you can use to file, serve, prepare, and explain your case more clearly.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {casePackage.map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-amber-300 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-4 py-10 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-primary mb-2">
            Prepare smarter. File correctly. Present confidently.
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Small Claims Genie is free to start. Pay only when you are ready to download your court-ready forms.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              onClick={() => gtagReportConversion()}
              className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
              aria-label="Start your small claims case for free"
            >
              <Link href="/cases/new"><Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />Start Your Case Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
              className="h-12 px-8 text-base rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5"
              aria-label="Ask the Genie a question for free"
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
            <h2 className="text-2xl md:text-3xl font-bold text-primary">How It Works FAQ</h2>
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
        aria-label="Ask the Genie a question for free"
      >
        <Wand2 className="mr-2 h-[18px] w-[18px]" aria-hidden="true" />
        Ask the Genie — Free
      </Button>
    </div>

    </>
  );
}
