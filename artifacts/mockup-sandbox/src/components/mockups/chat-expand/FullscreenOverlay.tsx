import { useState } from "react";
import { Eraser, Download, CheckCircle, Send, Mic, X, ArrowsMaximize } from "lucide-react";
import { Expand } from "lucide-react";

const MESSAGES = [
  { role: "user", content: "What are my strongest arguments against ABC Contractors?" },
  { role: "assistant", content: "Based on your uploaded contract and the invoice you provided, your three strongest arguments are:\n\n**1. Breach of contract** — The signed agreement required completion by March 15th. They finished April 3rd, 19 days late.\n\n**2. Documented damage** — Your photos show water damage to the hardwood floors caused by the uncovered roof. Estimated repair: $2,400.\n\n**3. Failure to obtain permits** — California requires permits for structural work. No permit was pulled for the beam replacement." },
  { role: "user", content: "How much can I claim in small claims?" },
  { role: "assistant", content: "As an individual in California, you can claim up to **$12,500** in small claims court.\n\nYour current claim is **$8,750**, which is well within the limit." },
];

export function FullscreenOverlay() {
  const [open, setOpen] = useState(false);

  const Messages = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
      {MESSAGES.map((m, i) => (
        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          {m.role === "assistant" && (
            <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-base mr-2 shrink-0 mt-0.5">🧞</div>
          )}
          <div className={`rounded-2xl px-4 py-2.5 max-w-[75%] text-sm leading-relaxed whitespace-pre-line ${
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

  const InputBar = () => (
    <div className="border-t border-gray-200 p-3 bg-white shrink-0">
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
        <input className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400" placeholder="Ask anything about your case…" />
        <button className="h-7 w-7 flex items-center justify-center text-gray-400">
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
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Option B — Full Screen Button</p>

        {/* Normal panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col" style={{ height: 500 }}>
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-gray-800">AI Genie is trained on all your case info</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-7 px-2 text-xs flex items-center gap-1 border border-gray-200 rounded text-gray-500 bg-white">
                <Eraser className="h-3 w-3" /> Clear
              </button>
              <button className="h-7 px-2 text-xs flex items-center gap-1 border border-gray-200 rounded text-gray-500 bg-white">
                <Download className="h-3 w-3" /> Word
              </button>
            </div>
          </div>
          <Messages />
          <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between bg-white shrink-0">
            <span className="text-xs text-gray-400">Want more room to work?</span>
            <button
              onClick={() => setOpen(true)}
              className="h-8 px-3 text-xs flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <Expand className="h-3.5 w-3.5" />
              Open Full Screen
            </button>
          </div>
          <InputBar />
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">
          A <span className="font-medium text-teal-600">Open Full Screen</span> button sits between messages and the input bar.
        </p>
      </div>

      {/* Fullscreen overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-[#0d1f2d] flex flex-col">
          {/* Overlay header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-teal-600/20 flex items-center justify-center text-xl">🧞</div>
              <div>
                <p className="text-white font-semibold text-sm">AI Genie Case Review</p>
                <p className="text-white/50 text-xs">Smith v. ABC Contractors · $8,750</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 max-w-3xl w-full mx-auto">
            {MESSAGES.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-teal-600/20 flex items-center justify-center text-lg mr-3 shrink-0 mt-0.5">🧞</div>
                )}
                <div className={`rounded-2xl px-4 py-3 max-w-[70%] text-sm leading-relaxed whitespace-pre-line ${
                  m.role === "user"
                    ? "bg-teal-600 text-white rounded-tr-sm"
                    : "bg-white/10 text-white/90 rounded-tl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-4 max-w-3xl w-full mx-auto">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
              <input className="flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/30" placeholder="Ask anything about your case…" />
              <button className="h-7 w-7 flex items-center justify-center text-white/40"><Mic className="h-4 w-4" /></button>
              <button className="h-7 w-7 flex items-center justify-center bg-teal-500 text-white rounded-lg"><Send className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
