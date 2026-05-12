import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import { Trophy, UserCheck, Loader2, X } from "lucide-react";

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
  personal_low: 79,
  personal_high: 99,
  business_low: 99,
  business_high: 109,
  paralegal: 159,
  collection_low: 89,
  collection_high: 109,
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

function CheckoutButton({
  planKey,
  label,
  icon,
  className,
  loadingKey,
  onCheckout,
}: {
  planKey: PlanKey;
  label: string;
  icon: React.ReactNode;
  className: string;
  loadingKey: PlanKey | null;
  onCheckout: (planKey: PlanKey) => void;
}) {
  const isLoading = loadingKey === planKey;
  const isDisabled = loadingKey !== null;
  return (
    <button
      onClick={() => !isDisabled && onCheckout(planKey)}
      disabled={isDisabled}
      className={`flex items-center justify-center gap-2 w-full rounded-full text-white text-[15px] font-black min-h-[56px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {isLoading ? "Loading…" : label}
    </button>
  );
}

function PersonalCard({ loadingKey, onCheckout }: { loadingKey: PlanKey | null; onCheckout: (k: PlanKey) => void }) {
  return (
    <section className="bg-white rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.09)] p-[18px_20px] flex flex-col relative border-[3px] border-[#14b8a6]/60">

      <div className="pb-4 pt-1 h-[138px] flex flex-col">
        <p className="text-xl font-black tracking-tight text-[#0d6b5e] mb-1.5 leading-tight">Personal Case</p>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          For person-versus-person disputes only, such as conflicts with a neighbor, roommate, acquaintance, friend, or other individual.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 h-[90px]">
        {([
          { key: "personal_low" as PlanKey, price: "$79", label: "Up to $5,000" },
          { key: "personal_high" as PlanKey, price: "$99", label: "$5,000 and above" },
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
                <span className="block text-[10px] font-bold text-[#14b8a6] group-hover:text-[#0d6b5e] mt-[3px] transition-colors">Buy →</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div className="bg-[#f7f9fc] border border-[#e3e8f0] rounded-xl p-[8px_12px] mb-4 h-[88px] flex flex-col justify-center">
        <strong className="block text-[13px] text-[#0d6b5e] mb-[2px] leading-[1.25]">Best for a straightforward consumer dispute.</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">Built to move a user from confusion to a cleaner, more organized filing package.</span>
      </div>

      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-4">
        {[
          "AI Case Advisor that helps organize your facts, spot weak points, and strengthen your claim before filing.",
          "Step-by-step guided intake that turns your story into a cleaner, more organized case package.",
          "Downloadable California small claims court forms, including SC-100 and SC-105 when applicable.",
          "Evidence organizer for receipts, screenshots, messages, photos, contracts, and records.",
          "Demand letter generator with a downloadable PDF you can send before filing.",
          "Case Readiness Score that shows what is complete, what is missing, and what to fix before court.",
          "Opening statement builder that helps you prepare a short, clear explanation for the judge.",
          "Mock hearing practice where AI plays the judge and asks questions so you can practice your answers.",
        ].map((f) => (
          <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            {CHECK}
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-[#8a96a8] text-center">One-time flat fee. No subscription.</p>

    </section>
  );
}

function BusinessCard({ loadingKey, onCheckout }: { loadingKey: PlanKey | null; onCheckout: (k: PlanKey) => void }) {
  return (
    <section className="bg-white rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.09)] p-[18px_20px] flex flex-col relative border-[3px] border-[#14b8a6]">

      <div className="pb-4 pt-1 h-[138px] flex flex-col">
        <p className="text-xl font-black tracking-tight text-[#0d6b5e] mb-1.5 leading-tight">Business Case</p>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          For any case involving a business on either side, including a business suing an individual or an individual suing a business.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 h-[90px]">
        {([
          { key: "business_low" as PlanKey, price: "$99", label: "Up to $5,000" },
          { key: "business_high" as PlanKey, price: "$109", label: "$5,000 and above" },
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
                <span className="block text-[10px] font-bold text-[#14b8a6] group-hover:text-[#0d6b5e] mt-[3px] transition-colors">Buy →</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div className="bg-[#f7f9fc] border border-[#e3e8f0] rounded-xl p-[8px_12px] mb-4 h-[88px] flex flex-col justify-center">
        <strong className="block text-[13px] text-[#0d6b5e] mb-[2px] leading-[1.25]">Best for more document-heavy disputes.</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">Designed for cases where the facts are commercial, the records matter more, and the user needs tighter structure.</span>
      </div>

      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-4">
        {[
          "AI Business Case Advisor that helps organize your facts, damages, records, and claim strategy.",
          "Guided business case intake that turns invoices, contracts, payments, dates, and communications into a cleaner case package.",
          "Downloadable court ready small claims court forms to submit and serve the defendant.",
          "Evidence organizer for invoices, estimates, contracts, warranties, payment records, messages, and business documents.",
          "Demand letter generator with a downloadable PDF you can send before filing.",
          "Case Readiness Score that shows what is complete, what is missing, and what to fix before court.",
          "Opening statement builder that helps you explain the dispute, damages, and proof clearly.",
          "Mock hearing practice focused on records, damages, credibility, and likely judge questions.",
        ].map((f) => (
          <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            {CHECK}
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-[#8a96a8] text-center">One-time flat fee. No subscription.</p>

    </section>
  );
}

function GeniePlusCard({ loadingKey, onCheckout }: { loadingKey: PlanKey | null; onCheckout: (k: PlanKey) => void }) {
  return (
    <section className="bg-white rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.12)] p-[18px_20px] flex flex-col relative border-[3px] border-[#6366f1]">

      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#6366f1] text-white text-[11px] font-black px-3 py-1 rounded-full whitespace-nowrap tracking-wide shadow">
        ADD-ON PARALEGAL SUPPORT
      </div>

      <div className="pb-4 pt-1 h-[138px] flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <UserCheck className="w-5 h-5 text-[#6366f1] shrink-0" />
          <p className="text-xl font-black tracking-tight text-[#0d6b5e] leading-tight">Genie Plus: Paralegal Review</p>
        </div>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          Small Claims Genie's AI tools plus personalized document review and hearing preparation support from a trained paralegal.
        </p>
      </div>

      <div className="mb-4 h-[90px]">
        <div className="h-full rounded-xl px-3 text-center border-2 border-[#6366f1] bg-[#f5f3ff] ring-2 ring-[#6366f1] flex flex-col items-center justify-center">
          <span className="block text-[26px] font-black tracking-[-0.05em] leading-none text-[#6366f1]">$159</span>
          <span className="block text-[11px] font-bold text-[#33405c] mt-1">flat fee</span>
        </div>
      </div>

      <div className="bg-[#f5f3ff] border border-[#c7d2fe] rounded-xl p-[8px_12px] mb-4 h-[88px] flex flex-col justify-center">
        <strong className="block text-[13px] text-[#4338ca] mb-[2px] leading-[1.25]">Best for document-heavy or higher-stress cases.</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">For users who want another set of eyes on the paperwork before they file or appear in court.</span>
      </div>

      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-5">
        {([
          { text: "Paralegal case review — a trained paralegal reviews your claim summary, uploaded documents, damages, and filing packet before you submit." },
          { text: "Document, evidence, and exhibit review — identifies missing information, organizes receipts, contracts, photos, messages, invoices, and estimates, and ensures your written explanation and selected evidence are clear for the court." },
          { text: "30-minute paralegal support session — talk by phone or Zoom to walk through your case, documents, filing steps, evidence, and hearing preparation.", bold: true },
          { text: "Court-form review support — helps confirm that names, addresses, claim amount, parties, dates, and case details appear complete and consistent." },
          { text: "Paralegal support at your hearing by Zoom to provide non-attorney procedural and organizational support.", bold: true },
          { text: "Filing and service guidance — helps you understand the basic filing sequence, court-stamped copies, service of the defendant, and proof of service requirements." },
        ] as { text: string; bold?: boolean }[]).map(({ text, bold }) => (
          <li key={text} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[#6366f1] text-[#6366f1] inline-flex items-center justify-center text-[11px] font-black mt-[2px]">✓</span>
            <span className={bold ? "font-bold" : ""}>{text}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-2">
        <CheckoutButton
          planKey="paralegal"
          label="Add-On Paralegal Support"
          icon={<UserCheck className="w-4 h-4 flex-shrink-0" />}
          className="bg-[#6366f1] hover:bg-[#4f46e5]"
          loadingKey={loadingKey}
          onCheckout={onCheckout}
        />
        <p className="text-[12px] text-[#8a96a8] text-center">One-time flat fee. No subscription.</p>
      </div>

    </section>
  );
}

function CollectionCard({ loadingKey, onCheckout }: { loadingKey: PlanKey | null; onCheckout: (k: PlanKey) => void }) {
  const [selectedTier, setSelectedTier] = useState<"collection_low" | "collection_high">("collection_low");

  return (
    <section className="bg-white border-[3px] border-amber-400 rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.09)] p-[18px_20px] flex flex-col relative">

      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[11px] font-black px-3 py-1 rounded-full whitespace-nowrap tracking-wide shadow">
        ADD-ON AFTER YOU WIN
      </div>

      <div className="pb-4 pt-1 h-[138px] flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xl font-black tracking-tight text-[#0d6b5e] leading-tight">Post-Judgment Collection</p>
        </div>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          Won your case but the defendant still hasn't paid? This add-on gives you every tool California law provides to force collection.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 h-[90px]">
        <button
          onClick={() => setSelectedTier("collection_low")}
          className={`h-full rounded-xl px-3 text-center border transition-all flex flex-col items-center justify-center ${selectedTier === "collection_low" ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400" : "bg-[#f7f9fc] border-[#e3e8f0]"}`}
        >
          <span className="block text-[26px] font-black tracking-[-0.05em] leading-none text-[#0d6b5e]">$89</span>
          <span className="block text-[11px] font-bold text-[#33405c] mt-1">Up to $5,000</span>
        </button>
        <button
          onClick={() => setSelectedTier("collection_high")}
          className={`h-full rounded-xl px-3 text-center border transition-all flex flex-col items-center justify-center ${selectedTier === "collection_high" ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400" : "bg-[#f7f9fc] border-[#e3e8f0]"}`}
        >
          <span className="block text-[26px] font-black tracking-[-0.05em] leading-none text-[#0d6b5e]">$109</span>
          <span className="block text-[11px] font-bold text-[#33405c] mt-1">$5,000 and above</span>
        </button>
      </div>

      <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-[8px_12px] mb-4 h-[88px] flex flex-col justify-center">
        <strong className="block text-[13px] text-[#92400e] mb-[2px] leading-[1.25]">Best for winners who still need to collect.</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">Every enforcement tool California law provides — writs, levies, garnishments, and liens — in one guided workflow.</span>
      </div>

      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-5">
        {[
          "Writ of Execution — the court order that authorizes the sheriff to seize the debtor's assets on your behalf.",
          "Wage Garnishment — directs the debtor's employer to withhold a portion of each paycheck and pay it to you.",
          "Bank Levy — freezes funds in the debtor's bank account and transfers the balance to satisfy your judgment.",
          "Abstract of Judgment — creates a legal lien on any real property the debtor owns in California.",
          "Judgment Renewal — extends the life of your judgment so you never lose your right to collect.",
          "AI enforcement strategy — tells you which method to use first based on what you know about the debtor.",
          "Step-by-step collection workflow — no guesswork on what to file next or where to go.",
          "Debtor asset identification guide — know where to look before you levy.",
        ].map((f) => (
          <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-amber-500 text-amber-500 inline-flex items-center justify-center text-[11px] font-black mt-[2px]">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-2">
        <CheckoutButton
          planKey={selectedTier}
          label="Add Collection Tools"
          icon={<Trophy className="w-4 h-4 flex-shrink-0" />}
          className="bg-amber-500 hover:bg-amber-600"
          loadingKey={loadingKey}
          onCheckout={onCheckout}
        />
        <p className="text-[12px] text-[#8a96a8] text-center">When you win &amp; judgment is entered.<br />One-time flat fee.</p>
      </div>

    </section>
  );
}

export default function Pricing() {
  const { getToken } = useAuth();
  const [, navigate] = useLocation();
  const [loadingKey, setLoadingKey] = useState<PlanKey | null>(null);
  const [addOnModal, setAddOnModal] = useState<{ planKey: PlanKey; label: string } | null>(null);

  const handleCheckout = (planKey: PlanKey) => {
    if (planKey.startsWith("personal_") || planKey.startsWith("business_")) {
      const label = planKey.startsWith("personal_") ? "Personal Case" : "Business Case";
      setAddOnModal({ planKey, label });
    } else {
      startCheckout(getToken, [planKey], setLoadingKey, navigate);
    }
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

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[#0d6b5e] shrink-0" />
            <h1 className="text-[clamp(28px,2.8vw,42px)] font-black tracking-[-0.04em] leading-none text-[#0d6b5e]">
              Only Pay If You Win
            </h1>
          </div>
          <p className="text-[clamp(14px,1.1vw,17px)] text-[#5a6478] font-medium">
            Pick the plan that best fits your case.
          </p>
        </div>

        <div className="w-full max-w-[1400px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          <PersonalCard loadingKey={loadingKey} onCheckout={handleCheckout} />
          <BusinessCard loadingKey={loadingKey} onCheckout={handleCheckout} />
          <GeniePlusCard loadingKey={loadingKey} onCheckout={handleCheckout} />
          <CollectionCard loadingKey={loadingKey} onCheckout={handleCheckout} />
        </div>

        <p className="mt-6 text-center text-[12px] text-[#8a96a8] max-w-md">
          All plans include AI chat, document uploads, all 58 California counties, and email reminders.
        </p>

        <p className="mt-3 text-center text-[11px] text-[#8a96a8]">
          By purchasing, you agree to our{" "}
          <a href="/payment-terms" className="underline underline-offset-2 hover:text-[#0d6b5e] transition-colors">
            Payment Terms
          </a>
          , including pay-only-if-you-win and paralegal support conditions.
        </p>

      </div>
    </div>
  );
}
