import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, useSignUp } from "@clerk/clerk-react";
import { Link } from "wouter";
import {
  Loader2, Eye, EyeOff, CheckCircle, ClipboardList, MessageSquare, FileText, Star, Shield, Zap,
} from "lucide-react";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";

const PRIMARY = "#0d6b5e";
const PRIMARY_DARK = "#0a5a4e";
const TEAL_BG = "#f5fdfb";
const TEAL_LIGHT = "#ddf6f3";

// ── Value props ────────────────────────────────────────────────────────────────
const VALUE_PROPS = [
  {
    icon: <ClipboardList className="h-6 w-6" style={{ color: PRIMARY }} />,
    title: "Step-by-step intake wizard",
    desc: "Answer plain-language questions and we build your complete case file — parties, amounts, timeline, and evidence.",
  },
  {
    icon: <MessageSquare className="h-6 w-6" style={{ color: PRIMARY }} />,
    title: "AI Case Advisor & Help Genie",
    desc: "Ask anything, anytime. Get strategy, answer prep, and coaching from an AI trained on California small claims rules.",
  },
  {
    icon: <FileText className="h-6 w-6" style={{ color: PRIMARY }} />,
    title: "Court-ready forms — SC-100 & more",
    desc: "Your completed, court-ready SC-100 form generated automatically from your intake. Download and file the same day.",
  },
];

// ── Testimonial-style social proof ─────────────────────────────────────────────
const PROOF_POINTS = [
  { icon: <Star className="h-4 w-4 text-amber-400 fill-amber-400" />, text: "No lawyer needed" },
  { icon: <Shield className="h-4 w-4 text-green-600" />, text: "30-day money-back guarantee" },
  { icon: <Zap className="h-4 w-4" style={{ color: PRIMARY }} />, text: "Ready in under 30 minutes" },
];

// ── Beta Tester Agreement text ─────────────────────────────────────────────────
const BETA_AGREEMENT = `Beta Access Agreement: By signing up, you acknowledge that (1) Small Claims Genie is a pre-release beta product and features may change or be temporarily unavailable; (2) your case data may be reset during beta testing and should not be relied on as a permanent record; (3) your beta access is personal and non-transferable — sharing your login is not permitted; and (4) you agree to provide honest feedback to help us improve the product. Beta access is provided free of charge for the duration of the beta period.`;

// ── Sign-up form (inline, custom) ──────────────────────────────────────────────
function BetaSignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const { signUp, setActive } = useSignUp();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedBeta, setAcceptedBeta] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = acceptedTerms && acceptedBeta && email.trim().length > 3 && password.length >= 8;

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
      setError(err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp || !setActive) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        onSuccess();
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Verification failed. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Email verification step ────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: TEAL_LIGHT }}>
            <CheckCircle className="h-5 w-5" style={{ color: PRIMARY }} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Check your inbox</h3>
            <p className="text-xs text-gray-500">We sent a 6-digit code to <strong>{email}</strong></p>
          </div>
        </div>
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d6b5e] focus:border-transparent"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={code.length < 6 || loading}
            className="w-full rounded-full text-white font-black text-base min-h-[52px] flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            style={{ backgroundColor: loading || code.length < 6 ? "#94a3b8" : PRIMARY }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {loading ? "Verifying…" : "Confirm & Claim My Spot"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("form"); setError(""); setCode(""); }}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back to sign-up
          </button>
        </form>
      </div>
    );
  }

  // ── Sign-up form ───────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full">
      <h3 className="text-xl font-black text-gray-900 mb-1">Claim your free beta spot</h3>
      <p className="text-sm text-gray-500 mb-6">No credit card. No catch. Cancel anytime.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b5e] focus:border-transparent"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password <span className="font-normal text-gray-400">(8+ characters)</span></label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b5e] focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Terms checkboxes */}
        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 cursor-pointer"
              style={{ accentColor: PRIMARY }}
            />
            <span className="text-[13px] text-gray-700 leading-snug">
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                style={{ color: PRIMARY }}
                onClick={e => e.stopPropagation()}>
                Terms of Use
              </a>
              {" "}and{" "}
              <a href="/payment-terms" target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                style={{ color: PRIMARY }}
                onClick={e => e.stopPropagation()}>
                Payment Terms
              </a>.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedBeta}
              onChange={e => setAcceptedBeta(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 cursor-pointer"
              style={{ accentColor: PRIMARY }}
            />
            <span className="text-[13px] text-gray-700 leading-snug">
              I understand this is a pre-release beta. Data may be reset, and my access is non-transferable.{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:opacity-80 transition-opacity text-left"
                style={{ color: PRIMARY }}
                onClick={() => alert(BETA_AGREEMENT)}
              >
                Read full agreement
              </button>.
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full rounded-full text-white font-black text-base min-h-[52px] flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          style={{ backgroundColor: canSubmit && !loading ? PRIMARY : "#94a3b8" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          {loading ? "Creating your account…" : "Claim My Free Beta Spot"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline underline-offset-2 hover:opacity-80" style={{ color: PRIMARY }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

// ── Main beta page ─────────────────────────────────────────────────────────────
export default function BetaPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, navigate] = useLocation();

  // Already signed in → send to app
  useEffect(() => {
    if (isLoaded && isSignedIn) navigate("/");
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: TEAL_BG }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: TEAL_BG }}>

      {/* ── Minimal header ── */}
      <header className="w-full bg-white border-b" style={{ borderColor: TEAL_LIGHT }}>
        <div className="max-w-5xl mx-auto px-4 h-[70px] flex items-center justify-between">
          <Link href="/">
            <img src={logoPath} alt="Small Claims Genie" className="h-[50px] w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white px-3 py-1.5 rounded-full" style={{ backgroundColor: PRIMARY }}>
              Beta Access
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── Hero ── */}
        <section className="px-4 pt-10 pb-8" style={{ backgroundColor: TEAL_BG }}>
          <div className="max-w-5xl mx-auto">

            {/* Spot badge */}
            <div className="flex justify-center mb-5">
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold px-4 py-2 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                24 of 25 beta spots remaining
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-start gap-10">

              {/* Left — copy */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-black leading-snug mb-4 tracking-tight" style={{ color: PRIMARY }}>
                  Be One of the First 25.<br />
                  File Small Claims Court<br />
                  with Confidence.
                </h1>
                <p className="text-lg text-gray-700 mb-5 leading-relaxed max-w-lg">
                  Small Claims Genie is opening a limited beta to 25 users — free. Get complete access to our AI-powered case wizard, demand letters, and court-ready SC-100 forms. No credit card. No lawyer.
                </p>

                {/* Proof points */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {PROOF_POINTS.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm">
                      {p.icon}
                      {p.text}
                    </div>
                  ))}
                </div>

                {/* Value props — desktop only */}
                <div className="hidden lg:flex flex-col gap-4 mt-2">
                  {VALUE_PROPS.map((v, i) => (
                    <div key={i} className="flex items-start gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-50">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: TEAL_LIGHT }}>
                        {v.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{v.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{v.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — sign-up card */}
              <div className="w-full lg:w-[420px] shrink-0">
                <BetaSignUpForm onSuccess={() => navigate("/")} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Value props — mobile ── */}
        <section className="lg:hidden px-4 pb-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-lg font-black text-gray-900 mb-4">What you get — completely free</h2>
            <div className="flex flex-col gap-3">
              {VALUE_PROPS.map((v, i) => (
                <div key={i} className="flex items-start gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: TEAL_LIGHT }}>
                    {v.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{v.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Urgency strip ── */}
        <section className="px-4 pb-10">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: TEAL_LIGHT }}>
              <p className="text-sm font-bold mb-1" style={{ color: PRIMARY }}>
                Why beta? Why now?
              </p>
              <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
                We're in the final stages before public launch. Beta users get free access in exchange for honest feedback. Once the 25 spots are gone, new users pay full price. This offer won't repeat.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-4 text-center" style={{ backgroundColor: TEAL_LIGHT }}>
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Small Claims Genie.{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:opacity-80" style={{ color: PRIMARY }}>Terms</Link>
          {" · "}
          <Link href="/payment-terms" className="underline underline-offset-2 hover:opacity-80" style={{ color: PRIMARY }}>Payment Terms</Link>
        </p>
      </footer>

    </div>
  );
}
