import { i18n } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, FileText, Scale, BookOpen, ClipboardList, Mic, Wand2, ShieldCheck, Clock, Star } from "lucide-react";
import logoPath from "@assets/2small-claims-genie-logo.png_1775057452576.png";

export default function Landing() {
  return (
    <div className="flex flex-col w-full bg-white">

      {/* ── Hero ── */}
      <section className="relative px-4 pt-16 pb-20 md:pt-24 md:pb-28 bg-white overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(217,185,78,0.12),transparent)] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.03] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-accent/15 text-accent-foreground border border-accent/30 px-4 py-1.5 rounded-full text-sm font-semibold mb-8">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="text-primary/80">Built for California Small Claims Court</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] mb-6 text-primary tracking-tight">
            Win in Small Claims<br className="hidden sm:block" /> Court.
          </h1>

          <p className="text-2xl md:text-3xl font-bold text-accent mb-6 tracking-tight">
            Don't lose because you're unprepared.
          </p>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Small Claims Genie guides you through every step — from organizing your case and uploading evidence to generating your SC-100 form, ready to file. No lawyer required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button asChild size="lg" className="h-14 px-10 text-lg bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-bold shadow-lg shadow-accent/20">
              <Link href="/cases/new">
                <Wand2 className="mr-2 h-5 w-5" />
                {i18n.landing.startCaseBtn}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-10 text-lg rounded-full font-semibold border-primary/20 text-primary hover:bg-primary/5">
              <Link href="/dashboard">
                {i18n.landing.resumeCaseBtn}
              </Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground/70 tracking-wide">
            No account required · Free to start · $49 to download your final forms
          </p>

          {/* Social proof row */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-accent text-accent" />)}
              </div>
              <span>Trusted by Southern California filers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>All 58 California Counties</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary/50" />
              <span>Ready in under an hour</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-gray-100" />

      {/* ── What We Do ── */}
      <section className="px-4 py-20 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3">
              {i18n.landing.whatWeDoTitle}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Built specifically for California small claims court — not generic legal software.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: ClipboardList, title: i18n.landing.feature1Title, desc: i18n.landing.feature1Desc },
              { icon: FileText, title: i18n.landing.feature2Title, desc: i18n.landing.feature2Desc },
              { icon: BookOpen, title: i18n.landing.feature3Title, desc: i18n.landing.feature3Desc },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col p-7 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-accent/30 transition-all">
                <div className="h-14 w-14 bg-primary/8 rounded-xl flex items-center justify-center mb-5 border border-primary/10">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-primary">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="px-4 py-24 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3">
              {i18n.landing.howItWorksTitle}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              Three simple steps from dispute to ready-to-file.
            </p>
          </div>

          <div className="space-y-14">
            {[
              { num: "01", icon: ClipboardList, label: "7-Step Intake Wizard", title: i18n.landing.step1Title, desc: i18n.landing.step1Desc },
              { num: "02", icon: FileText, label: "AI Evidence Reader", title: i18n.landing.step2Title, desc: i18n.landing.step2Desc },
              { num: "03", icon: Scale, label: "SC-100 Download", title: i18n.landing.step3Title, desc: i18n.landing.step3Desc },
            ].map(({ num, icon: Icon, label, title, desc }, i) => (
              <div key={num} className={`flex flex-col md:flex-row${i % 2 === 1 ? "-reverse" : ""} items-center gap-10`}>
                <div className="w-full md:w-1/2">
                  <div className="text-7xl font-black text-accent/25 mb-3 leading-none">{num}</div>
                  <h3 className="text-2xl font-bold mb-3 text-primary">{title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">{desc}</p>
                </div>
                <div className="w-full md:w-1/2 h-52 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-primary/25">
                    <Icon className="h-14 w-14" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Chat Callout ── */}
      <section className="px-4 py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Mic className="h-4 w-4" /> Voice + Text AI Chat
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-5">Your Genie Knows Your Case.</h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto leading-relaxed">
            Unlike generic AI tools, your Genie has read your documents, knows your case facts, and gives advice specific to your situation. Ask anything — by voice or text.
          </p>
          <Button asChild size="lg" className="h-14 px-10 text-lg bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-bold shadow-lg">
            <Link href="/cases/new"><Wand2 className="mr-2 h-5 w-5" />Start Your Case Free</Link>
          </Button>
        </div>
      </section>

      {/* ── Counties Quick-Link ── */}
      <section className="px-4 py-16 bg-white border-y border-gray-100">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold mb-3 text-primary">All 58 California Counties</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Courthouse addresses, filing fees, and phone numbers for every county in California.
          </p>
          <Button asChild variant="outline" size="lg" className="rounded-full border-primary/20 text-primary hover:bg-primary/5">
            <Link href="/counties">Find My County Courthouse <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-4 py-24 bg-gray-50">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
            {i18n.landing.pricingTitle}
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto">
            {i18n.landing.pricingDesc}
          </p>
          <div className="p-8 md:p-12 border-2 border-accent/30 rounded-3xl bg-white shadow-xl max-w-sm mx-auto">
            <div className="flex items-center justify-center mb-4">
              <img src={logoPath} alt="Small Claims Genie" className="h-14 w-auto" />
            </div>
            <div className="text-6xl font-black text-primary mb-1">{i18n.landing.price}</div>
            <div className="text-muted-foreground mb-2">{i18n.landing.priceSub}</div>
            <ul className="text-sm text-left space-y-2.5 text-muted-foreground my-6 pl-2">
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
            <Button asChild size="lg" className="w-full h-13 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90 rounded-full">
              <Link href="/cases/new"><Wand2 className="mr-2 h-4 w-4" />Start Your Case Free</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
