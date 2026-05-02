import { Link } from "wouter";
import { Wand2, Trophy, UserCheck } from "lucide-react";

const CHECK = (
  <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[#0d6b5e] text-[#0d6b5e] inline-flex items-center justify-center text-[11px] font-black mt-[2px]">
    ✓
  </span>
);

function PricingCard({
  plan,
  tagline,
  price,
  priceSub,
  valueBold,
  valueSub,
  features,
  ctaLabel,
  ctaHref,
  badge,
  highlight,
}: {
  plan: string;
  tagline: string;
  price: string;
  priceSub: string;
  valueBold: string;
  valueSub: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <section className={`bg-white rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.09)] p-[18px_20px] flex flex-col relative ${highlight ? "border-[3px] border-[#14b8a6]" : "border-[3px] border-[#14b8a6]/60"}`}>

      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0d6b5e] text-white text-[11px] font-black px-3 py-1 rounded-full whitespace-nowrap tracking-wide shadow">
          {badge}
        </div>
      )}

      {/* Plan name + tagline */}
      <div className="pb-4 pt-1">
        <p className="text-xl font-black tracking-tight text-[#0d6b5e] mb-1.5 leading-tight">{plan}</p>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">{tagline}</p>
      </div>

      {/* Price */}
      <div className="pb-4 flex items-end gap-2">
        <span className="text-[32px] font-black tracking-[-0.05em] leading-none text-[#0d6b5e]">{price}</span>
        <span className="text-[14px] font-extrabold pb-[3px] text-[#33405c]">{priceSub}</span>
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

      {/* CTA */}
      <div className="flex flex-col items-center gap-2">
        <Link
          href={ctaHref}
          className="flex items-center justify-center gap-2 w-full rounded-full bg-[#0d6b5e] hover:bg-[#0a5a4f] text-white text-[15px] font-black min-h-[56px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors no-underline"
        >
          <Wand2 className="w-4 h-4 flex-shrink-0" />
          {ctaLabel}
        </Link>
        <p className="text-[12px] text-[#8a96a8] text-center">One-time flat fee. No subscription.</p>
      </div>

    </section>
  );
}

function GeniePlusCard() {
  return (
    <section className="bg-white rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.12)] p-[18px_20px] flex flex-col relative border-[3px] border-[#6366f1]">

      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#6366f1] text-white text-[11px] font-black px-3 py-1 rounded-full whitespace-nowrap tracking-wide shadow">
        MOST SUPPORT
      </div>

      {/* Plan name + tagline */}
      <div className="pb-4 pt-1">
        <div className="flex items-center gap-2 mb-1.5">
          <UserCheck className="w-5 h-5 text-[#6366f1] shrink-0" />
          <p className="text-xl font-black tracking-tight text-[#0d6b5e] leading-tight">Genie Plus: Paralegal Review</p>
        </div>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          Small Claims Genie's AI tools plus personalized document review and hearing preparation support from a trained paralegal.
        </p>
      </div>

      {/* Price */}
      <div className="pb-4 flex items-end gap-2">
        <span className="text-[32px] font-black tracking-[-0.05em] leading-none text-[#6366f1]">$159</span>
        <span className="text-[14px] font-extrabold pb-[3px] text-[#33405c]">flat fee</span>
      </div>

      {/* Value box */}
      <div className="bg-[#f5f3ff] border border-[#c7d2fe] rounded-xl p-[8px_12px] mb-4">
        <strong className="block text-[13px] text-[#4338ca] mb-[2px] leading-[1.25]">Best for document-heavy or higher-stress cases.</strong>
        <span className="block text-[11px] text-[#5a6478] leading-[1.3]">For users who want another set of eyes on the paperwork before they file or appear in court.</span>
      </div>

      {/* Features */}
      <ul className="flex-1 list-none p-0 m-0 grid gap-[8px] content-start mb-5">
        {[
          "Paralegal case review — a trained paralegal reviews your claim summary, uploaded documents, damages, and filing packet before you submit.",
          "Document review before filing — helps identify missing information, unclear facts, incomplete evidence, or documents that may need correction.",
          "One-hour paralegal support session — talk by phone or Zoom to walk through your case, documents, filing steps, evidence, and hearing preparation.",
          "Court-form review support — helps confirm that names, addresses, claim amount, parties, dates, and case details appear complete and consistent.",
          "Evidence organization review — helps organize receipts, contracts, photos, messages, emails, invoices, estimates, and proof of payment.",
          "Declaration and exhibit review — helps make sure your written explanation and selected evidence are organized clearly for the court.",
          "Hearing preparation checklist — shows what to print, what to bring, how many copies to prepare, and what issues to be ready to explain.",
          "Zoom hearing support availability — a paralegal can be available during your court hearing to provide non-attorney procedural and organizational support.",
          "Filing and service guidance — helps you understand the basic filing sequence, court-stamped copies, service of the defendant, and proof of service requirements.",
        ].map((f) => (
          <li key={f} className="flex gap-[8px] items-start text-[#20304f] text-[14px] leading-[1.35]">
            <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[#6366f1] text-[#6366f1] inline-flex items-center justify-center text-[11px] font-black mt-[2px]">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/cases/new"
          className="flex items-center justify-center gap-2 w-full rounded-full bg-[#6366f1] hover:bg-[#4f46e5] text-white text-[15px] font-black min-h-[56px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors no-underline"
        >
          <UserCheck className="w-4 h-4 flex-shrink-0" />
          Get Paralegal Support
        </Link>
        <p className="text-[12px] text-[#8a96a8] text-center">One-time flat fee. No subscription.</p>
      </div>

    </section>
  );
}

function CollectionCard() {
  return (
    <section className="bg-white border-[3px] border-amber-400 rounded-[24px] shadow-[0_14px_32px_rgba(13,107,94,0.09)] p-[18px_20px] flex flex-col relative">

      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[11px] font-black px-3 py-1 rounded-full whitespace-nowrap tracking-wide shadow">
        ADD-ON AFTER YOU WIN
      </div>

      {/* Plan name + tagline */}
      <div className="pb-4 pt-1">
        <div className="flex items-center gap-2 mb-1.5">
          <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xl font-black tracking-tight text-[#0d6b5e] leading-tight">Post-Judgment Collection</p>
        </div>
        <p className="text-[13px] text-[#5a6478] leading-[1.4]">
          Won your case but the defendant still hasn't paid? This add-on gives you every tool California law provides to force collection.
        </p>
      </div>

      {/* Tiered pricing */}
      <div className="pb-4 grid grid-cols-2 gap-3">
        <div className="bg-[#f7f9fc] border border-[#e3e8f0] rounded-xl p-[10px_12px] text-center">
          <span className="block text-[26px] font-black tracking-[-0.05em] leading-none text-[#0d6b5e]">$89</span>
          <span className="block text-[11px] font-bold text-[#33405c] mt-1">Judgments up to $5,000</span>
        </div>
        <div className="bg-[#f7f9fc] border border-[#e3e8f0] rounded-xl p-[10px_12px] text-center">
          <span className="block text-[26px] font-black tracking-[-0.05em] leading-none text-[#0d6b5e]">$99</span>
          <span className="block text-[11px] font-bold text-[#33405c] mt-1">Judgments $5,000 and above</span>
        </div>
      </div>

      {/* Features */}
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

      {/* CTA */}
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/cases/new"
          className="flex items-center justify-center gap-2 w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[15px] font-black min-h-[56px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors no-underline"
        >
          <Trophy className="w-4 h-4 flex-shrink-0" />
          Add Collection Tools
        </Link>
        <p className="text-[12px] text-[#8a96a8] text-center">Available after your judgment is entered. One-time flat fee.</p>
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
        <div className="w-full max-w-[1400px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          <PricingCard
            plan="Personal Case"
            tagline="For person-versus-person disputes only, such as conflicts with a neighbor, roommate, acquaintance, friend, or other individual."
            price="$69"
            priceSub="flat fee"
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
            ctaHref="/cases/new"
          />

          <PricingCard
            plan="Business Case"
            tagline="For any case involving a business on either side, including a business suing an individual or an individual suing a business."
            price="$89"
            priceSub="flat fee"
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
            ctaHref="/cases/new"
            highlight
          />

          <GeniePlusCard />

          <CollectionCard />
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-[12px] text-[#8a96a8] max-w-md">
          All plans include AI chat, document uploads, all 58 California counties, and email reminders.
        </p>

      </div>
    </div>
  );
}
