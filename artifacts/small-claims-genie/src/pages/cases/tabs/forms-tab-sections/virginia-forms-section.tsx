import { useState, useEffect } from "react";
import { Download, Info, PenLine, CheckCircle2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormWizardStepper } from "@/components/form-wizard-stepper";
import { VA_WIZARD_STEPS } from "../forms-tab";
import type { FormsTabCtx } from "../forms-tab";

export function VirginiaFormsSection({ ctx }: { ctx: FormsTabCtx }) {
  const [vaWizardIndex, setVaWizardIndex] = useState(() => {
    try { const s = localStorage.getItem(`va_forms_step_${ctx.caseId}`); const n = s !== null ? parseInt(s, 10) : 0; return isNaN(n) ? 0 : n; } catch { return 0; }
  });
  useEffect(() => { try { localStorage.setItem(`va_forms_step_${ctx.caseId}`, String(vaWizardIndex)); } catch {} }, [vaWizardIndex, ctx.caseId]);
  return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦅</span>
            <h3 className="text-base font-bold text-foreground">Virginia Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={VA_WIZARD_STEPS}
            currentIndex={vaWizardIndex}
            onStepClick={setVaWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: DC-402 Warrant in Debt ────────────────────────────────── */}
          {vaWizardIndex === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File this Warrant in Debt with your General District Court clerk. Claim limit: $5,000 (Va. Code § 16.1-122.2). Filing fees vary by county — check with your local clerk or the GDC Civil Filing Fee Calculator before filing.
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">DC-402</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Warrant in Debt</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details — plaintiff, defendant, amount claimed, and basis of claim. Sign and file with the clerk at the courthouse.</p>
                  {ctx.downloadError && (ctx.downloadingForm === "va/dc-402" || ctx.downloadingForm === "va/dc-402/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "va/dc-402/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "va/dc-402", filename: `VA-Warrant-in-Debt-Signed-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "va/dc-402/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={ctx.downloadingForm === "va/dc-402"} onClick={() => ctx.downloadSignedFLForm("va/dc-402", `VA-Warrant-in-Debt-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {ctx.downloadingForm === "va/dc-402" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-base font-bold text-foreground mb-1">Virginia Filing Fees</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
                  <span className="text-blue-700">Filing fee</span><span className="font-medium text-blue-900">Varies by county — check with your local clerk</span>
                  <span className="text-blue-700">Claim limit</span><span className="font-medium text-blue-900">$5,000 (Va. Code § 16.1-122.2)</span>
                </div>
                <p className="text-xs text-blue-800">Unlike some states, Virginia does not publish one statewide flat filing fee — amounts are set per General District Court. File a Fee Waiver (DC-409) if you cannot afford the fees — see the Fee Waiver step.</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Service info ─────────────────────────────────────────────── */}
          {vaWizardIndex === 1 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Sheriff Serves the Defendant</h4>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Court Handles This</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In Virginia General District Court, <strong>the sheriff (or a private process server) serves the defendant — you do not arrange service yourself.</strong> When you file your Warrant in Debt, the clerk issues it and arranges service per Va. Code § 17.1-272.
              </p>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex gap-2.5">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-0.5">What to bring to the clerk's window</p>
                    <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                      <li>• Your signed <strong>Warrant in Debt (DC-402)</strong></li>
                      <li>• The filing fee — <strong>check with your local clerk for the amount</strong></li>
                      <li>• The defendant's full name and best known address</li>
                      <li>• If applicable, your <strong>Petition to Proceed In Forma Pauperis (DC-409)</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-0.5">After you file</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      The clerk sets a return date and arranges service on the defendant. You and the defendant will both be notified of the hearing date. No further action is required on your part for service.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                  <p className="text-xs font-semibold text-blue-900 mb-0.5">After winning</p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    A judgment remains enforceable for 10 years (Va. Code § 16.1-94.1) and may be renewed. Collection options include garnishment and liens as allowed by Virginia law. Attorneys are generally barred from small claims proceedings absent both parties' consent (Va. Code § 16.1-122.4).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Fee Waiver (optional) ─────────────────────────────────── */}
          {vaWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Petition to Proceed In Forma Pauperis</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you cannot afford the filing fee, file this petition with the clerk (Va. Code § 17.1-606). Your name and case information are pre-filled — complete the financial eligibility section after downloading and file it at the same time as your Warrant in Debt.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">DC-409</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Petition to Proceed In Forma Pauperis</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading and sign before filing.</p>
                  {ctx.downloadError && (ctx.downloadingForm === "va/dc-409" || ctx.downloadingForm === "va/dc-409/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "va/dc-409/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "va/dc-409", filename: `VA-Fee-Waiver-Signed-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "va/dc-409/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={ctx.downloadingForm === "va/dc-409"} onClick={() => ctx.downloadSignedFLForm("va/dc-409", `VA-Fee-Waiver-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {ctx.downloadingForm === "va/dc-409" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is filed under oath.</span> The clerk or judge must approve the petition before your filing is accepted without fees.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={vaWizardIndex === 0} onClick={() => setVaWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={vaWizardIndex === VA_WIZARD_STEPS.length - 1} onClick={() => setVaWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
  );
}
