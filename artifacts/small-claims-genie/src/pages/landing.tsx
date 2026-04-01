import { i18n } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, MessageSquare, FileText, Scale } from "lucide-react";

export default function Landing() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="px-4 py-24 md:py-32 bg-primary text-primary-foreground text-center flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-extrabold max-w-3xl leading-tight mb-6 text-white">
          {i18n.landing.heroTitle}
        </h1>
        <p className="text-lg md:text-xl max-w-2xl text-primary-foreground/80 mb-10">
          {i18n.landing.heroSubtitle}
        </p>
        <Button asChild size="lg" className="h-14 px-8 text-lg bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-bold">
          <Link href="/dashboard">
            {i18n.landing.startCaseBtn} <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </section>

      {/* Features Section */}
      <section className="px-4 py-24 bg-background">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">
            {i18n.landing.featuresTitle}
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-muted/50">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{i18n.landing.feature1Title}</h3>
              <p className="text-muted-foreground">{i18n.landing.feature1Desc}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-muted/50">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{i18n.landing.feature2Title}</h3>
              <p className="text-muted-foreground">{i18n.landing.feature2Desc}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-muted/50">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{i18n.landing.feature3Title}</h3>
              <p className="text-muted-foreground">{i18n.landing.feature3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="px-4 py-24 bg-muted">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-16 text-foreground">
            {i18n.landing.howItWorksTitle}
          </h2>
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row items-center gap-8 text-left">
              <div className="w-full md:w-1/2">
                <div className="text-6xl font-black text-primary/20 mb-4">01</div>
                <h3 className="text-2xl font-bold mb-4">{i18n.landing.step1Title}</h3>
                <p className="text-lg text-muted-foreground">{i18n.landing.step1Desc}</p>
              </div>
              <div className="w-full md:w-1/2 h-64 bg-background rounded-xl border shadow-sm flex items-center justify-center">
                <FileText className="h-16 w-16 text-muted-foreground/50" />
              </div>
            </div>
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 text-left">
              <div className="w-full md:w-1/2">
                <div className="text-6xl font-black text-primary/20 mb-4">02</div>
                <h3 className="text-2xl font-bold mb-4">{i18n.landing.step2Title}</h3>
                <p className="text-lg text-muted-foreground">{i18n.landing.step2Desc}</p>
              </div>
              <div className="w-full md:w-1/2 h-64 bg-background rounded-xl border shadow-sm flex items-center justify-center">
                <FileText className="h-16 w-16 text-muted-foreground/50" />
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8 text-left">
              <div className="w-full md:w-1/2">
                <div className="text-6xl font-black text-primary/20 mb-4">03</div>
                <h3 className="text-2xl font-bold mb-4">{i18n.landing.step3Title}</h3>
                <p className="text-lg text-muted-foreground">{i18n.landing.step3Desc}</p>
              </div>
              <div className="w-full md:w-1/2 h-64 bg-background rounded-xl border shadow-sm flex items-center justify-center">
                <FileText className="h-16 w-16 text-muted-foreground/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 py-24 bg-background">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
            {i18n.landing.pricingTitle}
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto">
            {i18n.landing.pricingDesc}
          </p>
          <div className="p-8 md:p-12 border-2 border-primary/10 rounded-3xl bg-card shadow-xl max-w-md mx-auto">
            <div className="text-5xl font-black text-primary mb-2">{i18n.landing.price}</div>
            <div className="text-muted-foreground mb-8">{i18n.landing.priceSub}</div>
            <Button asChild size="lg" className="w-full h-14 text-lg">
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
