import { i18n } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, FileText, Scale, BookOpen, ClipboardList, Mic, Wand2 } from "lucide-react";
import logoPath from "@assets/2small-claims-genie-logo.png_1775057452576.png";

const TEAL = "#ddf6f3";

export default function Landing() {
  return (
    <div className="flex flex-col w-full bg-white">

      {/* ── Hero ── */}
      <section style={{ backgroundColor: TEAL }} className="px-4 pt-8 pb-8 md:pt-10 md:pb-10">
        <div className="max-w-3xl mx-auto">

          {/* Headline — left-aligned, single bold block, 25% smaller than reference */}
          <h1 className="text-3xl sm:text-4xl font-black leading-snug mb-5 text-primary tracking-tight">
            Win in Small Claims Court.<br />
            Don't lose because you're unprepared.<br />
            Get your money back!
          </h1>

          <p className="text-base md:text-lg text-primary/65 mb-7 max-w-xl leading-relaxed">
            Small Claims Genie walks you through every step — intake, evidence, AI chat, and your SC-100 form, ready to file. No lawyer needed.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button asChild size="lg" className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-md shadow-amber-200">
              <Link href="/cases/new">
                <Wand2 className="mr-2 h-4 w-4" />
                Start Your Case Free
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base rounded-full font-semibold border-primary/20 text-primary hover:bg-white/60 bg-white/40">
              <Link href="/dashboard">Resume Your Case</Link>
            </Button>
          </div>

          <p className="text-xs text-primary/45 tracking-wide">
            No account required · Free to start · $49 to download your final forms
          </p>
        </div>
      </section>

      {/* ── Three Feature Boxes ── */}
      <section className="px-4 pt-8 pb-12 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: ClipboardList,
                title: "Court-Ready Intake Forms",
                desc: "Guided 7-step intake collects every field required for your SC-100 — legally complete, nothing missed.",
              },
              {
                icon: FileText,
                title: "Evidence That Speaks for You",
                desc: "Upload receipts, contracts, texts, and photos. Our AI reads every document and builds your case argument.",
              },
              {
                icon: BookOpen,
                title: "Filing Guidance & Checklists",
                desc: "Step-by-step filing instructions, courthouse details, and a readiness checklist for your specific county.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-amber-200 transition-all group">
                <div style={{ backgroundColor: TEAL }} className="h-12 w-12 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary/70" />
                </div>
                <h3 className="text-base font-bold mb-2 text-primary">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{ backgroundColor: TEAL }} className="px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">How It Works</h2>
            <p className="text-primary/60 text-base max-w-xl mx-auto">Three steps from dispute to ready-to-file.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: "01", icon: ClipboardList, label: "7-Step Intake Wizard", title: i18n.landing.step1Title, desc: i18n.landing.step1Desc },
              { num: "02", icon: FileText, label: "AI Evidence Reader", title: i18n.landing.step2Title, desc: i18n.landing.step2Desc },
              { num: "03", icon: Scale, label: "SC-100 Download", title: i18n.landing.step3Title, desc: i18n.landing.step3Desc },
            ].map(({ num, icon: Icon, title, desc, label }) => (
              <div key={num} className="bg-white/70 rounded-2xl p-6 border border-white/80 shadow-sm">
                <div className="text-5xl font-black text-amber-400/40 mb-3 leading-none">{num}</div>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5 text-primary/60" />
                  <span className="text-xs font-semibold text-primary/40 uppercase tracking-wider">{label}</span>
                </div>
                <h3 className="text-base font-bold mb-2 text-primary">{title}</h3>
                <p className="text-sm text-primary/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Chat Callout ── */}
      <section className="px-4 py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-5">
            <Mic className="h-3.5 w-3.5" /> Voice + Text AI Chat
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Your Genie Knows Your Case.</h2>
          <p className="text-base text-primary-foreground/75 mb-7 max-w-xl mx-auto leading-relaxed">
            Unlike generic AI tools, your Genie has read your documents, knows your case facts, and gives advice specific to your situation — by voice or text.
          </p>
          <Button asChild size="lg" className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg">
            <Link href="/cases/new"><Wand2 className="mr-2 h-4 w-4" />Start Your Case Free</Link>
          </Button>
        </div>
      </section>

      {/* ── Counties ── */}
      <section className="px-4 py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-xl font-bold mb-2 text-primary">All 58 California Counties</h2>
          <p className="text-muted-foreground mb-5 text-sm max-w-xl mx-auto">
            Courthouse addresses, filing fees, and phone numbers for every county.
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-full border-primary/20 text-primary hover:bg-primary/5">
            <Link href="/counties">Find My County Courthouse <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-primary">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-base">
            Prepare your entire case for free. Pay only when you're ready to download your final court forms.
          </p>
          <div className="p-8 border-2 border-amber-200 rounded-3xl bg-white shadow-xl max-w-sm mx-auto">
            <img src={logoPath} alt="Small Claims Genie" className="h-12 w-auto mx-auto mb-5" />
            <div className="text-5xl font-black text-primary mb-1">$49</div>
            <div className="text-muted-foreground text-sm mb-1">per case · one-time</div>
            <ul className="text-sm text-left space-y-2.5 text-muted-foreground my-6 pl-1">
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
            <Button asChild size="lg" className="w-full text-base font-bold bg-amber-500 text-white hover:bg-amber-600 rounded-full h-12">
              <Link href="/cases/new"><Wand2 className="mr-2 h-4 w-4" />Start Your Case Free</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
