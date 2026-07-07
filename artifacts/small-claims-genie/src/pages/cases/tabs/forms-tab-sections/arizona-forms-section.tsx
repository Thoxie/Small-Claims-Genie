import { Download, Info, PenLine, ExternalLink } from "lucide-react";
import type { FormsTabCtx } from "../forms-tab";

export function ArizonaFormsSection({ ctx }: { ctx: FormsTabCtx }) {
  return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌵</span>
            <h3 className="text-base font-bold text-foreground">Arizona Court Forms</h3>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">A.R.S. § 22-504</span>
              </div>
              <p className="text-sm font-semibold text-foreground">Small Claims Complaint</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your case details — the main form you file with the Justice Court clerk to start your small claims case.</p>
              {ctx.downloadError && (ctx.downloadingForm === "az/complaint" || ctx.downloadingForm === "az/complaint/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <button type="button" disabled={ctx.downloadingForm === "az/complaint/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "az/complaint", filename: `AZ-Small-Claims-Complaint-Signed-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {ctx.downloadingForm === "az/complaint/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                Sign &amp; Download
              </button>
              <button type="button" disabled={ctx.downloadingForm === "az/complaint"} onClick={() => ctx.downloadSignedFLForm("az/complaint", `AZ-Small-Claims-Complaint-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                {ctx.downloadingForm === "az/complaint" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                Skip signing
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
            <div className="flex gap-2.5">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-0.5">Filing, service, and important Arizona rules</p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  File the signed Complaint with your Justice Court clerk and pay the $30 filing fee (A.R.S. § 22-281). The court will set a hearing date — typically within 30–70 days. <strong>You are responsible for serving the defendant</strong> by registered/certified mail with return receipt, constable, sheriff, or licensed process server (A.R.S. § 22-513). File proof of service within 45 days of filing. <strong>Important: Arizona small claims judgments are final — there is no appeal (A.R.S. § 22-519).</strong>
                </p>
              </div>
            </div>
            <a href="https://www.azcourts.gov/selfservicecenter/small-claims" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              Arizona Courts Small Claims Self-Help <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
  );
}
