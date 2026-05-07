import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PenLine, Download, CheckCircle2, X, Info } from "lucide-react";

// Convert UI field state → server body format
export function sc104FieldsToBody(f: Record<string, string>): Record<string, unknown> {
  const docsServed: string[] = [];
  if (f["docsServed_sc100"] === "yes") docsServed.push("sc100");
  if (f["docsServed_sc120"] === "yes") docsServed.push("sc120");
  if ((f["docsServedOther"] ?? "").trim()) docsServed.push("other");
  return { ...f, docsServed };
}

interface Props {
  open: boolean;
  onClose: () => void;
  fields: Record<string, string>;
  saving: boolean;
  downloadingForm: string | null;
  onSave: () => void;
  onSignAndDownload: () => void;
  onDownloadNoSig: () => void;
}

export function SC104PdfModal({
  open, onClose, fields, saving, downloadingForm, onSave, onSignAndDownload, onDownloadNoSig,
}: Props) {
  const busy = saving || downloadingForm === "sc104";
  const hasSaved = Object.keys(fields).some(k => (fields[k] ?? "").trim());

  // The actual SC-104 PDF is served from the frontend's public folder
  const pdfUrl = `${import.meta.env.BASE_URL}sc104-form.pdf`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none flex flex-col overflow-hidden gap-0"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      >
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d6b5e] text-white shrink-0 shadow-md gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-bold text-sm tracking-wide whitespace-nowrap">SC-104 — Proof of Service</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:inline">
              Fill directly in the form · use the toolbar above the form to save to your computer
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1 bg-white/10 text-white border border-white/30 hover:bg-white/20"
              onClick={onSave}
              disabled={busy}
              title="Save your case data so it can be used when generating PDFs via the buttons below"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              {hasSaved ? "Update Saved Data" : "Save Data to System"}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-[#14b8a6] hover:bg-[#0d9488] text-white"
              onClick={onSignAndDownload}
              disabled={busy}
              title="Generate a pre-filled PDF with your case data, then add a signature"
            >
              {downloadingForm === "sc104" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}
              Sign &amp; Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 bg-transparent text-white border-white/40 hover:bg-white/20"
              onClick={onDownloadNoSig}
              disabled={busy}
              title="Download a pre-filled PDF with your case data (no signature)"
            >
              {downloadingForm === "sc104" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Download Pre-filled
            </Button>
            <button
              onClick={onClose}
              className="ml-1 p-1.5 rounded hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── PDF viewer ── */}
        <div className="flex-1 min-h-0 bg-gray-300 relative">
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-full block"
            aria-label="SC-104 Proof of Service form"
          >
            {/* Fallback if browser can't display PDF inline */}
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <Info className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-sm">
                Your browser cannot display the PDF inline. Use the buttons below to download or generate the form.
              </p>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3 w-3" />
                  Open Blank SC-104 Form
                </Button>
              </a>
            </div>
          </object>
        </div>

        {/* ── Footer tip ── */}
        <div className="shrink-0 bg-white border-t border-border px-4 py-2 flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#0d6b5e]" />
          <span>
            <strong className="text-foreground">To save to your computer:</strong> Fill in the form above, then use the form&apos;s own download/save button in the toolbar (the floppy disk icon).{" "}
            <strong className="text-foreground">To generate a pre-filled version</strong> with your case details (case name, hearing date, etc.), use the <em>Download Pre-filled</em> or <em>Sign &amp; Download</em> buttons above.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
