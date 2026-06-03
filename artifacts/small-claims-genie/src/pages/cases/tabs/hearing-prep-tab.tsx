import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useWebSpeech } from "@workspace/integrations-openai-ai-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Gavel, FileText, Star, Mic, Send, RotateCcw, CheckCircle, ChevronLeft, Printer, RefreshCw, Clock, AlertCircle, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { DraftOverlay, DraftLockedButton } from "@/components/draft-overlay";
import type { ExtendedCase } from "@/lib/types";

function isRawNote(text: string): boolean {
  if (!text) return false;
  const upper = text.replace(/[$0-9.,\s\-\/]/g, "");
  if (upper.length === 0) return false;
  return upper === upper.toUpperCase() && upper.length > 4;
}

function buildOpeningStatement(c: ExtendedCase): string {
  const name = c.plaintiffName?.trim() || "[Your Name]";
  const defendant = c.defendantName?.trim() || "the defendant";
  const amount = c.claimAmount ? `$${Number(c.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "[amount owed]";
  const description = (c.claimDescription || "").trim();
  const howCalculated = (c.howAmountCalculated || "").trim();
  const priorDemand = c.priorDemandMade;
  const priorDemandDesc = (c.priorDemandDescription || "").trim();
  const rawDate = c.incidentDate || "";

  const gatheredEvidence = (c.evidenceChecklist || [])
    .filter(i => i.checked)
    .map(i => i.item);

  let datePhrase = "";
  if (rawDate) {
    const parts = rawDate.split(" – ");
    if (parts.length > 1) {
      datePhrase = `Between ${parts[0].trim()} and ${parts[1].trim()}, `;
    } else {
      datePhrase = `On ${parts[0].trim()}, `;
    }
  }

  const lines: string[] = [];

  lines.push(`Your Honor, my name is ${name}, and I am the plaintiff in this case against ${defendant}.`);
  lines.push("");

  if (description) {
    const sentences = description.match(/[^.!?\n]+[.!?\n]*/g) ?? [description];
    const cleaned = sentences.map(s => s.trim()).filter(Boolean);
    if (cleaned.length > 0) {
      const first = cleaned[0];
      const startsWithDate = /^(on |between |in |during )/i.test(first);
      const body = startsWithDate || !datePhrase ? first : `${datePhrase}${first.charAt(0).toLowerCase()}${first.slice(1)}`;
      lines.push(body.endsWith(".") || body.endsWith("?") || body.endsWith("!") ? body : body + ".");
      if (cleaned.length > 1) {
        lines.push("");
        lines.push(cleaned.slice(1).join(" "));
      }
    }
  } else {
    lines.push(`${datePhrase || "At some point, "}the defendant failed to fulfill an obligation to me, which is the basis of this claim.`);
  }

  lines.push("");
  const calcIsRaw = isRawNote(howCalculated);
  const amountLine = (!howCalculated || calcIsRaw)
    ? `My damages total ${amount}.`
    : `My damages total ${amount}. ${howCalculated.charAt(0).toUpperCase()}${howCalculated.slice(1)}${howCalculated.endsWith(".") ? "" : "."}`;
  lines.push(amountLine);

  lines.push("");
  if (priorDemand) {
    const demandIsRaw = isRawNote(priorDemandDesc);
    const demandLine = (!priorDemandDesc || demandIsRaw)
      ? `Before filing this case, I contacted the defendant to resolve this matter, but did not receive payment.`
      : `Before filing this case, I attempted to resolve this matter directly with the defendant. ${priorDemandDesc.charAt(0).toUpperCase()}${priorDemandDesc.slice(1)}${priorDemandDesc.endsWith(".") ? "" : "."} They have not paid or adequately responded.`;
    lines.push(demandLine);
    lines.push("");
  }

  if (gatheredEvidence.length > 0) {
    const list = gatheredEvidence.length === 1
      ? gatheredEvidence[0]
      : gatheredEvidence.slice(0, -1).join(", ") + ", and " + gatheredEvidence[gatheredEvidence.length - 1];
    lines.push(`My damages are supported by the following evidence I will present to the Court: ${list}.`);
  } else {
    lines.push(`I will present my evidence to the Court in support of this claim.`);
  }

  lines.push("");
  lines.push(`For those reasons, I respectfully ask the Court to enter judgment in my favor against the defendant in the amount of ${amount}, plus any allowable court costs and service costs.`);

  return lines.join("\n");
}

function buildNoShowStatement(c: ExtendedCase): string {
  const name = c.plaintiffName?.trim() || "[Your Name]";
  const amount = c.claimAmount ? `$${Number(c.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "[amount claimed]";
  const caseNumber = c.caseNumber?.trim() || "";
  const description = (c.claimDescription || "").trim();

  const sentences = description ? (description.match(/[^.!?\n]+[.!?\n]*/g) ?? [description]) : [];
  const cleanedSentences = sentences.map(s => s.trim()).filter(Boolean);
  const summary = cleanedSentences.length > 0
    ? cleanedSentences.slice(0, 2).join(" ")
    : "a dispute for which I am seeking damages";

  const lines: string[] = [];
  lines.push(`Your Honor, my name is ${name}. I am the plaintiff in this case.${caseNumber ? ` The case number is ${caseNumber}.` : ""} The defendant is not present. I am ready to proceed today. I understand the Court will need to confirm that service was properly completed before deciding whether the case can proceed today.`);
  lines.push("");

  const startsWithDatePhrase = /^(on |between |in |during |at )/i.test(summary.trim());
  if (startsWithDatePhrase) {
    lines.push(`${summary.trim()}${summary.trim().endsWith(".") ? "" : "."}`);
  } else {
    const s = summary.trim();
    const lower = s.charAt(0).toLowerCase() + s.slice(1);
    lines.push(`This case arises from ${lower}${lower.endsWith(".") ? "" : "."}`);
  }

  lines.push("");
  lines.push(`I have copies of my evidence for the Court. My damages total ${amount}.`);
  lines.push("");
  lines.push(`For those reasons, I respectfully ask the Court to enter judgment in my favor against the defendant in the amount of ${amount}, plus any allowable court costs and service costs.`);

  return lines.join("\n");
}

function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function wordsToTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const seconds = Math.round((words / 130) * 60);
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`;
}

type PrepMessage = { role: "user" | "assistant"; content: string };

export function HearingPrepTab({ caseId, currentCase, isDraftMode = false }: { caseId: number; currentCase: ExtendedCase; isDraftMode?: boolean }) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<PrepMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [prepMode, setPrepMode] = useState<null | "statement" | "mock-trial">(null);
  const [statementText, setStatementText] = useState(() => currentCase.statementText || buildOpeningStatement(currentCase));
  const [noShowText, setNoShowText] = useState(() => currentCase.noShowStatementText || buildNoShowStatement(currentCase));
  const [isRedrafting, setIsRedrafting] = useState(false);
  const [redraftError, setRedraftError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const { startListening, stopListening } = useWebSpeech();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMountRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveVersionRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const saveStatements = useCallback(async (statement: string, noShow: string) => {
    // Cancel any in-flight save so an older response can't overwrite newer text
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const version = ++saveVersionRef.current;

    setIsSaving(true);
    setSavedAt(null);
    setSaveError(false);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statementText: statement, noShowStatementText: noShow }),
        signal: controller.signal,
      });
      // Only update UI state for the latest save attempt
      if (version === saveVersionRef.current) {
        if (res.ok) setSavedAt(Date.now());
        else setSaveError(true);
      }
    } catch (err) {
      // AbortError means a newer save superseded this one — ignore it
      if (err instanceof Error && err.name === "AbortError") return;
      if (version === saveVersionRef.current) setSaveError(true);
    } finally {
      if (version === saveVersionRef.current) setIsSaving(false);
    }
  }, [caseId, getToken]);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void saveStatements(statementText, noShowText);
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [statementText, noShowText, saveStatements]);

  const streamJudgeResponse = async (msgHistory: PrepMessage[]) => {
    setIsTyping(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/cases/${caseId}/hearing-prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: msgHistory }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.error || "Something went wrong. Please try again."}` }]);
        return;
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              fullResponse += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullResponse };
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      console.error("[HearingPrep] Streaming error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startSession = () => {
    setSessionStarted(true);
    setMessages([]);
    streamJudgeResponse([]);
  };

  const resetSession = () => {
    setSessionStarted(false);
    setMessages([]);
    setInput("");
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const newMessages: PrepMessage[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    await streamJudgeResponse(newMessages);
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

  if (!sessionStarted && prepMode === null) {
    return (
      <div className="px-4 pt-5 pb-6 flex flex-col items-center gap-6">
        <div className="flex items-center justify-between w-full border-b border-amber-200 pb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <Gavel className="h-5 w-5 text-amber-500 shrink-0" />
              Hearing Prep Coach
            </h2>
            <p className="text-sm text-gray-500 mt-1 ml-[30px] leading-relaxed">
              Get ready for court. Practice your statement or run a mock hearing with an AI judge.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 shrink-0 ml-4">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            AI-Powered Practice
          </div>
        </div>

        <div className="flex justify-center gap-5 flex-wrap w-full">
          <button type="button" onClick={() => setPrepMode("statement")}
            className="group text-left rounded-2xl border-2 border-[#a8e6df] bg-[#f0fffe] hover:border-[#0d6b5e] hover:bg-[#e6faf8] transition-all p-6 space-y-3 shadow-sm hover:shadow-md w-[280px]">
            <div className="h-12 w-12 rounded-xl bg-[#0d6b5e] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">Court-Ready Statement</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Build and polish exactly what you'll say when the judge asks you to explain your case.</p>
            </div>
            <p className="text-xs font-semibold text-[#0d6b5e] flex items-center gap-1">Start here →</p>
          </button>
          <button type="button" onClick={() => setPrepMode("mock-trial")}
            className="group text-left rounded-2xl border-2 border-amber-200 bg-amber-50 hover:border-amber-500 hover:bg-amber-100 transition-all p-6 space-y-3 shadow-sm hover:shadow-md w-[280px]">
            <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Gavel className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">Practice Hearing Session</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Practice answering real judge questions in a simulated courtroom.</p>
            </div>
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">Practice session →</p>
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Nothing you say here is sent to the court — this is 100% private practice.</p>
      </div>
    );
  }

  if (!sessionStarted && prepMode === "statement") {
    const defName = currentCase.defendantName || "the defendant";
    const amount = currentCase.claimAmount ? `$${Number(currentCase.claimAmount).toLocaleString()}` : "the amount claimed";
    const hasMissingIntake = !currentCase.claimDescription || !currentCase.claimAmount;
    const speakingTime = wordsToTime(statementText);
    const wordCount = statementText.trim().split(/\s+/).filter(Boolean).length;
    const hasBrackets = /\[.+?\]/.test(statementText);
    const noShowWordCount = noShowText.trim().split(/\s+/).filter(Boolean).length;
    const noShowSpeakingTime = wordsToTime(noShowText);
    const noShowHasBrackets = /\[.+?\]/.test(noShowText);

    const printStatement = () => {
      const escaped = statementText.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const escapedNoShow = noShowText.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const noShowWc = noShowText.trim().split(/\s+/).filter(Boolean).length;
      const noShowTime = wordsToTime(noShowText);
      const draftWatermarkCss = isDraftMode ? `@media print{body::after{content:"DRAFT";position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:120px;font-weight:900;color:rgba(13,107,94,0.12);z-index:9999;pointer-events:none;white-space:nowrap;}}` : "";
      const draftBanner = isDraftMode ? `<div style="background:#f0fffe;border:2px dashed #14b8a6;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px;"><span style="font-size:18px;">🔒</span><span style="font-size:13px;color:#0d6b5e;font-weight:600;">Draft — Subscribe to unlock full PDF access</span></div>` : "";
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<!DOCTYPE html><html><head><title>Court-Ready Statement</title><style>body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#111;padding:0 20px;line-height:1.7}h1{font-family:Arial,sans-serif;color:#0d6b5e;font-size:22px;margin-bottom:4px}.sub{font-family:Arial,sans-serif;color:#666;font-size:13px;margin-bottom:28px}.section{font-family:Arial,sans-serif;font-weight:bold;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#0d6b5e;margin-bottom:10px;margin-top:0}.meta{font-family:Arial,sans-serif;font-size:11px;color:#9ca3af;margin-bottom:28px}.statement{border:1px solid #d1d5db;background:#fff;padding:24px 28px;border-radius:8px;font-size:15px;line-height:1.9;white-space:pre-wrap;margin-bottom:24px}.bracket{color:#d97706;font-style:italic;background:#fffbeb;border-radius:2px;padding:0 2px}.tips{border:1px solid #a8e6df;background:#f0fffe;padding:16px 20px;border-radius:8px;margin-bottom:24px;font-family:Arial,sans-serif}.tips li{font-size:12px;color:#0d6b5e;margin-bottom:6px;line-height:1.5}.mistakes{border:1px solid #fecaca;background:#fff7f7;padding:16px 20px;border-radius:8px;font-family:Arial,sans-serif;font-size:12px;color:#b91c1c;line-height:1.7}.print-btn{margin-top:24px;padding:10px 24px;background:#0d6b5e;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:Arial,sans-serif}@media print{.print-btn{display:none}}${draftWatermarkCss}</style></head><body>${draftBanner}<h1>Court-Ready Opening Statement</h1><p class="sub">Prepared for ${currentCase.plaintiffName || "Plaintiff"} · ${currentCase.countyId ? currentCase.countyId + " County" : "CA Small Claims"} · Small Claims Genie</p><p class="meta">~${wordCount} words · estimated speaking time ${speakingTime}</p><div class="section">Your Statement</div><div class="statement">${escaped.replace(/\[([^\]]+)\]/g, '<span class="bracket">[$1]</span>').replace(/\n/g, "<br>")}</div><div class="tips"><div class="section">5 Rules for Speaking in Court</div><ul><li><strong>Introduce yourself</strong> — State your name and what you want the court to decide.</li><li><strong>Tell the story in order</strong> — What happened first, then next. Judges want a clear timeline.</li><li><strong>Name the exact dollar amount</strong> — State ${amount} and how you calculated it.</li><li><strong>Mention your prior demand</strong> — Did you ask them to pay before filing? Say so.</li><li><strong>Keep it under 3 minutes</strong> — Practice until you can state the essentials clearly.</li></ul></div><div class="mistakes"><strong style="display:block;margin-bottom:8px;text-transform:uppercase;font-size:11px;letter-spacing:.06em">Common mistakes to avoid</strong>✕ Don't bring up the defendant's character — stick to facts about this dispute<br/>✕ Don't interrupt the judge — wait until they finish before speaking<br/>✓ Bring organized copies of your evidence for the judge and the other side, and follow your court's local rules about submitting evidence.<br/>✕ Don't get emotional — calm and factual always wins over angry and passionate</div><button class="print-btn" onclick="window.print()">Print / Save as PDF</button><script>window.onload=function(){window.print()}</script></body></html>`);
      w.document.write(`<hr style="border:none;border-top:2px solid #e5e7eb;margin:40px 0"><div style="font-family:Arial,sans-serif;font-weight:bold;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px">Statement if Defendant Does Not Appear</div><p style="font-family:Arial,sans-serif;font-size:11px;color:#9ca3af;margin-bottom:16px">~${noShowWc} words &nbsp;·&nbsp; ${noShowTime} &nbsp;·&nbsp; Read only if the defendant fails to appear — do not use otherwise</p><div style="border:1px solid #cbd5e1;background:#f8fafc;padding:24px 28px;border-radius:8px;font-size:15px;line-height:1.9;white-space:pre-wrap;margin-bottom:32px">${escapedNoShow.replace(/\[([^\]]+)\]/g,'<span style="color:#d97706;font-style:italic">[$1]</span>').replace(/\n/g,"<br>")}</div>`);
      w.document.close();
    };

    return (
      <div className="p-5 md:p-8 space-y-5 max-w-[814px] mx-auto">
        <button type="button" onClick={() => setPrepMode(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0d6b5e] flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Court-Ready Statements</h2>
              <p className="text-xs text-muted-foreground">Pre-drafted from your case — refine them, then practice out loud.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isRedrafting}
            onClick={async () => {
              setIsRedrafting(true);
              setRedraftError(null);
              try {
                const token = await getToken();
                const res = await fetch(`/api/cases/${caseId}/opening-statement`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  setRedraftError(err.error || "Something went wrong. Please try again.");
                  return;
                }
                const data = await res.json();
                const newStatement: string = data.statement || statementText;
                const newNoShow: string = data.noShowStatement || noShowText;
                if (data.statement) setStatementText(newStatement);
                if (data.noShowStatement) setNoShowText(newNoShow);
                // Auto-save both statements to the case record
                const saveRes = await fetch(`/api/cases/${caseId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ statementText: newStatement, noShowStatementText: newNoShow }),
                });
                if (saveRes.ok) setSavedAt(Date.now());
              } catch {
                setRedraftError("Connection error. Please try again.");
              } finally {
                setIsRedrafting(false);
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-[#0d6b5e] border border-border bg-muted/50 hover:bg-[#f0fffe] hover:border-[#a8e6df] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRedrafting ? "animate-spin" : ""}`} />
            {isRedrafting ? "Generating…" : "Re-draft from intake"}
          </button>
        </div>

        {redraftError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">{redraftError}</p>
          </div>
        )}

        {isSaving && !redraftError && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-gray-400 animate-spin shrink-0" />
            <p className="text-xs text-gray-500 font-medium">Saving…</p>
          </div>
        )}
        {saveError && !isSaving && !redraftError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800 font-medium">Save failed — check your connection and try editing again.</p>
          </div>
        )}
        {savedAt && !isSaving && !saveError && !redraftError && !isRedrafting && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-2.5 flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
            <p className="text-xs text-green-800 font-medium">Saved — your statements will be here when you come back.</p>
          </div>
        )}

        <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] px-4 py-4 space-y-3">
          <p className="text-sm font-bold text-[#0d6b5e]">We include two statements for your hearing:</p>
          <div className="space-y-2.5">
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-[#0d6b5e] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Statement if the Defendant Appears</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Use this statement if the defendant shows up and the judge asks you to present your case.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-[#0d6b5e] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Statement if the Defendant Does Not Appear</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Use this statement if the defendant does not show up and you need to ask the judge to enter judgment in your favor based on your evidence.</p>
              </div>
            </div>
          </div>
        </div>

        {hasMissingIntake && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">Some intake fields are missing (claim description or amount). <span className="font-semibold underline cursor-pointer">Fill in the Intake tab</span> for a stronger pre-draft.</p>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">This is a rough pre-draft built from your intake notes. For a polished, court-ready version that cleans up shorthand and formats everything properly, click <span className="font-semibold">Re-draft from intake</span> above.</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-900">Your Opening Statement</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-drafted from your intake data. Edit freely — this is your statement to refine.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${wordCount > 390 ? "border-red-200 bg-red-50 text-red-600" : wordCount > 260 ? "border-yellow-200 bg-yellow-50 text-yellow-700" : "border-green-200 bg-green-50 text-green-700"}`}>
                <Clock className="h-3 w-3" /> {speakingTime}
              </div>
              <span className="text-xs text-muted-foreground">{wordCount} words</span>
              <button
                type="button"
                title="Download statement as text file"
                onClick={() => downloadTextFile(statementText, "statement-defendant-appears.txt")}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-[#0d6b5e] hover:bg-[#f0fffe] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <DraftOverlay isDraftMode={isDraftMode}>
            <Textarea
              value={statementText}
              onChange={e => setStatementText(e.target.value)}
              className="font-serif text-sm leading-relaxed min-h-[340px] resize-y"
              placeholder="Your case details will appear here once you fill in the Intake tab…"
            />
          </DraftOverlay>

          {hasBrackets && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Fill in all <span className="font-bold font-mono">[bracketed]</span> sections before printing — those are placeholders that need your specific details.</p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-900">Statement if Defendant Does Not Appear</p>
              <p className="text-xs text-muted-foreground mt-0.5">Read this <span className="font-semibold">only</span> if the defendant fails to show up. Edit freely to personalize.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                <Clock className="h-3 w-3" /> {noShowSpeakingTime}
              </div>
              <span className="text-xs text-muted-foreground">{noShowWordCount} words</span>
              <button
                type="button"
                title="Download statement as text file"
                onClick={() => downloadTextFile(noShowText, "statement-defendant-no-show.txt")}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <DraftOverlay isDraftMode={isDraftMode}>
            <Textarea
              value={noShowText}
              onChange={e => setNoShowText(e.target.value)}
              className="font-serif text-sm leading-relaxed min-h-[200px] resize-y bg-slate-50/60"
              placeholder="No-show statement will appear here…"
            />
          </DraftOverlay>
          {noShowHasBrackets && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Fill in all <span className="font-bold font-mono">[bracketed]</span> sections — those are placeholders for missing intake data.</p>
            </div>
          )}
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">Only read this if the defendant does not appear. If they do appear, use your opening statement above instead.</p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800"><span className="font-semibold">Bring proof of service to court.</span> Before a judge can decide the case when the defendant is not present, the Court must confirm the defendant was properly served. Have your proof of service ready to hand to the clerk.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#a8e6df] bg-[#f0fffe] p-4 space-y-3">
          <p className="text-xs font-bold text-[#0d6b5e] uppercase tracking-wide">5 rules for speaking in court</p>
          {[
            { n: "1", tip: "Introduce yourself", detail: `State your name and that you're the plaintiff suing ${defName}.` },
            { n: "2", tip: "Tell the story in order", detail: "What happened first, then what happened next. Judges want a clear timeline — not a complaint." },
            { n: "3", tip: "Name the exact dollar amount", detail: `State ${amount} and explain how you calculated it. Bring the math on paper.` },
            { n: "4", tip: "Mention your prior demand", detail: "Say you contacted them before filing. It shows you tried to resolve it first." },
            { n: "5", tip: "Keep it under 3 minutes", detail: "Practice until you can state the essentials in 2–3 minutes. The judge will ask follow-up questions." },
          ].map(({ n, tip, detail }) => (
            <div key={n} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-[#0d6b5e] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{n}</div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{tip}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-1.5">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Common mistakes to avoid</p>
          {[
            "Don't bring up the defendant's character — stick to facts about this specific dispute",
            "Don't interrupt the judge — wait until they finish before speaking",
            "Bring organized copies of your evidence for the judge and the other side, and follow your court's local rules about submitting evidence.",
            "Don't get emotional — calm and factual always wins over angry and passionate",
          ].map((m, i) => (
            <div key={i} className="flex items-start gap-2"><span className="text-red-400 shrink-0 mt-0.5">✕</span><p className="text-xs text-red-800 leading-relaxed">{m}</p></div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-1">
          {isDraftMode
            ? <DraftLockedButton label="Subscribe to Print / Save as PDF" fullWidth />
            : <Button type="button" onClick={printStatement} variant="outline" className="w-full gap-2 h-11 border-[#0d6b5e] text-[#0d6b5e] hover:bg-[#f0fffe]">
                <Printer className="h-4 w-4" /> Print / Save as PDF
              </Button>
          }
          <Button onClick={() => setPrepMode("mock-trial")} className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white h-11">
            <Gavel className="h-4 w-4" /> Statement ready? Practice with Mock Trial →
          </Button>
          <button type="button" onClick={() => setPrepMode(null)} className="text-xs text-muted-foreground hover:text-foreground text-center hover:underline">← Back to prep options</button>
        </div>
      </div>
    );
  }

  if (!sessionStarted && prepMode === "mock-trial") {
    const hasHearingDate = !!currentCase.hearingDate;
    return (
      <div className="p-5 md:p-8 space-y-6 max-w-2xl mx-auto">
        <button type="button" onClick={() => setPrepMode(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0"><Gavel className="h-5 w-5 text-white" /></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Practice Hearing Session</h2>
            <p className="text-xs text-muted-foreground">AI-simulated courtroom — practice before the real thing</p>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-4">
          <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Before you start — a few tips</p>
          {[
            { icon: "🎯", tip: "Answer as if it's real court", detail: "The more seriously you treat it, the more useful the practice. Speak out loud — don't just think the answers." },
            { icon: "📅", tip: "Have your dates and amounts ready", detail: "The judge will ask specifics. Know your incident date, the amount you're claiming, and how you got that number." },
            { icon: "🧾", tip: "Mention your evidence", detail: "When the judge asks, say what documents you have — receipts, texts, photos, contracts." },
            { icon: "💬", tip: "Ask for feedback when you're done", detail: 'After a few rounds, type "Give me feedback" to get a personal critique of how you answered.' },
          ].map(({ icon, tip, detail }) => (
            <div key={tip} className="flex items-start gap-3">
              <span className="text-lg shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">{tip}</p>
                <p className="text-xs text-amber-800/80 mt-0.5 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-background p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">How the session works</p>
          {[
            { num: "1", text: "The session opens — you are asked to explain your case in your own words" },
            { num: "2", text: "The judge follows up with the same questions a real judge would ask — amounts, dates, evidence" },
            { num: "3", text: "You keep going until you feel confident, then ask for personal feedback" },
          ].map(({ num, text }) => (
            <div key={num} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{num}</div>
              <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
        {hasHearingDate && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              <strong>Hearing date set:</strong> {new Date(currentCase.hearingDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Your session is tailored to your real case.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={startSession} className="w-full gap-3 text-base h-12 bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl transition-all">
            <Gavel className="h-5 w-5" /> Begin Your Practice Hearing
          </Button>
          <p className="text-xs text-muted-foreground text-center">This is practice only — nothing is sent to the court.</p>
          <button type="button" onClick={() => setPrepMode("statement")} className="text-xs text-muted-foreground hover:text-foreground text-center hover:underline">← Build your statement first</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-260px)] min-h-[520px]">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-amber-500 flex items-center justify-center shadow-sm"><Gavel className="h-5 w-5 text-white" /></div>
          <div>
            <p className="text-sm font-bold text-gray-900">Practice Hearing</p>
            <p className="text-xs text-muted-foreground">Practice session — answer as you would in real court</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={resetSession} className="gap-1.5 text-muted-foreground hover:text-destructive text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Restart
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mr-2 mt-1"><Gavel className="h-4 w-4 text-white" /></div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-[#0d6b5e] text-white rounded-tr-sm" : "bg-amber-50 border border-amber-200 text-gray-800 rounded-tl-sm"}`}>
              {msg.role === "assistant" ? <ReactMarkdown>{msg.content || "…"}</ReactMarkdown> : <p>{msg.content}</p>}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mr-2 mt-1"><Gavel className="h-4 w-4 text-white" /></div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 bg-card border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-4 pt-1.5 pb-3">
        <div className="flex items-center justify-end mb-1.5">
          {isRecording ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-destructive animate-pulse">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
              Recording… tap mic to stop
            </span>
          ) : (
            <span className="text-xs font-bold text-muted-foreground/70">
              Tap mic to start · tap again to stop
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
              }}
              placeholder={isRecording ? "🔴 Recording — tap mic to stop…" : "Type your answer here… speak naturally, like you would in court"}
              rows={1}
              disabled={isRecording || isTyping}
              className="w-full resize-none overflow-hidden rounded-full border border-input bg-background pl-4 pr-10 py-2.5 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-70 transition-colors"
              style={{ minHeight: "42px", maxHeight: "120px" }}
            />
            <button
              type="button"
              onClick={isRecording ? handleVoiceStop : handleVoiceStart}
              aria-label={isRecording ? "Tap to stop recording" : "Tap to start recording"}
              className={`absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full transition-colors ${isRecording ? "text-destructive animate-pulse bg-destructive/10" : "text-muted-foreground hover:text-amber-600"}`}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
          {voiceError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mt-1 shrink-0">{voiceError}</p>
          )}
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={isTyping || isRecording || !input.trim()}
            className="h-[42px] w-[42px] shrink-0 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Send"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
