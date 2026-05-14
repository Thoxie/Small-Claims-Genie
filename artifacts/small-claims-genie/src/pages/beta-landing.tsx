import { useEffect, useState } from "react";
import { SignUp, useAuth } from "@clerk/clerk-react";
import { Redirect } from "wouter";

function HeroSection() {
  return (
    <div className="text-center mb-10">
      <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold px-4 py-2 rounded-full mb-6">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse inline-block" />
        24 of 25 beta spots remaining
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-4">
        Your Small Claims Case,<br />
        <span className="text-[hsl(45,90%,42%)]">Handled Simply.</span>
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-2">
        Small Claims Genie guides you through every step — from organizing your story to filing your forms.
      </p>
      <p className="text-base font-semibold text-foreground">
        First 25 beta users get{" "}
        <span className="underline decoration-[hsl(45,90%,42%)] decoration-2">free access</span> — no credit card needed.
      </p>
    </div>
  );
}

function FeatureList() {
  const features = [
    { icon: "⚖️", title: "Step-by-step intake", desc: "We ask the right questions and build your case automatically." },
    { icon: "📄", title: "Court-ready forms", desc: "SC-100 and MC-030 pre-filled from your answers, ready to print." },
    { icon: "✉️", title: "Demand letter generator", desc: "Professional demand letters written by AI, reviewed by you." },
    { icon: "🤖", title: "AI case advisor", desc: "Ask anything about your case — get plain-language answers." },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
      {features.map((f) => (
        <div
          key={f.title}
          className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 shadow-sm"
        >
          <span className="text-2xl flex-shrink-0">{f.icon}</span>
          <div>
            <p className="font-semibold text-foreground text-sm">{f.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: "1", title: "Create your free account", desc: "Sign up below — takes 30 seconds." },
    { num: "2", title: "Answer a few questions", desc: "Tell us what happened, who you're suing, and how much." },
    { num: "3", title: "Get your forms & letter", desc: "We generate your SC-100 court form and demand letter instantly." },
    { num: "4", title: "File with confidence", desc: "Download, print, and bring your completed forms to the courthouse." },
  ];

  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-foreground text-center mb-5">How it works</h2>
      <div className="flex flex-col gap-3">
        {steps.map((s) => (
          <div key={s.num} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
              {s.num}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignUpSection() {
  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-xs text-muted-foreground mb-4 text-center">
        Create your free beta account below. By signing up you agree to our{" "}
        <a
          href="#beta-agreement"
          className="underline text-foreground hover:text-accent-foreground transition-colors"
        >
          Beta Tester Agreement
        </a>
        .
      </p>
      <div className="w-full max-w-sm [&_.cl-card]:shadow-none [&_.cl-card]:border [&_.cl-card]:border-border [&_.cl-card]:rounded-2xl [&_.cl-footer]:hidden">
        <SignUp
          routing="hash"
          signInUrl="/sign-in"
          forceRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: "hsl(220, 45%, 15%)",
              colorTextOnPrimaryBackground: "#ffffff",
              borderRadius: "0.75rem",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            },
            elements: {
              rootBox: "w-full",
              card: "w-full p-5",
              headerTitle: "text-foreground font-bold text-lg",
              headerSubtitle: "text-muted-foreground text-sm",
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold",
              footerActionLink: "text-primary font-semibold",
            },
          }}
        />
      </div>
    </div>
  );
}

function BetaAgreement() {
  return (
    <section
      id="beta-agreement"
      className="mt-14 max-w-2xl mx-auto bg-card border border-border rounded-2xl p-6 shadow-sm"
    >
      <h2 className="text-lg font-bold text-foreground mb-3">Beta Tester Agreement</h2>
      <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
        <p>By creating a beta account you agree to the following terms:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            <strong>Free access.</strong> Your account is free for the duration of the beta period. No charges will be made without your explicit consent.
          </li>
          <li>
            <strong>Feedback.</strong> We may occasionally contact you to ask about your experience. Participation is optional but appreciated.
          </li>
          <li>
            <strong>No attorney-client relationship.</strong> Small Claims Genie provides information and document preparation assistance only — not legal advice. For complex situations consult a licensed attorney.
          </li>
          <li>
            <strong>Data.</strong> We store only the information you provide to help you build and manage your case. We do not sell your data.
          </li>
          <li>
            <strong>Beta limitations.</strong> Features may change, be added, or removed during the beta period. We'll do our best to keep you informed.
          </li>
          <li>
            <strong>Termination.</strong> Either party may close the account at any time. Your data can be deleted upon request.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground/70 pt-2">Last updated May 2025</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-12 pb-8 text-center text-xs text-muted-foreground">
      <p>© {new Date().getFullYear()} Small Claims Genie · California Small Claims Court Assistance</p>
      <p className="mt-1">Not a law firm · Not legal advice · Information purposes only</p>
    </footer>
  );
}

export default function BetaLanding() {
  const { isSignedIn, isLoaded } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoaded) setReady(true);
  }, [isLoaded]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5fdfb]">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isSignedIn) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-[#f5fdfb] flex flex-col">
      <div className="flex-1 flex flex-col items-center px-4 py-12 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-10 self-start">
          <span className="text-2xl">⚖️</span>
          <span className="font-extrabold text-xl text-foreground">Small Claims Genie</span>
          <span className="ml-2 text-xs bg-amber-100 text-amber-800 border border-amber-200 font-semibold px-2 py-0.5 rounded-full">
            BETA
          </span>
        </div>

        <HeroSection />
        <FeatureList />
        <HowItWorksSection />
        <SignUpSection />
        <BetaAgreement />
        <Footer />
      </div>
    </div>
  );
}
