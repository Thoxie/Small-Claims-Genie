import { Download, Info, PenLine, CheckCircle2, AlertTriangle, ExternalLink, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormWizardStepper } from "@/components/form-wizard-stepper";
import { IL_WIZARD_STEPS } from "../forms-tab";
import type { FormsTabCtx } from "../forms-tab";

export function IllinoisFormsSection({ ctx }: { ctx: FormsTabCtx }) {
  return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <h3 className="text-base font-bold text-foreground">Illinois Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={IL_WIZARD_STEPS}
            currentIndex={ctx.ilWizardIndex}
            onStepClick={ctx.setIlWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: Small Claims Complaint ─────────────────────────────────── */}
          {ctx.ilWizardIndex === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File this standardized complaint form with your county Circuit Court clerk. Illinois uses a uniform statewide small claims complaint (735 ILCS 5/2-209 et seq.). Claim limit: $10,000.
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Small Claims Complaint</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Illinois Supreme Court uniform form — accepted at every Illinois Circuit Court. Pre-filled from your case details.</p>
                  {ctx.downloadError && (ctx.downloadingForm === "il/smc-complaint" || ctx.downloadingForm === "il/smc-complaint/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "il/smc-complaint/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "il/smc-complaint", filename: `IL-Small-Claims-Complaint-Signed-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "il/smc-complaint/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={ctx.downloadingForm === "il/smc-complaint"} onClick={() => ctx.downloadSignedFLForm("il/smc-complaint", `IL-Small-Claims-Complaint-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {ctx.downloadingForm === "il/smc-complaint" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-base font-bold text-foreground mb-1">Illinois Filing Fees</p>
                <p className="text-base font-bold text-foreground mb-1">Filing fees are recoverable as court costs when you win your case — 735 ILCS 5/5-108.</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
                  <span className="text-blue-700">$0 – $250</span><span className="font-medium text-blue-900">$54</span>
                  <span className="text-blue-700">$251 – $1,000</span><span className="font-medium text-blue-900">$77</span>
                  <span className="text-blue-700">$1,001 – $2,500</span><span className="font-medium text-blue-900">$132</span>
                  <span className="text-blue-700">$2,501 – $10,000</span><span className="font-medium text-blue-900">$221</span>
                </div>
                <p className="text-xs text-blue-800">Claim limit: $10,000. Fees vary slightly by county — check with your Circuit Court clerk. A fee waiver is available if you cannot afford the filing fee (see the Fee Waiver step).</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Summons ────────────────────────────────────────────────── */}
          {ctx.ilWizardIndex === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File this summons with your complaint. The clerk assigns the return date (hearing date) and issues the summons — you then have it served on the defendant before the return date.
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes &amp; Issues</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Summons — Small Claims</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk when you file your Complaint — the clerk assigns the return date and signs it.</p>
                  {ctx.downloadError && (ctx.downloadingForm === "il/summons" || ctx.downloadingForm === "il/summons/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "il/summons/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "il/summons", filename: `IL-Summons-Signed-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "il/summons/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={ctx.downloadingForm === "il/summons"} onClick={() => ctx.downloadSignedFLForm("il/summons", `IL-Summons-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {ctx.downloadingForm === "il/summons" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800 leading-relaxed"><strong>Important:</strong> The clerk sets the return date <strong>21–40 days after the summons is issued</strong>. The defendant must be served at least <strong>3 days before that return date</strong>. The process server must be at least 18 years old and not a party to the case.</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Serve Defendant ─────────────────────────────────────────── */}
          {ctx.ilWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Serving the Defendant</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After the clerk issues the summons, you must have it served on the defendant. The clerk sets a return date <strong>21–40 days after the summons is issued</strong>. Illinois requires service at least <strong>3 days before the return date</strong>. The process server must be at least 18 years old and not a party to the case.
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <RadioGroup value={ctx.ilServiceMethod} onValueChange={ctx.setIlServiceMethod} className="gap-0">

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${ctx.ilServiceMethod === "process_server" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (ctx.ilServiceMethod === "process_server") { e.preventDefault(); ctx.setIlServiceMethod(""); } }}>
                    <RadioGroupItem value="process_server" id="il-serve-ps" className="mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">Recommended — Most Reliable</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); ctx.navigate(`/cases/${ctx.caseId}/efile`); }}
                          className="shrink-0 flex items-center gap-2 rounded-lg border-2 border-black bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-center transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-bold leading-tight">e-File and/or Service by Process Server</span>
                        </button>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-bold">Private Process Server</span> — A licensed Illinois process server personally delivers the summons and complaint to the defendant. Best option if the defendant may avoid service. Fees may be recoverable if you win.
                      </p>
                    </div>
                  </label>
                  {ctx.ilServiceMethod === "process_server" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">How It Works</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After the clerk issues the summons, give it to a <strong>licensed private detective / process server</strong> along with a copy of the complaint (735 ILCS 5/2-202). A licensed server can serve without court appointment in all Illinois counties (including Cook County as of January 1, 2025). The server personally delivers both ctx.documents to the defendant and files a Proof of Service with the court.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Be Ready to Provide</p>
                          <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                            <li>• The clerk-issued summons and a copy of your Complaint.</li>
                            <li>• The defendant's full legal name and best address for service.</li>
                            <li>• Any additional details: work address, business hours, vehicle description, or photo.</li>
                            <li>• The return date — service must be completed at least 3 days before.</li>
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Deadline</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Service must be completed at least <strong>3 days before the return date</strong>. Process server fees may be recovered if you win your case.</p>
                      </div>
                    </div>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${ctx.ilServiceMethod === "sheriff" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (ctx.ilServiceMethod === "sheriff") { e.preventDefault(); ctx.setIlServiceMethod(""); } }}>
                    <RadioGroupItem value="sheriff" id="il-serve-sheriff" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Sheriff Service</span> — Contact your county sheriff's civil division to arrange service. The sheriff serves the defendant and files a Return of Service with the court. More affordable but may take longer.
                    </p>
                  </label>
                  {ctx.ilServiceMethod === "sheriff" && (
                    <>
                      <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                        <div className="flex gap-2.5">
                          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-blue-900 mb-0.5">How to Request Sheriff Service</p>
                            <p className="text-xs text-blue-800 leading-relaxed">Download the Letter to the Sheriff below. Mail it to your county sheriff's civil division with 3 copies of the summons, 1 copy of the complaint, a self-addressed stamped envelope, and the service fee (typically $60). The sheriff will mail you back the completed Proof of Service.</p>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-blue-900 mb-0.5">Allow Extra Time</p>
                            <p className="text-xs text-blue-800 leading-relaxed">Sheriff service can take 1–2 weeks. Given the 3-day minimum requirement before the return date, start this process as soon as you file. If the return date is too close, request a continuance from the clerk.</p>
                          </div>
                        </div>
                      </div>
                      <div className="mx-3 mb-2 rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Sheriff Service</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">Letter to the Sheriff</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Illinois Supreme Court form CS-L 706.1. Pre-filled with your case information and signed with your name. Check the appropriate fee waiver box after downloading, then mail with 3 summons copies, 1 complaint copy, a self-addressed stamped envelope, and the service fee.</p>
                          {ctx.downloadError && ctx.downloadingForm === "il/letter-to-sheriff" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                        </div>
                        <div className="shrink-0">
                          <button
                            type="button"
                            disabled={ctx.downloadingForm === "il/letter-to-sheriff"}
                            onClick={() => ctx.downloadSignedFLForm("il/letter-to-sheriff", `IL-Letter-to-Sheriff-Case-${ctx.caseId}.pdf`)}
                            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                          >
                            {ctx.downloadingForm === "il/letter-to-sheriff" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                            Download
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${ctx.ilServiceMethod === "certified_mail" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (ctx.ilServiceMethod === "certified_mail") { e.preventDefault(); ctx.setIlServiceMethod(""); } }}>
                    <RadioGroupItem value="certified_mail" id="il-serve-mail" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Certified Mail — Least Reliable.</span> The clerk may send the summons by certified mail at your request. Service is only complete if the defendant signs for it. Not recommended if the defendant is likely to refuse delivery.
                    </p>
                  </label>
                  {ctx.ilServiceMethod === "certified_mail" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Is Only Complete If the Defendant Signs</p>
                          <p className="text-xs text-blue-800 leading-relaxed">If the defendant refuses or does not sign for the certified mail, service fails. Your case is not dismissed — you can switch to personal service by a process server or sheriff and request a new return date.</p>
                        </div>
                      </div>
                    </div>
                  )}

                </RadioGroup>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Proof of Service</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Illinois Proof of Service</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Give this blank form to your process server. They complete and sign it after serving the defendant, then file it with the Circuit Court clerk before the return date.</p>
                  {ctx.downloadError && ctx.downloadingForm === "il/proof-of-service" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0">
                  <button type="button" disabled={ctx.downloadingForm === "il/proof-of-service"} onClick={() => ctx.downloadSignedFLForm("il/proof-of-service", `IL-Proof-of-Service-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "il/proof-of-service" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Fee Waiver (optional) ──────────────────────────────────── */}
          {ctx.ilWizardIndex === 3 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Application for Waiver of Court Fees</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your name, address, and case information are pre-filled from your intake. Download the form, complete the financial eligibility section, sign it, and file it with the clerk at the same time as your Complaint.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Application for Waiver of Court Fees</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading.</p>
                  <p className="text-xs text-muted-foreground mt-1">Editable fields require Adobe Acrobat.</p>
                  {ctx.downloadError && (ctx.downloadingForm === "il/fee-waiver" || ctx.downloadingForm === "il/fee-waiver/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "il/fee-waiver/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "il/fee-waiver", filename: `IL-Fee-Waiver-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "il/fee-waiver/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={ctx.downloadingForm === "il/fee-waiver"} onClick={() => ctx.downloadSignedFLForm("il/fee-waiver", `IL-Fee-Waiver-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {ctx.downloadingForm === "il/fee-waiver" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is confidential.</span> The court will not give it to the other party. False statements on a fee waiver form are a criminal offense. File it at the clerk's window at the same time as your Complaint.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={ctx.ilWizardIndex === 0} onClick={() => ctx.setIlWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={ctx.ilWizardIndex === IL_WIZARD_STEPS.length - 1} onClick={() => ctx.setIlWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
  );
}
