import { useState, useEffect } from "react";
import { Download, Info, PenLine, CheckCircle2, AlertTriangle, ExternalLink, UserCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormWizardStepper } from "@/components/form-wizard-stepper";
import { TX_WIZARD_STEPS, TX_JP_PRECINCTS } from "../forms-tab";
import type { FormsTabCtx } from "../forms-tab";

export function TexasFormsSection({ ctx }: { ctx: FormsTabCtx }) {
  const [txWizardIndex, setTxWizardIndex] = useState(() => {
    try { const s = localStorage.getItem(`tx_forms_step_${ctx.caseId}`); const n = s !== null ? parseInt(s, 10) : 0; return isNaN(n) ? 0 : n; } catch { return 0; }
  });
  useEffect(() => { try { localStorage.setItem(`tx_forms_step_${ctx.caseId}`, String(txWizardIndex)); } catch {} }, [txWizardIndex, ctx.caseId]);
  const [txServiceMethod, setTxServiceMethod] = useState<string>("");
  const [txSeeksProperty, setTxSeeksProperty] = useState<boolean>(false);
  const [txPersonalPropertyDesc, setTxPersonalPropertyDesc] = useState<string>("");
  const [txPersonalPropertyValue, setTxPersonalPropertyValue] = useState<string>("");
  const [txInterestPref, setTxInterestPref] = useState<string>("doesnot");
  const [txJuryPref, setTxJuryPref] = useState<string>("none");
  const [txPhonePref, setTxPhonePref] = useState<string>("yes");
  const [txVideoPref, setTxVideoPref] = useState<string>("yes");
  return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <h3 className="text-base font-bold text-foreground">Texas Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={TX_WIZARD_STEPS}
            currentIndex={txWizardIndex}
            onStepClick={setTxWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: TX Petition ────────────────────────────────────────────── */}
          {txWizardIndex === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File with the Justice of the Peace court in the precinct where the defendant lives or where the transaction occurred. The petition below is pre-filled with your case information.
              </p>

              {/* ── Petition questions ──────────────────────────────────────── */}
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <p className="text-xs font-semibold text-foreground">A few questions to complete your petition</p>

                {/* 1. Personal property (optional) */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={txSeeksProperty}
                      onCheckedChange={(v) => setTxSeeksProperty(!!v)}
                    />
                    <span className="text-xs font-medium text-foreground">I am also seeking return of personal property</span>
                  </label>
                  {txSeeksProperty && (
                    <div className="space-y-2 pl-6">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-foreground">Describe the property</p>
                        <Input
                          className="h-8 text-xs"
                          placeholder="e.g., iPhone 13 Pro, Black, serial #ABC123"
                          value={txPersonalPropertyDesc}
                          onChange={(e) => setTxPersonalPropertyDesc(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-foreground">Estimated value ($)</p>
                        <Input
                          className="h-8 text-xs w-32"
                          placeholder="0.00"
                          value={txPersonalPropertyValue}
                          onChange={(e) => setTxPersonalPropertyValue(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Interest preference */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Do you want to seek interest on your damages?</p>
                  <RadioGroup value={txInterestPref} onValueChange={setTxInterestPref} className="flex flex-row gap-3">
                    {[
                      { val: "doesnot", label: "No interest" },
                      { val: "does",    label: "Yes, seek interest" },
                    ].map(({ val, label }) => (
                      <label key={val} className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors border ${txInterestPref === val ? "border-[#0d6b5e]/30 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}>
                        <RadioGroupItem value={val} />
                        <span className="text-xs text-foreground">{label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {/* 4. Jury preference */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Do you want a jury trial?</p>
                  <RadioGroup value={txJuryPref} onValueChange={setTxJuryPref} className="flex flex-row gap-3">
                    {[
                      { val: "none",    label: "No (bench trial)" },
                      { val: "request", label: "Yes, request jury" },
                    ].map(({ val, label }) => (
                      <label key={val} className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors border ${txJuryPref === val ? "border-[#0d6b5e]/30 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}>
                        <RadioGroupItem value={val} />
                        <span className="text-xs text-foreground">{label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {/* 5. Remote participation — phone */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Can you attend hearings by phone call?</p>
                  <RadioGroup value={txPhonePref} onValueChange={setTxPhonePref} className="flex flex-col gap-1">
                    {[
                      { val: "yes", label: "Yes — I can attend hearings by phone call" },
                      { val: "no",  label: "No — I cannot attend hearings by phone" },
                    ].map(({ val, label }) => (
                      <label key={val} className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors border ${txPhonePref === val ? "border-[#0d6b5e]/30 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}>
                        <RadioGroupItem value={val} />
                        <span className="text-xs text-foreground">{label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {/* 6. Remote participation — video */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Can you attend hearings by video conference?</p>
                  <RadioGroup value={txVideoPref} onValueChange={setTxVideoPref} className="flex flex-col gap-1">
                    {[
                      { val: "yes", label: "Yes — I can attend hearings by video conference" },
                      { val: "no",  label: "No — I cannot attend hearings by video conference" },
                    ].map(({ val, label }) => (
                      <label key={val} className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors border ${txVideoPref === val ? "border-[#0d6b5e]/30 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}>
                        <RadioGroupItem value={val} />
                        <span className="text-xs text-foreground">{label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              {/* ── Download card ───────────────────────────────────────────── */}
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Texas Small Claims Petition</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled petition to open your case in Texas JP court. File this with the justice court clerk in your precinct.</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => ctx.downloadFormPost("tx/petition", `TX-Small-Claims-Petition-Case-${ctx.caseId}.pdf`, { interestPref: txInterestPref, juryPref: txJuryPref, phonePref: txPhonePref, videoPref: txVideoPref, personalPropertyDesc: txSeeksProperty ? txPersonalPropertyDesc : "", personalPropertyValue: txSeeksProperty ? txPersonalPropertyValue : "" })}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                  <Button size="sm" className="gap-1.5 h-8 text-xs bg-[#0d6b5e] hover:bg-[#0a5449] text-white" onClick={() => ctx.openFlSigModal({ endpoint: "tx/petition", filename: `TX-Small-Claims-Petition-Case-${ctx.caseId}-signed.pdf`, extraBody: { interestPref: txInterestPref, juryPref: txJuryPref, phonePref: txPhonePref, videoPref: txVideoPref, personalPropertyDesc: txSeeksProperty ? txPersonalPropertyDesc : "", personalPropertyValue: txSeeksProperty ? txPersonalPropertyValue : "" } })}>
                    <PenLine className="h-3.5 w-3.5" /> Sign &amp; Download
                  </Button>
                </div>
              </div>

              {/* Filing steps */}
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Filing in Texas — Next Steps</p>
                {(() => {
                  const countyId = ctx.currentCase.countyId ?? "";
                  const precinct = TX_JP_PRECINCTS[countyId];
                  return precinct ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 mb-1">
                      <p className="text-xs font-semibold text-emerald-800 mb-0.5">Your JP Court — Precinct 1, Place 1</p>
                      <p className="text-xs text-emerald-700">{precinct.address}, {precinct.city}, TX {precinct.zip}</p>
                    </div>
                  ) : null;
                })()}
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Print the petition and bring it to the Justice of the Peace court in the correct precinct.</li>
                  <li>File in the precinct where the defendant lives, or where the contract or incident occurred.</li>
                  <li>Pay the filing fee at the clerk's window (see fee schedule below). Ask about fee waivers if needed.</li>
                  <li>The court will issue a Citation (summons) — served by constable, sheriff, or process server.</li>
                  <li>Your trial date will be set — typically 20–45 days after service.</li>
                </ol>
              </div>

              {/* Fee schedule */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-base font-bold text-foreground mb-1">Texas Filing Fees — Tex. Gov't Code § 118.121</p>
                <p className="text-base font-bold text-foreground mb-2">Filing fees are recoverable as court costs when you win your case — Tex. R. Civ. P. 131.</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <span className="text-muted-foreground">$0 – $200</span><span className="font-medium text-foreground">$46</span>
                  <span className="text-muted-foreground">$201 – $500</span><span className="font-medium text-foreground">$71</span>
                  <span className="text-muted-foreground">$501 – $1,000</span><span className="font-medium text-foreground">$121</span>
                  <span className="text-muted-foreground">$1,001 – $5,000</span><span className="font-medium text-foreground">$221</span>
                  <span className="text-muted-foreground">$5,001 – $10,000</span><span className="font-medium text-foreground">$271</span>
                  <span className="text-muted-foreground">$10,001 – $20,000</span><span className="font-medium text-foreground">$321</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Claim limit: $20,000 (exclusive of attorneys' fees, interest, and court costs)</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Citation ───────────────────────────────────────────────── */}
          {txWizardIndex === 1 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Citation (Court-Issued Summons)</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After you file your petition and pay the filing fee, the court prepares a Citation — the official notice to the defendant. Download this pre-filled Citation to bring to the clerk at filing. The clerk will stamp it and forward it for service.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes &amp; Issues</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Texas Citation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your case details. Bring to the clerk when you file — the clerk signs, stamps, and forwards it for service on the defendant.</p>
                  {ctx.downloadError && ctx.downloadingForm === "tx/citation" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "tx/citation"} onClick={() => ctx.downloadSignedFLForm("tx/citation", `TX-Citation-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "tx/citation" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Serve Defendant ─────────────────────────────────────────── */}
          {txWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Serving the Defendant</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After you file and pay the filing fee, the clerk issues a Citation (summons) for you to have served on the defendant. Once served, the defendant has <strong>14 days to file an answer</strong> (TRCP Rule 502). The court then schedules trial <strong>20–45 days after service</strong> (TRCP Rule 503). Serve as early as possible — the hearing date is not set until after the answer period closes.
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <RadioGroup value={txServiceMethod} onValueChange={setTxServiceMethod} className="gap-0">

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${txServiceMethod === "process_server" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (txServiceMethod === "process_server") { e.preventDefault(); setTxServiceMethod(""); } }}>
                    <RadioGroupItem value="process_server" id="tx-serve-ps" className="mt-0.5 shrink-0" />
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
                        <span className="font-bold">Private Process Server</span> — A licensed Texas process server picks up the citation from the clerk and personally serves the defendant. More expensive but most reliable if the defendant may avoid service. Fees are recoverable if you win.
                      </p>
                    </div>
                  </label>
                  {txServiceMethod === "process_server" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">How It Works</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After filing, ask the clerk to prepare the Citation. A licensed process server picks it up from the court, locates and personally serves the defendant, and files a Return of Service directly with the court when complete.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Be Ready to Provide</p>
                          <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                            <li>• The defendant's full legal name and best address for service.</li>
                            <li>• Any additional details: work address, business hours, vehicle description, or photo.</li>
                            <li>• Your contact information and any hearing date concerns.</li>
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Timing</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Once the defendant is served, they have <strong>14 days to file an answer</strong>. The court schedules trial 20–45 days after service. Serve early so there is time to resolve service issues before your case is heard. Service fees are typically recoverable if you win.</p>
                      </div>
                    </div>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${txServiceMethod === "constable_sheriff" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (txServiceMethod === "constable_sheriff") { e.preventDefault(); setTxServiceMethod(""); } }}>
                    <RadioGroupItem value="constable_sheriff" id="tx-serve-constable" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Constable / Sheriff Service</span> — Standard option. Request constable or sheriff service at the clerk's window when you file. The court forwards the citation to the constable's or sheriff's office, which attempts service and files a Return of Service when complete.
                    </p>
                  </label>
                  {txServiceMethod === "constable_sheriff" && (
                    <>
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">At the Filing Window</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Tell the clerk you want constable or sheriff service. There is usually a small service fee (around $75–$100 depending on the county). The constable will attempt service at the defendant's address on file.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Check Your Case Status</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Follow up with the clerk 10–14 days after filing to confirm the Return of Service has been filed. If service was unsuccessful, you may need to switch to a private process server or provide an updated address.</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Timing</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Once the defendant is served, they have <strong>14 days to file an answer</strong>. The court then schedules trial 20–45 days after service. Serve early — if service fails, you will need to make another attempt before the court can proceed.</p>
                      </div>
                    </div>
                    {ctx.currentCase.countyId === "tx-denton" && (
                      <div className="mx-3 mb-2 rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Constable / Sheriff Service</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">Denton County Citation Request</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Official Denton County Justice Court form to request sheriff service of your citation. Pre-filled with your case info and the Denton County Sheriff's Office address. Enter your JP court precinct number after opening, then submit to the clerk with your filing fee.</p>
                          {ctx.downloadError && ctx.downloadingForm === "tx/denton-citation-request" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                        </div>
                        <div className="shrink-0">
                          <button
                            type="button"
                            disabled={ctx.downloadingForm === "tx/denton-citation-request"}
                            onClick={() => ctx.downloadSignedFLForm("tx/denton-citation-request", `TX-Denton-Citation-Request-Case-${ctx.caseId}.pdf`)}
                            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                          >
                            {ctx.downloadingForm === "tx/denton-citation-request" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                            Open
                          </button>
                        </div>
                      </div>
                    )}
                    </>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${txServiceMethod === "certified_mail" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (txServiceMethod === "certified_mail") { e.preventDefault(); setTxServiceMethod(""); } }}>
                    <RadioGroupItem value="certified_mail" id="tx-serve-mail" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Certified Mail — Least Reliable.</span> Available in some Texas JP courts. The clerk sends the citation by certified mail. Service only counts if the defendant personally signs for it.
                    </p>
                  </label>
                  {txServiceMethod === "certified_mail" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Return Receipt Required (TRCP Rule 501)</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Must be sent restricted delivery. Service is complete only upon the court receiving a signed or electronic return receipt. If the defendant refuses or does not accept delivery, service fails.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">If Certified Mail Fails</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Switch to constable/sheriff service or a certified process server right away. The answer deadline does not restart — serve early to leave time for a second attempt if needed.</p>
                        </div>
                      </div>
                    </div>
                  )}

                </RadioGroup>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Return of Service</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Texas Return of Service</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Give this blank form to your process server or constable. They complete and file it with the court after serving the defendant.</p>
                  {ctx.downloadError && ctx.downloadingForm === "tx/return-of-service" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0">
                  <button type="button" disabled={ctx.downloadingForm === "tx/return-of-service"} onClick={() => ctx.downloadSignedFLForm("tx/return-of-service", `TX-Return-of-Service-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "tx/return-of-service" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Fee Waiver (optional) ──────────────────────────────────── */}
          {txWizardIndex === 3 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Affidavit of Inability to Pay</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your name, address, and case information are pre-filled from your intake. Download the form, complete the financial eligibility section, sign it, and file it with the clerk at the same time as your petition.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Rule 145</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Affidavit of Inability to Pay</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading.</p>
                  <p className="text-xs text-muted-foreground mt-1">Editable fields require Adobe Acrobat.</p>
                  {ctx.downloadError && (ctx.downloadingForm === "tx/fee-waiver" || ctx.downloadingForm === "tx/fee-waiver/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "tx/fee-waiver/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "tx/fee-waiver", filename: `TX-Fee-Waiver-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "tx/fee-waiver/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={ctx.downloadingForm === "tx/fee-waiver"} onClick={() => ctx.downloadSignedFLForm("tx/fee-waiver", `TX-Fee-Waiver-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {ctx.downloadingForm === "tx/fee-waiver" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is confidential.</span> The court will not give it to the other party. False statements on a fee waiver form are a criminal offense. File it at the clerk's window at the same time as your petition.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={txWizardIndex === 0} onClick={() => setTxWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={txWizardIndex === TX_WIZARD_STEPS.length - 1} onClick={() => setTxWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
  );
}
