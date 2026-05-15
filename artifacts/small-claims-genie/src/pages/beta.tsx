import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, useSignUp } from "@clerk/clerk-react";
import { Link } from "wouter";
import { Loader2, Eye, EyeOff, CheckCircle, ArrowRight, Lock } from "lucide-react";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";

const PRIMARY = "#0d6b5e";
const PRIMARY_DARK = "#0a5a4e";

// ── Beta Tester Agreement text ─────────────────────────────────────────────────
const BETA_AGREEMENT = `Beta Access Agreement: By signing up, you acknowledge that (1) Small Claims Genie is a pre-release beta product and features may change or be temporarily unavailable; (2) your case data may be reset during beta testing and should not be relied on as a permanent record; (3) your beta access is personal and non-transferable — sharing your login is not permitted; and (4) you agree to provide honest feedback to help us improve the product. Beta access is provided free of charge for the duration of the beta period.`;

// ── Sign-up form ───────────────────────────────────────────────────────────────
function BetaSignUpForm({ onSuccess }: { onSuccess: () => void }) {
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
      <div className="w-full space-y-5">
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
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Verification code
            </label>
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

          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={code.length < 6 || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: PRIMARY }}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
              : <><CheckCircle className="h-4 w-4" /> Confirm &amp; Continue</>}
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
    <div className="w-full space-y-5">
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
        {/* Email */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Email address
          </label>
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

        {/* Password */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Password{" "}
            <span className="font-normal text-gray-400">(8+ characters)</span>
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

        {/* Terms checkbox */}
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
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-75"
              style={{ color: PRIMARY }}
              onClick={e => e.stopPropagation()}
            >
              Terms of Use
            </a>
            {" & "}
            <a
              href="/payment-terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-75"
              style={{ color: PRIMARY }}
              onClick={e => e.stopPropagation()}
            >
              Payment Terms
            </a>
            , and the{" "}
            <button
              type="button"
              className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-75 text-left"
              style={{ color: PRIMARY }}
              onClick={e => { e.stopPropagation(); alert(BETA_AGREEMENT); }}
            >
              Beta Agreement
            </button>
            .
          </span>
        </label>

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: PRIMARY }}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating your account…</>
            : <><ArrowRight className="h-4 w-4" /> Claim My Beta Spot</>}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-75"
          style={{ color: PRIMARY }}
        >
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

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate("/dashboard");
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5fdfb]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel — brand + value props ─────────────────────────────────── */}
      <div
        className="flex flex-col justify-between px-8 py-10 lg:w-[52%] lg:px-16 lg:py-16"
        style={{ backgroundColor: PRIMARY }}
      >
        {/* Logo */}
        <div>
          <img
            src={logoPath}
            alt="Small Claims Genie"
            className="h-[52px] w-auto brightness-0 invert"
          />
        </div>

        {/* Headline */}
        <div className="mt-10 lg:mt-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
            Beta — 24 of 25 spots remaining
          </div>

          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
            Prepare Your California<br />
            Small Claims Case<br />
            Online
          </h1>

          <p className="mt-5 text-base text-white/75 leading-relaxed max-w-md">
            No lawyer. No jargon. Answer a few plain-language questions, upload your evidence, and walk out with a court-ready SC-100 form — in under 30 minutes.
          </p>

          {/* Feature list */}
          <ul className="mt-8 space-y-4">
            {[
              { label: "Guided intake wizard", desc: "Organizes your facts, dates, and parties step by step" },
              { label: "Upload & analyze evidence", desc: "Attach photos, contracts, and receipts — AI reads them" },
              { label: "AI Case Advisor", desc: "Ask anything about California small claims rules" },
              { label: "Generate SC-100 & demand letters", desc: "Download court-ready forms in minutes" },
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <CheckCircle className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-white">{f.label}</span>
                  <span className="text-xs text-white/60">{f.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-xs text-white/40 lg:mt-0">
          © {new Date().getFullYear()} Small Claims Genie · Not legal advice ·{" "}
          <a href="/terms" className="underline underline-offset-2 hover:text-white/60 transition-colors">Terms</a>
        </p>
      </div>

      {/* ── Right panel — sign-up card ────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <BetaSignUpForm onSuccess={() => navigate("/cases/new")} />
        </div>
      </div>

    </div>
  );
}
