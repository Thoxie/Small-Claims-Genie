import { useState, useEffect } from "react";
import { ClerkProvider, SignUp, useAuth, useUser } from "@clerk/clerk-react";

const CLERK_KEY = import.meta.env.DEV
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_DEV
  : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const MAIN_APP_URL = "/";

function AlreadySignedInRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      window.location.href = MAIN_APP_URL;
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}

function HeroSection() {
  return (
    <div className="text-center mb-10">
      <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold px-4 py-2 rounded-full mb-6">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse inline-block" />
        24 of 25 beta spots remaining
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-[hsl(220,45%,15%)] leading-tight mb-4">
        Your Small Claims Case,<br />
        <span className="text-[hsl(45,90%,45%)]">Handled Simply.</span>
      </h1>
      <p className="text-lg text-[hsl(220,15%,32%)] max-w-xl mx-auto mb-2">
        Small Claims Genie guides you through every step — from organizing your story to filing your forms.
      </p>
      <p className="text-base font-semibold text-[hsl(220,45%,15%)]">
        First 25 beta users get <span className="underline decoration-amber-400 decoration-2">free access</span> — no credit card needed.
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
        <div key={f.title} className="flex items-start gap-3 bg-white border border-[hsl(220,13%,91%)] rounded-xl p-4 shadow-sm">
          <span className="text-2xl flex-shrink-0">{f.icon}</span>
          <div>
            <p className="font-semibold text-[hsl(220,45%,15%)] text-sm">{f.title}</p>
            <p className="text-xs text-[hsl(220,15%,42%)] mt-0.5">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignUpSection() {
  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-xs text-[hsl(220,15%,42%)] mb-4 text-center">
        Create your free beta account below. By signing up you agree to our{" "}
        <a
          href="#beta-agreement"
          className="underline text-[hsl(220,45%,15%)] hover:text-[hsl(45,90%,45%)] transition-colors"
        >
          Beta Tester Agreement
        </a>.
      </p>
      <div className="w-full max-w-sm [&_.cl-card]:shadow-none [&_.cl-card]:border [&_.cl-card]:border-[hsl(220,13%,91%)] [&_.cl-card]:rounded-2xl [&_.cl-footer]:hidden [&_.cl-internal-b3fm6y]:hidden">
        <SignUp
          routing="hash"
          signInUrl="/"
          forceRedirectUrl={MAIN_APP_URL}
          afterSignUpUrl={MAIN_APP_URL}
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
              headerTitle: "text-[hsl(220,45%,15%)] font-bold text-lg",
              headerSubtitle: "text-[hsl(220,15%,42%)] text-sm",
              formButtonPrimary:
                "bg-[hsl(220,45%,15%)] hover:bg-[hsl(220,45%,20%)] text-white font-semibold",
              footerActionLink: "text-[hsl(220,45%,15%)] font-semibold",
            },
          }}
        />
      </div>
    </div>
  );
}

function BetaAgreement() {
  return (
    <section id="beta-agreement" className="mt-14 max-w-2xl mx-auto bg-white border border-[hsl(220,13%,91%)] rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[hsl(220,45%,15%)] mb-3">Beta Tester Agreement</h2>
      <div className="text-sm text-[hsl(220,15%,32%)] space-y-3 leading-relaxed">
        <p>
          By creating a beta account you agree to the following terms:
        </p>
        <ol className="list-decimal list-inside space-y-2">
          <li><strong>Free access.</strong> Your account is free for the duration of the beta period. No charges will be made without your explicit consent.</li>
          <li><strong>Feedback.</strong> We may occasionally contact you to ask about your experience. Participation is optional but appreciated.</li>
          <li><strong>No attorney-client relationship.</strong> Small Claims Genie provides information and document preparation assistance only — not legal advice. For complex situations consult a licensed attorney.</li>
          <li><strong>Data.</strong> We store only the information you provide to help you build and manage your case. We do not sell your data. See our Privacy Policy for full details.</li>
          <li><strong>Beta limitations.</strong> Features may change, be added, or removed during the beta period. We'll do our best to keep you informed.</li>
          <li><strong>Termination.</strong> Either party may close the account at any time. Your data can be deleted upon request.</li>
        </ol>
        <p className="text-xs text-[hsl(220,15%,45%)] pt-2">Last updated May 2025</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-12 pb-8 text-center text-xs text-[hsl(220,15%,55%)]">
      <p>© {new Date().getFullYear()} Small Claims Genie · California Small Claims Court Assistance</p>
      <p className="mt-1">Not a law firm · Not legal advice · Information purposes only</p>
    </footer>
  );
}

function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setRedirecting(true);
      window.location.href = MAIN_APP_URL;
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5fdfb]">
        <div className="w-8 h-8 rounded-full border-4 border-[hsl(220,45%,15%)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5fdfb] flex flex-col">
      <div className="flex-1 flex flex-col items-center px-4 py-12 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-10 self-start">
          <span className="text-2xl">⚖️</span>
          <span className="font-extrabold text-xl text-[hsl(220,45%,15%)]">Small Claims Genie</span>
          <span className="ml-2 text-xs bg-amber-100 text-amber-800 border border-amber-200 font-semibold px-2 py-0.5 rounded-full">BETA</span>
        </div>

        <HeroSection />
        <FeatureList />
        <SignUpSection />
        <BetaAgreement />
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  if (!CLERK_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5fdfb]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-sm text-center">
          <p className="text-red-700 font-semibold">Configuration error</p>
          <p className="text-red-500 text-sm mt-1">Clerk publishable key is not set.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <AlreadySignedInRedirect />
      <LandingPage />
    </ClerkProvider>
  );
}
