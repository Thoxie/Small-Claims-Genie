import { i18n } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, FileText, Scale, BookOpen, ClipboardList, Mic } from "lucide-react";

export default function Landing() {
  return (
    <div className="flex flex-col w-full">

      {/* ── Hero ── */}
      <section className="relative px-4 py-24 md:py-36 bg-primary text-primary-foreground flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-4 text-white tracking-tight">
            {i18n.landing.heroTitle}
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-accent mb-5">
            {i18n.landing.heroSubtitle}
          </p>
          <p className="text-base md:text-lg text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            {i18n.landing.heroBody}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-14 px-10 text-lg bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-bold shadow-lg">
              <Link href="/cases/new">
                {i18n.landing.startCaseBtn} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-10 text-lg rounded-full font-semibold border-white/30 text-white hover:bg-white/10">
              <Link href="/dashboard">
                {i18n.landing.resumeCaseBtn}
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-primary-foreground/50">
            No account required · Free to start · $49 to download your final forms
          </p>
        </div>
      </section>

      {/* ── What We Do ── */}
      <section className="px-4 py-24 bg-background">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            {i18n.landing.whatWeDoTitle}
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-14 max-w-2xl mx-auto">
            Built specifically for California small claims court — not generic legal software.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col p-7 rounded-2xl border bg-card shadow-sm hover:border-primary/40 transition-colors">
              <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                <ClipboardList className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{i18n.landing.feature1Title}</h3>
              <p className="text-muted-foreground leading-relaxed">{i18n.landing.feature1Desc}</p>
            </div>
            <div className="flex flex-col p-7 rounded-2xl border bg-card shadow-sm hover:border-primary/40 transition-colors">
              <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{i18n.landing.feature2Title}</h3>
              <p className="text-muted-foreground leading-relaxed">{i18n.landing.feature2Desc}</p>
            </div>
            <div className="flex flex-col p-7 rounded-2xl border bg-card shadow-sm hover:border-primary/40 transition-colors">
              <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{i18n.landing.feature3Title}</h3>
              <p className="text-muted-foreground leading-relaxed">{i18n.landing.feature3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="px-4 py-24 bg-muted/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">
            {i18n.landing.howItWorksTitle}
          </h2>
          <div className="space-y-16">

            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="w-full md:w-1/2">
                <div className="text-7xl font-black text-primary/15 mb-3 leading-none">01</div>
                <h3 className="text-2xl font-bold mb-3">{i18n.landing.step1Title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">{i18n.landing.step1Desc}</p>
              </div>
              <div className="w-full md:w-1/2 h-52 bg-card rounded-2xl border shadow-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground/40">
                  <ClipboardList className="h-14 w-14" />
                  <span className="text-sm font-medium">7-Step Intake Wizard</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row-reverse items-center gap-10">
              <div className="w-full md:w-1/2">
                <div className="text-7xl font-black text-primary/15 mb-3 leading-none">02</div>
                <h3 className="text-2xl font-bold mb-3">{i18n.landing.step2Title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">{i18n.landing.step2Desc}</p>
              </div>
              <div className="w-full md:w-1/2 h-52 bg-card rounded-2xl border shadow-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground/40">
                  <FileText className="h-14 w-14" />
                  <span className="text-sm font-medium">AI Evidence Reader</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="w-full md:w-1/2">
                <div className="text-7xl font-black text-primary/15 mb-3 leading-none">03</div>
                <h3 className="text-2xl font-bold mb-3">{i18n.landing.step3Title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">{i18n.landing.step3Desc}</p>
              </div>
              <div className="w-full md:w-1/2 h-52 bg-card rounded-2xl border shadow-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground/40">
                  <Scale className="h-14 w-14" />
                  <span className="text-sm font-medium">SC-100 Download</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── AI Chat Callout ── */}
      <section className="px-4 py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Mic className="h-4 w-4" /> Voice + Text AI Chat
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-5">Our AI is Smarter.</h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Unlike generic AI tools, your Genie has read your documents, knows your case facts, and gives advice specific to your situation. Ask anything — by voice or text.
          </p>
          <Button asChild size="lg" className="h-14 px-10 text-lg bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-bold">
            <Link href="/cases/new">Start Your Case Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      {/* ── Counties Quick-Link ── */}
      <section className="px-4 py-16 bg-background border-b">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold mb-3">All 58 California Counties</h2>
          <p className="text-muted-foreground mb-6">
            Courthouse addresses, filing fees, and phone numbers for every county in California.
          </p>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/counties">Find My County Courthouse <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-4 py-24 bg-muted/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {i18n.landing.pricingTitle}
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto">
            {i18n.landing.pricingDesc}
          </p>
          <div className="p-8 md:p-12 border-2 border-primary/15 rounded-3xl bg-card shadow-xl max-w-sm mx-auto">
            <div className="text-6xl font-black text-primary mb-1">{i18n.landing.price}</div>
            <div className="text-muted-foreground mb-2">{i18n.landing.priceSub}</div>
            <ul className="text-sm text-left space-y-2 text-muted-foreground my-6 pl-2">
              {[
                "Full 7-step intake wizard",
                "Unlimited document uploads + AI OCR",
                "Unlimited AI chat sessions",
                "SC-100 PDF download",
                "Step-by-step filing checklist",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="w-full h-13 text-base font-bold">
              <Link href="/cases/new">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
