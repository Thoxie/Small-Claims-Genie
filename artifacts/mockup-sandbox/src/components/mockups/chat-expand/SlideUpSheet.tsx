import { useState } from "react";
import { Eraser, Download, CheckCircle, Send, Mic, ChevronDown, ChevronsUp } from "lucide-react";

const MESSAGES = [
  { role: "user", content: "What are my strongest arguments against ABC Contractors?" },
  { role: "assistant", content: "Based on your uploaded contract and the invoice you provided, your three strongest arguments are:\n\n**1. Breach of contract** — The signed agreement required completion by March 15th. They finished April 3rd, 19 days late.\n\n**2. Documented damage** — Your photos show water damage to the hardwood floors caused by the uncovered roof. Estimated repair: $2,400.\n\n**3. Failure to obtain permits** — California requires permits for structural work. No permit was pulled for the beam replacement." },
  { role: "user", content: "How much can I claim in small claims?" },
  { role: "assistant", content: "As an individual in California, you can claim up to **$12,500** in small claims court.\n\nYour current claim is **$8,750**, which is well within the limit." },
];

export function SlideUpSheet() {
  const [expanded, setExpanded] = useState(false);

  const Messages = ({ compact }: { compact?: boolean }) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {MESSAGES.map((m, i) => (
        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          {m.role === "assistant" && (
            <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-base mr-2 shrink-0 mt-0.5">🧞</div>
          )}
          <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
            compact ? "max-w-[80%]" : "max-w-[70%]"
          } ${
            m.role === "user"
              ? "bg-teal-600 text-white rounded-tr-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
          }`}>
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );

  const InputBar = ({ dark }: { dark?: boolean }) => (
    <div className={`border-t ${dark ? "border-white/10" : "border-gray-200"} p-3 shrink-0`}>
      <div className={`flex items-center gap-2 ${dark ? "bg-white/10" : "bg-gray-50 border border-gray-200"} rounded-xl px-3 py-2`}>
        <input
          className={`flex-1 bg-transparent text-sm outline-none ${dark ? "text-white/80 placeholder:text-white/30" : "text-gray-700 placeholder:text-gray-400"}`}
          placeholder="Ask anything about your case…"
        />
        <button className={`h-7 w-7 flex items-center justify-center ${dark ? "text-white/40" : "text-gray-400"}`}>
          <Mic className="h-4 w-4" />
        </button>
        <button className="h-7 w-7 flex items-center justify-center bg-teal-600 text-white rounded-lg">
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Option C — Slide-Up Sheet</p>

        {/* Normal chat panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col" style={{ height: 500 }}>
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-gray-800">AI Genie is trained on all your case info</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-7 px-2 text-xs flex items-center gap-1 border border-gray-200 rounded text-gray-500">
                <Eraser className="h-3 w-3" /> Clear
              </button>
              <button className="h-7 px-2 text-xs flex items-center gap-1 border border-gray-200 rounded text-gray-500">
                <Download className="h-3 w-3" /> Word
              </button>
            </div>
          </div>

          <Messages compact />
          <InputBar />

          {/* Expand handle */}
          <button
            onClick={() => setExpanded(true)}
            className="shrink-0 w-full py-2 flex items-center justify-center gap-1.5 bg-teal-50 hover:bg-teal-100 border-t border-teal-100 transition-colors group"
          >
            <ChevronsUp className="h-3.5 w-3.5 text-teal-600 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-xs font-medium text-teal-700">Expand chat to full screen</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">
          A <span className="font-medium text-teal-600">↑ Expand chat</span> handle at the bottom slides the chat up to cover the full screen.
        </p>
      </div>

      {/* Slide-up sheet */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          style={{
            animation: "slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1) both"
          }}
        >
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>

          {/* Sheet handle + header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-teal-100 flex items-center justify-center text-xl">🧞</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">AI Genie Case Review</p>
                <p className="text-xs text-gray-400">Full screen mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-7 px-2 text-xs flex items-center gap-1 border border-gray-200 rounded text-gray-500">
                <Eraser className="h-3 w-3" /> Clear
              </button>
              <button className="h-7 px-2 text-xs flex items-center gap-1 border border-gray-200 rounded text-gray-500">
                <Download className="h-3 w-3" /> Word
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="h-7 px-2 text-xs flex items-center gap-1 border border-teal-200 rounded text-teal-600 hover:bg-teal-50"
              >
                <ChevronDown className="h-3 w-3" /> Minimize
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-gray-50/40 max-w-3xl w-full mx-auto self-stretch">
            {MESSAGES.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-lg mr-3 shrink-0 mt-0.5">🧞</div>
                )}
                <div className={`rounded-2xl px-4 py-3 max-w-[68%] text-sm leading-relaxed whitespace-pre-line ${
                  m.role === "user"
                    ? "bg-teal-600 text-white rounded-tr-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-3xl w-full mx-auto self-stretch">
            <InputBar />
          </div>
        </div>
      )}
    </div>
  );
}
