import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth, useSignUp } from "@clerk/clerk-react";
import { Link } from "wouter";
import { Loader2, Eye, EyeOff, CheckCircle, ArrowRight } from "lucide-react";

const PRIMARY = "#0d6b5e";
const TEAL_BG = "#f5fdfb";
const TEAL_LIGHT = "#ddf6f3";

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
  const [, navigate] = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] px-4 py-12 md:py-16" style={{ backgroundColor: TEAL_BG }}>
      <div className="mx-auto w-full max-w-5xl">

        <div className="flex flex-col md:flex-row md:items-center gap-10 md:gap-16">

          {/* ── Left: Hero copy ── */}
          <div className="flex-1">
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl text-gray-900">
              Win in Small Claims Court.
            </h1>
            <p className="mt-3 text-2xl font-bold text-gray-900 leading-snug">
              Don't lose because you're unprepared.
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              Get your money back!
            </p>
            <p className="mt-6 text-base text-gray-700 leading-relaxed max-w-md">
              Small Claims Genie walks you through every step — intake, evidence, AI chat, demand letters and your court-ready forms, ready to file. No lawyer needed.
            </p>

            {/* Feature list */}
            <div className="mt-8 space-y-3">
              {[
                "AI Case Advisor",
                "Court-ready SC-100 form",
                "Demand letter generator",
                "Hearing prep tools",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                  <CheckCircle className="h-4 w-4 shrink-0" style={{ color: PRIMARY }} />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Sign-up card ── */}
          <div className="w-full md:w-[420px] shrink-0">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              {isSignedIn ? (
                <div className="text-center space-y-5">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-black tracking-wide text-amber-700 uppercase">
                    Free Offer – Start Now
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">Build your case now.</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    You're already signed in. Jump straight to intake step one.
                  </p>
                  <button
                    onClick={() => navigate("/cases/new")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black text-white shadow-sm transition-all hover:opacity-90"
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
  );
}
