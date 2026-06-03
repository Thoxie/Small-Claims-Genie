import { useState, useEffect, useCallback } from "react";
import { ClerkProvider, SignUp, useAuth, useUser } from "@clerk/clerk-react";

const CLERK_KEY = import.meta.env.DEV
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_DEV
  : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const MAIN_APP_URL = "/";
const BETA_TOTAL = 10;

function useSlotCount() {
  const [slots, setSlots] = useState<{ claimed: number; total: number; available: number } | null>(null);

  useEffect(() => {
    fetch("/api/beta/slots")
      .then(r => r.json())
      .then(setSlots)
      .catch(() => setSlots({ claimed: 0, total: BETA_TOTAL, available: BETA_TOTAL }));
  }, []);

  return slots;
}

function HeroSection({ slots }: { slots: { claimed: number; total: number; available: number } | null }) {
  const available = slots?.available ?? BETA_TOTAL;
  const isFull = available === 0;

  return (
    <div className="text-center mb-10">
      <div className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full mb-6 border ${
        isFull
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}>
        <span className={`w-2 h-2 rounded-full inline-block ${isFull ? "bg-red-500" : "bg-amber-500 animate-pulse"}`} />
        {slots === null
          ? "Loading beta spots…"
          : isFull
          ? "All beta spots have been claimed"
          : `${available} of ${BETA_TOTAL} free beta spots remaining`}
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-[hsl(220,45%,15%)] leading-tight mb-4">
        Your Small Claims Case,<br />
        <span className="text-[hsl(45,90%,45%)]">Handled Simply.</span>
      </h1>
      <p className="text-lg text-[hsl(220,15%,32%)] max-w-xl mx-auto mb-2">
        Small Claims Genie guides you through every step — from organizing your story to filing your forms.
      </p>
      <p className="text-base font-semibold text-[hsl(220,45%,15%)]">
        Beta testers get <span className="underline decoration-amber-400 decoration-2">free full access</span> — no credit card, ever.
      </p>
    </div>
  );
}

const TEAL_CHECK = (
  <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[#0d6b5e] text-[#0d6b5e] inline-flex items-center justify-center text-[11px] font-black mt-[2px]">
    ✓
  </span>
);

const INDIGO_CHECK = (
  <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[#6366f1] text-[#6366f1] inline-flex items-center justify-center text-[11px] font-black mt-[2px]">
    ✓
  </span>
);

function WhatYouGet() {
  const personalFeatures = [
    "AI Case Advisor that helps organize your facts, spot weak points, and strengthen your claim before filing.",
    "Step-by-step guided intake that turns your story into a cleaner, more organized case package.",
    "Downloadable California small claims court forms, including SC-100 and SC-105 when applicable.",
    "Evidence organizer for receipts, screenshots, messages, photos, contracts, and records.",
    "Demand letter generator with a downloadable PDF you can send before filing.",
    "Case Readiness Score that shows what is complete, what is missing, and what to fix before court.",
    "Opening statement builder that helps you prepare a short, clear explanation for the judge.",
    "Mock hearing practice where AI plays the judge and asks questions so you can practice your answers.",
  ];

  const businessFeatures = [
    "AI Business Case Advisor that helps organize your facts, damages, records, and claim strategy.",
    "Guided business case intake that turns invoices, contracts, payments, dates, and communications into a cleaner case package.",
    "Downloadable court ready small claims court forms to submit and serve the defendant.",
    "Evidence organizer for invoices, estimates, contracts, warranties, payment records, messages, and business documents.",
    "Demand letter generator with a downloadable PDF you can send before filing.",
    "Case Readiness Score that shows what is complete, what is missing, and what to fix before court.",
    "Opening statement builder that helps you explain the dispute, damages, and proof clearly.",
    "Mock hearing practice focused on records, damages, credibility, and likely judge questions.",
  ];

  const paralegalFeatures: { text: string; bold?: boolean }[] = [
    { text: "Paralegal case review — a trained paralegal reviews your claim summary, uploaded documents, damages, and filing packet before you submit." },
    { text: "Document, evidence, and exhibit review — identifies missing information, organizes receipts, contracts, photos, messages, invoices, and estimates, and ensures your written explanation and selected evidence are clear for the court." },
    { text: "30-minute paralegal support session — talk by phone or Zoom to walk through your case, documents, filing steps, evidence, and hearing preparation.", bold: true },
    { text: "Court-form review support — helps confirm that names, addresses, claim amount, parties, dates, and case details appear complete and consistent." },
    { text: "Paralegal support at your hearing by Zoom to provide non-attorney procedural and organizational support.", bold: true },
    { text: "Filing and service guidance — helps you understand the basic filing sequence, court-stamped copies, service of the defendant, and proof of service requirements." },
  ];

  return (
    <div className="mt-16 mb-12">
      <div className="text-center mb-8">
        <span className="inline-block bg-amber-100 border border-amber-300 text-amber-800 text-xs font-black px-4 py-1.5 rounded-full mb-4 tracking-wide uppercase">
          Beta exclusive — everything included free
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[hsl(220,45%,15%)] mb-2">
          What you get as a beta tester
        </h2>
        <p className="text-[hsl(220,15%,42%)] text-sm">
          Normally valued at{" "}
          <span className="font-bold text-[hsl(220,45%,15%)]">$79–$268+</span>{" "}
          — yours free for the entire beta period.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Personal Case */}
        <div className="bg-white rounded-[20px] border-[3px] border-[#14b8a6] shadow-[0_8px_24px_rgba(13,107,94,0.08)] p-5 flex flex-col">
          <div className="mb-3">
            <p className="text-lg font-black text-[#0d6b5e] mb-1">Personal Case</p>
            <p className="text-xs text-[#5a6478] leading-[1.4]">For person-versus-person disputes — neighbors, roommates, acquaintances, friends.</p>
          </div>
          <div className="bg-[#f0faf8] border border-[#14b8a6]/40 rounded-xl px-3 py-2 mb-4">
            <span className="text-xs font-bold text-[#0d6b5e]">$79–$99 normally · Free for beta</span>
          </div>
          <ul className="flex-1 grid gap-[8px]">
            {personalFeatures.map((f) => (
              <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[13px] leading-[1.35]">
                {TEAL_CHECK}
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Business Case */}
        <div className="bg-white rounded-[20px] border-[3px] border-[#14b8a6] shadow-[0_8px_24px_rgba(13,107,94,0.08)] p-5 flex flex-col">
          <div className="mb-3">
            <p className="text-lg font-black text-[#0d6b5e] mb-1">Business Case</p>
            <p className="text-xs text-[#5a6478] leading-[1.4]">For any case involving a business — invoices, contracts, commercial disputes.</p>
          </div>
          <div className="bg-[#f0faf8] border border-[#14b8a6]/40 rounded-xl px-3 py-2 mb-4">
            <span className="text-xs font-bold text-[#0d6b5e]">$99–$109 normally · Free for beta</span>
          </div>
          <ul className="flex-1 grid gap-[8px]">
            {businessFeatures.map((f) => (
              <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[13px] leading-[1.35]">
                {TEAL_CHECK}
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Genie Plus: Paralegal Review */}
        <div className="bg-white rounded-[20px] border-[3px] border-[#6366f1] shadow-[0_8px_24px_rgba(99,102,241,0.10)] p-5 flex flex-col relative">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#6366f1] text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap tracking-wide shadow">
            ADD-ON PARALEGAL SUPPORT
          </div>
          <div className="mb-3 pt-1">
            <p className="text-lg font-black text-[#0d6b5e] mb-1">Genie Plus: Paralegal Review</p>
            <p className="text-xs text-[#5a6478] leading-[1.4]">AI tools plus personalized document review and hearing support from a trained paralegal.</p>
          </div>
          <div className="bg-[#f5f3ff] border border-[#c7d2fe] rounded-xl px-3 py-2 mb-4">
            <span className="text-xs font-bold text-[#4338ca]">$159 normally · Free for beta</span>
          </div>
          <ul className="flex-1 grid gap-[8px]">
            {paralegalFeatures.map(({ text, bold }) => (
              <li key={text} className="flex gap-[8px] items-start text-[#20304f] text-[13px] leading-[1.35]">
                {INDIGO_CHECK}
                <span className={bold ? "font-bold" : ""}>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SignUpSection({ isFull }: { isFull: boolean }) {
  if (isFull) {
    return (
      <div className="w-full max-w-sm text-center p-8 bg-white border border-[hsl(220,13%,91%)] rounded-2xl shadow-sm">
        <p className="text-2xl mb-3">😔</p>
        <p className="font-bold text-[hsl(220,45%,15%)] mb-2">Beta is full</p>
        <p className="text-sm text-[hsl(220,15%,42%)]">
          All 10 beta spots have been claimed. Sign up below to be notified when we open the next round.
        </p>
      </div>
    );
  }

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
        <p>By creating a beta account you agree to the following terms:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li><strong>Free access.</strong> Your account is free for the duration of the beta period. No charges will be made without your explicit consent.</li>
          <li><strong>Feedback.</strong> We may occasionally contact you to ask about your experience. Participation is optional but appreciated.</li>
          <li><strong>No attorney-client relationship.</strong> Small Claims Genie provides information and document preparation assistance only — not legal advice. For complex situations consult a licensed attorney.</li>
          <li><strong>Data.</strong> We store only the information you provide to help you build and manage your case. We do not sell your data. See our Privacy Policy for full details.</li>
          <li><strong>Beta limitations.</strong> Features may change, be added, or removed during the beta period. We'll do our best to keep you informed.</li>
          <li><strong>Termination.</strong> Either party may close the account at any time. Your data can be deleted upon request.</li>
        </ol>
        <p className="text-xs text-[hsl(220,15%,45%)] pt-2">Last updated May 2026</p>
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
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const [redirecting, setRedirecting] = useState(false);
  const slots = useSlotCount();

  const claimAndRedirect = useCallback(async () => {
    setRedirecting(true);
    try {
      const token = await getToken();
      await fetch("/api/beta/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: user?.primaryEmailAddress?.emailAddress ?? null }),
      });
    } catch {
      // Silent — we still redirect even if claim fails
    }
    window.location.href = MAIN_APP_URL;
  }, [getToken, user]);

  useEffect(() => {
    if (isLoaded && isSignedIn && !redirecting) {
      claimAndRedirect();
    }
  }, [isLoaded, isSignedIn, redirecting, claimAndRedirect]);

  if (!isLoaded || redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f5fdfb]">
        <div className="w-8 h-8 rounded-full border-4 border-[hsl(220,45%,15%)] border-t-transparent animate-spin" />
        {redirecting && (
          <p className="text-sm text-[hsl(220,15%,42%)] font-medium">Activating your free trial…</p>
        )}
      </div>
    );
  }

  const isFull = slots !== null && slots.available === 0;

  return (
    <div className="min-h-screen bg-[#f5fdfb] flex flex-col">
      {/* Logo + hero + sign-up form — narrow container */}
      <div className="flex flex-col items-center px-4 pt-12 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-10 self-start">
          <span className="text-2xl">⚖️</span>
          <span className="font-extrabold text-xl text-[hsl(220,45%,15%)]">Small Claims Genie</span>
          <span className="ml-2 text-xs bg-amber-100 text-amber-800 border border-amber-200 font-semibold px-2 py-0.5 rounded-full">BETA</span>
        </div>
        <HeroSection slots={slots} />
        <SignUpSection isFull={isFull} />
      </div>

      {/* Full feature breakdown — wider container */}
      <div className="w-full px-4 max-w-5xl mx-auto">
        <WhatYouGet />
      </div>

      {/* Beta agreement + footer — narrow */}
      <div className="flex flex-col items-center px-4 pb-4 max-w-2xl mx-auto w-full">
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
      <LandingPage />
    </ClerkProvider>
  );
}
