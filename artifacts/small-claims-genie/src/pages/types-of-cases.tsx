import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

const cases = [
  {
    title: "Personal Loans & IOUs",
    desc: "Unpaid personal loans, shared expenses, or repayment promises that never happened. We help you organize texts, payment trails, and a timeline that shows the agreement, the amount, and the failure to repay.",
  },
  {
    title: "Online Purchases",
    desc: "Non-delivery, counterfeit items, damaged goods, chargeback disputes, or refused refunds. We help you assemble order history, messages, tracking, photos, and the exact amount owed.",
  },
  {
    title: "Contractors / Home Services",
    desc: "Incomplete work, poor workmanship, delays, or payment disputes with contractors. We help you document scope, change requests, milestones, invoices, and the cost to finish or fix the work.",
  },
  {
    title: "Landlord / Tenant Disputes",
    desc: "Security deposit disputes, unlawful deductions, habitability issues, rent-related disputes, or repair reimbursement. We help you structure move-in/move-out evidence, repair quotes, written notices, and a damages breakdown that's easy for a judge to follow.",
  },
  {
    title: "Injury (Out-of-Pocket Costs)",
    desc: "Recover medical bills, treatment costs, replacement costs, and other out-of-pocket expenses from minor incidents. We help you package receipts, medical documentation, and a simple causation narrative that stays focused and credible.",
  },
  {
    title: "Auto Repair",
    desc: 'Disputes over bad repairs, overcharging, unauthorized work, "fixed" problems that return, or vehicles returned worse than before. We help you collect invoices, estimates, photos, and any expert notes to support a refund or repair-cost claim.',
  },
  {
    title: "Airlines and Travel Problems",
    desc: "Sue for lost baggage, delays, denied boarding, damaged items, or out-of-pocket expenses. We help you document what happened, what you spent, what you requested from the airline, and how to present it clearly in court.",
  },
  {
    title: "Airbnb / VRBO / Hotel Issues",
    desc: "File temporary vacation rental related claims for cancellations, unsafe conditions, property damage, withheld deposits, or misrepresentation. We help you organize messages, photos, receipts, and a clean timeline so your damages are easy to prove.",
  },
];

export default function TypesOfCases() {
  return (
    <div className="flex flex-col w-full bg-white">

      {/* ── Header ── */}
      <section className="px-6 pt-10 pb-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-primary mb-2">
            Types of Small Claims
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-4">
            Small Claims Genie helps you navigate small claims by identifying the right jurisdiction and venue,
            organizing your evidence, preparing court-ready documents, guiding service steps, and getting you ready for court.
          </p>
          <p className="text-sm font-bold text-primary">
            Here are some of the most common types of disputes we help you prepare:
          </p>
        </div>
      </section>

      {/* ── Case Type Boxes ── */}
      <section className="px-6 pb-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {cases.map(({ title, desc }) => (
              <div key={title} className="border-2 border-gray-200 rounded-xl p-5 bg-white">
                <h3 className="text-sm font-bold text-primary mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 pb-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="border-2 border-gray-200 rounded-xl px-6 py-6 bg-gray-50">
            <p className="text-sm text-muted-foreground mb-4">
              Not sure which one you have? Describe what happened in plain English. Small Claims Genie will classify the dispute, flag missing proof, and tell you the next step.
            </p>
            <Button asChild size="lg" className="h-10 px-7 text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-sm">
              <Link href="/cases/new">
                <Wand2 className="mr-2 h-4 w-4" />
                Ask the Genie
              </Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
