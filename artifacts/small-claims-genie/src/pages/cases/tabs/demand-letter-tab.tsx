import { useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import type { ExtendedCase } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Mail, Handshake, PenLine, Loader2, Download, AlertCircle, CheckSquare2, Square, FileText, Scale, MessageCircle, CheckCircle2, Play, X, ChevronRight, BookOpen } from "lucide-react";

type DemandLetterTone = "formal" | "firm" | "friendly";

const TONE_META: { value: DemandLetterTone; label: string; description: string; icon: ReactNode }[] = [
  { value: "formal",   label: "Formal",   description: "Neutral, professional — facts stated plainly",         icon: <FileText className="h-3.5 w-3.5" /> },
  { value: "firm",     label: "Firm",     description: "Assertive & deadline-focused — legal basis emphasized", icon: <Scale className="h-3.5 w-3.5" /> },
  { value: "friendly", label: "Friendly", description: "Cooperative — prefers settlement over court",           icon: <MessageCircle className="h-3.5 w-3.5" /> },
];

const SETTLE_CHECKLIST = [
  { id: "certified", label: "Send via certified mail (USPS)", detail: "Get a tracking number — you'll need it if they later dispute receipt." },
  { id: "copy", label: "Keep a copy of this letter for your court file", detail: "Bring it to the hearing to show you attempted to settle." },
  { id: "written", label: "If they accept: get the agreement in writing", detail: "A signed written agreement is required before you withdraw your case." },
  { id: "counter", label: "If they counter-offer: nothing is binding until signed", detail: "You can accept, reject, or counter again — you're still in control." },
  { id: "reminder", label: "Set a calendar reminder for your response deadline", detail: "If no response by the deadline, proceed with your court case." },
];

export function DemandLetterTab({ caseId, currentCase, onNext }: { caseId: number; currentCase: ExtendedCase; onNext?: () => void }) {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<"demand" | "settlement" | "agreement">("demand");

  const [text, setText] = useState("");
  const [tone, setTone] = useState<DemandLetterTone>("formal");
  const [letters, setLetters] = useState<Record<DemandLetterTone, string>>({ formal: "", firm: "", friendly: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const claimAmt = Number(currentCase?.claimAmount ?? 0);
  const defaultSettle = Math.round(claimAmt * 0.75 * 100) / 100;
  const [settlementText, setSettlementText] = useState("");
  const [settleTone, setSettleTone] = useState<"firm" | "cooperative">("firm");
  const [settleAmount, setSettleAmount] = useState(defaultSettle || 0);
  const [settlePct, setSettlePct] = useState(75);
  const [installments, setInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(3);
  const [responseDays, setResponseDays] = useState(14);
  const [isGeneratingSettle, setIsGeneratingSettle] = useState(false);
  const [isDownloadingSettle, setIsDownloadingSettle] = useState(false);
  const [settleLoaded, setSettleLoaded] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleChecklist, setSettleChecklist] = useState<Record<string, boolean>>({});

  const [agreementText, setAgreementText] = useState("");
  const [agreeInstallments, setAgreeInstallments] = useState(false);
  const [agreeInstallmentCount, setAgreeInstallmentCount] = useState(3);
  const [agreePaymentMethod, setAgreePaymentMethod] = useState<"check" | "cash" | "Zelle" | "bank transfer">("check");
  const [agreeConfidential, setAgreeConfidential] = useState(false);
  const [isGeneratingAgreement, setIsGeneratingAgreement] = useState(false);
  const [isDownloadingAgreement, setIsDownloadingAgreement] = useState(false);
  const [agreementLoaded, setAgreementLoaded] = useState(false);
  const [agreementError, setAgreementError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/cases/${caseId}/demand-letter`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          const loaded: Record<DemandLetterTone, string> = {
            formal:   data.letters?.formal   || "",
            firm:     data.letters?.firm     || "",
            friendly: data.letters?.friendly || "",
          };
          setLetters(loaded);
          const activeTone: DemandLetterTone = (data.tone as DemandLetterTone) || "formal";
          setTone(activeTone);
          setText(loaded[activeTone] || "");
          setLoaded(true);
        }
      } catch { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [caseId, getToken]);

  function handleToneChange(newTone: DemandLetterTone) {
    setTone(newTone);
    setText(letters[newTone] || "");
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/cases/${caseId}/settlement-letter`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) { if (data.text) setSettlementText(data.text); if (data.tone) setSettleTone(data.tone as "firm" | "cooperative"); setSettleLoaded(true); }
      } catch { if (!cancelled) setSettleLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [caseId, getToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/cases/${caseId}/settlement-agreement`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) { if (data.text) setAgreementText(data.text); setAgreementLoaded(true); }
      } catch { if (!cancelled) setAgreementLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [caseId, getToken]);

  const hasRequiredInfo = !!(currentCase?.plaintiffName && currentCase?.defendantName && currentCase?.claimAmount);

  async function generate() {
    if (isGenerating) return;
    setIsGenerating(true); setError(null); setText("");
    const currentTone = tone;
    let fullText = "";
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/demand-letter`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tone: currentTone }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.error ?? "Generation failed"); return; }
      const reader = res.body?.getReader();
      if (!reader) { setError("Streaming not supported"); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.content) { fullText += p.content; setText(prev => prev + p.content); }
          } catch { /* ignore */ }
        }
      }
      if (fullText) setLetters(prev => ({ ...prev, [currentTone]: fullText }));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unexpected error"); }
    finally { setIsGenerating(false); }
  }

  async function downloadPdf() {
    if (!text.trim() || isDownloading) return;
    setIsDownloading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/demand-letter/pdf`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { setError("PDF generation failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `demand-letter.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Download failed"); }
    finally { setIsDownloading(false); }
  }

  async function generateSettlement() {
    if (isGeneratingSettle) return;
    setIsGeneratingSettle(true); setSettleError(null); setSettlementText("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/settlement-letter`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tone: settleTone, settlementAmount: settleAmount, installments, installmentCount, responseDays }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setSettleError(err.error ?? "Generation failed"); return; }
      const reader = res.body?.getReader();
      if (!reader) { setSettleError("Streaming not supported"); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const p = JSON.parse(line.slice(6)); if (p.content) setSettlementText(prev => prev + p.content); } catch { /* ignore */ }
        }
      }
    } catch (e: unknown) { setSettleError(e instanceof Error ? e.message : "Unexpected error"); }
    finally { setIsGeneratingSettle(false); }
  }

  async function downloadSettlePdf() {
    if (!settlementText.trim() || isDownloadingSettle) return;
    setIsDownloadingSettle(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/settlement-letter/pdf`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: settlementText }),
      });
      if (!res.ok) { setSettleError("PDF generation failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const defName = (currentCase?.defendantName ?? "defendant").replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a"); a.href = url; a.download = `Settlement_Offer_${defName}_${dateStr}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e: unknown) { setSettleError(e instanceof Error ? e.message : "Download failed"); }
    finally { setIsDownloadingSettle(false); }
  }

  async function generateAgreement() {
    if (isGeneratingAgreement) return;
    setIsGeneratingAgreement(true); setAgreementError(null); setAgreementText("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/settlement-agreement`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settlementAmount: settleAmount, installments: agreeInstallments, installmentCount: agreeInstallmentCount, paymentMethod: agreePaymentMethod, includeConfidentiality: agreeConfidential }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setAgreementError(err.error ?? "Generation failed"); return; }
      const reader = res.body?.getReader();
      if (!reader) { setAgreementError("Streaming not supported"); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const p = JSON.parse(line.slice(6)); if (p.content) setAgreementText(prev => prev + p.content); } catch { /* ignore */ }
        }
      }
    } catch (e: unknown) { setAgreementError(e instanceof Error ? e.message : "Unexpected error"); }
    finally { setIsGeneratingAgreement(false); }
  }

  async function downloadAgreementPdf() {
    if (!agreementText.trim() || isDownloadingAgreement) return;
    setIsDownloadingAgreement(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/settlement-agreement/pdf`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: agreementText }),
      });
      if (!res.ok) { setAgreementError("PDF generation failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const defName = (currentCase?.defendantName ?? "defendant").replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a"); a.href = url; a.download = `Settlement_Agreement_${defName}_${dateStr}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e: unknown) { setAgreementError(e instanceof Error ? e.message : "Download failed"); }
    finally { setIsDownloadingAgreement(false); }
  }

  const pctLabel = claimAmt > 0
    ? `${settlePct}% of your claim (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settleAmount)})`
    : `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settleAmount)}`;

  return (
    <div className="px-4 pt-3 pb-4 space-y-3">

      {/* ── Mode tabs + title + tone selector (left) | video card (right, stays fixed) ── */}
      <div className="flex gap-4 items-start">

        {/* Left: everything stacks here so content fills the space beside the video */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Mode tab switcher */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
            {[
              { value: "demand",     icon: <Mail className="h-4 w-4" />,      label: "Demand Letter" },
              { value: "settlement", icon: <Handshake className="h-4 w-4" />, label: "Settlement Offer" },
              { value: "agreement",  icon: <PenLine className="h-4 w-4" />,   label: "Settlement Agreement" },
            ].map(({ value, icon, label }) => (
              <button key={value} type="button" onClick={() => setMode(value as typeof mode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === value
                    ? "bg-[#14b8a6] text-white border-2 border-black shadow-md"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {mode === "demand" && (
            <>
              {/* Title row */}
              <div className="space-y-2">
                <h2 className="text-sm flex flex-wrap items-center gap-2">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-bold">Demand Letter Generator</span>
                  <span className="font-normal text-muted-foreground">— Generate a professional pre-litigation demand letter using your case details.</span>
                </h2>
                {text.trim() && (
                  <Button onClick={downloadPdf} disabled={isDownloading} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
                  </Button>
                )}
              </div>
              {!hasRequiredInfo && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div><p className="font-semibold text-amber-800 text-sm">Complete Intake First</p><p className="text-amber-700 text-sm mt-0.5">Fill in your name, the defendant's name, and claim amount in the Intake tab.</p></div>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold mb-3">Choose a tone — you can generate all three versions</p>
                <div className="flex items-stretch gap-0 p-1.5 bg-muted rounded-xl">
                  {TONE_META.map(({ value, label, description, icon }, idx) => {
                    const active = tone === value;
                    const generated = !!letters[value];
                    return (
                      <div key={value} className="flex items-stretch flex-1 min-w-0">
                        {idx > 0 && (
                          <div className={["h-auto w-0.5 shrink-0 rounded-full mx-1 self-stretch", generated || active ? "bg-[#14b8a6]" : "bg-gray-300"].join(" ")} />
                        )}
                        <button type="button" onClick={() => handleToneChange(value)}
                          className={[
                            "flex-1 flex flex-col items-center text-center gap-1.5 px-2 py-2.5 rounded-lg transition-all relative",
                            active
                              ? "bg-[#14b8a6] text-white border-2 border-black shadow-md"
                              : generated
                              ? "bg-background border-2 border-[#14b8a6] text-[#0d6b5e] hover:bg-white"
                              : "bg-background/60 border-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-background",
                          ].join(" ")}>
                          <span className={[
                            "inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-all",
                            active    ? "bg-white text-[#14b8a6]" :
                            generated ? "bg-[#14b8a6] text-white" :
                                        "bg-gray-200 text-gray-500",
                          ].join(" ")}>
                            {generated && !active ? <CheckCircle2 className="h-3 w-3" /> : icon}
                          </span>
                          <span className={["text-xs leading-snug", active ? "font-bold" : "font-semibold"].join(" ")}>{label}</span>
                          <span className={["text-[10px] leading-snug hidden sm:block", active ? "text-white/90" : "text-muted-foreground"].join(" ")}>{description}</span>
                          {generated && active && (
                            <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.5 font-medium">Generated</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>{/* end left column */}

        {/* Right: video tutorial card — stays in place */}
        <div
          onClick={() => setTutorialOpen(true)}
          className="cursor-pointer group flex-shrink-0 w-[220px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
          title="Watch the tutorial for this step"
        >
          <div className="relative bg-[#0f2537] h-[120px] flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <BookOpen className="w-16 h-16 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
                <Play className="w-5 h-5 text-white ml-1" fill="white" />
              </div>
              <span className="text-white text-xs font-semibold opacity-90">Watch Tutorial</span>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">~3 min</div>
            <div className="absolute top-2 left-2 bg-[#14b8a6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Step 4</div>
          </div>
          <div className="bg-background px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold">Demand Letter</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Generate your pre-litigation letter</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#14b8a6] shrink-0" />
          </div>
        </div>

      </div>{/* end two-column row */}

      {mode === "demand" && (
        <>
          <Button onClick={generate} disabled={isGenerating || !hasRequiredInfo} className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-5" size="lg">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating letter…</> : <><Mail className="h-4 w-4" />{letters[tone] ? "Regenerate Letter" : "Generate Letter"} — {TONE_META.find(t => t.value === tone)?.label}</>}
          </Button>
          {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3"><AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" /><p className="text-sm text-destructive">{error}</p></div>}
          {(text.trim() || isGenerating) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Letter Preview</p>
                <p className="text-xs text-muted-foreground font-bold">You can edit the text below before downloading.</p>
              </div>
              <Textarea value={text} onChange={e => setText(e.target.value)} className="font-mono text-sm leading-relaxed min-h-[520px] resize-y" placeholder={isGenerating ? "Generating your demand letter…" : ""} readOnly={isGenerating} />
              {!isGenerating && text.trim() && (
                <Button onClick={downloadPdf} disabled={isDownloading} className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white mt-2" size="lg">
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download as PDF
                </Button>
              )}
            </div>
          )}
          {!text.trim() && !isGenerating && loaded && (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
              <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No demand letter yet</p>
              <p className="text-xs text-muted-foreground mt-1">Select a tone above and click Generate to create your letter.</p>
            </div>
          )}
        </>
      )}

      {mode === "settlement" && (
        <>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Handshake className="h-5 w-5 text-[#0d6b5e]" />Settlement Offer Generator</h2>
            <p className="text-sm text-muted-foreground mt-1">Create a strategic settlement offer letter — tailored to your case and claim amount.</p>
          </div>
          <div className="rounded-xl border border-[#a8e6df] bg-[#f0fffe] px-4 py-3 space-y-2">
            <p className="text-sm text-gray-700 leading-snug">
              <span className="font-bold text-[#0d6b5e]">When to use a Settlement Offer: </span>
              Use this <strong>after you've filed</strong> — or after sending a demand letter that was ignored. A good offer is 70–85% of your claim.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { icon: "📅", tip: "Best timing: 2–6 weeks before your hearing date" },
                { icon: "✍️", tip: "If accepted, get the agreement in writing before withdrawing" },
                { icon: "⚖️", tip: "If ignored, proceed to court — you've shown good faith" },
              ].map(({ icon, tip }) => (
                <div key={tip} className="flex items-start gap-1.5">
                  <span className="text-sm shrink-0">{icon}</span>
                  <p className="text-xs text-gray-600 leading-snug">{tip}</p>
                </div>
              ))}
            </div>
          </div>
          {!hasRequiredInfo && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div><p className="font-semibold text-amber-800 text-sm">Complete Intake First</p><p className="text-amber-700 text-sm mt-0.5">Fill in your name, the defendant's name, and claim amount in the Intake tab.</p></div>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Settlement Amount</p>
              <span className="text-sm font-bold text-[#0d6b5e]">{pctLabel}</span>
            </div>
            {claimAmt > 0 ? (
              <>
                <Slider min={50} max={100} step={1} value={[settlePct]} onValueChange={([v]) => { setSettlePct(v); setSettleAmount(Math.round(claimAmt * v / 100 * 100) / 100); }} className="[&_.bg-primary]:bg-[#0d6b5e] [&_.border-primary\/50]:border-[#0d6b5e]" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>50%</span><span className="font-semibold text-[#0d6b5e]">← Recommended range: 70–85% →</span><span>100%</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">$</span>
                <input type="number" min={0} step={1} value={settleAmount} onChange={e => setSettleAmount(Number(e.target.value))} className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]" placeholder="Enter settlement amount" />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="installments" checked={installments} onChange={e => setInstallments(e.target.checked)} className="h-4 w-4 accent-[#0d6b5e]" />
              <label htmlFor="installments" className="text-sm font-medium cursor-pointer">Offer installment payments</label>
            </div>
            {installments && (
              <div className="flex items-center gap-3 pl-7">
                <span className="text-sm text-muted-foreground">Number of monthly payments:</span>
                {[2, 3, 4, 6].map(n => (
                  <button key={n} type="button" onClick={() => setInstallmentCount(n)}
                    className={`h-8 w-8 rounded-full text-sm font-bold border-2 transition-all ${installmentCount === n ? "border-[#0d6b5e] bg-[#0d6b5e] text-white" : "border-border hover:border-[#0d6b5e]"}`}>{n}</button>
                ))}
                {settleAmount > 0 && <span className="text-xs text-muted-foreground ml-1">≈ {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settleAmount / installmentCount)}/mo</span>}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Response deadline</p>
            <div className="flex gap-2">
              {[7, 14, 21].map(d => (
                <button key={d} type="button" onClick={() => setResponseDays(d)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${responseDays === d ? "border-[#0d6b5e] bg-[#f0fffe] text-[#0d6b5e]" : "border-border hover:border-[#0d6b5e]/40"}`}>{d} days</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Tone</p>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: "firm", label: "Firm", desc: "Business-like, no ambiguity about consequences" }, { value: "cooperative", label: "Cooperative", desc: "Conciliatory, invites dialogue and resolution" }].map(({ value, label, desc }) => (
                <button key={value} type="button" onClick={() => setSettleTone(value as "firm" | "cooperative")}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${settleTone === value ? "border-[#0d6b5e] bg-[#f0fffe] shadow-sm" : "border-border hover:border-[#0d6b5e]/40"}`}>
                  <span className="block font-semibold text-sm">{label}</span>
                  <span className="block text-xs text-muted-foreground mt-1">{desc}</span>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={generateSettlement} disabled={isGeneratingSettle || !hasRequiredInfo || settleAmount <= 0} className="w-full gap-2 bg-[#0d6b5e] hover:bg-[#0a5449] text-white py-5" size="lg">
            {isGeneratingSettle ? <><Loader2 className="h-4 w-4 animate-spin" />Generating letter…</> : <><Handshake className="h-4 w-4" />{settlementText.trim() ? "Regenerate Settlement Offer" : "Generate Settlement Offer"}</>}
          </Button>
          {settleError && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3"><AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" /><p className="text-sm text-destructive">{settleError}</p></div>}
          {(settlementText.trim() || isGeneratingSettle) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Letter Preview</p>
                <p className="text-xs text-muted-foreground">You can edit before downloading.</p>
              </div>
              <Textarea value={settlementText} onChange={e => setSettlementText(e.target.value)} className="font-mono text-sm leading-relaxed min-h-[520px] resize-y" placeholder={isGeneratingSettle ? "Generating your settlement offer…" : ""} readOnly={isGeneratingSettle} />
              {!isGeneratingSettle && settlementText.trim() && (
                <Button onClick={downloadSettlePdf} disabled={isDownloadingSettle} className="w-full gap-2 bg-[#0d6b5e] hover:bg-[#0a5449] text-white" size="lg">
                  {isDownloadingSettle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download as PDF
                </Button>
              )}
              {!isGeneratingSettle && settlementText.trim() && (
                <div className="rounded-2xl border border-[#a8e6df] bg-[#f0fffe] p-5 space-y-3">
                  <p className="text-sm font-bold text-[#0d6b5e]">Before you send — checklist</p>
                  {SETTLE_CHECKLIST.map(item => (
                    <button key={item.id} type="button" onClick={() => setSettleChecklist(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className="w-full flex items-start gap-3 text-left hover:bg-[#e6faf8] rounded-lg p-2 transition-colors">
                      <div className="shrink-0 mt-0.5 text-[#0d6b5e]">
                        {settleChecklist[item.id] ? <CheckSquare2 className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${settleChecklist[item.id] ? "line-through text-muted-foreground" : ""}`}>{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!settlementText.trim() && !isGeneratingSettle && settleLoaded && (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
              <Handshake className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No settlement offer yet</p>
              <p className="text-xs text-muted-foreground mt-1">Configure your offer above and click Generate.</p>
            </div>
          )}
        </>
      )}

      {mode === "agreement" && (
        <>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><PenLine className="h-5 w-5 text-[#0d6b5e]" />Settlement Agreement Generator</h2>
            <p className="text-sm text-muted-foreground mt-1">Generate a formal, legally-structured Settlement Agreement and Mutual Release.</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-3">
            <p className="text-sm font-bold text-blue-800">What is a Settlement Agreement?</p>
            <p className="text-sm text-blue-700 leading-relaxed">Unlike a Settlement Offer Letter, a Settlement Agreement is the <strong>binding contract</strong> both parties sign once they agree to settle. It includes a mutual release of all claims, payment terms, and dismissal of the case.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[{ icon: "✍️", tip: "Both parties must sign for it to be binding" }, { icon: "🏛️", tip: "Plaintiff withdraws the court case upon receipt of payment" }, { icon: "🔒", tip: "Mutual release means neither side can sue over this again" }].map(({ icon, tip }) => (
                <div key={tip} className="flex items-start gap-2"><span className="text-base shrink-0">{icon}</span><p className="text-xs text-blue-700 leading-relaxed">{tip}</p></div>
              ))}
            </div>
          </div>
          {!hasRequiredInfo && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div><p className="font-semibold text-amber-800 text-sm">Complete Intake First</p><p className="text-amber-700 text-sm mt-0.5">Fill in your name, the defendant's name, and claim amount in the Intake tab.</p></div>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Agreed Settlement Amount</p>
              <span className="text-sm font-bold text-[#0d6b5e]">{pctLabel}</span>
            </div>
            {claimAmt > 0 ? (
              <>
                <Slider min={50} max={100} step={1} value={[settlePct]} onValueChange={([v]) => { setSettlePct(v); setSettleAmount(Math.round(claimAmt * v / 100 * 100) / 100); }} className="[&_.bg-primary]:bg-[#0d6b5e] [&_.border-primary\/50]:border-[#0d6b5e]" />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>50%</span><span className="font-semibold text-[#0d6b5e]">← Recommended range: 70–85% →</span><span>100%</span></div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">$</span>
                <input type="number" min={0} step={1} value={settleAmount} onChange={e => setSettleAmount(Number(e.target.value))} className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]" placeholder="Enter agreed amount" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Payment Method</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["check", "cash", "Zelle", "bank transfer"] as const).map(method => (
                <button key={method} type="button" onClick={() => setAgreePaymentMethod(method)}
                  className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all capitalize ${agreePaymentMethod === method ? "border-[#0d6b5e] bg-[#f0fffe] text-[#0d6b5e]" : "border-border hover:border-[#0d6b5e]/40"}`}>{method}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="agreeInstallments" checked={agreeInstallments} onChange={e => setAgreeInstallments(e.target.checked)} className="h-4 w-4 accent-[#0d6b5e]" />
              <label htmlFor="agreeInstallments" className="text-sm font-medium cursor-pointer">Pay in installments</label>
            </div>
            {agreeInstallments && (
              <div className="flex items-center gap-3 pl-7">
                <span className="text-sm text-muted-foreground">Monthly payments:</span>
                {[2, 3, 4, 6].map(n => (
                  <button key={n} type="button" onClick={() => setAgreeInstallmentCount(n)}
                    className={`h-8 w-8 rounded-full text-sm font-bold border-2 transition-all ${agreeInstallmentCount === n ? "border-[#0d6b5e] bg-[#0d6b5e] text-white" : "border-border hover:border-[#0d6b5e]"}`}>{n}</button>
                ))}
                {settleAmount > 0 && <span className="text-xs text-muted-foreground ml-1">≈ {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settleAmount / agreeInstallmentCount)}/mo</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="agreeConfidential" checked={agreeConfidential} onChange={e => setAgreeConfidential(e.target.checked)} className="h-4 w-4 accent-[#0d6b5e]" />
            <label htmlFor="agreeConfidential" className="text-sm font-medium cursor-pointer">
              Include confidentiality clause <span className="text-muted-foreground font-normal">(both parties agree not to disclose terms)</span>
            </label>
          </div>
          <Button onClick={generateAgreement} disabled={isGeneratingAgreement || !hasRequiredInfo || settleAmount <= 0} className="w-full gap-2 bg-[#0d6b5e] hover:bg-[#0a5449] text-white py-5" size="lg">
            {isGeneratingAgreement ? <><Loader2 className="h-4 w-4 animate-spin" />Drafting agreement…</> : <><PenLine className="h-4 w-4" />{agreementText.trim() ? "Regenerate Settlement Agreement" : "Generate Settlement Agreement"}</>}
          </Button>
          {agreementError && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3"><AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" /><p className="text-sm text-destructive">{agreementError}</p></div>}
          {(agreementText.trim() || isGeneratingAgreement) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Agreement Preview</p>
                <p className="text-xs text-muted-foreground">Edit to fill in [BLANK] fields before printing.</p>
              </div>
              <Textarea value={agreementText} onChange={e => setAgreementText(e.target.value)} className="font-mono text-sm leading-relaxed min-h-[620px] resize-y" placeholder={isGeneratingAgreement ? "Drafting your settlement agreement…" : ""} readOnly={isGeneratingAgreement} />
              {!isGeneratingAgreement && agreementText.trim() && (
                <Button onClick={downloadAgreementPdf} disabled={isDownloadingAgreement} className="w-full gap-2 bg-[#0d6b5e] hover:bg-[#0a5449] text-white" size="lg">
                  {isDownloadingAgreement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download as PDF
                </Button>
              )}
              {!isGeneratingAgreement && agreementText.trim() && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-2">
                  <p className="text-sm font-bold text-amber-800">Before you sign</p>
                  {[
                    { icon: "✍️", tip: "Fill in all [BLANK] fields with the correct information." },
                    { icon: "📋", tip: "Print two copies — one for each party to keep." },
                    { icon: "🤝", tip: "Both parties must sign and date in front of each other." },
                    { icon: "💰", tip: "Plaintiff should wait until payment clears before filing dismissal." },
                    { icon: "🏛️", tip: "File a Request for Dismissal (SC-290) with the court once paid." },
                  ].map(({ icon, tip }) => (
                    <div key={tip} className="flex items-start gap-2"><span className="text-base shrink-0">{icon}</span><p className="text-xs text-amber-700 leading-relaxed">{tip}</p></div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!agreementText.trim() && !isGeneratingAgreement && agreementLoaded && (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
              <PenLine className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No agreement drafted yet</p>
              <p className="text-xs text-muted-foreground mt-1">Configure the terms above and click Generate.</p>
            </div>
          )}
        </>
      )}
      {/* ── Save & Continue ── */}
      {onNext && (
        <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
          <Button
            onClick={onNext}
            className="bg-[#0d6b5e] hover:bg-[#0a5449] text-white gap-2 px-6"
          >
            Save &amp; Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
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
                  <p className="text-sm font-bold text-gray-800">Step 4 Tutorial — Demand Letter Generator</p>
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
              src="https://app.heygen.com/embeds/1c740fd241094b05a8a42168e14df5f5"
              title="HeyGen video player"
              frameBorder="0"
              allow="encrypted-media; fullscreen;"
              allowFullScreen
              className="block"
            />
            <div className="px-5 py-3 bg-[#f0fdf9] border-t flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-600 flex-1 min-w-[200px]">
                Video plays above — click X or press Escape to return to your case.
              </p>
              <button
                onClick={() => setTutorialOpen(false)}
                className="text-xs font-semibold text-[#14b8a6] hover:text-[#0d9488] transition-colors"
              >
                Close &amp; Start Filling
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
