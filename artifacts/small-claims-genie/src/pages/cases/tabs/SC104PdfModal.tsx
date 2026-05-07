import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, X, Info } from "lucide-react";

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
  onSave: () => void;
}

export function SC104PdfModal({ open, onClose, fields, saving, onSave }: Props) {
  const hasSaved = Object.keys(fields).some(k => (fields[k] ?? "").trim());
  const pdfUrl = `${import.meta.env.BASE_URL}sc104-form.pdf`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none flex flex-col overflow-hidden gap-0"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      >
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d6b5e] text-white shrink-0 shadow-md gap-3">
          <span className="font-bold text-sm tracking-wide">SC-104 — Proof of Service</span>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1.5 bg-white/10 text-white border border-white/30 hover:bg-white/20"
              onClick={onSave}
              disabled={saving}
              title="Save your SC-104 data to your case record"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              {hasSaved ? "Update Saved Data" : "Save Data to System"}
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

        {/* ── Instruction banner ── */}
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-800">
          <Info className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            Fill in the form below, then use the form&apos;s own{" "}
            <strong>Save this form</strong> button (at the bottom of page 2) or your browser&apos;s{" "}
            <strong>download icon</strong> in the toolbar to save your filled copy to your computer.
            To download a version pre-filled with your case details, close this window and use the{" "}
            <strong>Sign &amp; Download</strong> or <strong>Download Without Signature</strong> buttons on the form card.
          </span>
        </div>

        {/* ── PDF viewer ── */}
        <div className="flex-1 min-h-0 bg-gray-300 relative">
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-full block"
            aria-label="SC-104 Proof of Service form"
          >
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <Info className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-sm">
                Your browser cannot display the PDF inline.
              </p>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  Open SC-104 Form in New Tab
                </Button>
              </a>
            </div>
          </object>
        </div>
      </DialogContent>
    </Dialog>
  );
}
