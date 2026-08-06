import { Helmet } from 'react-helmet-async';
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, useSignUp } from "@clerk/clerk-react";
import { Link } from "wouter";
import { Loader2, Eye, EyeOff, CheckCircle, ArrowRight, Sparkles, LogIn, ChevronDown } from "lucide-react";
import { SignUpModal } from "@/components/sign-up-modal";

const PRIMARY = "#0d6b5e";
const TEAL_BG = "#f5fdfb";
const _TEAL_LIGHT = "#ddf6f3";

const TC = (
  <span className="flex-shrink-0 w-[14px] h-[14px] rounded-full border-[1.5px] border-[#0d6b5e] text-[#0d6b5e] inline-flex items-center justify-center text-[9px] font-black mt-[1px]">
    ✓
  </span>
);

const IC = (
  <span className="flex-shrink-0 w-[14px] h-[14px] rounded-full border-[1.5px] border-[#6366f1] text-[#6366f1] inline-flex items-center justify-center text-[9px] font-black mt-[1px]">
    ✓
  </span>
);

const COMBINED_FEATURES = [
  "AI Case Advisor that helps organize your facts, spot weak points, and strengthen your claim before filing.",
  "Step-by-step guided intake that turns your story into a cleaner, more organized case package.",
  "Pre-filled with your evidence all necessary court forms — smallclaimsgenie.com/free-trial",
  "Evidence organizer for receipts, screenshots, messages, photos, contracts, and records.",
  "Demand letter generator with a downloadable PDF you can send before filing.",
  "Case Readiness Score that shows what is complete, what is missing, and what to fix before court.",
  "Opening statement builder that helps you prepare a short, clear explanation for the judge.",
  "Mock hearing practice where AI plays the judge and asks questions so you can practice your answers.",
];

const PARALEGAL_FEATURES: { text: string; bold?: boolean }[] = [
  { text: "Paralegal case review — a trained paralegal reviews your claim summary, uploaded documents, damages, and filing packet before you submit." },
  { text: "Document, evidence, and exhibit review — identifies missing information, organizes receipts, contracts, photos, messages, invoices, and estimates, and ensures your written explanation and selected evidence are clear for the court." },
  { text: "30-minute paralegal support session — talk by phone or Zoom to walk through your case, documents, filing steps, evidence, and hearing preparation.", bold: true },
  { text: "Court-form review support — helps confirm that names, addresses, claim amount, parties, dates, and case details appear complete and consistent." },
  { text: "Paralegal support at your hearing by Zoom to provide non-attorney procedural and organizational support.", bold: true },
  { text: "Filing and service guidance — helps you understand the basic filing sequence, court-stamped copies, service of the defendant, and proof of service requirements." },
];

// ── Sign-up form ───────────────────────────────────────────────────────────────
function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const { signUp, setActive } = useSignUp();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = acceptedTerms && email.trim().length > 3 && password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !signUp) return;
    setLoading(true);
    setError("");
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Sign-up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp || !setActive || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        onSuccess();
      } else if (result.status === "missing_requirements") {
        // Log so we can diagnose what the production Clerk tenant requires
        const missing: string[] = (result as any).missingFields ?? [];
        const unverified: string[] = (result as any).unverifiedFields ?? [];
        console.error("[sign-up] missing_requirements after verification", { missing, unverified });

        // Auto-satisfy name requirements using the email prefix as a fallback
        const needsName = missing.includes("first_name") || missing.includes("last_name");
        if (needsName || (missing.length === 0 && unverified.length === 0)) {
          try {
            const namePart = email.split("@")[0].replace(/[._+-]/g, " ").trim() || "User";
            const updatePayload: Record<string, string> = {};
            if (missing.includes("first_name") || missing.length === 0) updatePayload.firstName = namePart;
            if (missing.includes("last_name") || missing.length === 0) updatePayload.lastName = ".";
            const updated = await signUp.update(updatePayload);
            if (updated.status === "complete") {
              await setActive({ session: updated.createdSessionId });
              onSuccess();
              return;
            }
          } catch {}
        }

        setError(
          missing.length > 0
            ? `Sign-up incomplete — missing: ${missing.join(", ")}. Please contact support@smallclaimsgenie.com.`
            : "Verification incomplete. Please try again or contact support@smallclaimsgenie.com."
        );
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const errCode: string = err?.errors?.[0]?.code ?? "";
      const errMsg: string = (err?.errors?.[0]?.message ?? err?.message ?? "").toLowerCase();
      const alreadyVerified = errCode === "verification_already_verified" || errMsg.includes("already been verified");

      if (alreadyVerified) {
        try {
          if (signUp.status === "complete" && signUp.createdSessionId) {
            await setActive({ session: signUp.createdSessionId });
            onSuccess();
            return;
          }
        } catch {}
        setError("Your email is already verified. Please use the sign-in link below.");
        return;
      }

      setError(
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Incorrect code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Verify step ───────────────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 border border-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Check your email</h2>
          <p className="mt-1 text-sm text-gray-500">
            We sent a 6-digit code to <strong className="text-gray-700">{email}</strong>
          </p>
        </div>
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-2xl font-bold tracking-widest text-gray-900 placeholder-gray-300 focus:border-[#0d6b5e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/20"
            />
          </div>
          {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={code.length < 6 || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: PRIMARY }}
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <><CheckCircle className="h-4 w-4" /> Confirm &amp; Continue</>}
          </button>
          <button
            type="button"
            onClick={() => { setStep("form"); setError(""); setCode(""); }}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Use a different email
          </button>
        </form>
      </div>
    );
  }

  // ── Sign-up form ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-black tracking-wide text-amber-700 uppercase">
          Free Offer – Start Now
        </div>
        <h2 className="text-2xl font-black text-gray-900 leading-tight">Build your case now.</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          You'll have full access to all tools — AI advisor, court forms, demand letters, hearing prep, and more.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0d6b5e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Password <span className="font-normal text-gray-400">(8+ characters)</span>
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0d6b5e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/20"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={e => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 cursor-pointer"
            style={{ accentColor: PRIMARY }}
          />
          <span className="text-[13px] leading-snug text-gray-600">
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:opacity-75 transition-opacity"
              style={{ color: PRIMARY }}
              onClick={e => e.stopPropagation()}>
              Terms of Use
            </a>
            {" & "}
            <a href="/payment-terms" target="_blank" rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:opacity-75 transition-opacity"
              style={{ color: PRIMARY }}
              onClick={e => e.stopPropagation()}>
              Payment Terms
            </a>.
          </span>
        </label>

        {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: PRIMARY }}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating your account…</>
            : <><ArrowRight className="h-4 w-4" /> Start Building My Case</>}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold underline underline-offset-2 hover:opacity-75" style={{ color: PRIMARY }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function BetaPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [_location, navigate] = useLocation();
  const [bannerOpen, setBannerOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const signUpRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bannerRef.current && !bannerRef.current.contains(e.target as Node)) {
        setBannerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  return (
    <>
    <div className="px-4 pt-4 pb-10" style={{ backgroundColor: TEAL_BG }}>
      <Helmet>
        <title>Small Claims Court Help Without a Lawyer — Small Claims Genie</title>
        <meta name="description" content="Answer a few questions. Get a demand letter, AI case guidance, and court-ready forms — all in one place. Available in 9 states." />
        <link rel="canonical" href="https://smallclaimsgenie.com/startup" />
        <meta property="og:url" content="https://smallclaimsgenie.com/startup" />
        <meta property="og:title" content="Small Claims Court Help Without a Lawyer — Small Claims Genie" />
        <meta property="og:description" content="Answer a few questions. Get a demand letter, AI case guidance, and court-ready forms — all in one place. Available in 9 states." />
        <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
      </Helmet>
      <div className="mx-auto w-full max-w-6xl">

        {/* Compact header */}
        <div className="text-center mb-4">
          <div ref={bannerRef} className="relative inline-block">
            {!bannerOpen && (
              <span className="absolute inset-[-3px] rounded-full bg-amber-400 opacity-40 animate-ping pointer-events-none" style={{ animationDuration: "2s" }} />
            )}
            <span
              onClick={() => setBannerOpen(v => !v)}
              className="relative inline-flex items-center gap-2 bg-amber-100 border-2 border-amber-400 text-amber-900 text-[14px] font-black px-5 py-2 rounded-full cursor-pointer hover:bg-amber-200 transition-colors select-none shadow-md hover:shadow-lg"
            >
              Start Free Trial — Full Access for One Small Claims Case &nbsp;·&nbsp; Normally $79–$268
              <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${bannerOpen ? "rotate-180" : "animate-bounce"}`} />
            </span>
            {bannerOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[260px]">
                <button
                  onClick={() => { setBannerOpen(false); setSignUpOpen(true); }}
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors group w-full text-left"
                >
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#20304f] group-hover:text-primary transition-colors normal-case">Start free</p>
                    <p className="text-[11px] text-[#8a96a8] leading-snug normal-case">No credit card · Limited spots available</p>
                  </div>
                </button>
                <div className="border-t border-gray-100" />
                <Link
                  href="/sign-in?redirect=/start"
                  onClick={() => setBannerOpen(false)}
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors group"
                >
                  <LogIn className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#20304f] group-hover:text-primary transition-colors normal-case">I have an account — sign in</p>
                    <p className="text-[11px] text-[#8a96a8] leading-snug normal-case">Resume where you left off</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Three columns */}
        <div className="flex flex-col lg:flex-row items-start gap-4">

          {/* Col 1: Combined Personal & Business */}
          <div className="flex-1 bg-white rounded-[16px] border-[2.5px] border-[#14b8a6] shadow-[0_4px_16px_rgba(13,107,94,0.08)] p-3.5 flex flex-col">
            <div className="mb-2">
              <p className="text-sm font-black text-[#0d6b5e] mb-0.5">Personal & Business Cases</p>
              <p className="text-[11px] text-gray-500 leading-[1.35]">For personal and business disputes — neighbors, roommates, contracts, invoices, and more.</p>
            </div>
            <div className="bg-[#f0faf8] border border-[#14b8a6]/40 rounded-lg px-2.5 py-1 mb-2.5">
              <span className="text-[11px] font-bold text-[#0d6b5e]">Normally $79–$109 · Included In Offer</span>
            </div>
            <ul className="flex-1 grid gap-[4px]">
              {COMBINED_FEATURES.map((f) => (
                <li key={f} className="flex gap-[5px] items-start text-gray-700 text-[11px] leading-[1.35]">
                  {TC}
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Genie Plus: Paralegal Review */}
          <div className="flex-1 bg-white rounded-[16px] border-[2.5px] border-[#6366f1] shadow-[0_4px_16px_rgba(99,102,241,0.10)] p-3.5 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6366f1] text-white text-[9px] font-black px-2.5 py-0.5 rounded-full whitespace-nowrap tracking-wide shadow">
              ADD-ON PARALEGAL SUPPORT
            </div>
            <div className="mb-2 pt-0.5">
              <p className="text-sm font-black text-[#0d6b5e] mb-0.5">Genie Plus: Paralegal Review</p>
              <p className="text-[11px] text-gray-500 leading-[1.35]">AI tools plus personalized document review and hearing support from a trained paralegal.</p>
            </div>
            <div className="bg-[#f5f3ff] border border-[#c7d2fe] rounded-lg px-2.5 py-1 mb-2.5">
              <span className="text-[11px] font-bold text-[#4338ca]">$159 normally · Free</span>
            </div>
            <ul className="flex-1 grid gap-[4px]">
              {PARALEGAL_FEATURES.map(({ text, bold }) => (
                <li key={text} className="flex gap-[5px] items-start text-gray-700 text-[11px] leading-[1.35]">
                  {IC}
                  <span className={bold ? "font-semibold text-gray-800" : ""}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Video + Sign-up card */}
          <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-3">

            {/* Video */}
            <div className="hidden lg:block">
              <div className="relative rounded-xl overflow-hidden shadow-lg bg-[#0a5a50] aspect-video">
                <iframe
                  src="https://app.heygen.com/embeds/b789b4bb9ad646b2bed4b078e2d9c6e2"
                  title="Small Claims Genie Introduction"
                  frameBorder="0"
                  allow="encrypted-media; fullscreen;"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>

            {/* Sign-up card */}
            <div ref={signUpRef} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              {isSignedIn ? (
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-black tracking-wide text-amber-700 uppercase">
                    Free Offer – Start Now
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Build your case now.</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    You're already signed in. Jump straight to intake step one.
                  </p>
                  <button
                    onClick={() => navigate("/cases/new")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Start Building My Case
                  </button>
                </div>
              ) : (
                <SignUpForm onSuccess={() => navigate("/cases/new")} />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>

    <SignUpModal open={signUpOpen} onClose={() => setSignUpOpen(false)} />
    </>
  );
}
