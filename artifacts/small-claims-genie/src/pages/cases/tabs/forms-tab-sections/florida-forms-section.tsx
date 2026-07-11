import { Download, Info, PenLine, CheckCircle2, AlertTriangle, ExternalLink, UserCheck } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
  import { FormWizardStepper } from "@/components/form-wizard-stepper";
  import { FL_WIZARD_STEPS } from "../forms-tab";
  import type { FormsTabCtx } from "../forms-tab";

  // FL SOC claim types that map to statewide numbered AcroForms (7.330–7.337)
  const FL_SOC_TYPES: Record<string, { formNo: string; formName: string }> = {
    "Auto Negligence": { formNo: "7.330", formName: "Statement of Claim (Auto Negligence)" },
    "Goods Sold": { formNo: "7.331", formName: "Statement of Claim (For Goods Sold)" },
    "Work Done / Materials Furnished": { formNo: "7.332", formName: "Statement of Claim (For Work Done and Materials Furnished)" },
    "Money Lent": { formNo: "7.333", formName: "Statement of Claim (For Money Lent)" },
    "Promissory Note": { formNo: "7.334", formName: "Statement of Claim (Promissory Note)" },
    "Stolen Property from Pawnbroker": { formNo: "7.335", formName: "Statement of Claim (For Return of Stolen Property from Pawnbroker)" },
    "Return of Property from Government": { formNo: "7.336", formName: "Statement of Claim for Replevin (Return of Property from Government Entity)" },
    "Account Stated": { formNo: "7.337", formName: "Statement of Claim (Account Stated)" },
  };

  export function FloridaFormsSection({ ctx }: { ctx: FormsTabCtx }) {
    const claimType = ctx.currentCase.claimType ?? "";
    const socMeta = FL_SOC_TYPES[claimType] ?? null;

    return (
          <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <h3 className="text-base font-bold text-foreground">Florida Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={FL_WIZARD_STEPS}
            currentIndex={ctx.flWizardIndex}
            onStepClick={ctx.setFlWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: Statement of Claim ──────────────────────────────────── */}
          {ctx.flWizardIndex === 0 && (
            <div className="space-y-3">

              {/* ── Statewide numbered form (7.330–7.337) when claim type is specific ── */}
              {socMeta ? (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form {socMeta.formNo}</span>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Statewide — All 67 Counties</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">{socMeta.formName}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                      Florida statewide AcroForm pre-filled with your case details. Sign and file with your county clerk.
                    </p>
                    {ctx.downloadError && (ctx.downloadingForm === "fl/soc" || ctx.downloadingForm === "fl/soc/signed") && (
                      <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button
                      type="button"
                      disabled={!!ctx.downloadingForm}
                      onClick={() => ctx.openFlSigModal({ endpoint: "fl/soc", filename: `FL-Statement-of-Claim-Case-${ctx.caseId}.pdf` })}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {ctx.downloadingForm === "fl/soc/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                      Sign &amp; Download
                    </button>
                    <button
                      type="button"
                      disabled={!!ctx.downloadingForm}
                      onClick={() => ctx.downloadSignedFLForm("fl/soc", `FL-Statement-of-Claim-Case-${ctx.caseId}.pdf`)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
                    >
                      {ctx.downloadingForm === "fl/soc" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                      Skip signing
                    </button>
                  </div>
                </div>
              ) : (
                /* ── County-specific fallback (General / Other or claim type not set) ── */
                <>
                  {ctx.currentCase.countyId === "fl-miami-dade" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        File with the Miami-Dade County Court Clerk — 73 W. Flagler St., Suite 133, Miami.
                      </p>
                      <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">CLK/CT. 333</span>
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                          </div>
                          <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled from your case details.</p>
                          {ctx.downloadError && ctx.downloadingForm === "fl/clkct333" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <button type="button" disabled={ctx.downloadingForm === "fl/clkct333/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/clkct333", filename: `Statement-of-Claim-Miami-Dade-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                            {ctx.downloadingForm === "fl/clkct333/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                            Sign &amp; Download
                          </button>
                          <button type="button" disabled={ctx.downloadingForm === "fl/clkct333"} onClick={() => ctx.downloadSignedFLForm("fl/clkct333", `Statement-of-Claim-Miami-Dade-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                            {ctx.downloadingForm === "fl/clkct333" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                            Skip signing
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {ctx.currentCase.countyId === "fl-volusia" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">File with the Volusia County Court Clerk — 101 N. Alabama Ave., DeLand.</p>
                      <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">CL-219</span>
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                            </div>
                            <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                            <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled from your case details.</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <button type="button" disabled={ctx.downloadingForm === "fl/cl219-volusia-pdf/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/cl219-volusia-pdf", filename: `Statement-of-Claim-Volusia-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                              {ctx.downloadingForm === "fl/cl219-volusia-pdf/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                              Sign &amp; Download
                            </button>
                            <button type="button" disabled={ctx.downloadingForm === "fl/cl219-volusia-pdf"} onClick={() => ctx.downloadSignedFLForm("fl/cl219-volusia-pdf", `Statement-of-Claim-Volusia-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                              {ctx.downloadingForm === "fl/cl219-volusia-pdf" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                              Skip signing
                            </button>
                          </div>
                        </div>
                        {ctx.downloadError && (ctx.downloadingForm === "fl/cl219-volusia-pdf" || ctx.downloadingForm === "fl/cl219-volusia") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                        <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3">
                          <p className="text-xs text-muted-foreground">Prefer the standard layout? Use the programmatic version.</p>
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={ctx.downloadingForm === "fl/cl219-volusia/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/cl219-volusia", filename: `Statement-of-Claim-Volusia-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60 transition-colors">
                              {ctx.downloadingForm === "fl/cl219-volusia/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3 w-3" />}
                              Sign alternate
                            </button>
                            <button type="button" disabled={ctx.downloadingForm === "fl/cl219-volusia"} onClick={() => ctx.downloadSignedFLForm("fl/cl219-volusia", `Statement-of-Claim-Volusia-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                              {ctx.downloadingForm === "fl/cl219-volusia" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                              Skip
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {ctx.currentCase.countyId === "fl-broward" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">File with the Broward County Clerk of Courts — 201 SE 6th St., Room 01250, Fort Lauderdale.</p>
                      <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                          </div>
                          <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled with your case details and Broward County Court header.</p>
                          {ctx.downloadError && ctx.downloadingForm === "fl/broward" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <button type="button" disabled={ctx.downloadingForm === "fl/broward/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/broward", filename: `Statement-of-Claim-Broward-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                            {ctx.downloadingForm === "fl/broward/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                            Sign &amp; Download
                          </button>
                          <button type="button" disabled={ctx.downloadingForm === "fl/broward"} onClick={() => ctx.downloadSignedFLForm("fl/broward", `Statement-of-Claim-Broward-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                            {ctx.downloadingForm === "fl/broward" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                            Skip signing
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {ctx.currentCase.countyId === "fl-orange" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">File with the Orange County Clerk of Courts — 425 N. Orange Ave., Suite 100, Orlando.</p>
                      <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                            </div>
                            <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                            <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled from your case details.</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <button type="button" disabled={ctx.downloadingForm === "fl/plain-soc-orange/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/plain-soc-orange", filename: `Statement-of-Claim-Orange-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                              {ctx.downloadingForm === "fl/plain-soc-orange/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                              Sign &amp; Download
                            </button>
                            <button type="button" disabled={ctx.downloadingForm === "fl/plain-soc-orange"} onClick={() => ctx.downloadSignedFLForm("fl/plain-soc-orange", `Statement-of-Claim-Orange-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                              {ctx.downloadingForm === "fl/plain-soc-orange" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                              Skip signing
                            </button>
                          </div>
                        </div>
                        {ctx.downloadError && (ctx.downloadingForm === "fl/plain-soc-orange" || ctx.downloadingForm === "fl/orange") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                        <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3">
                          <p className="text-xs text-muted-foreground">Prefer the standard layout? Use the programmatic version.</p>
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={ctx.downloadingForm === "fl/orange/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/orange", filename: `Statement-of-Claim-Orange-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60 transition-colors">
                              {ctx.downloadingForm === "fl/orange/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3 w-3" />}
                              Sign alternate
                            </button>
                            <button type="button" disabled={ctx.downloadingForm === "fl/orange"} onClick={() => ctx.downloadSignedFLForm("fl/orange", `Statement-of-Claim-Orange-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                              {ctx.downloadingForm === "fl/orange" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                              Skip
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {ctx.currentCase.countyId === "fl-hillsborough" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">File with the Hillsborough County Clerk of Courts — 800 E. Twiggs St., Tampa.</p>
                      <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                            </div>
                            <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                            <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled from your case details.</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <button type="button" disabled={ctx.downloadingForm === "fl/soc-hillsborough/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/soc-hillsborough", filename: `Statement-of-Claim-Hillsborough-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                              {ctx.downloadingForm === "fl/soc-hillsborough/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                              Sign &amp; Download
                            </button>
                            <button type="button" disabled={ctx.downloadingForm === "fl/soc-hillsborough"} onClick={() => ctx.downloadSignedFLForm("fl/soc-hillsborough", `Statement-of-Claim-Hillsborough-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                              {ctx.downloadingForm === "fl/soc-hillsborough" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                              Skip signing
                            </button>
                          </div>
                        </div>
                        {ctx.downloadError && (ctx.downloadingForm === "fl/soc-hillsborough" || ctx.downloadingForm === "fl/hillsborough") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                        <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3">
                          <p className="text-xs text-muted-foreground">Prefer the standard layout? Use the programmatic version.</p>
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={ctx.downloadingForm === "fl/hillsborough/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/hillsborough", filename: `Statement-of-Claim-Hillsborough-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60 transition-colors">
                              {ctx.downloadingForm === "fl/hillsborough/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3 w-3" />}
                              Sign alternate
                            </button>
                            <button type="button" disabled={ctx.downloadingForm === "fl/hillsborough"} onClick={() => ctx.downloadSignedFLForm("fl/hillsborough", `Statement-of-Claim-Hillsborough-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                              {ctx.downloadingForm === "fl/hillsborough" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                              Skip
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {ctx.currentCase.countyId === "fl-palm-beach" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">File with the Palm Beach County Clerk &amp; Comptroller — 205 N. Dixie Hwy., West Palm Beach.</p>
                      <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                          </div>
                          <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled with your case details and Palm Beach County Court header.</p>
                          {ctx.downloadError && ctx.downloadingForm === "fl/palm-beach" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <button type="button" disabled={ctx.downloadingForm === "fl/palm-beach/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/palm-beach", filename: `Statement-of-Claim-Palm-Beach-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                            {ctx.downloadingForm === "fl/palm-beach/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                            Sign &amp; Download
                          </button>
                          <button type="button" disabled={ctx.downloadingForm === "fl/palm-beach"} onClick={() => ctx.downloadSignedFLForm("fl/palm-beach", `Statement-of-Claim-Palm-Beach-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                            {ctx.downloadingForm === "fl/palm-beach" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                            Skip signing
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {ctx.currentCase.countyId !== "fl-miami-dade" && ctx.currentCase.countyId !== "fl-volusia" && ctx.currentCase.countyId !== "fl-broward" && ctx.currentCase.countyId !== "fl-orange" && ctx.currentCase.countyId !== "fl-hillsborough" && ctx.currentCase.countyId !== "fl-palm-beach" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">File with your county clerk. Check your county's clerk website for the filing address and any local instructions.</p>
                      <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                          </div>
                          <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled with your case details and county court header.</p>
                          {ctx.downloadError && ctx.downloadingForm === "fl/statement-of-claim" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <button type="button" disabled={ctx.downloadingForm === "fl/statement-of-claim/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/statement-of-claim", filename: `Florida-Statement-of-Claim-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                            {ctx.downloadingForm === "fl/statement-of-claim/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                            Sign &amp; Download
                          </button>
                          <button type="button" disabled={ctx.downloadingForm === "fl/statement-of-claim"} onClick={() => ctx.downloadSignedFLForm("fl/statement-of-claim", `Florida-Statement-of-Claim-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                            {ctx.downloadingForm === "fl/statement-of-claim" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                            Skip signing
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Filing fee recoverability notice — always visible in FL step 0 */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-base font-bold text-foreground mb-0.5">Florida Filing Fees — Fla. Stat. § 28.241</p>
                <p className="text-base font-bold text-foreground mb-1">Filing fees are recoverable as court costs when you win your case — Fla. Stat. § 57.041.</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
                  <span className="text-blue-700">$0 – $100</span><span className="font-medium text-blue-900">$55</span>
                  <span className="text-blue-700">$101 – $500</span><span className="font-medium text-blue-900">$80</span>
                  <span className="text-blue-700">$501 – $2,500</span><span className="font-medium text-blue-900">$175</span>
                  <span className="text-blue-700">$2,501 – $5,000</span><span className="font-medium text-blue-900">$300</span>
                  <span className="text-blue-700">$5,001 – $8,000</span><span className="font-medium text-blue-900">$395</span>
                </div>
                <p className="text-xs text-blue-800">Claim limit: $8,000. Fees may vary slightly by county — confirm with your clerk. A fee waiver is available if you cannot afford the filing fee (see the Fee Waiver step).</p>
              </div>

            </div>
          )}

          {/* ── Step 1: Summons / Notice to Appear ─────────────────────────────── */}
          {ctx.flWizardIndex === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">Bring this form to the clerk when you file your Statement of Claim. The clerk assigns the case number, hearing date, and courtroom, then issues the summons to the defendant.</p>

              {/* Miami-Dade uses its own county summons (CLK/CT. 423) */}
              {ctx.currentCase.countyId === "fl-miami-dade" && (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">CLK/CT. 423</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">Summons / Notice to Appear</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk — they will assign the case number, hearing date, and courtroom, then issue it to the defendant.</p>
                    {ctx.downloadError && ctx.downloadingForm === "fl/clkct423" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button type="button" disabled={ctx.downloadingForm === "fl/clkct423/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/clkct423", filename: `Summons-Miami-Dade-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {ctx.downloadingForm === "fl/clkct423/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                      Sign &amp; Download
                    </button>
                    <button type="button" disabled={ctx.downloadingForm === "fl/clkct423"} onClick={() => ctx.downloadSignedFLForm("fl/clkct423", `Summons-Miami-Dade-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                      {ctx.downloadingForm === "fl/clkct423" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                      Skip signing
                    </button>
                  </div>
                </div>
              )}

              {/* All other counties use the statewide Form 7.322 AcroForm */}
              {ctx.currentCase.countyId !== "fl-miami-dade" && (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form 7.322</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes</span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Statewide — All 67 Counties</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">Summons / Notice to Appear</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk — they will assign the case number, hearing date, and courtroom, then issue it to the defendant.</p>
                    {ctx.downloadError && ctx.downloadingForm === "fl/7322-summons" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={!!ctx.downloadingForm}
                      onClick={() => ctx.downloadSignedFLForm("fl/7322-summons", `FL-Summons-Case-${ctx.caseId}.pdf`)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {ctx.downloadingForm === "fl/7322-summons" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                      Download
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── Step 2: Serve Defendant ─────────────────────────────────────────── */}
          {ctx.flWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Serving the Defendant</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After the clerk signs and stamps your summons, you must have it served on the defendant before the pretrial conference date shown on the summons. You have up to <strong>120 days from filing</strong> to complete service before the court may dismiss your case (Fla. R. Civ. P. 1.070). Serve early — sheriff and certified mail service can take weeks. Choose the method that works best for your situation.
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <RadioGroup value={ctx.flServiceMethod} onValueChange={ctx.setFlServiceMethod} className="gap-0">

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${ctx.flServiceMethod === "process_server" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (ctx.flServiceMethod === "process_server") { e.preventDefault(); ctx.setFlServiceMethod(""); } }}>
                    <RadioGroupItem value="process_server" id="fl-serve-ps" className="mt-0.5 shrink-0" />
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
                        <span className="font-bold">Certified Process Server</span> — A certified process server (licensed under Fla. Stat. § 48.27) personally serves the summons and Statement of Claim on the defendant. Best option if the defendant may avoid service or your hearing date is approaching. Fees may be recoverable if you win.
                      </p>
                    </div>
                  </label>
                  {ctx.flServiceMethod === "process_server" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">How It Works</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After the clerk issues and stamps your summons, bring or mail it to a certified process server. The server locates the defendant, personally delivers the summons and Statement of Claim, and files a Return of Service directly with the court.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Be Ready to Provide</p>
                          <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                            <li>• The clerk-issued, signed summons and a copy of your Statement of Claim.</li>
                            <li>• The defendant's full legal name and best address for service.</li>
                            <li>• Any additional details: work address, business hours, vehicle description, or photo.</li>
                            <li>• Your contact information and any hearing date concerns.</li>
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Deadline</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Service must be completed before the pretrial conference date on the summons. You have 120 days from filing before the court may dismiss for lack of service. Process server fees may be recovered if you win.</p>
                      </div>
                    </div>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${ctx.flServiceMethod === "sheriff" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (ctx.flServiceMethod === "sheriff") { e.preventDefault(); ctx.setFlServiceMethod(""); } }}>
                    <RadioGroupItem value="sheriff" id="fl-serve-sheriff" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Sheriff Service</span> — Contact your county sheriff's civil division to request service. The sheriff serves the defendant and files a Return of Service with the court. More affordable than a private process server, but may take longer to complete.
                    </p>
                  </label>
                  {ctx.flServiceMethod === "sheriff" && (
                    <>
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">How to Request Sheriff Service</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After the clerk issues your summons, contact the civil division of your county sheriff's office. Bring or mail the clerk-issued summons, a copy of the Statement of Claim, the defendant's address, and the service fee (varies by county, typically $40–$100).</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Check Status Early</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Contact the sheriff's office 10–14 days after submission to confirm service was completed. If the defendant cannot be found, you may need to provide an updated address or switch to a certified process server.</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Deadline</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Service must be completed before the pretrial conference date on the summons. Allow extra time — sheriff service can take 1–3 weeks depending on the county. You have 120 days from filing before the court may dismiss.</p>
                      </div>
                    </div>
                    <div className="mx-3 mb-2 rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form 7.340</span>
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Return of Service</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">Florida Return of Service</p>
                        <p className="text-xs text-muted-foreground mt-0.5">After the sheriff serves the defendant, they complete and file this Return of Service with the court. Download a copy to keep for your records and to confirm service was completed before your pretrial conference.</p>
                        {ctx.downloadError && ctx.downloadingForm === "fl/proof-of-service" && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                      </div>
                      <div className="shrink-0">
                        <button type="button" disabled={ctx.downloadingForm === "fl/proof-of-service"} onClick={() => ctx.downloadSignedFLForm("fl/proof-of-service", `FL-Return-of-Service-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                          {ctx.downloadingForm === "fl/proof-of-service" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                          Download
                        </button>
                      </div>
                    </div>
                    </>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${ctx.flServiceMethod === "certified_mail" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (ctx.flServiceMethod === "certified_mail") { e.preventDefault(); ctx.setFlServiceMethod(""); } }}>
                    <RadioGroupItem value="certified_mail" id="fl-serve-mail" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Certified Mail — Least Reliable.</span> Available for <strong>Florida residents only</strong> (Fla. Sm. Cl. R. 7.070). The clerk sends the summons and Statement of Claim by certified mail. Service is valid only if the defendant — or someone authorized to receive mail at their residence or business — signs the return receipt. Not valid for out-of-state defendants.
                    </p>
                  </label>
                  {ctx.flServiceMethod === "certified_mail" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Is Only Complete If the Defendant Signs</p>
                          <p className="text-xs text-blue-800 leading-relaxed">If the defendant refuses, ignores, or does not sign for the certified mail, service fails and your hearing may be postponed. Your case is not dismissed — you can switch to a different service method.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">If Certified Mail Fails</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Switch to a certified process server or sheriff service right away. A failed mail attempt does not reset your hearing deadline — contact the clerk to request a continuance if the date is too close.</p>
                        </div>
                      </div>
                    </div>
                  )}

                </RadioGroup>
              </div>
            </div>
          )}

          {/* ── Step 3: Fee Waiver (optional) ──────────────────────────────────── */}
          {ctx.flWizardIndex === 3 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Application for Civil Indigent Status</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your name, address, and case number are pre-filled. Print the form, hand-complete the financial eligibility section (income, assets, and debts), sign it, and file with the clerk at the same time as your Statement of Claim.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Application for Civil Indigent Status</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading.</p>
                  {ctx.downloadError && (ctx.downloadingForm === "fl/indigent-fee-waiver" || ctx.downloadingForm === "fl/indigent-fee-waiver/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={ctx.downloadingForm === "fl/indigent-fee-waiver/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "fl/indigent-fee-waiver", filename: `FL-Fee-Waiver-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {ctx.downloadingForm === "fl/indigent-fee-waiver/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={ctx.downloadingForm === "fl/indigent-fee-waiver"} onClick={() => ctx.downloadSignedFLForm("fl/indigent-fee-waiver", `FL-Fee-Waiver-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {ctx.downloadingForm === "fl/indigent-fee-waiver" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is confidential.</span> The court will not give it to the other party. False statements on a fee waiver form are a criminal offense. File it at the clerk's window before or at the same time as your Statement of Claim.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={ctx.flWizardIndex === 0} onClick={() => ctx.setFlWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={ctx.flWizardIndex === FL_WIZARD_STEPS.length - 1} onClick={() => ctx.setFlWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
    );
  }
