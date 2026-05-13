import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Wand2, X, Send, Loader2 } from "lucide-react";

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

function renderResponse(text: string) {
  return text.split("\n").map((line, i) => {
    // Convert markdown links [text](url) to anchor tags
    const parts = line.split(/(\[([^\]]+)\]\(([^)]+)\))/g);
    const rendered: React.ReactNode[] = [];
    let k = 0;
    while (k < parts.length) {
      if (parts[k].startsWith("[") && k + 2 < parts.length && parts[k + 2]) {
        // This is a match group — skip, handled by full regex below
        k++;
        continue;
      }
      rendered.push(parts[k]);
      k++;
    }

    // Use regex to properly split line into text + links
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    const nodes: React.ReactNode[] = [];
    let last = 0;
    let m;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(line)) !== null) {
      if (m.index > last) nodes.push(line.slice(last, m.index));
      nodes.push(
        <Link key={m.index} href={m[2]} className="text-[#0d6b5e] underline underline-offset-2 font-semibold hover:text-[#0a5a4e]">
          {m[1]}
        </Link>
      );
      last = m.index + m[0].length;
    }
    if (last < line.length) nodes.push(line.slice(last));

    if (nodes.length === 0) return <br key={i} />;
    return <p key={i} className="mb-1.5 last:mb-0">{nodes}</p>;
  });
}

function GenieModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const responseRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setResponse("");
    setDone(false);
    setError("");

    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { setDone(true); continue; }
          try {
            const parsed = JSON.parse(payload) as { content?: string; error?: string };
            if (parsed.error) { setError(parsed.error); break; }
            if (parsed.content) setResponse(prev => prev + parsed.content);
          } catch { /* ignore malformed */ }
        }
      }
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg flex flex-col relative max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-[20px] font-black text-[#0d6b5e] leading-tight flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-amber-500" />
              Ask the Genie
            </h2>
            <p className="text-[13px] text-[#5a6478] mt-1">
              Describe what happened in plain English — the Genie will classify your case and show you how Small Claims Genie can help.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-0.5 shrink-0 text-[#8a96a8] hover:text-[#20304f] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Response area */}
        {(response || loading) && (
          <div
            ref={responseRef}
            className="flex-1 overflow-y-auto px-7 py-4 text-[13.5px] text-[#20304f] leading-relaxed min-h-0"
          >
            {response ? renderResponse(response) : null}
            {loading && !response && (
              <div className="flex items-center gap-2 text-[#5a6478]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing your situation…</span>
              </div>
            )}
            {loading && response && (
              <span className="inline-block w-1.5 h-4 bg-[#0d6b5e] animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}

        {error && (
          <p className="mx-7 mt-3 text-[13px] text-red-600 bg-red-50 rounded-xl px-4 py-2.5 shrink-0">
            {error}
          </p>
        )}

        {/* Input area */}
        {!done && (
          <div className="px-7 py-5 shrink-0">
            <div className="flex flex-col gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
                placeholder="Example: My landlord kept my $1,800 security deposit but never showed me any receipts or deduction list…"
                rows={4}
                className="w-full resize-none rounded-2xl border-2 border-gray-200 focus:border-[#0d6b5e] focus:outline-none px-4 py-3 text-[13.5px] text-[#20304f] placeholder:text-[#adb5c5] transition-colors disabled:opacity-60"
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
                className="flex items-center justify-center gap-2 w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[15px] font-black min-h-[48px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "Analyzing…" : "Ask the Genie"}
              </button>
            </div>
            <p className="text-[11px] text-[#adb5c5] text-center mt-2.5">
              This is informational only — not legal advice.
            </p>
          </div>
        )}

        {/* After response: CTA */}
        {done && !loading && (
          <div className="px-7 py-5 border-t border-gray-100 shrink-0">
            <Link href="/pricing">
              <button className="flex items-center justify-center gap-2 w-full rounded-full bg-[#0d6b5e] hover:bg-[#0a5a4e] text-white text-[15px] font-black min-h-[48px] px-5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors">
                <Wand2 className="w-4 h-4" />
                See Plans &amp; Get Started
              </button>
            </Link>
            <button
              onClick={() => { setResponse(""); setDone(false); setInput(""); }}
              className="mt-2 w-full text-[13px] text-[#5a6478] hover:text-[#20304f] transition-colors py-1"
            >
              Ask another question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TypesOfCases() {
  const [genieOpen, setGenieOpen] = useState(false);

  return (
    <div className="flex flex-col w-full bg-[#f5fdfb]">

      {genieOpen && <GenieModal onClose={() => setGenieOpen(false)} />}

      {/* ── Header ── */}
      <section className="px-6 pt-10 pb-4 bg-[#f5fdfb]">
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
      <section className="px-6 pb-8 bg-[#f5fdfb]">
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
      <section className="px-6 pb-12 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <div className="border-2 border-gray-200 rounded-xl px-6 py-6 bg-gray-50">
            <p className="text-sm text-muted-foreground mb-4">
              Not sure which one you have? Describe what happened in plain English. Small Claims Genie will classify the dispute, flag missing proof, and tell you the next step.
            </p>
            <Button
              size="lg"
              onClick={() => setGenieOpen(true)}
              className="h-10 px-7 text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-sm"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Ask the Genie
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
