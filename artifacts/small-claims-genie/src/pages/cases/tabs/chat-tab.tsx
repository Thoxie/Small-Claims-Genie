import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useGetChatHistory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Mic, Send, CheckCircle, Loader2, Download, Sparkles, Eraser, Play, ChevronRight, X, Maximize2, Minimize2 } from "lucide-react";
import { i18n } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";
import { DraftLockedButton } from "@/components/draft-overlay";
import type { ExtendedCase, SpeechRecognitionWindow, SpeechRecognitionInstance, SpeechRecognitionEvent as SpeechRecognitionEvt } from "@/lib/types";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export function ChatTab({ caseId, isDraftMode = false, currentCase, autoMessage, onAutoMessageSent }: {
  caseId: number;
  isDraftMode?: boolean;
  currentCase?: ExtendedCase;
  autoMessage?: string;
  onAutoMessageSent?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const sessionKey = `chat_cleared_${caseId}`;
  const [cleared, setCleared] = useState(() => !!sessionStorage.getItem(`chat_cleared_${caseId}`));
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const expandedScrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const { getToken } = useAuth();

  const downloadChat = async (format: "word", scope: "last" | "all" = "all") => {
    setDownloadingWord(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/chat/export/${format}?scope=${scope}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(err.error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = scope === "last" ? "ai-document" : "ai-chat-transcript";
      a.download = `${label}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      console.error("[Chat export]", e);
      alert(e instanceof Error ? e.message : "Could not download. Please try again.");
    } finally {
      setDownloadingWord(false);
    }
  };

  const { data: history } = useGetChatHistory(caseId, { query: { enabled: !!caseId } });

  useEffect(() => {
    if (history && !cleared) setMessages(history);
  }, [history, cleared]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (expandedScrollRef.current) expandedScrollRef.current.scrollTop = expandedScrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const autoMessageFiredRef = useRef(false);
  useEffect(() => {
    if (!autoMessage || autoMessageFiredRef.current) return;
    autoMessageFiredRef.current = true;
    sendMessage(autoMessage);
    onAutoMessageSent?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMessage]);

  const detectDownloadCommand = (text: string): { format: "word"; scope: "last" | "all" } | null => {
    const t = text.toLowerCase().trim();
    const wordPatterns = [/word/, /\.docx/, /docx/, /ms word/, /microsoft word/, /\bpdf\b/, /\.pdf/, /download/, /export/];
    const actionPatterns = [/download/, /export/, /save/, /give me/, /get me/, /generate/, /send/];
    const hasAction = actionPatterns.some(p => p.test(t));
    if (!hasAction) return null;
    if (!wordPatterns.some(p => p.test(t))) return null;
    const allPatterns = [/\bchat\b/, /conversation/, /transcript/, /\ball\b/, /everything/, /whole/];
    const scope: "last" | "all" = allPatterns.some(p => p.test(t)) ? "all" : "last";
    return { format: "word" as const, scope };
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const downloadCmd = detectDownloadCommand(content);
    if (downloadCmd) {
      const { scope } = downloadCmd;
      setInput("");
      const scopeLabel = scope === "last" ? "that content" : "the full chat transcript";
      const botMsg: ChatMessage = { id: Date.now() + 1, role: 'assistant', content: `Of course! Downloading ${scopeLabel} as a **Word (.docx)** file — your download will start in a moment.` };
      setMessages(prev => [...prev, { id: Date.now(), role: 'user' as const, content }, botMsg]);
      await downloadChat("word", scope);
      return;
    }

    const newMsg: ChatMessage = { id: Date.now(), role: 'user', content };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const token = await getToken();
      const response = await fetch(`/api/cases/${caseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let sseBuffer = "";

      if (reader) {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant' as const, content: "" }]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                });
              }
            } catch { /* incomplete chunk */ }
          }
        }
      }
    } catch (e: unknown) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now() + 2, role: 'assistant' as const, content: `Sorry, I ran into an error: ${e instanceof Error ? e.message : "Please try again."}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceStart = () => {
    const w = window as Window & SpeechRecognitionWindow;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { console.warn("[Voice] Web Speech API not supported"); return; }
    const textBeforeRecording = input.trim();
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    recognition.onresult = (event: SpeechRecognitionEvt) => {
      let sessionTranscript = "";
      for (let i = 0; i < event.results.length; i++) sessionTranscript += event.results[i][0].transcript;
      const combined = textBeforeRecording ? textBeforeRecording + " " + sessionTranscript.trim() : sessionTranscript.trim();
      setInput(combined);
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

  return (
    <div className="flex gap-4 items-start pr-4 pl-0 pt-3 pb-4">

      {/* ── Chat column ── */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ height: "calc(100dvh - 165px)", minHeight: "420px" }}>
      <div className="bg-primary/5 border border-black/80 rounded-lg p-3 text-sm font-medium text-primary flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <strong className="truncate">Your AI Genie is trained on all your case information.</strong>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {messages.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1 border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                onClick={() => { sessionStorage.setItem(sessionKey, "1"); setMessages([]); setCleared(true); }}
              >
                <Eraser className="h-3 w-3" /> Clear Chat
              </Button>
              {isDraftMode ? (
                <DraftLockedButton label="Subscribe to Export" size="sm" />
              ) : (
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => downloadChat("word")} disabled={downloadingWord}>
                  {downloadingWord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Word
                </Button>
              )}
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 px-0 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setExpanded(true)}
            title="Expand to full screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 gap-6 max-w-lg mx-auto">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-[#ddf6f3] flex items-center justify-center text-3xl shadow-sm">🧞</div>
              <div>
                <p className="font-semibold text-foreground text-base">Your AI Genie is ready</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Ask anything about your California small claims case. I'm trained on your uploaded documents and California court rules.</p>
              </div>
            </div>
            <div className="w-full space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Suggested questions — tap to ask
              </p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { q: currentCase?.defendantName ? `What are the strongest arguments in my case against ${currentCase.defendantName}?` : "What are the strongest arguments in my case?", icon: "⚖️" },
                  { q: "What evidence should I bring to the hearing to prove my claim?", icon: "📋" },
                  { q: currentCase?.claimAmount ? `How do I prove I'm owed $${Number(currentCase.claimAmount).toLocaleString()}?` : "How do I calculate and prove my damages?", icon: "💵" },
                  { q: "What questions will the judge likely ask me at the hearing?", icon: "🏛️" },
                  { q: "What are the weakest parts of my case?", icon: "🔍" },
                  { q: "What defenses might the other side use?", icon: "🛡️" },
                  { q: "What should I say first when I talk to the judge?", icon: "🗣️" },
                  { q: "Is there anything missing from my case file?", icon: "📁" },
                ].map(({ q, icon }) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="flex items-start gap-3 w-full rounded-xl border border-[#a8e6df] bg-[#f0fffe] hover:bg-[#ddf6f3] px-4 py-3 text-left text-sm text-foreground transition-colors group"
                  >
                    <span className="text-base shrink-0 mt-0.5">{icon}</span>
                    <span className="leading-relaxed text-[#0d6b5e] group-hover:text-[#0a5a50]">{q}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">Or type your own question below — voice input also supported</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
              {msg.role === 'user' ? (
                <p className="text-[13px] leading-[1.55] whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="text-[13px] leading-[1.55] prose prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-headings:mt-2.5 prose-headings:mb-1 prose-strong:font-semibold prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-a:text-primary">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-tl-sm p-4 text-muted-foreground flex gap-1">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>●</span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-card border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-4 pt-1.5 pb-3 rounded-b-lg">
        <div className={`flex items-center justify-end mb-1.5 transition-all duration-200`}>
          {isRecording ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-destructive animate-pulse">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
              Recording… release mic to stop
            </span>
          ) : (
            <span className="text-xs font-extrabold text-white bg-black px-2 py-0.5 rounded-md">
              Click and Hold mic to record voice
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                }
              }}
              placeholder={isRecording ? "🔴 Recording — release to stop…" : i18n.chat.placeholder}
              rows={1}
              disabled={isRecording}
              className="w-full resize-none overflow-hidden rounded-full border-2 border-slate-400 bg-background pl-4 pr-10 py-2.5 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-70 transition-colors"
              style={{ minHeight: "42px", maxHeight: "120px" }}
            />
            <button
              type="button"
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceStop}
              onMouseLeave={isRecording ? handleVoiceStop : undefined}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceStop}
              aria-label={isRecording ? "Recording — release to stop" : "Hold to record"}
              className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full transition-colors ${isRecording ? 'text-destructive animate-pulse bg-destructive/10' : 'text-muted-foreground hover:text-primary'}`}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => { sendMessage(input); }}
            disabled={isTyping || isRecording || !input.trim()}
            className="h-[42px] w-[42px] shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Send"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </div>
      </div>
      </div>{/* end chat column */}

      {/* ── Video tutorial card ── */}
      <div
        onClick={() => setTutorialOpen(true)}
        className="cursor-pointer group flex-shrink-0 w-[220px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
        title="Watch the tutorial for this step"
      >
        <div className="relative bg-[#0f2537] h-[120px] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
              <Play className="w-5 h-5 text-white ml-1" fill="white" />
            </div>
            <span className="text-white text-xs font-semibold opacity-90">Watch Tutorial</span>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">~3 min</div>
          <div className="absolute top-2 left-2 bg-[#14b8a6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Step 5</div>
        </div>
        <div className="bg-background px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold">AI Genie Case Review</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Chat with your AI Genie</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#14b8a6] shrink-0" />
        </div>
      </div>

      {/* ── Expanded full-screen chat ── */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Header */}
          <div className="shrink-0 bg-primary/5 border-b border-black/80 px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              <strong className="text-sm text-primary">Your AI Genie is trained on all your case information.</strong>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {messages.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1 border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                    onClick={() => { sessionStorage.setItem(sessionKey, "1"); setMessages([]); setCleared(true); }}
                  >
                    <Eraser className="h-3 w-3" /> Clear Chat
                  </Button>
                  {isDraftMode ? (
                    <DraftLockedButton label="Subscribe to Export" size="sm" />
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => downloadChat("word")} disabled={downloadingWord}>
                      {downloadingWord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Word
                    </Button>
                  )}
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => setExpanded(false)}
                title="Minimize"
              >
                <Minimize2 className="h-3.5 w-3.5" /> Minimize
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto" ref={expandedScrollRef}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 gap-6 max-w-lg mx-auto">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-[#ddf6f3] flex items-center justify-center text-3xl shadow-sm">🧞</div>
                  <div>
                    <p className="font-semibold text-foreground text-base">Your AI Genie is ready</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Ask anything about your California small claims case. I'm trained on your uploaded documents and California court rules.</p>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Suggested questions — tap to ask
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { q: currentCase?.defendantName ? `What are the strongest arguments in my case against ${currentCase.defendantName}?` : "What are the strongest arguments in my case?", icon: "⚖️" },
                      { q: "What evidence should I bring to the hearing to prove my claim?", icon: "📋" },
                      { q: currentCase?.claimAmount ? `How do I prove I'm owed $${Number(currentCase.claimAmount).toLocaleString()}?` : "How do I calculate and prove my damages?", icon: "💵" },
                      { q: "What questions will the judge likely ask me at the hearing?", icon: "🏛️" },
                      { q: "What are the weakest parts of my case?", icon: "🔍" },
                      { q: "What defenses might the other side use?", icon: "🛡️" },
                      { q: "What should I say first when I talk to the judge?", icon: "🗣️" },
                      { q: "Is there anything missing from my case file?", icon: "📁" },
                    ].map(({ q, icon }) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="flex items-start gap-3 w-full rounded-xl border border-[#a8e6df] bg-[#f0fffe] hover:bg-[#ddf6f3] px-4 py-3 text-left text-sm text-foreground transition-colors group"
                      >
                        <span className="text-base shrink-0 mt-0.5">{icon}</span>
                        <span className="leading-relaxed text-[#0d6b5e] group-hover:text-[#0a5a50]">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                  {msg.role === 'user' ? (
                    <p className="text-[13px] leading-[1.55] whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="text-[13px] leading-[1.55] prose prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-headings:mt-2.5 prose-headings:mb-1 prose-strong:font-semibold prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-a:text-primary">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-tl-sm p-4 text-muted-foreground flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>●</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 bg-card border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-6 pt-1.5 pb-4 max-w-4xl w-full mx-auto">
            <div className="flex items-center justify-end mb-1.5">
              {isRecording ? (
                <span className="flex items-center gap-1 text-[10px] font-medium text-destructive animate-pulse">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                  Recording… release mic to stop
                </span>
              ) : (
                <span className="text-xs font-extrabold text-white bg-black px-2 py-0.5 rounded-md">
                  Click and Hold mic to record voice
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative flex items-center">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                      const el = e.target as HTMLTextAreaElement;
                      el.style.height = "auto";
                    }
                  }}
                  placeholder={isRecording ? "🔴 Recording — release to stop…" : i18n.chat.placeholder}
                  rows={1}
                  disabled={isRecording}
                  className="w-full resize-none overflow-hidden rounded-full border-2 border-slate-400 bg-background pl-4 pr-10 py-2.5 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-70 transition-colors"
                  style={{ minHeight: "42px", maxHeight: "120px" }}
                />
                <button
                  type="button"
                  onMouseDown={handleVoiceStart}
                  onMouseUp={handleVoiceStop}
                  onMouseLeave={isRecording ? handleVoiceStop : undefined}
                  onTouchStart={handleVoiceStart}
                  onTouchEnd={handleVoiceStop}
                  aria-label={isRecording ? "Recording — release to stop" : "Hold to record"}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full transition-colors ${isRecording ? 'text-destructive animate-pulse bg-destructive/10' : 'text-muted-foreground hover:text-primary'}`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => { sendMessage(input); }}
                disabled={isTyping || isRecording || !input.trim()}
                className="h-[42px] w-[42px] shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Send"
              >
                <Send className="h-4 w-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial modal ── */}
      {tutorialOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setTutorialOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-[95vw] max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b bg-[#f8fffe]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#14b8a6] flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Step 5 Tutorial — AI Genie Case Review</p>
                  <p className="text-[10px] text-gray-500">Small Claims Genie Training Video</p>
                </div>
              </div>
              <button
                onClick={() => setTutorialOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              width="800"
              height="450"
              src="https://app.heygen.com/embeds/c190d0b1142e43d9bc10ae1a7205dd8d"
              title="HeyGen video player"
              frameBorder="0"
              allow="encrypted-media; fullscreen;"
              allowFullScreen
              className="block"
            />
            <div className="px-5 py-3 bg-[#f0fdf9] border-t flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-600 flex-1 min-w-[200px]">
                Video plays above — click X or anywhere outside to return to your case.
              </p>
              <button
                onClick={() => setTutorialOpen(false)}
                className="shrink-0 text-xs font-semibold text-[#0d9488] hover:underline"
              >
                Close &amp; return to chat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
