import { useState } from "react";
import { i18n } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileText, Scale, BookOpen, ClipboardList, Wand2 } from "lucide-react";
import { GenieModal } from "@/components/genie-modal";

const TEAL = "#f5fdfb";

export default function Landing() {
  const [genieOpen, setGenieOpen] = useState(false);

  return (
    <div className="flex flex-col w-full bg-[#f5fdfb]">

      {genieOpen && <GenieModal onClose={() => setGenieOpen(false)} />}

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
            <Button asChild size="lg" className="lg:hidden h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg w-full sm:w-auto">
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
              { num: "03", icon: Scale, label: "SC-100 Download", title: i18n.landing.step3Title, desc: i18n.landing.step3Desc },
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
            onClick={() => setGenieOpen(true)}
            className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
          >
            <Wand2 className="mr-2 h-5 w-5" />
            Try Ask the Genie — Free
          </Button>
          <p className="text-xs text-primary-foreground/40 mt-3">No sign-up. No credit card. Just answers.</p>
        </div>
      </section>

    </div>
  );
}
