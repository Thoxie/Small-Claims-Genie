import { Helmet } from 'react-helmet-async';
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth, useSignUp } from "@clerk/clerk-react";
import { Trophy, UserCheck, Loader2, X, Eye, EyeOff, Wand2, MapPin } from "lucide-react";
import { STATE_ORDER, STATE_FACTS } from "@workspace/state-facts";
import { useLanguage } from "@/contexts/language-context";

// State list comes from the canonical @workspace/state-facts registry (see
// .agents/skills/state-expansion/SKILL.md) so a new state only needs to be
// added once.
const SUPPORTED_STATES = STATE_ORDER.map((code) => ({ abbr: code, name: STATE_FACTS[code].name }));

function TermsAndSignUpModal({
  alreadySignedIn,
  onConfirm,
  onDismiss,
}: {
  alreadySignedIn: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const { signUp, setActive } = useSignUp();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPayment, setAcceptedPayment] = useState(false);
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);

  const canProceed = acceptedTerms && acceptedPayment;
  const canSubmitForm = canProceed && email.trim().length > 0 && email.trim() === confirmEmail.trim() && password.length >= 8;

  const handleSubmit = async () => {
    if (!canSubmitForm || !signUp) return;
    setLoading(true);
    setError("");
    setEmailTaken(false);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: any) {
      const code = err?.errors?.[0]?.code ?? "";
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Sign-up failed. Please try again.";
      if (code === "form_identifier_exists" || msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("already")) {
        setEmailTaken(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signUp || !setActive) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        onConfirm();
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Verification failed. Check the code and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const termsCheckboxes = (
    <div className="flex flex-col gap-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={e => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#0d6b5e] cursor-pointer"
        />
        <span className="text-[13px] text-[#20304f] leading-snug">
          I have read and agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer"
            className="text-[#0d6b5e] underline underline-offset-2 hover:text-[#0a5a4e] transition-colors"
            onClick={e => e.stopPropagation()}>
            Terms of Use
          </a>.
        </span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptedPayment}
          onChange={e => setAcceptedPayment(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#0d6b5e] cursor-pointer"
        />
        <span className="text-[13px] text-[#20304f] leading-snug">
          I have read and agree to the{" "}
          <a href="/payment-terms" target="_blank" rel="noopener noreferrer"
            className="text-[#0d6b5e] underline underline-offset-2 hover:text-[#0a5a4e] transition-colors"
            onClick={e => e.stopPropagation()}>
            Payment Terms
          </a>
          , including the 30-day money-back guarantee and refund process.
        </span>
      </label>
    </div>
  );

  // Already signed in — show terms acceptance only
  if (alreadySignedIn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full p-7 relative">
          <button onClick={onDismiss} className="absolute top-4 right-4 text-[#8a96a8] hover:text-[#20304f] transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-[20px] font-black text-[#0d6b5e] mb-1 leading-tight">Before you continue</h2>
          <p className="text-[13px] text-[#5a6478] mb-6">Please review and accept the following to proceed to payment.</p>
          <div className="mb-7">{termsCheckboxes}</div>
          <button
            onClick={onConfirm}
            disabled={!canProceed}
            className="flex items-center justify-center w-full rounded-full bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white text-[15px] font-black min-h-[52px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    );
  }

  // Email verification step
  if (step === "verify") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full p-7 relative">
          <button onClick={onDismiss} className="absolute top-4 right-4 text-[#8a96a8] hover:text-[#20304f] transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-[20px] font-black text-[#0d6b5e] mb-1 leading-tight">Check your email</h2>
          <p className="text-[13px] text-[#5a6478] mb-6">
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your account and continue to payment.
          </p>
          <div className="mb-5">
            <label className="block text-[12px] font-bold text-[#20304f] mb-1.5">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full border-2 border-[#e3e8f0] focus:border-[#0d6b5e] rounded-xl px-4 py-3 text-[22px] font-black text-center tracking-[0.4em] text-[#0d6b5e] placeholder:text-gray-300 placeholder:font-normal placeholder:tracking-normal outline-none transition-colors"
              autoFocus
            />
          </div>
          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4 text-center">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="flex items-center justify-center w-full rounded-full bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white text-[15px] font-black min-h-[52px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-3"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue to Payment"}
          </button>
          <button
            onClick={() => { setStep("form"); setCode(""); setError(""); }}
            className="w-full text-[13px] text-[#5a6478] hover:text-[#20304f] transition-colors text-center"
          >
            ← Back to sign up
          </button>
        </div>
      </div>
    );
  }

  // Combined terms + sign-up form
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full p-7 relative max-h-[92vh] overflow-y-auto">
        <button onClick={onDismiss} className="absolute top-4 right-4 text-[#8a96a8] hover:text-[#20304f] transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-[20px] font-black text-[#0d6b5e] mb-1 leading-tight">Create your account & continue</h2>
        <p className="text-[13px] text-[#5a6478] mb-5">
          Accept our terms and create your free account — you'll go straight to payment after.
        </p>

        <p className="text-[11px] font-black text-[#0d6b5e] uppercase tracking-widest mb-3">Step 1 — Agree to our terms</p>
        <div className="mb-6">{termsCheckboxes}</div>

        <p className="text-[11px] font-black text-[#0d6b5e] uppercase tracking-widest mb-3">Step 2 — Create your free account</p>
        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className="block text-[12px] font-bold text-[#20304f] mb-1.5">Email address</label>
            <div className="relative">
              <input
                type={showEmail ? "text" : "email"}
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="you@example.com"
                className="w-full border-2 border-[#e3e8f0] focus:border-[#0d6b5e] rounded-xl px-4 py-2.5 pr-11 text-[14px] text-[#20304f] placeholder:text-gray-300 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowEmail(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a96a8] hover:text-[#20304f] transition-colors"
                aria-label={showEmail ? "Hide email" : "Show email"}
              >
                {showEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#20304f] mb-1.5">Confirm email address</label>
            <input
              type="email"
              autoComplete="email"
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="you@example.com"
              className="w-full border-2 border-[#e3e8f0] focus:border-[#0d6b5e] rounded-xl px-4 py-2.5 text-[14px] text-[#20304f] placeholder:text-gray-300 outline-none transition-colors"
            />
            {confirmEmail.length > 0 && email.trim() !== confirmEmail.trim() && (
              <p className="text-[12px] text-red-500 mt-1">Emails don't match</p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#20304f] mb-1.5">
              Password <span className="text-[#8a96a8] font-normal">(8+ characters)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                className="w-full border-2 border-[#e3e8f0] focus:border-[#0d6b5e] rounded-xl px-4 py-2.5 pr-11 text-[14px] text-[#20304f] placeholder:text-gray-300 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a96a8] hover:text-[#20304f] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {emailTaken && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-[13px] font-bold text-amber-800 mb-2">An account with that email already exists.</p>
            <Link
              href="/sign-in"
              className="flex items-center justify-center w-full rounded-full bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white text-[14px] font-black min-h-[44px] px-5 transition-colors"
            >
              Sign in to your existing account →
            </Link>
            <button
              type="button"
              onClick={() => { setEmailTaken(false); setEmail(""); setConfirmEmail(""); setPassword(""); }}
              className="w-full text-center text-[12px] text-[#5a6478] hover:text-[#20304f] mt-2 transition-colors"
            >
              Use a different email instead
            </button>
          </div>
        )}

        {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4 text-center">{error}</p>}

        {!emailTaken && (
          <button
            onClick={handleSubmit}
            disabled={!canSubmitForm || loading}
            className="flex items-center justify-center w-full rounded-full bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white text-[15px] font-black min-h-[52px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account & Continue to Payment"}
          </button>
        )}

        <p className="text-center text-[12px] text-[#5a6478]">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[#0d6b5e] font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const CHECK = (
  <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[#0d6b5e] text-[#0d6b5e] inline-flex items-center justify-center text-[11px] font-black mt-[2px]">
    ✓
  </span>
);

// Product metadata keys — must match what's seeded in Stripe
const _PLAN_KEYS = {
  personal_low: "personal_low",
  personal_high: "personal_high",
  business_low: "business_low",
  business_high: "business_high",
  paralegal: "paralegal",
  collection_low: "collection_low",
  collection_high: "collection_high",
} as const;

type PlanKey = (typeof _PLAN_KEYS)[keyof typeof _PLAN_KEYS];

const PLAN_PRICES: Record<PlanKey, number> = {
  personal_low: 39,
  personal_high: 59,
  business_low: 59,
  business_high: 79,
  paralegal: 159,
  collection_low: 69,
  collection_high: 99,
};

async function startCheckout(
  getToken: () => Promise<string | null>,
  planKeys: PlanKey[],
  setLoading: (k: PlanKey | null) => void,
  _navigate: (path: string) => void
) {
  setLoading(planKeys[0]);
  try {
    const productsRes = await fetch("/api/stripe/products");
    if (!productsRes.ok) throw new Error("Could not load products");
    const { products } = await productsRes.json();

    const priceIds: string[] = [];
    for (const planKey of planKeys) {
      const product = (products as any[]).find(
        (p: any) => p.metadata?.plan === planKey
      );
      if (!product || !product.prices?.[0]?.id) {
        throw new Error("Product not found in Stripe. Please contact support.");
      }
      priceIds.push(product.prices[0].id);
    }

    const token = await getToken().catch(() => null);

    const checkoutRes = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        priceIds,
        successPath: "/dashboard?payment=success",
        cancelPath: "/pricing?payment=cancelled",
      }),
    });

    if (!checkoutRes.ok) {
      const err = await checkoutRes.json().catch(() => ({}));
      throw new Error(err.error || "Could not start checkout");
    }

    const { url } = await checkoutRes.json();
    if (url) {
      window.location.href = url;
    }
  } catch (err: any) {
    alert(err?.message || "Something went wrong. Please try again.");
    setLoading(null);
  }
}

function ParalegalAddOnModal({
  basePlanKey,
  baseLabel,
  onConfirm,
  onDismiss,
  isLoading,
}: {
  basePlanKey: PlanKey;
  baseLabel: string;
  onConfirm: (addParalegal: boolean) => void;
  onDismiss: () => void;
  isLoading: boolean;
}) {
  const basePrice = PLAN_PRICES[basePlanKey];
  const totalWithParalegal = basePrice + 159;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full p-7 relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-[#8a96a8] hover:text-[#20304f] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-[20px] font-black text-[#0d6b5e] mb-1 leading-tight">
          One last step
        </h2>
        <p className="text-[13px] text-[#5a6478] mb-5">
          You selected <strong>{baseLabel}</strong> for <strong>${basePrice}</strong>. Would you like to add paralegal support?
        </p>

        <div className="bg-[#f5f3ff] border-2 border-[#6366f1] rounded-2xl p-4 mb-5">
          <div className="flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-[#6366f1] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#0d6b5e] text-[15px] leading-tight mb-1">
                Add Paralegal Review <span className="text-[#6366f1]">+$159</span>
              </p>
              <ul className="text-[12px] text-[#5a6478] space-y-[3px]">
                <li>✓ Trained paralegal reviews your full case package</li>
                <li>✓ 30-minute support session by phone or Zoom</li>
                <li>✓ Document, evidence, and exhibit review</li>
                <li>✓ Paralegal support at your hearing by Zoom</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onConfirm(true)}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 w-full rounded-full bg-[#6366f1] hover:bg-[#4f46e5] text-white text-[15px] font-black min-h-[52px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            {isLoading ? "Loading…" : `Yes, add Paralegal Review — $${totalWithParalegal} total`}
          </button>
          <button
            onClick={() => onConfirm(false)}
            disabled={isLoading}
            className="flex items-center justify-center w-full rounded-full border-2 border-[#0d6b5e] text-[#0d6b5e] hover:bg-[#f0faf8] text-[15px] font-black min-h-[52px] px-5 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading…" : `No thanks, continue — $${basePrice}`}
          </button>
        </div>
      </div>
    </div>
  );
}



function PersonalCard({ loadingKey, onCheckout }: { loadingKey: PlanKey | null; onCheckout: (k: PlanKey) => void }) {
  const { lang } = useLanguage();
  const es = lang === "es";
  const featuresEn = [
    "AI Case Advisor that helps organize your facts, spot weak points, and strengthen your claim before filing.",
    "Step-by-step guided intake that turns your story into a cleaner, more organized case package.",
    "Pre-filled with your evidence all necessary court forms — smallclaimsgenie.com/free-trial",
    "Evidence organizer for receipts, screenshots, messages, photos, contracts, and records.",
    "Demand letter generator with a downloadable PDF you can send before filing.",
    "Case Readiness Score that shows what is complete, what is missing, and what to fix before court.",
    "Opening statement builder that helps you prepare a short, clear explanation for the judge.",
    "Mock hearing practice where AI plays the judge and asks questions so you can practice your answers.",
  ];
  const featuresEs = [
    "Asesor de Caso con IA que ayuda a organizar los hechos, identificar puntos débiles y fortalecer tu reclamación antes de presentar.",
    "Proceso de registro guiado paso a paso que convierte tu historia en un paquete de caso más limpio y organizado.",
    "Formularios del tribunal prellenados con tu evidencia — smallclaimsgenie.com/free-trial",
    "Organizador de evidencia para recibos, capturas de pantalla, mensajes, fotos, contratos y registros.",
    "Generador de carta de demanda con PDF descargable que puedes enviar antes de presentar.",
    "Puntuación de Preparación del Caso que muestra qué está completo, qué falta y qué corregir antes del tribunal.",
    "Constructor de declaración de apertura que te ayuda a preparar una explicación breve y clara para el juez.",
    "Práctica de audiencia simulada donde la IA juega el papel del juez y hace preguntas para que puedas practicar tus respuestas.",
  ];
  const features = es ? featuresEs : featuresEn;
  return (
    <section className="bg-white rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.09)] p-[18px_20px] flex flex-col relative border-[3px] border-[#14b8a6]/60">

      <div className="pb-4 pt-1 h-[138px] flex flex-col">
        <p className="text-xl font-black tracking-tight text-[#0d6b5e] mb-1.5 leading-tight">{es ? "Caso Personal" : "Personal Case"}</p>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          {es ? "Solo para disputas persona contra persona, como conflictos con un vecino, compañero de cuarto, conocido, amigo u otro individuo." : "For person-versus-person disputes only, such as conflicts with a neighbor, roommate, acquaintance, friend, or other individual."}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 h-[90px]">
        {([
          { key: "personal_low" as PlanKey, price: "$39", label: es ? "Hasta $5,000" : "Up to $5,000" },
          { key: "personal_high" as PlanKey, price: "$59", label: "$5,000+" },
        ]).map(({ key, price, label }) => (
          <button
            key={key}
            onClick={() => loadingKey === null && onCheckout(key)}
            disabled={loadingKey !== null}
            className="h-full rounded-xl px-3 text-center border-2 border-[#14b8a6] bg-[#f0faf8] transition-all flex flex-col items-center justify-center cursor-pointer group hover:bg-[#e0f5f2] hover:border-[#0d6b5e] hover:shadow-[0_0_0_3px_rgba(20,184,166,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingKey === key ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#0d6b5e]" />
            ) : (
              <>
                <span className="block text-[26px] font-black tracking-[-0.05em] leading-none text-[#0d6b5e]">{price}</span>
                <span className="block text-[11px] font-bold text-[#33405c] mt-1">{label}</span>
                <span className="block text-[10px] font-bold text-[#14b8a6] group-hover:text-[#0d6b5e] mt-[3px] transition-colors">{es ? "Iniciar Caso Personal" : "Start Personal Case"}</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div className="bg-[#f7f9fc] border border-[#e3e8f0] rounded-xl p-[8px_12px] mb-4 h-[88px] flex flex-col justify-center">
        <strong className="block text-[13px] text-[#0d6b5e] mb-[2px] leading-[1.25]">{es ? "Ideal para disputas de consumidor sencillas." : "Best for a straightforward consumer dispute."}</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">{es ? "Diseñado para llevar al usuario de la confusión a un paquete de presentación más limpio y organizado." : "Built to move a user from confusion to a cleaner, more organized filing package."}</span>
      </div>

      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-4">
        {features.map((f) => (
          <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            {CHECK}
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-[#8a96a8] text-center">{es ? "Tarifa única. Sin suscripción." : "One-time flat fee. No subscription."}</p>

    </section>
  );
}

function BusinessCard({ loadingKey, onCheckout }: { loadingKey: PlanKey | null; onCheckout: (k: PlanKey) => void }) {
  const { lang } = useLanguage();
  const es = lang === "es";
  const featuresEn = [
    "AI Business Case Advisor that helps organize your facts, damages, records, and claim strategy.",
    "Guided business case intake that turns invoices, contracts, payments, dates, and communications into a cleaner case package.",
    "Downloadable court ready small claims court forms to submit and serve the defendant.",
    "Evidence organizer for invoices, estimates, contracts, warranties, payment records, messages, and business documents.",
    "Demand letter generator with a downloadable PDF you can send before filing.",
    "Case Readiness Score that shows what is complete, what is missing, and what to fix before court.",
    "Opening statement builder that helps you explain the dispute, damages, and proof clearly.",
    "Mock hearing practice focused on records, damages, credibility, and likely judge questions.",
  ];
  const featuresEs = [
    "Asesor de Caso Empresarial con IA que ayuda a organizar los hechos, daños, registros y estrategia de reclamación.",
    "Registro de caso empresarial guiado que convierte facturas, contratos, pagos, fechas y comunicaciones en un paquete de caso más limpio.",
    "Formularios del tribunal de reclamaciones menores descargables y listos para presentar y notificar al demandado.",
    "Organizador de evidencia para facturas, estimaciones, contratos, garantías, registros de pago, mensajes y documentos comerciales.",
    "Generador de carta de demanda con PDF descargable que puedes enviar antes de presentar.",
    "Puntuación de Preparación del Caso que muestra qué está completo, qué falta y qué corregir antes del tribunal.",
    "Constructor de declaración de apertura que te ayuda a explicar la disputa, los daños y la prueba claramente.",
    "Práctica de audiencia simulada enfocada en registros, daños, credibilidad y preguntas probables del juez.",
  ];
  const features = es ? featuresEs : featuresEn;
  return (
    <section className="bg-white rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.09)] p-[18px_20px] flex flex-col relative border-[3px] border-[#14b8a6]">

      <div className="pb-4 pt-1 h-[138px] flex flex-col">
        <p className="text-xl font-black tracking-tight text-[#0d6b5e] mb-1.5 leading-tight">{es ? "Caso Empresarial" : "Business Case"}</p>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          {es ? "Para cualquier caso que involucre una empresa en cualquiera de las partes, incluyendo una empresa que demanda a un individuo o un individuo que demanda a una empresa." : "For any case involving a business on either side, including a business suing an individual or an individual suing a business."}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 h-[90px]">
        {([
          { key: "business_low" as PlanKey, price: "$59", label: es ? "Hasta $5,000" : "Up to $5,000" },
          { key: "business_high" as PlanKey, price: "$79", label: "$5,000+" },
        ]).map(({ key, price, label }) => (
          <button
            key={key}
            onClick={() => loadingKey === null && onCheckout(key)}
            disabled={loadingKey !== null}
            className="h-full rounded-xl px-3 text-center border-2 border-[#14b8a6] bg-[#f0faf8] transition-all flex flex-col items-center justify-center cursor-pointer group hover:bg-[#e0f5f2] hover:border-[#0d6b5e] hover:shadow-[0_0_0_3px_rgba(20,184,166,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingKey === key ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#0d6b5e]" />
            ) : (
              <>
                <span className="block text-[26px] font-black tracking-[-0.05em] leading-none text-[#0d6b5e]">{price}</span>
                <span className="block text-[11px] font-bold text-[#33405c] mt-1">{label}</span>
                <span className="block text-[10px] font-bold text-[#14b8a6] group-hover:text-[#0d6b5e] mt-[3px] transition-colors">{es ? "Iniciar Caso Empresarial" : "Start Business Case"}</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div className="bg-[#f7f9fc] border border-[#e3e8f0] rounded-xl p-[8px_12px] mb-4 h-[88px] flex flex-col justify-center">
        <strong className="block text-[13px] text-[#0d6b5e] mb-[2px] leading-[1.25]">{es ? "Ideal para disputas con más documentación." : "Best for more document-heavy disputes."}</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">{es ? "Diseñado para casos donde los hechos son comerciales, los registros importan más y el usuario necesita una estructura más ordenada." : "Designed for cases where the facts are commercial, the records matter more, and the user needs tighter structure."}</span>
      </div>

      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-4">
        {features.map((f) => (
          <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            {CHECK}
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-[#8a96a8] text-center">{es ? "Tarifa única. Sin suscripción." : "One-time flat fee. No subscription."}</p>

    </section>
  );
}

function GeniePlusCard({ loadingKey, onCheckout }: { loadingKey: PlanKey | null; onCheckout: (k: PlanKey) => void }) {
  const { lang } = useLanguage();
  const es = lang === "es";
  type FeatureItem = { text: string; bold?: boolean };
  const featuresEn: FeatureItem[] = [
    { text: "Paralegal case review — a trained paralegal reviews your claim summary, uploaded documents, damages, and filing packet before you submit." },
    { text: "Document, evidence, and exhibit review — identifies missing information, organizes receipts, contracts, photos, messages, invoices, and estimates, and ensures your written explanation and selected evidence are clear for the court." },
    { text: "30-minute paralegal support session — talk by phone or Zoom to walk through your case, documents, filing steps, evidence, and hearing preparation.", bold: true },
    { text: "Court-form review support — helps confirm that names, addresses, claim amount, parties, dates, and case details appear complete and consistent." },
    { text: "Paralegal support at your hearing by Zoom to provide non-attorney procedural and organizational support.", bold: true },
    { text: "Filing and service guidance — helps you understand the basic filing sequence, court-stamped copies, service of the defendant, and proof of service requirements." },
  ];
  const featuresEs: FeatureItem[] = [
    { text: "Revisión del caso por paralegal — un paralegal capacitado revisa el resumen de tu reclamación, documentos subidos, daños y paquete de presentación antes de que lo envíes." },
    { text: "Revisión de documentos, evidencia y anexos — identifica información faltante, organiza recibos, contratos, fotos, mensajes, facturas y estimaciones, y asegura que tu explicación escrita y evidencia seleccionada sean claras para el tribunal." },
    { text: "Sesión de apoyo paralegal de 30 minutos — habla por teléfono o Zoom para repasar tu caso, documentos, pasos de presentación, evidencia y preparación para la audiencia.", bold: true },
    { text: "Apoyo en revisión de formularios — ayuda a confirmar que los nombres, direcciones, monto de la reclamación, partes, fechas y detalles del caso aparezcan completos y consistentes." },
    { text: "Apoyo paralegal en tu audiencia por Zoom para brindar apoyo procesal y organizacional no-abogado.", bold: true },
    { text: "Orientación de presentación y notificación — ayuda a entender la secuencia básica de presentación, copias selladas por el tribunal, notificación al demandado y requisitos de prueba de notificación." },
  ];
  const features = es ? featuresEs : featuresEn;
  return (
    <section className="bg-white rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.12)] p-[18px_20px] flex flex-col relative border-[3px] border-[#6366f1]">

      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#6366f1] text-white text-[11px] font-black px-3 py-1 rounded-full whitespace-nowrap tracking-wide shadow">
        {es ? "APOYO PARALEGAL ADICIONAL" : "ADD-ON PARALEGAL SUPPORT"}
      </div>

      <div className="pb-4 pt-1 h-[138px] flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <UserCheck className="w-5 h-5 text-[#6366f1] shrink-0" />
          <p className="text-xl font-black tracking-tight text-[#0d6b5e] leading-tight">{es ? "Genie Plus: Revisión Paralegal" : "Genie Plus: Paralegal Review"}</p>
        </div>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          {es ? "Las herramientas de IA de Small Claims Genie más revisión personalizada de documentos y apoyo en la preparación de la audiencia de un paralegal capacitado." : "Small Claims Genie's AI tools plus personalized document review and hearing preparation support from a trained paralegal."}
        </p>
      </div>

      <div className="mb-4 h-[90px] grid grid-cols-1">
        <button
          onClick={() => loadingKey === null && onCheckout("paralegal")}
          disabled={loadingKey !== null}
          className="w-full h-full rounded-xl px-3 text-center border-2 border-[#6366f1] bg-[#f5f3ff] transition-all flex flex-col items-center justify-center cursor-pointer group hover:bg-[#ede9fe] hover:border-[#4f46e5] hover:shadow-[0_0_0_3px_rgba(99,102,241,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loadingKey === "paralegal" ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#6366f1]" />
          ) : (
            <>
              <span className="block text-[26px] font-black tracking-[-0.05em] leading-none text-[#6366f1]">$159</span>
              <span className="block text-[11px] font-bold text-[#33405c] mt-1">{es ? "tarifa única" : "flat fee"}</span>
              <span className="block text-[10px] font-bold text-[#6366f1] group-hover:text-[#4f46e5] mt-[3px] transition-colors">{es ? "Agregar Revisión Paralegal" : "Add Paralegal Review"}</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-[#f5f3ff] border border-[#c7d2fe] rounded-xl p-[8px_12px] mb-4 h-[88px] flex flex-col justify-center">
        <strong className="block text-[13px] text-[#4338ca] mb-[2px] leading-[1.25]">{es ? "Ideal para casos con mucha documentación o mayor complejidad." : "Best for document-heavy or higher-stress cases."}</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">{es ? "Para usuarios que quieren otra revisión del papeleo antes de presentar o comparecer ante el tribunal." : "For users who want another set of eyes on the paperwork before they file or appear in court."}</span>
      </div>

      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-5">
        {features.map(({ text, bold }) => (
          <li key={text} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[#6366f1] text-[#6366f1] inline-flex items-center justify-center text-[11px] font-black mt-[2px]">✓</span>
            <span className={bold ? "font-bold" : ""}>{text}</span>
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-[#8a96a8] text-center">{es ? "Tarifa única. Sin suscripción." : "One-time flat fee. No subscription."}</p>

    </section>
  );
}

function CollectionCard({ loadingKey, onCheckout }: { loadingKey: PlanKey | null; onCheckout: (k: PlanKey) => void }) {
  const { lang } = useLanguage();
  const es = lang === "es";
  const featuresEn = [
    "Writ of Execution — the court order that authorizes the sheriff to seize the debtor's assets on your behalf.",
    "Wage Garnishment — directs the debtor's employer to withhold a portion of each paycheck and pay it to you.",
    "Bank Levy — freezes funds in the debtor's bank account and transfers the balance to satisfy your judgment.",
    "Abstract of Judgment — creates a legal lien on any real property the debtor owns.",
    "Judgment Renewal — extends the life of your judgment so you never lose your right to collect.",
    "AI enforcement strategy — tells you which method to use first based on what you know about the debtor.",
    "Step-by-step collection workflow — no guesswork on what to file next or where to go.",
    "Debtor asset identification guide — know where to look before you levy.",
  ];
  const featuresEs = [
    "Mandamiento de Ejecución — la orden judicial que autoriza al alguacil a incautar los bienes del deudor en tu nombre.",
    "Embargo de Salario — ordena al empleador del deudor retener una parte de cada cheque de pago y pagártela.",
    "Embargo Bancario — congela fondos en la cuenta bancaria del deudor y transfiere el saldo para satisfacer tu fallo.",
    "Abstracto de Fallo — crea un gravamen legal sobre cualquier propiedad inmueble que posea el deudor.",
    "Renovación del Fallo — extiende la vigencia de tu fallo para que nunca pierdas tu derecho a cobrar.",
    "Estrategia de ejecución con IA — te dice qué método usar primero según lo que sabes sobre el deudor.",
    "Flujo de trabajo de cobro paso a paso — sin adivinar qué presentar después o adónde ir.",
    "Guía de identificación de activos del deudor — sabe dónde buscar antes de ejecutar el embargo.",
  ];
  const features = es ? featuresEs : featuresEn;
  return (
    <section className="bg-white border-[3px] border-amber-400 rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.09)] p-[18px_20px] flex flex-col relative">

      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[11px] font-black px-3 py-1 rounded-full whitespace-nowrap tracking-wide shadow">
        {es ? "ADICIONAL DESPUÉS DE GANAR" : "ADD-ON AFTER YOU WIN"}
      </div>

      <div className="pb-4 pt-1 h-[138px] flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xl font-black tracking-tight text-[#0d6b5e] leading-tight">{es ? "Cobro Post-Fallo" : "Post-Judgment Collection"}</p>
        </div>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          {es ? "¿Ganaste tu caso pero el demandado aún no ha pagado? Este complemento te da todas las herramientas legales disponibles para forzar el cobro." : "Won your case but the defendant still hasn't paid? This add-on gives you every legal tool available to force collection."}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 h-[90px]">
        {([
          { key: "collection_low" as PlanKey, price: "$69", label: es ? "Hasta $5,000" : "Up to $5,000" },
          { key: "collection_high" as PlanKey, price: "$99", label: "$5,000+" },
        ]).map(({ key, price, label }) => (
          <button
            key={key}
            onClick={() => loadingKey === null && onCheckout(key)}
            disabled={loadingKey !== null}
            className="h-full rounded-xl px-3 text-center border-2 border-amber-400 bg-amber-50 transition-all flex flex-col items-center justify-center cursor-pointer group hover:bg-amber-100 hover:border-amber-500 hover:shadow-[0_0_0_3px_rgba(245,158,11,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingKey === key ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            ) : (
              <>
                <span className="block text-[26px] font-black tracking-[-0.05em] leading-none text-[#0d6b5e]">{price}</span>
                <span className="block text-[11px] font-bold text-[#33405c] mt-1">{label}</span>
                <span className="block text-[10px] font-bold text-amber-500 group-hover:text-amber-600 mt-[3px] transition-colors">{es ? "Iniciar Ayuda de Cobro" : "Start Collection Help"}</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-[8px_12px] mb-4 h-[88px] flex flex-col justify-center">
        <strong className="block text-[13px] text-[#92400e] mb-[2px] leading-[1.25]">{es ? "Ideal para ganadores que aún necesitan cobrar." : "Best for winners who still need to collect."}</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">{es ? "Cada herramienta de ejecución que la ley proporciona — mandamientos, embargos, retenciones y gravámenes — en un flujo de trabajo guiado." : "Every enforcement tool the law provides — writs, levies, garnishments, and liens — in one guided workflow."}</span>
      </div>

      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-5">
        {features.map((f) => (
          <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-amber-500 text-amber-500 inline-flex items-center justify-center text-[11px] font-black mt-[2px]">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-[#8a96a8] text-center">{es ? <>Cuando ganas y se dicta el fallo.<br />Tarifa única.</> : <>When you win &amp; judgment is entered.<br />One-time flat fee.</>}</p>

    </section>
  );
}

export default function Pricing() {
  const { lang } = useLanguage();
  const es = lang === "es";
  const { getToken, isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const [loadingKey, setLoadingKey] = useState<PlanKey | null>(null);
  const [addOnModal, setAddOnModal] = useState<{ planKey: PlanKey; label: string } | null>(null);
  // Single state drives the combined terms + sign-up modal
  const [checkoutModal, setCheckoutModal] = useState<PlanKey | null>(null);
  const [cancelledBanner, setCancelledBanner] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("payment") === "cancelled";
  });

  // Plan button click — always show the combined terms/sign-up modal first
  const handleCheckout = (planKey: PlanKey) => {
    setCheckoutModal(planKey);
  };

  const proceedToCheckout = (planKey: PlanKey) => {
    if (planKey.startsWith("personal_") || planKey.startsWith("business_")) {
      const label = planKey.startsWith("personal_") ? "Personal Case" : "Business Case";
      setAddOnModal({ planKey, label });
    } else {
      startCheckout(getToken, [planKey], setLoadingKey, navigate);
    }
  };

  // Called when terms accepted (signed-in) or sign-up + verification complete (new user)
  const handleCheckoutConfirm = () => {
    const planKey = checkoutModal;
    setCheckoutModal(null);
    if (!planKey) return;
    proceedToCheckout(planKey);
  };

  const handleModalConfirm = (addParalegal: boolean) => {
    if (!addOnModal) return;
    const keys: PlanKey[] = addParalegal
      ? [addOnModal.planKey, "paralegal"]
      : [addOnModal.planKey];
    setAddOnModal(null);
    startCheckout(getToken, keys, setLoadingKey, navigate);
  };

  return (
    <div className="min-h-screen bg-[#f0faf8]">
      <Helmet>
        <title>Pricing — Small Claims Genie</title>
        <meta name="description" content="Free to start. Pay only to download your court-ready forms. See all plans including Genie+ for unlimited access." />
        <link rel="canonical" href="https://smallclaimsgenie.com/pricing" />
        <meta property="og:url" content="https://smallclaimsgenie.com/pricing" />
        <meta property="og:title" content="Pricing — Small Claims Genie" />
        <meta property="og:description" content="Free to start. Pay only to download your court-ready forms. See all plans including Genie+ for unlimited access." />
        <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "url": "https://smallclaimsgenie.com/pricing",
          "name": "Pricing — Small Claims Genie",
          "description": "Free to start. Pay only to download your court-ready forms. See all plans including Genie+ for unlimited access.",
          "isPartOf": { "@id": "https://smallclaimsgenie.com/#website" },
        })}</script>
      </Helmet>
      {checkoutModal && (
        <TermsAndSignUpModal
          alreadySignedIn={!!isSignedIn}
          onConfirm={handleCheckoutConfirm}
          onDismiss={() => setCheckoutModal(null)}
        />
      )}
      {addOnModal && (
        <ParalegalAddOnModal
          basePlanKey={addOnModal.planKey}
          baseLabel={addOnModal.label}
          onConfirm={handleModalConfirm}
          onDismiss={() => setAddOnModal(null)}
          isLoading={loadingKey !== null}
        />
      )}

      <div className="w-full px-7 pb-10 pt-6 flex flex-col items-center">

        {cancelledBanner && (
          <div className="w-full max-w-[1400px] mb-5 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
            <span className="text-amber-500 mt-0.5 shrink-0 text-base">⚠</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">{es ? "Pago no completado." : "Payment not completed."}</p>
              <p className="text-xs text-amber-700 mt-0.5">{es ? "Saliste antes de terminar el proceso de pago. No se realizó ningún cargo. Selecciona un plan abajo cuando estés listo." : "You left before finishing checkout. No charge was made. Select a plan below whenever you're ready."}</p>
            </div>
            <button onClick={() => setCancelledBanner(false)} className="text-amber-400 hover:text-amber-600 transition-colors mt-0.5 shrink-0" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[#0d6b5e] shrink-0" />
            <h1 className="text-[clamp(28px,2.8vw,42px)] font-black tracking-[-0.04em] leading-none text-[#0d6b5e]">
              {es ? "Garantía de Devolución de 30 Días" : "30-Day Money-Back Guarantee"}
            </h1>
          </div>
        </div>

        <div className="w-full max-w-[1400px] mx-auto mb-5 flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
          <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <p className="text-sm text-indigo-700 font-medium">
            <span className="text-indigo-500 font-normal mr-1">{es ? "Disponible en" : "Available in"}</span>
            <span className="sm:hidden">{SUPPORTED_STATES.map(s => s.abbr).join(" · ")}</span>
            <span className="hidden sm:inline">{SUPPORTED_STATES.map(s => s.name).join(" · ")}</span>
            <span className="hidden sm:inline text-indigo-400 font-normal ml-2">{es ? "· Más estados próximamente" : "· Additional states coming soon"}</span>
          </p>
        </div>

        <div className="w-full max-w-[1400px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          <PersonalCard loadingKey={loadingKey} onCheckout={handleCheckout} />
          <BusinessCard loadingKey={loadingKey} onCheckout={handleCheckout} />
          <GeniePlusCard loadingKey={loadingKey} onCheckout={handleCheckout} />
          <CollectionCard loadingKey={loadingKey} onCheckout={handleCheckout} />
        </div>

        <p className="mt-6 text-center text-[12px] text-[#8a96a8] max-w-md">
          {es ? "Todos los planes incluyen chat con IA, carga de documentos, cobertura completa de estados y condados, y recordatorios por correo electrónico." : "All plans include AI chat, document uploads, full state and county coverage, and email reminders."}
        </p>

        <div className="mt-8 w-full max-w-xl mx-auto border-2 border-[#a8e6df] rounded-2xl px-8 py-7 text-center bg-[#f0fffe]">
          <h2 className="text-lg font-black text-primary mb-1.5">{es ? "¿Tienes preguntas sobre qué plan es el adecuado para ti?" : "Have questions about which plan is right for you?"}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {es ? "Pregunta al Genie — describe tu situación y obtén una recomendación personalizada en español. Gratis, sin necesidad de cuenta." : "Ask the Genie — describe your situation and get a personalized recommendation in plain English. Free, no account required."}
          </p>
          <button
            onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
            className="inline-flex items-center gap-2 h-11 px-7 rounded-full bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 shadow-sm transition-colors"
          >
            <Wand2 className="h-4 w-4" />
            {es ? "Pregunta al Genie — Gratis" : "Ask the Genie — Free"}
          </button>
        </div>

      </div>
    </div>
  );
}
