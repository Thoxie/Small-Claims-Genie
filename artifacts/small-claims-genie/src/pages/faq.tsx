import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

const faqs = [
  {
    q: "How does Small Claims Genie help people file small claims cases?",
    a: "Small Claims Genie turns the small-claims process into a guided workflow. You answer structured questions, and Small Claims Genie organizes the facts, calculates what's needed, and prepares court-ready documents so you're not hunting for the right forms, rules, and steps on your own.",
  },
  {
    q: "Do I need a lawyer to use Small Claims Genie?",
    a: "No. Small claims court is designed so people can represent themselves. Small Claims Genie is built to guide you through the process without needing to hire an attorney, while helping you prepare a clean, organized presentation for court.",
  },
  {
    q: "Can Small Claims Genie help me understand whether I have a strong case?",
    a: "Small Claims Genie can help analyze the facts you provide and highlight missing information or evidence that may strengthen your claim. While it cannot guarantee an outcome, it helps you organize the case so the key points are clear and supported.",
  },
  {
    q: "What evidence should I collect before filing?",
    a: "Strong cases rely on clear documentation. Useful evidence may include receipts, contracts, text messages, emails, photos, repair estimates, invoices, and payment records. Small Claims Genie helps you organize these materials into a clear timeline so a judge can quickly understand what happened.",
  },
  {
    q: "How much does it cost to file a case?",
    a: "Filing fees vary by court and by claim amount, and service costs vary depending on location and difficulty. Small Claims Genie's platform fee is separate from court fees and service costs, which are set by the local jurisdiction. In general: Small Claims Genie fee + court filing fee + service cost.",
  },
  {
    q: "Can I recover court fees if I win?",
    a: "In many small claims courts, filing fees and certain service costs can be added to your claim and may be awarded if you win. Small Claims Genie helps you track these costs so they can be included properly when preparing your claim.",
  },
  {
    q: "What is the maximum amount I can sue for?",
    a: "Small-claims limits are set by each state (and sometimes by court type). Small Claims Genie helps you stay within the limit for the court you're filing in, and if your damages exceed the limit, it can prompt you to choose a strategy — reduce the amount, or consider a different court option.",
  },
  {
    q: "What is the statute of limitations?",
    a: "The statute of limitations is the deadline to file. Miss it, and the court may dismiss the case even if your facts are strong. The time limit depends on the claim type (contract, property damage, personal injury, etc.). Small Claims Genie helps you identify deadlines by asking what happened and when it happened.",
  },
  {
    q: "How do I know the correct court to file in?",
    a: "Court selection depends on jurisdiction and venue — usually tied to where the defendant is located and where the dispute happened. Small Claims Genie helps you identify the correct court by collecting those key facts and using them to direct the filing to the proper place.",
  },
  {
    q: "Can I file a case against a business using Small Claims Genie?",
    a: "Yes. Small claims courts commonly allow cases against businesses (contractors, landlords, retailers, and service providers). Small Claims Genie helps you capture the business details, what happened, and what you're asking for — then package it into a clean, court-ready presentation.",
  },
  {
    q: "What is a demand letter, and why does it matter?",
    a: "A demand letter is a written request to resolve the issue before filing a lawsuit. It explains what happened, what you want, and gives a clear deadline to pay or fix the problem. Many disputes settle at this step. Small Claims Genie can help generate a professional demand letter that's structured, clear, and easy to support with receipts, messages, and timelines.",
  },
  {
    q: "Does Small Claims Genie handle service of process?",
    a: "Every small-claims case requires formal notice to the defendant (service of process). Small Claims Genie guides you through service requirements and can support arranging professional service so the delivery is handled correctly and documented, which is often required before the court will proceed.",
  },
  {
    q: "Can I settle the case before the hearing?",
    a: "Yes. Many disputes are resolved before the court date through negotiation or settlement. If both sides agree to a payment or resolution, the case can often be closed without appearing in court. Small Claims Genie helps you prepare your case so you're in a stronger position to negotiate.",
  },
  {
    q: "What should I expect during the court hearing?",
    a: "Small claims hearings are usually brief and informal. Each side presents their explanation and evidence to the judge. The judge may ask questions and then decide either immediately or shortly after the hearing. Small Claims Genie helps you organize your presentation so the facts are clear and easy to follow.",
  },
  {
    q: "How long does a small claims case usually take?",
    a: "The timeline depends on the court and how quickly the defendant is served. After filing, courts typically schedule hearings several weeks to a few months later. Small Claims Genie helps you prepare everything in advance so you're ready once the court sets the hearing date.",
  },
  {
    q: "What if the defendant files a counterclaim?",
    a: "Sometimes the other party may file a claim against you related to the same dispute. If that happens, the court will usually hear both claims at the same hearing. Small Claims Genie helps you organize your response so you can address the counterclaim clearly.",
  },
  {
    q: "What happens after I win a case?",
    a: "Winning a judgment means the court agrees the defendant owes you money. If the defendant pays voluntarily, the case is resolved. If they do not pay, additional steps may be required to collect the judgment. Small Claims Genie can help explain the common options available for enforcing a judgment.",
  },
  {
    q: "What happens if the defendant cannot be found?",
    a: "Process servers typically attempt service multiple times. If they can't complete service, you may need a better address, a different service location, or additional steps to locate the defendant. Small Claims Genie helps you understand the next best option so the case doesn't stall.",
  },
  {
    q: "What if I lose the case?",
    a: "If the court decides against your claim, the case usually ends at that point. In some situations there may be options to appeal or take other legal steps depending on local rules. Small Claims Genie helps you prepare a clear, well-supported case from the start to improve your chances.",
  },
  {
    q: "Is my information secure when using Small Claims Genie?",
    a: "Small Claims Genie is designed to handle sensitive information responsibly. The platform stores case details securely and uses them only to help prepare your claim and related documents.",
  },
  {
    q: "Why use Small Claims Genie instead of filing on your own?",
    a: "You can file on your own, but it often requires finding the correct forms, understanding court rules, organizing evidence, and completing service properly. Small Claims Genie streamlines this into a guided system so you can focus on what happened and what you can prove, while the platform structures it into court-ready outputs.",
  },
];

export default function FAQ() {
  return (
    <div className="flex flex-col w-full bg-white">

      {/* ── Header ── */}
      <section className="px-6 pt-10 pb-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-primary mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Clear answers to common questions about how Small Claims Genie helps you prepare a small claims case.
            If you don't see your question here, describe what happened in plain English and Small Claims Genie will guide you.
          </p>
        </div>
      </section>

      {/* ── FAQ Boxes ── */}
      <section className="px-6 pb-10 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {faqs.map(({ q, a }, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl px-5 py-4 bg-white"
            >
              <p className="text-sm font-bold text-primary mb-1.5">{q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 pb-12 bg-white">
        <div className="max-w-3xl mx-auto border border-gray-200 rounded-xl px-8 py-8 text-center bg-gray-50">
          <h2 className="text-lg font-black text-primary mb-1.5">Still have questions?</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Start your case and ask the Genie directly — it knows your documents, your facts, and your county.
          </p>
          <Button asChild size="lg" className="h-10 px-7 text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-sm">
            <Link href="/cases/new">
              <Wand2 className="mr-2 h-4 w-4" />
              Ask the Genie
            </Link>
          </Button>
        </div>
      </section>

    </div>
  );
}
