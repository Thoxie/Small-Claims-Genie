import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Why Small Claims Genie Exists",
    bullets: [
      "Lawyers are not allowed in Small Claims Court",
      "AI-powered full-service legal guidance",
      "No need to retain a lawyer for advice",
    ],
  },
  {
    title: "AI-Guided Case Preparation",
    bullets: [
      "Instantly identifies what matters",
      "Know what to do next",
      "No legal jargon or guessing",
    ],
  },
  {
    title: "Avoid Costly Mistakes",
    bullets: [
      "Court-specific document builder",
      "Organized, credible paperwork",
      "Avoid rejections and delays",
    ],
  },
  {
    title: "Evidence Organization",
    bullets: [
      "Turns emails, texts, and receipts into a timeline",
      "Builds a clear narrative",
      "Presents a clean case judges can follow",
    ],
  },
  {
    title: "Step-by-Step Roadmap",
    bullets: [
      "Know what to do and when",
      "Prevent missed deadlines",
      "Stay organized from start to hearing",
    ],
  },
  {
    title: "Fast, Clear Answers",
    bullets: [
      "Understand options and risks",
      "No hourly legal fees",
      "Make confident decisions quickly",
    ],
  },
];

export default function HowItWorks() {
  return (
    <div className="flex flex-col w-full bg-white">

      {/* ── Hero ── */}
      <section className="px-4 pt-14 pb-10 text-center bg-white">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4 text-primary">
            Lawyers aren't allowed in Small Claims Court.<br />
            Win with the power of AI.
          </h1>
          <p className="text-base text-muted-foreground mb-7 leading-relaxed">
            Don't retain a lawyer for advice when you can use Small Claims Genie — an AI-powered system
            built to guide your case from start to hearing.
          </p>
          <Button asChild variant="outline" size="lg" className="h-11 px-8 text-base rounded-md border-primary text-primary hover:bg-primary/5 font-semibold">
            <Link href="/cases/new">Start Preparing Your Case</Link>
          </Button>
        </div>
      </section>

      {/* ── Six Feature Boxes ── */}
      <section className="px-4 pb-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(({ title, bullets }) => (
              <div key={title} className="border border-gray-200 rounded-xl p-5 bg-white">
                <h3 className="text-sm font-bold text-primary mb-3">{title}</h3>
                <ul className="space-y-1.5">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Banner ── */}
      <section className="px-4 py-10 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="border border-gray-200 rounded-xl px-8 py-10 text-center bg-gray-50">
            <h2 className="text-2xl sm:text-3xl font-black text-primary mb-2">
              Don't pay a lawyer. Use Small Claims Genie.
            </h2>
            <p className="text-sm text-muted-foreground">
              Prepare smarter. File correctly. Present confidently.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
