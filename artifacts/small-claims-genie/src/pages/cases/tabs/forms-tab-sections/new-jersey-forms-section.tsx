import { Download, Info, PenLine, ExternalLink } from "lucide-react";
import type { FormsTabCtx } from "../forms-tab";

export function NewJerseyFormsSection({ ctx }: { ctx: FormsTabCtx }) {
  return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌊</span>
            <h3 className="text-base font-bold text-foreground">New Jersey Court Forms</h3>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">CN 10532</span>
              </div>
              <p className="text-sm font-semibold text-foreground">Small Claims Complaint</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your case details — plaintiff, defendant, county, amount claimed, and basis of claim. Sign and file with the Special Civil Part clerk.</p>
              {ctx.downloadError && (ctx.downloadingForm === "nj/complaint" || ctx.downloadingForm === "nj/complaint/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <button type="button" disabled={ctx.downloadingForm === "nj/complaint/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "nj/complaint", filename: `NJ-Small-Claims-Complaint-Signed-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {ctx.downloadingForm === "nj/complaint/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                Sign &amp; Download
              </button>
              <button type="button" disabled={ctx.downloadingForm === "nj/complaint"} onClick={() => ctx.downloadSignedFLForm("nj/complaint", `NJ-Small-Claims-Complaint-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                {ctx.downloadingForm === "nj/complaint" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                Skip signing
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
            <div className="flex gap-2.5">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-0.5">After you file — 2 ways to serve the defendant</p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  By default, the clerk mails the Summons and Return of Service to the defendant by certified and regular mail — this is included in your filing fee, but only counts as service if the defendant signs for the certified mail. If you'd rather not rely on mail (or the defendant is likely to avoid signing for it), you can ask the clerk to have a <strong>Special Civil Part Officer serve the defendant in person</strong> instead, for an additional fee. If you cannot afford the filing fee, ask the clerk for the Application to Proceed as an Indigent when you file.
                </p>
              </div>
            </div>
            <a href="https://www.njcourts.gov/self-help/small-claims-court" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              NJ Courts Small Claims Self-Help <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
  );
}
