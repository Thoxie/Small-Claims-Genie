import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Wand2, X, Send, Loader2, Mic, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { SpeechRecognitionWindow, SpeechRecognitionInstance, SpeechRecognitionEvent as SpeechRecognitionEvt } from "@/lib/types";

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

interface Message {
  role: "user" | "assistant";
  content: string;
}

function GenieModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const handleVoiceStart = () => {
    const w = window as Window & SpeechRecognitionWindow;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const textBefore = input.trim();
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    recognition.onresult = (event: SpeechRecognitionEvt) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setInput(textBefore ? textBefore + " " + transcript.trim() : transcript.trim());
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleVoiceStop = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setIsRecording(false);
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError("");
    const userMsg: Message = { role: "user", content: trimmed };
    const history = [...messages];
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        setMessages(prev => prev.slice(0, -1));
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as { content?: string; error?: string };
            if (parsed.error) { setError(parsed.error); break; }
            if (parsed.content) {
              accumulated += parsed.content;
              const snap = accumulated;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: snap };
                return next;
              });
            }
          } catch { }
        }
      }
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== "AbortError") {
        setError("Could not reach the server. Please check your connection and try again.");
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl w-full sm:max-w-lg flex flex-col relative"
        style={{ maxHeight: "min(680px, 95dvh)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0 rounded-t-[24px]"
          style={{ background: "linear-gradient(135deg, #0d6b5e 0%, #14b8a6 100%)" }}>
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-base leading-tight flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-amber-300" /> Ask the Genie
            </h2>
            <p className="text-white/70 text-[11px] leading-tight">
              Describe what happened — voice or text
            </p>
          </div>
          <button onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">

          {/* Welcome message */}
          {!hasMessages && (
            <div className="flex gap-2.5">
              <div className="h-7 w-7 rounded-full bg-[#14b8a6]/15 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-[#0d6b5e]" />
              </div>
              <div className="bg-[#f0fffe] border border-[#a8e6df] rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[88%]">
                <p className="text-sm text-[#0d4a44] leading-relaxed">
                  Hi! Tell me what happened in plain English — what went wrong, who did it, and roughly how much you're out. I'll tell you if you have a case and exactly how Small Claims Genie can help you win it.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-[#14b8a6]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0d6b5e]" />
                </div>
              )}
              <div className={`rounded-2xl px-3.5 py-2.5 max-w-[88%] text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-amber-500 text-white rounded-tr-sm font-medium whitespace-pre-wrap"
                  : "bg-[#f0fffe] border border-[#a8e6df] text-[#0d4a44] rounded-tl-sm"
              }`}>
                {msg.role === "user" ? msg.content : (
                  msg.content
                    ? <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            href?.startsWith("/")
                              ? <Link href={href} onClick={onClose} className="text-[#0d6b5e] underline underline-offset-2 font-semibold hover:text-[#0a5449]">{children}</Link>
                              : <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#0d6b5e] underline underline-offset-2 font-semibold hover:text-[#0a5449]">{children}</a>
                          ),
                          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                          strong: ({ children }) => <strong className="font-semibold text-[#0d6b5e]">{children}</strong>,
                        }}
                      >{msg.content}</ReactMarkdown>
                    : streaming && i === messages.length - 1
                      ? <span className="flex gap-1 items-center h-4">
                          <span className="w-1.5 h-1.5 bg-[#14b8a6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-[#14b8a6] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-[#14b8a6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      : ""
                )}
              </div>
            </div>
          ))}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 text-center">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Voice hint */}
        <div className="px-4 pt-1 shrink-0 flex items-center justify-end">
          {isRecording ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-destructive animate-pulse">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
              Recording… release to stop
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              Hold mic to record voice
            </span>
          )}
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3 flex gap-2 items-center shrink-0 bg-white rounded-b-[24px]">
          <div className="flex-1 relative flex items-center">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 100) + "px";
              }}
              onKeyDown={handleKey}
              placeholder={isRecording ? "🔴 Recording — release to stop…" : hasMessages ? "Ask a follow-up question…" : "My landlord kept my $1,800 deposit but never gave me a receipt…"}
              rows={1}
              disabled={streaming || isRecording}
              className="w-full resize-none overflow-hidden rounded-full border border-input bg-background pl-4 pr-10 py-2.5 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/40 disabled:opacity-60 transition-colors"
              style={{ minHeight: "40px", maxHeight: "100px" }}
            />
            <button
              type="button"
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceStop}
              onMouseLeave={isRecording ? handleVoiceStop : undefined}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceStop}
              aria-label={isRecording ? "Recording — release to stop" : "Hold to record voice"}
              className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full transition-colors ${
                isRecording ? "text-destructive animate-pulse bg-destructive/10" : "text-muted-foreground hover:text-[#0d6b5e]"
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="icon"
            disabled={!input.trim() || streaming || isRecording}
            onClick={() => sendMessage(input)}
            className="h-[40px] w-[40px] shrink-0 rounded-full bg-[#0d6b5e] hover:bg-[#0a5449] disabled:opacity-40"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center pb-3 shrink-0">
          This is informational only — not legal advice.
        </p>
      </div>
    </div>
  );
}

export default function TypesOfCases() {
  const [genieOpen, setGenieOpen] = useState(false);

  return (
    <div className="flex flex-col w-full bg-[#f5fdfb]">

      {genieOpen && <GenieModal onClose={() => setGenieOpen(false)} />}

      {/* Header */}
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

      {/* Case Type Boxes */}
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

      {/* Bottom CTA */}
      <section className="px-6 pb-12 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <div className="border-2 border-[#a8e6df] rounded-xl px-6 py-6 bg-[#f0fffe]">
            <p className="text-sm text-[#0d4a44] font-medium mb-1">
              Not sure if you have a case?
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Describe what happened in plain English — by voice or text. The Genie will analyze your situation, tell you if it qualifies, what evidence you need, and how Small Claims Genie will help you win.
            </p>
            <Button
              size="lg"
              onClick={() => setGenieOpen(true)}
              className="h-11 px-7 text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-sm"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Ask the Genie — Free
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
