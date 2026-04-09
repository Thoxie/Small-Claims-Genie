import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Mail, Handshake, PenLine, Loader2, Download, AlertCircle, CheckSquare2, Square } from "lucide-react";

type DemandLetterTone = "formal" | "firm" | "friendly";

const TONE_META: { value: DemandLetterTone; label: string; description: string }[] = [
  { value: "formal",   label: "Formal",   description: "Neutral, professional tone — facts stated plainly" },
  { value: "firm",     label: "Firm",     description: "Assertive & deadline-focused — legal basis emphasized" },
  { value: "friendly", label: "Friendly", description: "Cooperative tone — prefers settlement over court" },
];

const SETTLE_CHECKLIST = [
  { id: "certified", label: "Send via certified mail (USPS)", detail: "Get a tracking number — you'll need it if they later dispute receipt." },
  { id: "copy", label: "Keep a copy of this letter for your court file", detail: "Bring it to the hearing to show you attempted to settle." },
  { id: "written", label: "If they accept: get the agreement in writing", detail: "A signed written agreement is required before you withdraw your case." },
  { id: "counter", label: "If they counter-offer: nothing is binding until signed", detail: "You can accept, reject, or counter again — you're still in control." },
  { id: "reminder", label: "Set a calendar reminder for your response deadline", detail: "If no response by the deadline, proceed with your court case." },
];

export function DemandLetterTab({ caseId, currentCase }: { caseId: number; currentCase: any }) {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<"demand" | "settlement" | "agreement">("demand");

  const [text, setText] = useState("");
  const [tone, setTone] = useState<DemandLetterTone>("formal");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) { if (data.text) setText(data.text); if (data.tone) setTone(data.tone as DemandLetterTone); setLoaded(true); }
      } catch { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [caseId, getToken]);

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
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/demand-letter`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tone }),
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
          try { const p = JSON.parse(line.slice(6)); if (p.content) setText(prev => prev + p.content); } catch { /* ignore */ }
        }
      }
    } catch (e: any) { setError(e.message ?? "Unexpected error"); }
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
    } catch (e: any) { setError(e.message ?? "Download failed"); }
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
    } catch (e: any) { setSettleError(e.message ?? "Unexpected error"); }
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
    } catch (e: any) { setSettleError(e.message ?? "Download failed"); }
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
    } catch (e: any) { setAgreementError(e.message ?? "Unexpected error"); }
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
    } catch (e: any) { setAgreementError(e.message ?? "Download failed"); }
    finally { setIsDownloadingAgreement(false); }
  }

  const pctLabel = claimAmt > 0
    ? `${settlePct}% of your claim (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settleAmount)})`
    : `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settleAmount)}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
        {[
          { value: "demand", icon: <Mail className="h-4 w-4" />, label: "Demand Letter" },
          { value: "settlement", icon: <Handshake className="h-4 w-4" />, label: "Settlement Offer" },
          { value: "agreement", icon: <PenLine className="h-4 w-4" />, label: "Settlement Agreement" },
        ].map(({ value, icon, label }) => (
          <button key={value} type="button" onClick={() => setMode(value as typeof mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === value ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {mode === "demand" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Demand Letter Generator</h2>
              <p className="text-sm text-muted-foreground mt-1">Generate a professional pre-litigation demand letter using your case details.</p>
            </div>
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
            <p className="text-sm font-semibold mb-3">Select Tone</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TONE_META.map(({ value, label, description }) => (
                <button key={value} type="button" onClick={() => setTone(value)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${tone === value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
                  <span className="block font-semibold text-sm">{label}</span>
                  <span className="block text-xs text-muted-foreground mt-1">{description}</span>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={generate} disabled={isGenerating || !hasRequiredInfo} className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-5" size="lg">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating letter…</> : <><Mail className="h-4 w-4" />{text.trim() ? "Regenerate Demand Letter" : "Generate Demand Letter"}</>}
          </Button>
          {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3"><AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" /><p className="text-sm text-destructive">{error}</p></div>}
          {(text.trim() || isGenerating) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Letter Preview</p>
                <p className="text-xs text-muted-foreground">You can edit the text below before downloading.</p>
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
            <p className="text-sm text-muted-foreground mt-1">Generate a strategic settlement offer letter — tailored to your case and claim amount.</p>
          </div>
          <div className="rounded-2xl border border-[#a8e6df] bg-[#f0fffe] p-5 space-y-3">
            <p className="text-sm font-bold text-[#0d6b5e]">When to use a Settlement Offer</p>
            <p className="text-sm text-gray-700 leading-relaxed">Use this <strong>after you've filed</strong> — or after sending a demand letter that was ignored. A good offer is 70–85% of your claim.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { icon: "📅", tip: "Best timing: 2–6 weeks before your hearing date" },
                { icon: "✍️", tip: "If accepted, get the agreement in writing before withdrawing" },
                { icon: "⚖️", tip: "If ignored, proceed to court — you've shown good faith" },
              ].map(({ icon, tip }) => (
                <div key={tip} className="flex items-start gap-2">
                  <span className="text-base shrink-0">{icon}</span>
                  <p className="text-xs text-gray-600 leading-relaxed">{tip}</p>
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
    </div>
  );
}
