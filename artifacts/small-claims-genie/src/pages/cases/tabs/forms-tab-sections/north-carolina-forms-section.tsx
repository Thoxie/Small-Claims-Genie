import { useState, useEffect } from "react";
import { Download, Info, PenLine, CheckCircle2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormWizardStepper } from "@/components/form-wizard-stepper";
import { NC_WIZARD_STEPS } from "../forms-tab";
import type { FormsTabCtx } from "../forms-tab";

export function NorthCarolinaFormsSection({ ctx }: { ctx: FormsTabCtx }) {
  const [ncWizardIndex, setNcWizardIndex] = useState(() => {
    try { const s = localStorage.getItem(`nc_forms_step_${ctx.caseId}`); const n = s !== null ? parseInt(s, 10) : 0; return isNaN(n) ? 0 : n; } catch { return 0; }
  });
  useEffect(() => { try { localStorage.setItem(`nc_forms_step_${ctx.caseId}`, String(ncWizardIndex)); } catch {} }, [ncWizardIndex, ctx.caseId]);
  return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <h3 className="text-base font-bold text-foreground">North Carolina Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={NC_WIZARD_STEPS}
            currentIndex={ncWizardIndex}
            onStepClick={setNcWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: AOC-CVM-200 Complaint ─────────────────────────────────── */}
          {ncWizardIndex === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File this Complaint with your county District Court clerk. The magistrate will hear your case and issue a judgment. Claim limit: $10,000 (G.S. 7A-210). Filing fee: <strong>$96 flat</strong> statewide (G.S. 7A-311).
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">AOC-CVM-200</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Complaint for Money Owed</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details — plaintiff, defendant, amount claimed, and basis of claim. Sign and file with the clerk at the courthouse.</p>
                  {ctx.downloadError && (ctx.downloadingForm === "nc/aoc-cvm-200" || ctx.downloadingForm === "nc/aoc-cvm-200/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "nc/aoc-cvm-200/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "nc/aoc-cvm-200", filename: `NC-Complaint-Signed-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "nc/aoc-cvm-200/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={ctx.downloadingForm === "nc/aoc-cvm-200"} onClick={() => ctx.downloadSignedFLForm("nc/aoc-cvm-200", `NC-Complaint-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {ctx.downloadingForm === "nc/aoc-cvm-200" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-base font-bold text-foreground mb-1">North Carolina Filing Fees</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
                  <span className="text-blue-700">Filing fee (all amounts)</span><span className="font-medium text-blue-900">$96.00 flat</span>
                  <span className="text-blue-700">Sheriff service fee (per defendant)</span><span className="font-medium text-blue-900">$30.00</span>
                  <span className="text-blue-700">Claim limit</span><span className="font-medium text-blue-900">$10,000 (G.S. 7A-210)</span>
                </div>
                <p className="text-xs text-blue-800">Filing and service fees are recoverable as court costs if you win your case (G.S. 7A-305). File a Fee Waiver (AOC-G-106) if you cannot afford the fees — see the Fee Waiver step.</p>
              </div>
            </div>
          )}

          {/* ── Step 1: AOC-CVM-100 Summons ────────────────────────────────────── */}
          {ncWizardIndex === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Magistrate's Summons is prepared and issued by the court clerk — you do not serve the defendant yourself. Bring this pre-filled form to the clerk when you file your Complaint. The clerk signs, seals, and forwards it to the county sheriff for service.
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes &amp; Issues</span>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">AOC-CVM-100</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Magistrate's Summons</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk when filing your Complaint — the clerk assigns the hearing date and issues the summons to the sheriff for service on the defendant.</p>
                  {ctx.downloadError && ctx.downloadingForm === "nc/aoc-cvm-100" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0">
                  <button type="button" disabled={ctx.downloadingForm === "nc/aoc-cvm-100"} onClick={() => ctx.downloadSignedFLForm("nc/aoc-cvm-100", `NC-Summons-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "nc/aoc-cvm-100" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                    Download
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-900">How NC service works</p>
                <ul className="text-xs text-blue-800 leading-relaxed space-y-1.5">
                  <li>• The sheriff serves the summons on the defendant — <strong>you do not arrange service yourself.</strong></li>
                  <li>• Pay the $30 sheriff service fee (per defendant) when you file with the clerk.</li>
                  <li>• After service, the court mails both parties notice of the hearing date — typically within <strong>30 days of filing</strong> (G.S. 7A-214).</li>
                  <li>• If the sheriff cannot locate the defendant, ask the clerk about alternative service options (certified mail, etc.).</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Step 2: Service info ─────────────────────────────────────────────── */}
          {ncWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Sheriff Serves the Defendant</h4>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Court Handles This</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In North Carolina small claims court, <strong>the sheriff serves the defendant — you do not arrange service yourself.</strong> When you file your Complaint and pay the $30 sheriff service fee, the clerk issues the Magistrate's Summons and forwards it directly to the county sheriff for service.
              </p>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex gap-2.5">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-0.5">What to bring to the clerk's window</p>
                    <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                      <li>• Your signed <strong>Complaint (AOC-CVM-200)</strong></li>
                      <li>• The pre-filled <strong>Magistrate's Summons (AOC-CVM-100)</strong></li>
                      <li>• <strong>$96 filing fee</strong> + <strong>$30 sheriff service fee</strong> per defendant</li>
                      <li>• The defendant's full name and best known address</li>
                      <li>• If applicable, your <strong>Fee Waiver (AOC-G-106)</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-0.5">After you file</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      The court mails both parties notice of the hearing date. Hearings are typically scheduled within <strong>30 days of filing</strong> (G.S. 7A-214). You and the defendant will both receive a notice by mail. No further action is required on your part for service.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                  <p className="text-xs font-semibold text-blue-900 mb-0.5">After winning</p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Collection options include: writ of execution (sheriff seizes non-exempt property), bank account garnishment, and judgment lien on real property. <strong>Note: wage garnishment is NOT available for private civil debt in North Carolina</strong> (G.S. 110-136). Filing and service fees are recoverable as court costs (G.S. 7A-305).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Fee Waiver (optional) ─────────────────────────────────── */}
          {ncWizardIndex === 3 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Petition to Sue as Indigent</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you cannot afford the $96 filing fee or $30 sheriff service fee, file this petition with the clerk. If granted, all fees are waived. Your name and case information are pre-filled — complete the financial eligibility section after downloading and file it at the same time as your Complaint.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">AOC-G-106</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Petition to Sue as Indigent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading and sign before filing.</p>
                  {ctx.downloadError && (ctx.downloadingForm === "nc/aoc-g-106" || ctx.downloadingForm === "nc/aoc-g-106/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "nc/aoc-g-106/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "nc/aoc-g-106", filename: `NC-Fee-Waiver-Signed-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "nc/aoc-g-106/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={ctx.downloadingForm === "nc/aoc-g-106"} onClick={() => ctx.downloadSignedFLForm("nc/aoc-g-106", `NC-Fee-Waiver-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {ctx.downloadingForm === "nc/aoc-g-106" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is filed under oath.</span> False statements are subject to criminal penalty under G.S. 14-209. The clerk or magistrate must approve the petition before your filing is accepted without fees. If granted and you win, the court may tax costs against the defendant.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={ncWizardIndex === 0} onClick={() => setNcWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={ncWizardIndex === NC_WIZARD_STEPS.length - 1} onClick={() => setNcWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
  );
}
