import { Download, Info, PenLine, ExternalLink, Loader2, FileCheck } from "lucide-react";
import type { FormsTabCtx } from "../forms-tab";

export function WashingtonFormsSection({ ctx }: { ctx: FormsTabCtx }) {
  return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏔️</span>
            <h3 className="text-base font-bold text-foreground">Washington Court Forms</h3>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">MISC 05.0100</span>
              </div>
              <p className="text-sm font-semibold text-foreground">Notice of Small Claim</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your case details — the main form you file to start your case in District Court.</p>
              {ctx.downloadError && (ctx.downloadingForm === "wa/notice" || ctx.downloadingForm === "wa/notice/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <button type="button" disabled={ctx.downloadingForm === "wa/notice/signed"} onClick={() => ctx.openFlSigModal({ endpoint: "wa/notice", filename: `WA-Notice-of-Small-Claim-Signed-Case-${ctx.caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {ctx.downloadingForm === "wa/notice/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                Sign &amp; Download
              </button>
              <button type="button" disabled={ctx.downloadingForm === "wa/notice"} onClick={() => ctx.downloadSignedFLForm("wa/notice", `WA-Notice-of-Small-Claim-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                {ctx.downloadingForm === "wa/notice" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                Skip signing
              </button>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">MISC 05.0200</span>
              </div>
              <p className="text-sm font-semibold text-foreground">Certificate of Service</p>
              <p className="text-xs text-muted-foreground mt-0.5">Complete and file after the defendant has been served, to prove service to the court.</p>
              {ctx.downloadError && (ctx.downloadingForm === "wa/service" || ctx.downloadingForm === "wa/service/signed") && <p className="mt-1 text-xs text-destructive">{ctx.downloadError}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <button type="button" disabled={ctx.downloadingForm === "wa/service"} onClick={() => ctx.downloadSignedFLForm("wa/service", `WA-Certificate-of-Service-Case-${ctx.caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {ctx.downloadingForm === "wa/service" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
                Download
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
            <div className="flex gap-2.5">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-0.5">Filing and service</p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  File the Notice of Small Claim with the District Court clerk, who sets a hearing date. You are responsible for arranging service on the defendant per RCW 12.40 — then file the Certificate of Service before your hearing.
                </p>
              </div>
            </div>
            <a href="https://www.courts.wa.gov/newsinfo/resources/index.cfm?fa=newsinfo_resources.smallclaims" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              Washington Courts Small Claims Resources <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
  );
}
