import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useGetChatHistory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Mic, Send, CheckCircle, Loader2, Download } from "lucide-react";
import { i18n } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";

export function ChatTab({ caseId }: { caseId: number }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { getToken } = useAuth();

  const downloadChat = async (format: "pdf" | "word", scope: "last" | "all" = "all") => {
    const setLoading = format === "pdf" ? setDownloadingPdf : setDownloadingWord;
    setLoading(true);
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
      const ext = format === "pdf" ? "pdf" : "docx";
      const label = scope === "last" ? "ai-document" : "ai-chat-transcript";
      a.download = `${label}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("[Chat export]", e);
      alert(e?.message || "Could not download. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const { data: history } = useGetChatHistory(caseId, { query: { enabled: !!caseId } });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const detectDownloadCommand = (text: string): { format: "pdf" | "word"; scope: "last" | "all" } | null => {
    const t = text.toLowerCase().trim();
    const wordPatterns = [/word/, /\.docx/, /docx/, /ms word/, /microsoft word/];
    const pdfPatterns = [/\bpdf\b/, /\.pdf/];
    const actionPatterns = [/download/, /export/, /save/, /give me/, /get me/, /generate/, /send/];
    const hasAction = actionPatterns.some(p => p.test(t));
    if (!hasAction) return null;
    let format: "pdf" | "word" | null = null;
    if (wordPatterns.some(p => p.test(t))) format = "word";
    else if (pdfPatterns.some(p => p.test(t))) format = "pdf";
    if (!format) return null;
    const allPatterns = [/\bchat\b/, /conversation/, /transcript/, /\ball\b/, /everything/, /whole/];
    const scope: "last" | "all" = allPatterns.some(p => p.test(t)) ? "all" : "last";
    return { format, scope };
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const downloadCmd = detectDownloadCommand(content);
    if (downloadCmd) {
      const { format, scope } = downloadCmd;
      setInput("");
      const formatLabel = format === "pdf" ? "PDF" : "Word (.docx)";
      const scopeLabel = scope === "last" ? "that content" : "the full chat transcript";
      const botMsg = { id: Date.now() + 1, role: 'assistant', content: `Of course! Downloading ${scopeLabel} as a **${formatLabel}** file — your download will start in a moment.` };
      setMessages(prev => [...prev, { id: Date.now(), role: 'user', content }, botMsg]);
      await downloadChat(format, scope);
      return;
    }

    const newMsg = { id: Date.now(), role: 'user', content };
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
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "" }]);
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
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now() + 2, role: 'assistant', content: `Sorry, I ran into an error: ${e?.message || "Please try again."}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceStart = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { console.warn("[Voice] Web Speech API not supported"); return; }
    const textBeforeRecording = input.trim();
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
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
    <div className="flex flex-col" style={{ height: "calc(100dvh - 135px)", minHeight: "420px" }}>
      <div className="bg-primary/5 border-b p-3 text-sm font-medium text-primary flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" /> Your AI Genie is trained on your uploaded documents.
        </div>
        {messages.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground font-normal">Download transcript:</span>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => downloadChat("pdf")} disabled={downloadingPdf || downloadingWord}>
              {downloadingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} PDF
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => downloadChat("word")} disabled={downloadingPdf || downloadingWord}>
              {downloadingWord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Word
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground opacity-60">
            <div className="text-4xl mb-4">🧞</div>
            <p>Ask anything about your case.</p>
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

      <div className="shrink-0 bg-card border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-3 py-3">
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
              className="w-full resize-none overflow-hidden rounded-full border border-input bg-background pl-4 pr-10 py-2.5 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-70 transition-colors"
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
  );
}
