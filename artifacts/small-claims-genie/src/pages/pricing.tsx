import { Link } from "wouter";
import { Wand2 } from "lucide-react";

const CHECK = (
  <span className="flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 border-[#0d6b5e] text-[#0d6b5e] inline-flex items-center justify-center text-[13px] font-black mt-[2px]">
    ✓
  </span>
);

function PricingCard({
  plan,
  tagline,
  price,
  priceNote,
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
  priceNote: string;
  addonText: string;
  addonCopy: string;
  valueBold: string;
  valueSub: string;
  features: string[];
  ctaLabel: string;
}) {
  return (
    <section
      className="bg-white border-[3px] border-[#14b8a6]/60 rounded-[28px] shadow-[0_18px_40px_rgba(13,107,94,0.09)] p-[22px_24px] flex flex-col gap-0"
      style={{ minHeight: 760 }}
    >
      {/* Plan name + tagline */}
      <div className="pb-5">
        <p className="text-2xl font-black tracking-tight text-[#0d6b5e] mb-2 leading-tight">{plan}</p>
        <p className="text-[15px] text-[#5a6478] leading-[1.42]">{tagline}</p>
      </div>

      {/* Price */}
      <div className="pb-5">
        <div className="flex items-end gap-2 mb-1">
          <span className="text-[38px] font-black tracking-[-0.05em] leading-[.95] text-[#0d6b5e]">{price}</span>
          <span className="text-[18px] font-extrabold pb-[5px] text-[#33405c]">/ month</span>
        </div>
        <p className="text-[14px] text-[#5a6478] leading-[1.35]">{priceNote}</p>
      </div>

      {/* Add-on box */}
      <div className="flex items-start gap-3 p-[12px_14px] rounded-[18px] bg-[#f0faf8] border border-[#14b8a6]/40 mb-5">
        <div className="flex-shrink-0 w-5 h-5 mt-[3px] rounded-full border-2 border-[#0d6b5e]/50 bg-white relative">
          <div className="absolute inset-[4px] rounded-full bg-[#14b8a6] opacity-25" />
        </div>
        <div>
          <p className="text-[15px] font-black text-[#0d6b5e] leading-[1.2] m-0">{addonText}</p>
          <p className="text-[13px] text-[#5a6478] mt-[3px] leading-[1.35]">{addonCopy}</p>
        </div>
      </div>

      {/* Value box */}
      <div className="bg-[#f7f9fc] border border-[#e3e8f0] rounded-2xl p-[10px_12px] mb-5">
        <strong className="block text-[14px] text-[#0d6b5e] mb-[3px] leading-[1.25]">{valueBold}</strong>
        <span className="block text-[12px] text-[#5a6478] leading-[1.3]">{valueSub}</span>
      </div>

      {/* Features */}
      <ul className="flex-1 list-none p-0 m-0 grid gap-[10px] content-start mb-5">
        {features.map((f) => (
          <li key={f} className="flex gap-[10px] items-start text-[#20304f] text-[16px] leading-[1.36]">
            {CHECK}
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/cases/new"
        className="flex items-center justify-center gap-2 w-full rounded-full bg-[#0d6b5e] hover:bg-[#0a5a4f] text-white text-[17px] font-black min-h-[72px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors no-underline"
      >
        <Wand2 className="w-5 h-5 flex-shrink-0" />
        {ctaLabel}
      </Link>
    </section>
  );
}

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#f0faf8]">
      <div className="w-full min-h-screen px-7 pb-10 pt-6 flex flex-col items-center">

        {/* Hero */}
        <div className="text-center mb-4">
          <h1 className="text-[clamp(20px,1.8vw,26px)] font-black tracking-[-0.03em] leading-tight text-[#0d6b5e]">
            Pick the plan that best fits your case.
          </h1>
        </div>

        {/* Grid */}
        <div className="w-full max-w-[1120px] grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <PricingCard
            plan="Personal Case"
            tagline="For person-versus-person disputes only, such as conflicts with a neighbor, roommate, acquaintance, friend, or other individual."
            price="$79"
            priceNote="One active case with guided setup and filing support."
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
            priceNote="One active business-related matter with added document support."
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

        {/* Bottom note */}
        <p className="mt-8 text-center text-sm text-[#5a6478] max-w-lg">
          All plans include full access to AI chat, document uploads, all 58 California counties, and email reminders. Cancel any time.
        </p>

      </div>
    </div>
  );
}
