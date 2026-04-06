
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
      <section className="px-4 pt-7 pb-5 text-center bg-white">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg sm:text-xl md:text-2xl font-black leading-tight mb-1 text-primary whitespace-nowrap">
            Lawyers aren't allowed in Small Claims Court.
          </h1>
          <p className="text-base font-semibold text-primary/70 mb-4">Win with the power of AI.</p>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Don't retain a lawyer for advice when you can use Small Claims Genie — an AI-powered system
            built to guide your case from start to hearing.
          </p>
        </div>
      </section>

      {/* ── Six Feature Boxes ── */}
      <section className="px-4 pb-0 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(({ title, bullets }) => (
              <div key={title} className="border-2 border-gray-300 rounded-xl p-5 bg-white">
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
      <section className="px-4 pt-4 pb-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="border-2 border-gray-300 rounded-xl px-8 py-10 text-center bg-gray-50">
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
