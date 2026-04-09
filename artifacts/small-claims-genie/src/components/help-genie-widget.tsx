import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "How do I start a case?",
  "What forms do I need to file?",
  "What is a demand letter?",
  "How much can I sue for in California?",
];

export function HelpGenieWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-help-genie", handler);
    return () => window.removeEventListener("open-help-genie", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const userMsg: Message = { role: "user", content: trimmed };
    const history = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantPlaceholder: Message = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantPlaceholder]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
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
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError("Something went wrong. Please try again.");
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Chat panel ── */}
      {open && (
        <div className="fixed bottom-[88px] right-5 z-[60] w-[370px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
          style={{ maxHeight: "min(580px, calc(100dvh - 120px))" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: "linear-gradient(135deg, #0d6b5e 0%, #14b8a6 100%)" }}>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Ask Genie — Help</p>
              <p className="text-white/70 text-[11px] leading-tight">App guide · CA small claims</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="flex gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-[#14b8a6]/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#0d6b5e]" />
                  </div>
                  <div className="bg-[#f0fffe] border border-[#a8e6df] rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
                    <p className="text-sm text-[#0d6b5e] leading-relaxed">
                      Hi! I'm your Small Claims Genie guide. I can explain how the app works, walk you through the process, or answer California small claims questions. What can I help with?
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-9">
                  {SUGGESTED.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-xs bg-white border border-[#a8e6df] text-[#0d6b5e] hover:bg-[#f0fffe] rounded-full px-3 py-1.5 font-medium transition-colors text-left leading-snug">
                      {q}
                    </button>
                  ))}
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
                <div className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-amber-500 text-white rounded-tr-sm font-medium"
                    : "bg-[#f0fffe] border border-[#a8e6df] text-[#0d4a44] rounded-tl-sm"
                }`}>
                  {msg.content || (streaming && i === messages.length - 1
                    ? <span className="flex gap-1 items-center h-4"><span className="w-1.5 h-1.5 bg-[#14b8a6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} /><span className="w-1.5 h-1.5 bg-[#14b8a6] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} /><span className="w-1.5 h-1.5 bg-[#14b8a6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} /></span>
                    : "")}
                </div>
              </div>
            ))}

            {error && (
              <p className="text-xs text-destructive text-center px-4">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2 items-end shrink-0 bg-white">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about the app…"
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/40 min-h-[38px] max-h-[120px] leading-relaxed disabled:opacity-60"
              style={{ fieldSizing: "content" } as any}
            />
            <Button size="icon" disabled={!input.trim() || streaming}
              onClick={() => sendMessage(input)}
              className="h-[38px] w-[38px] shrink-0 rounded-xl bg-[#0d6b5e] hover:bg-[#0a5449] disabled:opacity-40">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 pl-3 pr-4 h-12 rounded-full shadow-lg text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
        style={{ background: open ? "#0a5449" : "linear-gradient(135deg, #0d6b5e 0%, #14b8a6 100%)" }}
        aria-label={open ? "Close Help Genie" : "Open Help Genie"}
      >
        {open
          ? <ChevronDown className="h-4 w-4 shrink-0" />
          : <Sparkles className="h-4 w-4 shrink-0" />}
        <span>{open ? "Close" : "Ask Genie"}</span>
      </button>
    </>
  );
}
