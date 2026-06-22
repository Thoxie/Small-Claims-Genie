import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useGetChatHistory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Mic, Send, CheckCircle, Loader2, Download, Sparkles, Eraser, Play, ChevronRight, X, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { i18n } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";
import { DraftLockedButton } from "@/components/draft-overlay";
import type { ExtendedCase } from "@/lib/types";
import { useWebSpeech } from "@workspace/integrations-openai-ai-react";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  redirect?: { target: string; question: string } | null;
}

const REDIRECT_SEP = "\nREDIRECT:";
const SUGGESTIONS_SEP = "\nSUGGESTIONS:";

function parseAIContent(raw: string): { displayText: string; redirect: { target: string; question: string } | null } {
  let text = raw;
  let redirect: { target: string; question: string } | null = null;
  const ridx = text.indexOf(REDIRECT_SEP);
  if (ridx !== -1) {
    const part = text.slice(ridx + REDIRECT_SEP.length).trim();
    text = text.slice(0, ridx);
    const pipe = part.indexOf("|");
    if (pipe !== -1) {
      redirect = { target: part.slice(0, pipe).trim(), question: part.slice(pipe + 1).trim() };
    }
  }
  const sidx = text.indexOf(SUGGESTIONS_SEP);
  if (sidx !== -1) text = text.slice(0, sidx);
  return { displayText: text.trimEnd(), redirect };
}

const REDIRECT_LABELS: Record<string, string> = {
  "help-genie": "Open App Guide",
  "case-advisor": "Open Case Advisor",
  "step:chat": "Open Case Advisor",
  "step:prep": "Go to Hearing Prep",
  "step:deadlines": "Go to Deadlines",
  "step:documents": "Go to My Evidence",
  "step:demand-letter": "Go to Demand Letter",
  "step:forms": "Go to Court Forms",
  "step:intake": "Go to Case Details",
};

const PAGE_INSTRUCTIONS: Record<string, { title: string; steps: string[] }> = {
  'intake-1': {
    title: 'Your Information',
    steps: [
      'Enter your full name and contact details.',
      'Select the California county where you plan to file.',
      'Describe what happened in plain English — who owes you what and why.',
      'Enter the total amount you are claiming.',
      'Click Save & Continue when done.',
    ],
  },
  'intake-2': {
    title: 'Defendant Information',
    steps: [
      'Enter the full legal name of the person or business that owes you money.',
      'Add their address — this is required to serve them court papers.',
      'Add a second defendant if more than one party is responsible.',
      'Click Save & Continue when done.',
    ],
  },
  'documents': {
    title: 'Evidence & Documents',
    steps: [
      'Upload anything that supports your case: photos, receipts, contracts, texts, emails.',
      'AI automatically scans and summarizes each document.',
      'Add your own notes to explain what each item proves.',
      'The more evidence you upload, the stronger your AI case analysis will be.',
    ],
  },
  'demand-letter': {
    title: 'Demand Letter',
    steps: [
      'Choose a letter type:',
      '— Demand Letter — Required by California law. Send it and wait 30 days before you can file in court.',
      '— Settlement Offer Letter — If the other party wants to settle, use this to propose your payment terms.',
      '— Settlement Agreement — Once both parties agree, the system auto-drafts a binding contract. Download, sign, and send.',
      'Select a tone (firm, professional, or urgent) and click Generate.',
      'Review the letter, edit if needed, and download as PDF.',
    ],
  },
  'forms': {
    title: 'Court Forms',
    steps: [
      'Select the form you need — SC-100 to file your claim, SC-105 for defendants, MC-030 for declarations.',
      'Review the pre-filled information pulled from your intake.',
      'Download the completed form as a PDF.',
      'Print and file at your county courthouse, or submit online if your county allows it.',
    ],
  },
  'prep': {
    title: 'Hearing Preparation',
    steps: [
      'Generate a court-ready opening statement based on your case facts.',
      'Review tips for speaking in court and common mistakes to avoid.',
      'Use the AI coach to practice and refine your argument.',
      'Print your statement to bring on hearing day.',
    ],
  },
  'deadlines': {
    title: 'Deadlines & Timeline',
    steps: [
      'Enter your hearing date to activate your preparation timeline.',
      'Work through the checklist — each task has a suggested due date.',
      'Check off items as you complete them.',
      'Email reminders are sent automatically for upcoming deadlines.',
    ],
  },
  'chat': {
    title: 'AI Case Advisor',
    steps: [
      'Tap a suggested question or type your own in the box below.',
      'Hold the mic button to ask by voice.',
      'Ask follow-up questions — the AI remembers the full conversation.',
      'Download the chat transcript as a Word document using the Word button.',
    ],
  },
};

export function ChatTab({ caseId, isDraftMode = false, currentCase, autoMessage, onAutoMessageSent, hideTutorial = false, freshReview, pageContext, onTypingChange }: {
  caseId: number;
  isDraftMode?: boolean;
  currentCase?: ExtendedCase;
  autoMessage?: string;
  onAutoMessageSent?: () => void;
  hideTutorial?: boolean;
  freshReview?: boolean;
  pageContext?: string;
  onTypingChange?: (isTyping: boolean) => void;
}) {
  const jurisdictionState = currentCase?.jurisdictionState ?? "CA";
  const pageInstructions: Record<string, { title: string; steps: string[] }> = {
    ...PAGE_INSTRUCTIONS,
    'intake-1': {
      title: 'Your Information',
      steps: [
        'Enter your full name and contact details.',
        jurisdictionState === 'FL'
          ? 'Select your Florida county where you plan to file.'
          : jurisdictionState === 'TX'
          ? 'Select your Texas county and Justice of the Peace precinct.'
          : 'Select the California county where you plan to file.',
        'Describe what happened in plain English — who owes you what and why.',
        'Enter the total amount you are claiming.',
        'Click Save & Continue when done.',
      ],
    },
    'demand-letter': {
      title: 'Demand Letter',
      steps: [
        'Choose a letter type:',
        jurisdictionState === 'CA'
          ? '— Demand Letter — Required by California law. Send it and wait 30 days before you can file in court.'
          : '— Demand Letter — A formal written demand. Many courts and legal guides recommend sending one before filing.',
        '— Settlement Offer Letter — If the other party wants to settle, use this to propose your payment terms.',
        '— Settlement Agreement — Once both parties agree, the system auto-drafts a binding contract. Download, sign, and send.',
        'Select a tone (firm, professional, or urgent) and click Generate.',
        'Review the letter, edit if needed, and download as PDF.',
      ],
    },
    'forms': {
      title: 'Court Forms',
      steps: jurisdictionState === 'FL'
        ? [
            'Select the form for your Florida county — your Statement of Claim is pre-filled from your case intake.',
            'Review the pre-filled information and edit any field if needed.',
            'Download the completed form as a PDF.',
            'File at your county courthouse, or submit online if your court allows it.',
          ]
        : jurisdictionState === 'TX'
        ? [
            'Select the form you need — the Justice of the Peace Petition is pre-filled from your intake.',
            'Review the pre-filled information and edit any field if needed.',
            'Download the completed form as a PDF.',
            'File at your local Justice of the Peace court.',
          ]
        : [
            'Select the form you need — SC-100 to file your claim, SC-105 for defendants, MC-030 for declarations.',
            'Review the pre-filled information pulled from your intake.',
            'Download the completed form as a PDF.',
            'Print and file at your county courthouse, or submit online if your county allows it.',
          ],
    },
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const sessionKey = `chat_cleared_${caseId}`;
  const [cleared, setCleared] = useState(() => !!sessionStorage.getItem(`chat_cleared_${caseId}`));
  const [pendingFresh, setPendingFresh] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const expandedScrollRef = useRef<HTMLDivElement>(null);
  const { getToken } = useAuth();
  const { startListening, stopListening } = useWebSpeech();

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
    if (!autoMessage) { autoMessageFiredRef.current = false; return; }
    if (autoMessageFiredRef.current) return;
    autoMessageFiredRef.current = true;
    sendMessage(autoMessage, { fresh: freshReview });
    onAutoMessageSent?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMessage]);

  useEffect(() => { onTypingChange?.(isTyping); }, [isTyping, onTypingChange]);

  useEffect(() => {
    if (!hideTutorial) return;
    const onClearChat = () => {
      sessionStorage.setItem(sessionKey, "1");
      setMessages([]);
      setCleared(true);
      setPendingFresh(true);
    };
    const onExpand = () => setExpanded(true);
    window.addEventListener('ai-genie-clear-chat', onClearChat);
    window.addEventListener('ai-genie-expand', onExpand);
    return () => {
      window.removeEventListener('ai-genie-clear-chat', onClearChat);
      window.removeEventListener('ai-genie-expand', onExpand);
    };
  }, [hideTutorial, sessionKey]);

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

  const sendMessage = async (content: string, opts?: { fresh?: boolean }) => {
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

    const useFresh = pendingFresh || opts?.fresh;
    if (pendingFresh) setPendingFresh(false);

    const newMsg: ChatMessage = { id: Date.now(), role: 'user', content };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);
    setRateLimitMsg(null);

    try {
      const token = await getToken();
      const response = await fetch(`/api/cases/${caseId}/chat${useFresh ? '?fresh=1' : ''}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content, pageContext: pageContext ?? null })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string; code?: string };
        if (err.code === "RATE_LIMITED") {
          setRateLimitMsg(err.error ?? "You've used your AI allowance for this hour. Please try again later.");
          return;
        }
        throw new Error(err.error || `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let sseBuffer = "";
      const assistantMsgId = Date.now() + 1;

      if (reader) {
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant' as const, content: "" }]);
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
                const { displayText } = parseAIContent(assistantContent);
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  return [...prev.slice(0, -1), { ...last, content: displayText }];
                });
              }
            } catch { /* incomplete chunk */ }
          }
        }
        // After streaming completes, parse the final redirect and attach to message
        const { displayText: finalText, redirect } = parseAIContent(assistantContent);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last.id !== assistantMsgId) return prev;
          return [...prev.slice(0, -1), { ...last, content: finalText, redirect }];
        });
      }
    } catch (e: unknown) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now() + 2, role: 'assistant' as const, content: `Sorry, I ran into an error: ${e instanceof Error ? e.message : "Please try again."}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceStart = () => {
    setVoiceError(null);
    const started = startListening(
      input,
      (interim: string) => setInput(interim),
      (final: string) => { setInput(final); setIsRecording(false); },
      (msg: string) => { setVoiceError(msg); setIsRecording(false); },
    );
    if (started) setIsRecording(true);
  };

  const handleVoiceStop = () => {
    stopListening();
  };

  const mdComponents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1: ({children}: any) => <p className="font-bold mt-2 mb-0.5">{children}</p>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2: ({children}: any) => <p className="font-bold mt-1.5 mb-0.5">{children}</p>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3: ({children}: any) => <p className="font-semibold mt-1 mb-0.5">{children}</p>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h4: ({children}: any) => <p className="font-semibold mb-0.5">{children}</p>,
  };

  return (
    <div className={hideTutorial ? "flex-1 flex flex-col min-h-0" : "flex gap-4 items-start pr-4 pl-0 pt-3 pb-4"}>

      {/* ── Chat column ── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0" style={hideTutorial ? undefined : { height: "calc(100dvh - 165px)", minHeight: "420px" }}>
      {!hideTutorial && (
        <button
          type="button"
          onClick={() => setTutorialOpen(true)}
          className="sm:hidden flex items-center gap-2 rounded-lg border border-[#14b8a6] bg-[#f0fffe] px-3 py-2 text-xs font-semibold text-[#0d6b5e] w-full"
        >
          <Play className="h-3.5 w-3.5 shrink-0" fill="currentColor" />
          Watch Tutorial Video — Step 5
          <ChevronRight className="h-3 w-3 ml-auto shrink-0" />
        </button>
      )}
      {!hideTutorial && <div className="bg-primary/5 border border-black/80 rounded-lg p-3 text-sm font-medium text-primary flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <strong className="truncate">Your AI Genie is trained on all your case information.</strong>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1 border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
            title="Refresh AI context — re-reads your latest intake"
            onClick={() => { sessionStorage.setItem(sessionKey, "1"); setMessages([]); setCleared(true); setPendingFresh(true); }}
          >
            <Eraser className="h-3 w-3" /> Clear Chat
          </Button>
          {messages.length > 0 && (
            isDraftMode ? (
              <DraftLockedButton label="Subscribe to Export" size="sm" />
            ) : (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => downloadChat("word")} disabled={downloadingWord}>
                {downloadingWord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Word
              </Button>
            )
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
      </div>}

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col gap-4 py-6 px-2 max-w-lg mx-auto w-full">
            {pageContext && pageInstructions[pageContext] && (
              <div>
                <button
                  type="button"
                  onClick={() => setHowToOpen(h => !h)}
                  className="flex items-start gap-3 w-full rounded-xl border border-[#a8e6df] bg-[#f0fffe] hover:bg-[#ddf6f3] px-4 py-3 text-left text-sm transition-colors group"
                >
                  <span className="text-base shrink-0 mt-0.5">❓</span>
                  <span className="leading-relaxed text-[#0d6b5e] group-hover:text-[#0a5a50] flex-1">How do I use this page?</span>
                  <ChevronRight className={`h-4 w-4 text-[#0d6b5e] shrink-0 mt-0.5 transition-transform duration-200 ${howToOpen ? 'rotate-90' : ''}`} />
                </button>
                {howToOpen && (
                  <div className="mt-1.5 rounded-xl border border-[#a8e6df] bg-[#f0fffe] px-4 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0d6b5e]/60 mb-2">{pageInstructions[pageContext].title}</p>
                    <div className="space-y-1.5">
                      {pageInstructions[pageContext].steps.map((step, i) => {
                        if (step.startsWith('—')) return (
                          <p key={i} className="text-[12px] leading-relaxed text-[#0d6b5e]/70 pl-4">{step.slice(2)}</p>
                        );
                        const num = pageInstructions[pageContext].steps.slice(0, i + 1).filter((s: string) => !s.startsWith('—')).length;
                        return (
                          <div key={i} className="flex gap-2 text-[13px] leading-relaxed text-[#0d6b5e]">
                            <span className="font-semibold shrink-0">{num}.</span>
                            <span>{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-center gap-1.5 text-[#a8e6df] text-base select-none">• • •</div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Tap a question to ask
              </p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { q: currentCase?.defendantName ? `How strong is my case against ${currentCase.defendantName}, and what are my best arguments?` : "How strong is my case and what are my best arguments?", icon: "⚖️" },
                  { q: "What evidence should I bring to the hearing?", icon: "📋" },
                  { q: "What could hurt my case or go wrong at the hearing?", icon: "🔍" },
                  { q: "Please do a full review of my case. Identify the strongest arguments, any weaknesses or gaps in my evidence, what I should fix or gather before filing, and how strong my chances are.", icon: "📊" },
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
          <div key={msg.id} className="flex flex-col">
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                {msg.role === 'user' ? (
                  <p className="text-[13px] leading-[1.55] whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="text-[13px] leading-[1.55] prose prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-headings:mt-2.5 prose-headings:mb-1 prose-strong:font-semibold prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-a:text-primary">
                    <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
            {msg.role === 'assistant' && msg.redirect && (
              <div className="flex justify-start pl-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (msg.redirect!.target === 'help-genie') {
                      window.dispatchEvent(new CustomEvent('open-help-genie-with-message', { detail: { question: msg.redirect!.question } }));
                    } else {
                      const tabKey = msg.redirect!.target.startsWith('step:') ? msg.redirect!.target.slice(5) : 'chat';
                      window.dispatchEvent(new CustomEvent('navigate-workspace-tab', { detail: { tab: tabKey, question: msg.redirect!.question } }));
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-full border border-[#14b8a6] text-[#0d6b5e] bg-[#f0fffe] hover:bg-[#ddf6f3] transition-colors"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {REDIRECT_LABELS[msg.redirect.target] ?? "Open"}
                </button>
              </div>
            )}
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

      {rateLimitMsg && (
        <div className="shrink-0 mx-4 mb-2 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5">
          <span className="text-amber-500 text-base leading-none mt-0.5">⏳</span>
          <p className="text-xs font-medium text-amber-800 leading-relaxed">{rateLimitMsg}</p>
        </div>
      )}
      {voiceError && (
        <div className="shrink-0 mx-4 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <span className="text-red-500 text-sm leading-none mt-0.5">🎤</span>
          <p className="text-xs text-red-700 leading-relaxed">{voiceError}</p>
        </div>
      )}

      <div className="shrink-0 bg-card border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-4 pt-1.5 pb-3 rounded-b-lg">
        <div className={`flex items-center justify-end mb-1.5 transition-all duration-200`}>
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
              placeholder={isRecording ? "🔴 Recording — tap mic to stop…" : i18n.chat.placeholder}
              rows={1}
              disabled={isRecording}
              className="w-full resize-none overflow-hidden rounded-full border-2 border-slate-400 bg-background pl-4 pr-10 py-2.5 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-70 transition-colors"
              style={{ minHeight: "42px", maxHeight: "120px" }}
            />
            <button
              type="button"
              onClick={isRecording ? handleVoiceStop : handleVoiceStart}
              aria-label={isRecording ? "Tap to stop recording" : "Tap to start recording"}
              className={`absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full transition-colors ${isRecording ? 'text-destructive animate-pulse bg-destructive/10' : 'text-muted-foreground hover:text-primary'}`}
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

      {/* ── Video tutorial card — hidden when rendered in side panel ── */}
      {!hideTutorial && (
      <div
        onClick={() => setTutorialOpen(true)}
        className="hidden sm:block cursor-pointer group flex-shrink-0 w-[220px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
        title="Watch the tutorial for this step"
      >
        <div className="relative bg-[#0f2537] h-[120px] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
              <Play className="w-[18px] h-[18px] text-white ml-1" fill="white" />
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
      )}

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
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1 border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                title="Refresh AI context — re-reads your latest intake"
                onClick={() => { sessionStorage.setItem(sessionKey, "1"); setMessages([]); setCleared(true); setPendingFresh(true); }}
              >
                <Eraser className="h-3 w-3" /> Clear Chat
              </Button>
              {messages.length > 0 && (
                isDraftMode ? (
                  <DraftLockedButton label="Subscribe to Export" size="sm" />
                ) : (
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => downloadChat("word")} disabled={downloadingWord}>
                    {downloadingWord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Word
                  </Button>
                )
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
              <div className="flex flex-col gap-4 py-8 px-2 max-w-lg mx-auto w-full">
                {pageContext && pageInstructions[pageContext] && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setHowToOpen(h => !h)}
                      className="flex items-start gap-3 w-full rounded-xl border border-[#a8e6df] bg-[#f0fffe] hover:bg-[#ddf6f3] px-4 py-3 text-left text-sm transition-colors group"
                    >
                      <span className="text-base shrink-0 mt-0.5">❓</span>
                      <span className="leading-relaxed text-[#0d6b5e] group-hover:text-[#0a5a50] flex-1">How do I use this page?</span>
                      <ChevronRight className={`h-4 w-4 text-[#0d6b5e] shrink-0 mt-0.5 transition-transform duration-200 ${howToOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {howToOpen && (
                      <div className="mt-1.5 rounded-xl border border-[#a8e6df] bg-[#f0fffe] px-4 py-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0d6b5e]/60 mb-2">{pageInstructions[pageContext].title}</p>
                        <div className="space-y-1.5">
                          {pageInstructions[pageContext].steps.map((step, i) => {
                            if (step.startsWith('—')) return (
                              <p key={i} className="text-[12px] leading-relaxed text-[#0d6b5e]/70 pl-4">{step.slice(2)}</p>
                            );
                            const num = pageInstructions[pageContext].steps.slice(0, i + 1).filter((s: string) => !s.startsWith('—')).length;
                            return (
                              <div key={i} className="flex gap-2 text-[13px] leading-relaxed text-[#0d6b5e]">
                                <span className="font-semibold shrink-0">{num}.</span>
                                <span>{step}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-center gap-1.5 text-[#a8e6df] text-base select-none">• • •</div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Tap a question to ask
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { q: currentCase?.defendantName ? `How strong is my case against ${currentCase.defendantName}, and what are my best arguments?` : "How strong is my case and what are my best arguments?", icon: "⚖️" },
                      { q: "What evidence should I bring to the hearing?", icon: "📋" },
                      { q: "What could hurt my case or go wrong at the hearing?", icon: "🔍" },
                      { q: "Please do a full review of my case. Identify the strongest arguments, any weaknesses or gaps in my evidence, what I should fix or gather before filing, and how strong my chances are.", icon: "📊" },
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
              <div key={msg.id} className="flex flex-col">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                    {msg.role === 'user' ? (
                      <p className="text-[13px] leading-[1.55] whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-[13px] leading-[1.55] prose prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-headings:mt-2.5 prose-headings:mb-1 prose-strong:font-semibold prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-a:text-primary">
                        <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
                {msg.role === 'assistant' && msg.redirect && (
                  <div className="flex justify-start pl-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (msg.redirect!.target === 'help-genie') {
                          window.dispatchEvent(new CustomEvent('open-help-genie-with-message', { detail: { question: msg.redirect!.question } }));
                        } else {
                          const tabKey = msg.redirect!.target.startsWith('step:') ? msg.redirect!.target.slice(5) : 'chat';
                          window.dispatchEvent(new CustomEvent('navigate-workspace-tab', { detail: { tab: tabKey, question: msg.redirect!.question } }));
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-full border border-[#14b8a6] text-[#0d6b5e] bg-[#f0fffe] hover:bg-[#ddf6f3] transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {REDIRECT_LABELS[msg.redirect.target] ?? "Open"}
                    </button>
                  </div>
                )}
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
                  Recording… tap mic to stop
                </span>
              ) : (
                <span className="text-xs font-extrabold text-white bg-black px-2 py-0.5 rounded-md">
                  Tap mic to start · tap again to stop
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
                  placeholder={isRecording ? "🔴 Recording — tap mic to stop…" : i18n.chat.placeholder}
                  rows={1}
                  disabled={isRecording}
                  className="w-full resize-none overflow-hidden rounded-full border-2 border-slate-400 bg-background pl-4 pr-10 py-2.5 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-70 transition-colors"
                  style={{ minHeight: "42px", maxHeight: "120px" }}
                />
                <button
                  type="button"
                  onClick={isRecording ? handleVoiceStop : handleVoiceStart}
                  aria-label={isRecording ? "Tap to stop recording" : "Tap to start recording"}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full transition-colors ${isRecording ? 'text-destructive animate-pulse bg-destructive/10' : 'text-muted-foreground hover:text-primary'}`}
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
                  <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
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
