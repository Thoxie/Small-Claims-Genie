import { Link } from "wouter";
import { Wand2 } from "lucide-react";

const CHECK = (
  <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[#0d6b5e] text-[#0d6b5e] inline-flex items-center justify-center text-[11px] font-black mt-[2px]">
    ✓
  </span>
);

function PricingCard({
  plan,
  tagline,
  price,
  addonText,
  addonCopy,
  valueBold,
  valueSub,
  features,
  ctaLabel,
}: {
  plan: string;
  tagline: string;
  price: string;
  addonText: string;
  addonCopy: string;
  valueBold: string;
  valueSub: string;
  features: string[];
  ctaLabel: string;
}) {
  return (
    <section className="bg-white border-[3px] border-[#14b8a6]/60 rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.09)] p-[18px_20px] flex flex-col">

      {/* Plan name + tagline */}
      <div className="pb-4">
        <p className="text-xl font-black tracking-tight text-[#0d6b5e] mb-1.5 leading-tight">{plan}</p>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">{tagline}</p>
      </div>

      {/* Price — no subline */}
      <div className="pb-4 flex items-end gap-2">
        <span className="text-[32px] font-black tracking-[-0.05em] leading-none text-[#0d6b5e]">{price}</span>
        <span className="text-[14px] font-extrabold pb-[3px] text-[#33405c]">/ month</span>
      </div>

      {/* Add-on box */}
      <div className="flex items-start gap-3 p-[10px_12px] rounded-[14px] bg-[#f0faf8] border border-[#14b8a6]/40 mb-4">
        <div className="flex-shrink-0 w-4 h-4 mt-[3px] rounded-full border-2 border-[#0d6b5e]/50 bg-white relative">
          <div className="absolute inset-[3px] rounded-full bg-[#14b8a6] opacity-25" />
        </div>
        <div>
          <p className="text-[13px] font-black text-[#0d6b5e] leading-[1.2] m-0">{addonText}</p>
          <p className="text-[12px] text-[#5a6478] mt-[2px] leading-[1.35]">{addonCopy}</p>
        </div>
      </div>

      {/* Value box */}
      <div className="bg-[#f7f9fc] border border-[#e3e8f0] rounded-xl p-[8px_12px] mb-4">
        <strong className="block text-[13px] text-[#0d6b5e] mb-[2px] leading-[1.25]">{valueBold}</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">{valueSub}</span>
      </div>

      {/* Features */}
      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-5">
        {features.map((f) => (
          <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            {CHECK}
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA + cancel note */}
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/cases/new"
          className="flex items-center justify-center gap-2 w-full rounded-full bg-[#0d6b5e] hover:bg-[#0a5a4f] text-white text-[15px] font-black min-h-[56px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors no-underline"
        >
          <Wand2 className="w-4 h-4 flex-shrink-0" />
          {ctaLabel}
        </Link>
        <p className="text-[12px] text-[#8a96a8] text-center">Cancel anytime. No contracts.</p>
      </div>

    </section>
  );
}

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#f0faf8]">
      <div className="w-full px-7 pb-10 pt-6 flex flex-col items-center">

        {/* Hero */}
        <div className="text-center mb-5">
          <h1 className="text-[clamp(18px,1.6vw,24px)] font-black tracking-[-0.03em] leading-tight text-[#0d6b5e]">
            Pick the plan that best fits your case.
          </h1>
        </div>

        {/* Grid */}
        <div className="w-full max-w-[960px] grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          <PricingCard
            plan="Personal Case"
            tagline="For person-versus-person disputes only, such as conflicts with a neighbor, roommate, acquaintance, friend, or other individual."
            price="$79"
            addonText="Add an additional case anytime for +$49"
            addonCopy="Separate workspace, separate documents, separate timeline, and separate prep flow."
            valueBold="Best for a straightforward consumer dispute."
            valueSub="Built to move a user from confusion to a cleaner, more organized filing package."
            features={[
              "Guided case intake that organizes your facts, dates, damages, and parties fast.",
              "AI case evaluation to identify weak points, missing proof, and stronger framing.",
              "Step-by-step help preparing court-ready forms and filing information.",
              "Evidence checklist for receipts, screenshots, messages, photos, contracts, and records.",
              "Demand letter support before filing so your claim starts cleaner and stronger.",
              "Hearing prep workflow so you know what to bring, what to say, and what matters.",
            ]}
            ctaLabel="Start Personal Case"
          />

          <PricingCard
            plan="Business Case"
            tagline="For any case involving a business on either side, including a business suing an individual or an individual suing a business."
            price="$99"
            addonText="Add an additional case anytime for +$59"
            addonCopy="Useful for a second defendant, another dispute, or a separate claim track under the same account."
            valueBold="Best for more document-heavy disputes."
            valueSub="Designed for cases where the facts are commercial, the records matter more, and the user needs tighter structure."
            features={[
              "Guided business case intake that organizes your facts, dates, damages, parties, and business records fast.",
              "AI review of your facts and uploads to tighten the claim story before filing.",
              "Support preparing court-ready filing details with clearer damages and requested relief.",
              "Evidence guidance for estimates, invoices, communications, warranties, and proof of payment.",
              "Demand letter support to present a stronger pre-suit position and show reasonableness.",
              "Submission and hearing checklist so your exhibits, timeline, and records are easier to present.",
            ]}
            ctaLabel="Start Business Case"
          />
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-[12px] text-[#8a96a8] max-w-md">
          All plans include AI chat, document uploads, all 58 California counties, and email reminders.
        </p>

      </div>
    </div>
  );
}
