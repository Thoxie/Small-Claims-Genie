import { useState } from "react";
import { Maximize2, Minimize2, Eraser, Download, CheckCircle, Send, Mic, Sparkles, X } from "lucide-react";

const MESSAGES = [
  { role: "user", content: "What are my strongest arguments against ABC Contractors?" },
  { role: "assistant", content: "Based on your uploaded contract and the invoice you provided, your three strongest arguments are:\n\n**1. Breach of contract** — The signed agreement required completion by March 15th. They finished April 3rd, 19 days late.\n\n**2. Documented damage** — Your photos show water damage to the hardwood floors caused by the uncovered roof. Estimated repair: $2,400.\n\n**3. Failure to obtain permits** — California requires permits for structural work. No permit was pulled for the beam replacement." },
  { role: "user", content: "How much can I claim in small claims?" },
  { role: "assistant", content: "As an individual in California, you can claim up to **$12,500** in small claims court.\n\nYour current claim is **$8,750**, which is well within the limit. You don't need to split your case or go to a higher court." },
];

export function ExpandIcon() {
  const [expanded, setExpanded] = useState(false);

  const ChatContent = ({ full }: { full: boolean }) => (
    <div className={`flex flex-col ${full ? "h-full" : "h-full"} bg-white`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-semibold text-gray-800">AI Genie is trained on all your case info</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-7 px-2 text-xs flex items-center gap-1 border border-gray-200 rounded text-gray-500 hover:text-red-500 hover:border-red-200 bg-white transition-colors">
            <Eraser className="h-3 w-3" /> Clear
          </button>
          <button className="h-7 px-2 text-xs flex items-center gap-1 border border-gray-200 rounded text-gray-500 hover:text-gray-700 bg-white transition-colors">
            <Download className="h-3 w-3" /> Word
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 flex items-center justify-center border border-teal-200 rounded text-teal-600 hover:bg-teal-50 bg-white transition-colors"
            title={expanded ? "Minimize" : "Expand to full screen"}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/40">
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

      {/* Input */}
      <div className="border-t border-gray-200 p-3 bg-white shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <input className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400" placeholder="Ask anything about your case…" />
          <button className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <Mic className="h-4 w-4" />
          </button>
          <button className="h-7 w-7 flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Option A — Expand Icon in Header</p>

        {/* Normal chat panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: 560 }}>
          <ChatContent full={false} />
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">
          A <span className="font-medium text-teal-600">⛶ maximize icon</span> sits in the chat header. Click to expand, click again to minimize.
        </p>
      </div>

      {/* Fullscreen modal */}
      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ width: "min(1100px, 95vw)", height: "min(800px, 92vh)" }}
            onClick={e => e.stopPropagation()}
          >
            <ChatContent full={true} />
          </div>
        </div>
      )}
    </div>
  );
}
