import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Sparkles, Send, Loader2, Mic, ExternalLink, Eraser, ChevronsLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ReactMarkdown from "react-markdown";
import { Link } from "wouter";
import { useWebSpeech } from "@workspace/integrations-openai-ai-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  redirect?: { target: string; question: string } | null;
  showSignupCta?: boolean;
}

const HG_REDIRECT_SEP = "\nREDIRECT:";
const HG_SUGGESTIONS_SEP = "\nSUGGESTIONS:";
const HG_SIGNUP_CTA = "\nSIGNUP_CTA";
const HG_FEATURE_TAG_SEP = "\nFEATURE_TAG:";

const HG_FEATURE_CTAS: Record<string, string> = {
  DEMAND_LETTER: "Small Claims Genie's Demand Letter tool drafts a professional settlement offer or full settlement agreement for you in seconds, pulling in your case facts automatically — a documented, formal offer settles cases faster than an informal phone call. It's free to try.",
  COURT_FORMS: "Small Claims Genie generates your state's court forms pre-filled with your case details, so you don't have to figure out which form or field to use — free to try.",
  PROCESS_SERVER: "Small Claims Genie can connect you with a professional process server to get the defendant served correctly and on time, so your case doesn't get dismissed on a technicality — free to try.",
  HEARING_PREP: "Small Claims Genie's Hearing Prep step generates your opening statement from your case facts, and its AI Mock Trial lets you practice answering a judge's likely questions out loud before the real thing — free to start.",
  EVIDENCE_UPLOAD: "Small Claims Genie's Evidence Upload tool organizes and labels your documents automatically, so everything is ready to present at your hearing — free to try.",
  CASE_ADVISOR: "Small Claims Genie's AI Case Advisor reviews your specific facts and evidence and tells you exactly how strong your case is and what's missing — free to try.",
  DEADLINE_TRACKING: "Small Claims Genie automatically tracks your filing, service, and hearing deadlines so you never miss one — free to try.",
  JUDGMENT_COLLECTION: "Small Claims Genie's Collect After You Have Won tools walk you through the right post-judgment enforcement options for your state — garnishment, bank levies, liens, and debtor exams — so a judgment doesn't just sit unpaid. Free to try.",
};

function parseHelpContent(raw: string): { displayText: string; redirect: { target: string; question: string } | null; showSignupCta: boolean; featureTagPending: boolean } {
  let text = raw;
  let redirect: { target: string; question: string } | null = null;
  const ridx = text.indexOf(HG_REDIRECT_SEP);
  if (ridx !== -1) {
    const part = text.slice(ridx + HG_REDIRECT_SEP.length).trim();
    text = text.slice(0, ridx);
    const pipe = part.indexOf("|");
    if (pipe !== -1) {
      redirect = { target: part.slice(0, pipe).trim(), question: part.slice(pipe + 1).trim() };
    }
  }
  const showSignupCta = text.includes(HG_SIGNUP_CTA);
  if (showSignupCta) {
    text = text.slice(0, text.indexOf(HG_SIGNUP_CTA));
  }
  const sidx = text.indexOf(HG_SUGGESTIONS_SEP);
  const hasSuggestions = sidx !== -1;
  if (hasSuggestions) text = text.slice(0, sidx);

  let featureTagPending = false;
  const ftidx = text.indexOf(HG_FEATURE_TAG_SEP);
  if (ftidx !== -1) {
    const rest = text.slice(ftidx + HG_FEATURE_TAG_SEP.length);
    const answer = text.slice(0, ftidx).trimEnd();
    const nlidx = rest.indexOf("\n");
    if (nlidx === -1 && !hasSuggestions) {
      featureTagPending = true;
      text = answer;
    } else {
      const tag = (nlidx === -1 ? rest : rest.slice(0, nlidx)).trim();
      const cta = HG_FEATURE_CTAS[tag];
      text = cta ? `${answer}\n\n${cta}` : answer;
    }
  }

  return { displayText: text.trimEnd(), redirect, showSignupCta, featureTagPending };
}

const HG_REDIRECT_LABELS: Record<string, string> = {
  "case-advisor": "Open Case Advisor",
  "step:chat": "Open Case Advisor",
  "step:prep": "Go to Hearing Prep",
  "step:deadlines": "Go to Deadlines",
  "step:documents": "Go to My Evidence",
  "step:demand-letter": "Go to Demand Letter",
  "step:forms": "Go to Court Forms",
  "step:intake": "Go to Case Details",
};

const SUGGESTED = [
  { q: "Do I have a strong enough case for small claims court?", icon: "⚖️" },
  { q: "How much can I sue for in small claims court?", icon: "💰" },
  { q: "What evidence do I need to win my case?", icon: "📋" },
  { q: "I'm being sued — what are my options?", icon: "🔍" },
  { q: "What happens at a small claims hearing?", icon: "🏛️" },
];

export function HelpGenieWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { isSignedIn } = useAuth();
  const { startListening, stopListening } = useWebSpeech();
  const sendMessageRef = useRef<((text: string) => void) | null>(null);
  const [panelWidth, setPanelWidth] = useState<number | string>('50vw');
  const isDragging = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [pageContext, setPageContext] = useState<string | null>(null);
  const [jurisdictionState, setJurisdictionState] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    const openWithMsg = (e: Event) => {
      const { question } = (e as CustomEvent).detail as { question: string };
      setOpen(true);
      setTimeout(() => sendMessageRef.current?.(question), 120);
    };
    window.addEventListener("open-help-genie", handler);
    window.addEventListener("open-help-genie-with-message", openWithMsg);
    return () => {
      window.removeEventListener("open-help-genie", handler);
      window.removeEventListener("open-help-genie-with-message", openWithMsg);
    };
  }, []);

  useEffect(() => {
    const handleContext = (e: Event) => {
      const ctx = (e as CustomEvent<string>).detail;
      setPageContext(prev => {
        if (prev !== null && prev !== ctx) {
          setMessages([]);
        }
        return ctx;
      });
    };
    window.addEventListener("help-genie-page-context", handleContext);
    return () => window.removeEventListener("help-genie-page-context", handleContext);
  }, []);

  useEffect(() => {
    const handleJurisdiction = (e: Event) => {
      setJurisdictionState((e as CustomEvent<string>).detail);
    };
    window.addEventListener("help-genie-jurisdiction", handleJurisdiction);
    return () => window.removeEventListener("help-genie-jurisdiction", handleJurisdiction);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function handleClose() {
    setOpen(false);
    setMessages([]);
    setInput("");
    setError(null);
    if (isRecording) { stopListening(); setIsRecording(false); }
  }

  const handleVoiceStart = () => {
    setError(null);
    if (!isSignedIn) {
      setError("Please sign in to use voice input.");
      return;
    }
    const started = startListening(
      input,
      (interim: string) => setInput(interim),
      (final: string) => { setInput(final); setIsRecording(false); },
      (msg: string) => { setError(msg); setIsRecording(false); },
    );
    if (started) setIsRecording(true);
  };

  const handleVoiceStop = () => {
    stopListening();
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const userMsg: Message = { role: "user", content: trimmed };
    const history = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, pageContext, isSignedIn: !!isSignedIn, jurisdictionState }),
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
              const { displayText } = parseHelpContent(accumulated);
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: displayText };
                return next;
              });
            }
          } catch {}
        }
      }

      const { displayText: finalText, redirect, showSignupCta } = parseHelpContent(accumulated);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: finalText, redirect, showSignupCta };
        return next;
      });
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== "AbortError") {
        setError("Something went wrong. Please try again.");
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, pageContext]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.min(Math.max(newWidth, 280), window.innerWidth * 0.9));
    };
    const onMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Right-side Sheet panel ── */}
      <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <SheetContent
          ref={sheetRef}
          side="right"
          className="p-0 flex flex-col overflow-visible"
          style={{ width: panelWidth, maxWidth: "95vw", minWidth: "320px" }}
          onPointerDownOutside={(e) => {
            const pe = e.detail.originalEvent as PointerEvent;
            if (sheetRef.current) {
              const rect = sheetRef.current.getBoundingClientRect();
              if (pe.clientX >= rect.left - 30 && pe.clientX <= rect.left + 10) {
                e.preventDefault();
              }
            }
          }}
        >
          {/* ── Drag-to-resize handle — protruding teal pill on left edge ── */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute left-0 top-0 h-full w-6 cursor-col-resize z-20 group"
            aria-label="Drag to resize panel"
          >
            <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-[26px] h-14 bg-[#0d6b5e] rounded-l-xl flex items-center justify-center shadow-[-4px_0_10px_rgba(0,0,0,0.25)] group-hover:bg-[#0a5a4e] group-hover:w-[30px] transition-all duration-150 pointer-events-none">
              <ChevronsLeftRight className="h-4 w-4 text-white" />
            </div>
          </div>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: "linear-gradient(135deg, #0d6b5e 0%, #14b8a6 100%)" }}>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">AI Genie</p>
              <p className="text-white/70 text-[11px] leading-tight">Small Claims Court Advisor</p>
            </div>
            <div className="flex items-center gap-1.5 pr-6">
              <button
                onClick={() => { setMessages([]); setInput(""); setError(null); }}
                title="Clear chat"
                className="h-7 px-2 flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-[11px] font-medium"
              >
                <Eraser className="h-3 w-3" /> Clear Chat
              </button>
            </div>
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
                      Hi! I'm the Small Claims Genie. Tell me about your situation and I'll help you figure out your options — for free, no sign-up needed.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0d6b5e]/60 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Tap a question to ask
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {SUGGESTED.map(({ q, icon }) => (
                      <button key={q} onClick={() => sendMessage(q)}
                        className="flex items-start gap-3 w-full rounded-xl border border-[#a8e6df] bg-[#f0fffe] hover:bg-[#ddf6f3] px-4 py-3 text-left text-sm transition-colors group">
                        <span className="text-base shrink-0 mt-0.5">{icon}</span>
                        <span className="leading-relaxed text-[#0d6b5e] group-hover:text-[#0a5a50]">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col">
                <div className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-[#14b8a6]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#0d6b5e]" />
                    </div>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm leading-relaxed ${
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
                                  ? <Link href={href} onClick={handleClose} className="text-[#0d6b5e] underline underline-offset-2 font-semibold hover:text-[#0a5449]">{children}</Link>
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
                {msg.role === "assistant" && msg.redirect && !streaming && (
                  <div className="flex justify-start pl-9 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const { target, question } = msg.redirect!;
                        if (target === "case-advisor" || target === "step:chat") {
                          window.dispatchEvent(new CustomEvent("navigate-workspace-tab", { detail: { tab: "chat", question } }));
                        } else if (target.startsWith("step:")) {
                          const tabKey = target.slice(5);
                          window.dispatchEvent(new CustomEvent("navigate-workspace-tab", { detail: { tab: tabKey, question } }));
                        }
                        handleClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-full border border-[#14b8a6] text-[#0d6b5e] bg-white hover:bg-[#f0fffe] transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {HG_REDIRECT_LABELS[msg.redirect.target] ?? "Open"}
                    </button>
                  </div>
                )}
                {msg.role === "assistant" && msg.showSignupCta && !streaming && !isSignedIn && (
                  <div className="flex justify-start pl-9 mt-2">
                    <Link
                      href="/sign-up"
                      onClick={() => {
                        const userQuestion = messages[i - 1]?.content ?? "";
                        if (userQuestion) {
                          fetch("/api/help/conversion", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              question: userQuestion,
                              answerSnippet: msg.content.slice(0, 400),
                            }),
                          }).catch(() => {});
                        }
                        handleClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-full text-white transition-colors"
                      style={{ background: "linear-gradient(135deg, #0d6b5e 0%, #14b8a6 100%)" }}
                    >
                      Get started free →
                    </Link>
                  </div>
                )}
              </div>
            ))}

            {error && (
              <p className="text-xs text-destructive text-center px-4">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Mic hint */}
          <div className="px-3 pt-1 shrink-0 flex items-center justify-end">
            {isRecording ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-destructive animate-pulse">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                Recording… tap mic to stop
              </span>
            ) : (
              <span className="text-xs font-extrabold text-white bg-black px-2 py-0.5 rounded-md">
                Tap mic to start · tap again to stop
              </span>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2 items-center shrink-0 bg-white">
            <div className="flex-1 relative flex items-center">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 100) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "🔴 Recording — tap mic to stop…" : "Ask Small Claims Genie a question..."}
                rows={1}
                disabled={streaming || isRecording}
                className="w-full resize-none overflow-hidden rounded-full border border-input bg-background pl-4 pr-10 py-2.5 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/40 disabled:opacity-60 transition-colors"
                style={{ minHeight: "40px", maxHeight: "100px" }}
              />
              <button
                type="button"
                onClick={isRecording ? handleVoiceStop : handleVoiceStart}
                aria-label={isRecording ? "Tap to stop recording" : "Tap to start recording"}
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full transition-colors ${
                  isRecording ? "text-destructive animate-pulse bg-destructive/10" : "text-muted-foreground hover:text-[#0d6b5e]"
                }`}
              >
                <Mic className="h-4 w-4" />
              </button>
            </div>
            <Button size="icon" disabled={!input.trim() || streaming || isRecording}
              onClick={() => sendMessage(input)}
              className="h-[40px] w-[40px] shrink-0 rounded-full bg-[#0d6b5e] hover:bg-[#0a5449] disabled:opacity-40">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </>
  );
}
