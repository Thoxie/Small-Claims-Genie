import { useState } from "react";
import { useSignUp } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";

const PRIMARY = "#0d6b5e";

interface SignUpModalProps {
  open: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export function SignUpModal({ open, onClose, redirectTo = "/cases/new" }: SignUpModalProps) {
  const { signUp, setActive } = useSignUp();
  const [_loc, navigate] = useLocation();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    acceptedTerms &&
    email.trim().length > 3 &&
    email.trim() === confirmEmail.trim() &&
    password.length >= 8 &&
    password === confirmPassword;

  function reset() {
    setStep("form");
    setEmail("");
    setConfirmEmail("");
    setPassword("");
    setShowPw(false);
    setConfirmPassword("");
    setShowConfirmPw(false);
    setAcceptedTerms(false);
    setCode("");
    setLoading(false);
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

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
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Sign-up failed. Please try again.";
      setError(msg);
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
        reset();
        onClose();
        navigate(redirectTo);
      } else if (result.status === "missing_requirements") {
        const missing: string[] = (result as any).missingFields ?? [];
        const unverified: string[] = (result as any).unverifiedFields ?? [];
        console.error("[sign-up] missing_requirements after verification", { missing, unverified });

        const needsName = missing.includes("first_name") || missing.includes("last_name");
        if (needsName || (missing.length === 0 && unverified.length === 0)) {
          try {
            const emailVal = (signUp as any).emailAddress ?? "";
            const namePart = emailVal.split("@")[0].replace(/[._+-]/g, " ").trim() || "User";
            const updatePayload: Record<string, string> = {};
            if (missing.includes("first_name") || missing.length === 0) updatePayload.firstName = namePart;
            if (missing.includes("last_name") || missing.length === 0) updatePayload.lastName = ".";
            const updated = await signUp.update(updatePayload);
            if (updated.status === "complete") {
              await setActive({ session: updated.createdSessionId });
              reset();
              onClose();
              navigate(redirectTo);
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
            reset();
            onClose();
            navigate(redirectTo);
            return;
          }
        } catch {}
        setError("Your email is already verified. Please close this and sign in instead.");
        return;
      }

      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Verification failed. Check the code and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Create your free account</DialogTitle>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center" style={{ background: "linear-gradient(135deg, #f5fdfb 0%, #ddf6f3 100%)" }}>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-black tracking-wide text-amber-700 uppercase mb-3">
            Free Trial — Everything Included
          </div>
          <h2 className="text-xl font-black text-gray-900">Create your free account</h2>
          <p className="text-sm text-gray-500 mt-1">No credit card required</p>
        </div>

        <div className="px-6 pb-6 pt-4">
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email — mandatory, no eye icon */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/30 focus:border-[#0d6b5e] transition-colors"
                />
              </div>

              {/* Confirm email — no eye icon */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Confirm email address</label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/30 focus:border-[#0d6b5e] transition-colors"
                />
                {confirmEmail.length > 0 && email.trim() !== confirmEmail.trim() && (
                  <p className="text-xs text-red-500 mt-1">Emails don't match</p>
                )}
              </div>

              {/* Password — eye icon on right */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Password <span className="font-normal text-gray-400">(8+ characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/30 focus:border-[#0d6b5e] transition-colors"
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

              {/* Confirm password — eye icon on right */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/30 focus:border-[#0d6b5e] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPw ? "Hide password" : "Show password"}
                  >
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                )}
              </div>

              {/* Terms checkbox — must be checked to enable submit */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 cursor-pointer accent-[#0d6b5e]"
                />
                <span className="text-[12px] text-gray-600 leading-snug">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer"
                    className="text-[#0d6b5e] underline underline-offset-2 hover:text-[#0a5a4e]"
                    onClick={e => e.stopPropagation()}>
                    Terms of Use
                  </a>
                  {" "}and{" "}
                  <a href="/payment-terms" target="_blank" rel="noopener noreferrer"
                    className="text-[#0d6b5e] underline underline-offset-2 hover:text-[#0a5a4e]"
                    onClick={e => e.stopPropagation()}>
                    Payment Terms
                  </a>
                </span>
              </label>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: PRIMARY }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create My Free Account"}
              </button>

              <p className="text-center text-xs text-gray-400">
                Already have an account?{" "}
                <a href="/sign-in" className="text-[#0d6b5e] font-semibold hover:underline" onClick={handleClose}>Sign in</a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-center space-y-1">
                <CheckCircle className="h-8 w-8 mx-auto" style={{ color: PRIMARY }} />
                <p className="text-sm font-bold text-gray-800">Check your email</p>
                <p className="text-xs text-gray-500">We sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Verification code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-center tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/30 focus:border-[#0d6b5e] transition-colors"
                />
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={code.length < 6 || loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: PRIMARY }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Start Building"}
              </button>

              <button type="button" onClick={() => { setStep("form"); setError(""); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ← Use a different email
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
