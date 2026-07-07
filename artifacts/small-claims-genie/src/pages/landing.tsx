import { Helmet } from 'react-helmet-async';
import { i18n } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Scale, BookOpen, ClipboardList, Wand2, Search, CalendarDays, DollarSign, Mail, Mic, MessageCircle, CheckCircle2 } from "lucide-react";
import { gtagReportConversion } from "@/lib/gtag";

const TEAL = "#f5fdfb";

const landingSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://smallclaimsgenie.com/#website",
      "url": "https://smallclaimsgenie.com/",
      "name": "Small Claims Genie",
      "description": "Guided small claims court preparation — intake, evidence, demand letters, court-ready forms, and hearing practice. No lawyer needed.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://smallclaimsgenie.com/#app",
      "name": "Small Claims Genie",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://smallclaimsgenie.com/",
      "description": "Small Claims Genie helps you prepare for small claims court with guided intake, evidence organization, demand letters, court-ready forms, hearing preparation, and mock trial practice.",
      "offers": {
        "@type": "Offer",
        "price": 0,
        "priceCurrency": "USD",
        "description": "Free to start. Pay only to download court-ready forms.",
      },
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What does Small Claims Genie do?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Small Claims Genie helps you prepare for small claims court by guiding you through intake, evidence organization, demand letters, court-ready materials, hearing preparation, and mock trial practice.",
      },
    },
    {
      "@type": "Question",
      "name": "Does Small Claims Genie file my case for me?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Small Claims Genie does not file your case for you and does not provide legal representation. It helps you prepare the information, documents, and case materials you may need before filing.",
      },
    },
    {
      "@type": "Question",
      "name": "Can Small Claims Genie help me write a demand letter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Small Claims Genie can help create a demand letter that explains the dispute, states what you are asking for, and gives the other side a deadline to respond before you file a small claims case.",
      },
    },
    {
      "@type": "Question",
      "name": "What evidence can I upload?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can upload common small claims evidence such as contracts, receipts, invoices, photos, screenshots, emails, text messages, payment records, repair estimates, and other documents related to your dispute.",
      },
    },
    {
      "@type": "Question",
      "name": "Can Small Claims Genie help me prepare for the hearing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Genie helps you organize your case, create a court-ready statement, review possible defenses, and practice with mock trial questions before your small claims hearing.",
      },
    },
  ],
};

const featureCards = [
  {
    icon: ClipboardList,
    title: "Guided Small Claims Intake",
    desc: "Answer simple questions about what happened, who is involved, what you are owed, and what evidence you have. Small Claims Genie turns scattered facts into a structured case file.",
  },
  {
    icon: Search,
    title: "AI Evidence Review",
    desc: "Upload receipts, contracts, photos, screenshots, emails, text messages, invoices, payment records, and other documents. Genie helps identify the evidence that supports your small claims case.",
  },
  {
    icon: CalendarDays,
    title: "Small Claims Timeline Builder",
    desc: "Turn confusing events into a clean timeline the court can follow. Dates, conversations, payments, missed promises, and key events are organized in chronological order.",
  },
  {
    icon: DollarSign,
    title: "Damages Calculator",
    desc: "Break down what you are asking for and why. Genie helps connect your claimed amount to invoices, receipts, payments, property damage, deposits, or money owed.",
  },
  {
    icon: Mail,
    title: "Demand Letter Generator",
    desc: "Create a clear demand letter before filing a small claims case. Explain the dispute, state what you want, include a deadline, and show the other side you are prepared.",
  },
  {
    icon: Scale,
    title: "Court-Ready Forms",
    desc: "Prepare the information needed for small claims court forms and filing. Genie helps organize the details so your paperwork is cleaner and easier to complete.",
  },
  {
    icon: Mic,
    title: "Court-Ready Judge Statement",
    desc: "Generate a clear, plain-English statement that explains your case to the judge. Practice from it, refine it, and use it to stay focused at the hearing.",
  },
  {
    icon: MessageCircle,
    title: "Small Claims Mock Trial Practice",
    desc: "Practice before court with questions the judge or the other side may ask. Genie helps you prepare for weak spots, defenses, and follow-up questions.",
  },
];

const outputs = [
  "Small claims case summary",
  "Evidence checklist",
  "Organized case timeline",
  "Damages breakdown",
  "Demand letter",
  "Court-ready statement",
  "Filing checklist",
  "Service instructions",
  "Hearing preparation",
  "Mock trial practice",
];

const caseTypes = [
  "Unpaid invoices",
  "Security deposits",
  "Contractor disputes",
  "Property damage",
  "Auto damage",
  "Loans and money owed",
  "Breach of contract",
  "Bad service or unfinished work",
  "Customer disputes",
  "Landlord/tenant money disputes",
];

const homepageFaqs = [
  {
    q: "What does Small Claims Genie do?",
    a: "Small Claims Genie helps you prepare for small claims court by guiding you through intake, evidence organization, demand letters, court-ready materials, hearing preparation, and mock trial practice.",
  },
  {
    q: "Does Small Claims Genie file my case for me?",
    a: "No. Small Claims Genie does not file your case for you and does not provide legal representation. It helps you prepare the information, documents, and case materials you may need before filing.",
  },
  {
    q: "Can Small Claims Genie help me write a demand letter?",
    a: "Yes. Small Claims Genie can help create a demand letter that explains the dispute, states what you are asking for, and gives the other side a deadline to respond before you file a small claims case.",
  },
  {
    q: "What evidence can I upload?",
    a: "You can upload common small claims evidence such as contracts, receipts, invoices, photos, screenshots, emails, text messages, payment records, repair estimates, and other documents related to your dispute.",
  },
  {
    q: "Can Small Claims Genie help me prepare for the hearing?",
    a: "Yes. Genie helps you organize your case, create a court-ready statement, review possible defenses, and practice with mock trial questions before your small claims hearing.",
  },
];

export default function Landing() {
  return (
    <>
    <div className="flex flex-col w-full bg-[#f5fdfb] pb-[80px]">
      <Helmet>
        <title>Small Claims Genie | Prepare for Small Claims Court</title>
        <meta name="description" content="Small Claims Genie helps you prepare for small claims court with guided intake, evidence organization, demand letters, court-ready forms, hearing preparation, and mock trial practice." />
        <link rel="canonical" href="https://smallclaimsgenie.com/" />
        <meta property="og:url" content="https://smallclaimsgenie.com/" />
        <meta property="og:title" content="Small Claims Genie | Prepare for Small Claims Court" />
        <meta property="og:description" content="Small Claims Genie helps you prepare for small claims court with guided intake, evidence organization, demand letters, court-ready forms, hearing preparation, and mock trial practice." />
        <script type="application/ld+json">{JSON.stringify(landingSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      {/* ── Hero ── */}
      <section style={{ backgroundColor: TEAL }} className="px-4 pt-8 pb-7 overflow-hidden">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-8">

          {/* Video — top on mobile, right side on desktop */}
          <div className="w-full lg:w-[462px] shrink-0 lg:self-start lg:-mt-4 order-first lg:order-last">
            <p className="hidden lg:block text-base font-black text-primary mb-2 text-center tracking-wide uppercase">Small Claims Genie Introduction.</p>
            <div className="relative rounded-2xl overflow-hidden shadow-xl bg-[#0a5a50] aspect-video">
              <iframe
                src="https://app.heygen.com/embeds/b789b4bb9ad646b2bed4b078e2d9c6e2"
                title="HeyGen video player"
                frameBorder="0"
                allow="encrypted-media; fullscreen;"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>

          {/* Text + CTA — below video on mobile, left side on desktop */}
          <div className="flex-1 min-w-0 lg:text-left order-last lg:order-first">
            <h1 className="text-3xl sm:text-4xl font-black leading-snug mb-4 text-primary tracking-tight">
              Win in Small Claims Court.<br />
              Don't lose because you're unprepared.<br />
              Get your money back!
            </h1>
            <p className="text-lg text-gray-700 mb-5 max-w-xl leading-relaxed">
              Small Claims Genie walks you through every step — intake, evidence, AI chat, demand letters and your court-ready forms, ready to file. No lawyer needed.
            </p>
            <Button asChild size="lg" onClick={() => gtagReportConversion()} className="lg:hidden h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg w-full sm:w-auto">
              <Link href="/cases/new"><Wand2 className="mr-2 h-4 w-4" />Start Your Case Free</Link>
            </Button>
          </div>

        </div>
      </section>

      {/* ── Three Feature Boxes ── */}
      <section className="px-4 pt-5 pb-5 bg-[#f5fdfb]">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: ClipboardList,
                title: "Court-Ready Intake Forms",
                desc: "Guided 7-step intake collects every field required for all your court forms— legally complete, nothing missed.",
              },
              {
                icon: FileText,
                title: "Evidence That Speaks for You",
                desc: "Upload receipts, contracts, texts, and photos. Our AI Genie reads every document and builds your case argument.",
              },
              {
                icon: BookOpen,
                title: "Filing Guidance & Checklists",
                desc: "Step-by-step filing instructions, courthouse details, and a readiness checklist for your specific county.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-amber-200 transition-all group">
                <div style={{ backgroundColor: TEAL }} className="h-11 w-11 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-primary/70" />
                </div>
                <h3 className="text-base font-bold mb-1.5 text-primary">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{ backgroundColor: TEAL }} className="px-4 py-8">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-7">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-1.5">How It Works</h2>
            <p className="text-primary/60 text-base max-w-xl mx-auto">Three steps from dispute to ready-to-file.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { num: "01", icon: ClipboardList, label: "7-Step Intake Wizard", title: i18n.landing.step1Title, desc: i18n.landing.step1Desc },
              { num: "02", icon: FileText, label: "AI Evidence Reader", title: i18n.landing.step2Title, desc: i18n.landing.step2Desc },
              { num: "03", icon: Scale, label: "Court-Ready Forms", title: i18n.landing.step3Title, desc: i18n.landing.step3Desc },
            ].map(({ num, icon: Icon, title, desc, label }) => (
              <div key={num} className="bg-white/70 rounded-2xl p-5 border border-white/80 shadow-sm">
                <div className="text-4xl font-black text-amber-400/40 mb-2 leading-none">{num}</div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-primary/60" />
                  <span className="text-xs font-semibold text-primary/40 uppercase tracking-wider">{label}</span>
                </div>
                <h3 className="text-base font-bold mb-1.5 text-primary">{title}</h3>
                <p className="text-sm text-primary/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/how-it-works" className="text-sm text-primary/60 hover:text-primary underline underline-offset-4 transition-colors">
              See the full step-by-step process →
            </Link>
          </div>
        </div>
      </section>

      {/* ── AI Chat Callout ── */}
      <section className="px-4 py-10 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="text-amber-300 text-base font-semibold mb-2">Voice &amp; Text AI Chat — Included Free</p>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Not sure if you have a case?</h2>
          <p className="text-base text-primary-foreground/75 max-w-xl mx-auto leading-relaxed mb-6">
            Tell the Genie what happened — by voice or text. It will tell you if you have a case,
            what evidence you need, and exactly how to win. No account required.
          </p>
          <Button
            size="lg"
            onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
            className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
          >
            <Wand2 className="mr-2 h-5 w-5" />
            Ask the Genie — Free
          </Button>
        </div>
      </section>

      {/* ── Small Claims Court Help, Step by Step ── */}
      <section className="px-4 py-12 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">Small Claims Court Help, Step by Step</h2>
            <p className="text-muted-foreground text-base max-w-2xl mx-auto leading-relaxed">
              Small Claims Genie is more than a form filler. It is a guided small claims court preparation tool that helps you understand your dispute, organize your evidence, prepare your documents, and get ready to explain your case clearly.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featureCards.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col p-5 rounded-2xl border border-gray-100 bg-[#f5fdfb] shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3 bg-white border border-gray-100">
                  <Icon className="h-5 w-5 text-primary/70" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold mb-1.5 text-primary">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Get ── */}
      <section className="px-4 py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">What You Get With Small Claims Genie</h2>
            <p className="text-primary-foreground/70 text-base max-w-2xl mx-auto leading-relaxed">
              By the end of the process, you are not walking into small claims court with random papers and a vague story. You have an organized case package built around your facts, evidence, damages, and hearing preparation.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {outputs.map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-amber-300 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built for Common Disputes ── */}
      <section className="px-4 py-12 bg-[#f5fdfb]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">Built for Common Small Claims Court Disputes</h2>
            <p className="text-muted-foreground text-base max-w-2xl mx-auto leading-relaxed">
              Small Claims Genie is designed for everyday disputes where people need a clear, organized way to get their money back.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {caseTypes.map((type) => (
              <div
                key={type}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-xs font-semibold text-primary shadow-sm hover:border-amber-300 hover:shadow-md transition-all"
              >
                {type}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prepare + Hearing ── */}
      <section className="px-4 py-12 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-100 bg-[#f5fdfb] p-7 shadow-sm">
              <h2 className="text-xl font-bold text-primary mb-3">Prepare Before You File</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Many people lose or settle for less because they are disorganized, missing evidence, or unsure how to explain their claim. Small Claims Genie helps you prepare before you file, so your facts, documents, timeline, damages, and demand letter are organized from the beginning.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-[#f5fdfb] p-7 shadow-sm">
              <h2 className="text-xl font-bold text-primary mb-3">Get Ready for the Hearing</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Small claims court is designed for people to represent themselves, but preparation still matters. Genie helps you practice your presentation, answer likely questions, understand possible defenses, and stay focused when it is time to explain your case.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Legal Self-Help Disclaimer + CTA ── */}
      <section className="px-4 py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Legal Self-Help, Not a Law Firm</h2>
          <p className="text-base text-primary-foreground/75 max-w-xl mx-auto leading-relaxed mb-8">
            Small Claims Genie is legal self-help software. It is not a law firm, does not provide legal representation, and does not file your case for you. It helps you organize your facts, prepare documents, understand the process, and get ready to present your claim.
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

      {/* ── FAQ ── */}
      <section className="px-4 py-12 bg-[#f5fdfb]">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">Small Claims Court Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {homepageFaqs.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
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
        </div>
      </section>

    </div>

    {/* ── Sticky Bottom CTA — fixed on all devices/OS ── */}
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
