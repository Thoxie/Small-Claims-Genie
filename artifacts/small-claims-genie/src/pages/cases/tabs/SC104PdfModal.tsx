import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PenLine, Download, CheckCircle2, X } from "lucide-react";

// ── PDF coordinate helpers ─────────────────────────────────────────────────────
// PDF page: 612 × 792 pts. PNG assets: 2550 × 3300 px (4.167×).
// CSS left%  = x / 612 * 100
// CSS top%   = (792 - y - 12) / 792 * 100   (12pt ≈ one input height; y is text baseline from bottom)
// Checkbox top% = (792 - y - 8) / 792 * 100

const L = (x: number) => `${(x / 612) * 100}%`;
const T = (y: number) => `${((792 - y - 12) / 792) * 100}%`;  // text inputs
const TC = (y: number) => `${((792 - y - 8) / 792) * 100}%`;  // checkboxes/radios

const INPUT_CLS =
  "absolute text-[clamp(6px,1.1vw,11px)] leading-none bg-[rgba(173,216,230,0.22)] border border-[rgba(0,100,200,0.3)] rounded-[2px] px-[2px] py-0 text-[#0a0a1a] placeholder:text-[rgba(0,0,0,0.28)] focus:bg-[rgba(173,216,230,0.45)] focus:border-[rgba(0,80,200,0.6)] focus:outline-none h-[2%]";

const SELECT_CLS =
  "absolute text-[clamp(5px,1vw,10px)] leading-none bg-[rgba(173,216,230,0.22)] border border-[rgba(0,100,200,0.3)] rounded-[2px] px-0 py-0 text-[#0a0a1a] focus:bg-[rgba(173,216,230,0.45)] focus:border-[rgba(0,80,200,0.6)] focus:outline-none h-[2%] cursor-pointer";

function fi(
  fields: Record<string, string>,
  set: (k: string, v: string) => void,
  key: string,
  x: number,
  y: number,
  widthPct: number,
  placeholder?: string,
  inputType = "text",
) {
  return (
    <input
      key={key}
      type={inputType}
      value={fields[key] ?? ""}
      onChange={(e) => set(key, e.target.value)}
      placeholder={placeholder}
      className={INPUT_CLS}
      style={{ left: L(x), top: T(y), width: `${widthPct}%` }}
    />
  );
}

function cb(
  fields: Record<string, string>,
  set: (k: string, v: string) => void,
  key: string,
  x: number,
  y: number,
  value = "yes",
) {
  const checked = fields[key] === value;
  return (
    <button
      key={key}
      type="button"
      onClick={() => set(key, checked ? "" : value)}
      className="absolute flex items-center justify-center w-[2%] h-[2%] border border-[rgba(0,100,200,0.4)] bg-[rgba(173,216,230,0.15)] rounded-[2px] hover:bg-[rgba(173,216,230,0.4)] focus:outline-none focus:ring-1 focus:ring-blue-400"
      style={{ left: L(x), top: TC(y) }}
      title={checked ? "Uncheck" : "Check"}
    >
      {checked && (
        <span className="text-[#0a0a1a] font-bold leading-none" style={{ fontSize: "clamp(5px,0.9vw,9px)" }}>✕</span>
      )}
    </button>
  );
}

function radioMethod(
  fields: Record<string, string>,
  set: (k: string, v: string) => void,
  value: "personal" | "substituted",
  x: number,
  y: number,
) {
  const checked = fields["serviceMethod"] === value;
  return (
    <button
      type="button"
      onClick={() => set("serviceMethod", value)}
      className="absolute flex items-center justify-center w-[2%] h-[2%] border border-[rgba(0,100,200,0.4)] bg-[rgba(173,216,230,0.15)] rounded-[2px] hover:bg-[rgba(173,216,230,0.4)] focus:outline-none"
      style={{ left: L(x), top: TC(y) }}
    >
      {checked && (
        <span className="text-[#0a0a1a] font-bold leading-none" style={{ fontSize: "clamp(5px,0.9vw,9px)" }}>✕</span>
      )}
    </button>
  );
}

// ── Convert UI field state → server body ────────────────────────────────────────
export function sc104FieldsToBody(f: Record<string, string>): Record<string, unknown> {
  const docsServed: string[] = [];
  if (f["docsServed_sc100"] === "yes") docsServed.push("sc100");
  if (f["docsServed_sc120"] === "yes") docsServed.push("sc120");
  if ((f["docsServedOther"] ?? "").trim()) docsServed.push("other");
  return { ...f, docsServed };
}

// ── Main modal ─────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  saving: boolean;
  downloadingForm: string | null;
  onSave: () => void;
  onSignAndDownload: () => void;
  onDownloadNoSig: () => void;
}

export function SC104PdfModal({
  open, onClose, fields, onChange, saving, downloadingForm, onSave, onSignAndDownload, onDownloadNoSig,
}: Props) {
  const [page, setPage] = useState<1 | 2>(1);
  const set = (k: string, v: string) => onChange({ ...fields, [k]: v });
  const busy = saving || downloadingForm === "sc104";

  const pageStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    aspectRatio: "612 / 792",
    display: "block",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none flex flex-col overflow-hidden gap-0"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      >
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d6b5e] text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm tracking-wide">SC-104 — Proof of Service</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Fill directly on the form below</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Page toggle */}
            <div className="flex rounded overflow-hidden border border-white/30 text-[11px] mr-2">
              <button onClick={() => setPage(1)} className={`px-3 py-1 transition-colors ${page === 1 ? "bg-white text-[#0d6b5e] font-semibold" : "text-white hover:bg-white/20"}`}>Page 1</button>
              <button onClick={() => setPage(2)} className={`px-3 py-1 transition-colors ${page === 2 ? "bg-white text-[#0d6b5e] font-semibold" : "text-white hover:bg-white/20"}`}>Page 2</button>
            </div>
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1 bg-white text-[#0d6b5e] hover:bg-gray-100"
              onClick={onSave} disabled={busy}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Save to System
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1 bg-[#14b8a6] hover:bg-[#0d9488] text-white"
              onClick={onSignAndDownload} disabled={busy}>
              {downloadingForm === "sc104" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}
              Sign &amp; Download
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-transparent text-white border-white/50 hover:bg-white/20"
              onClick={onDownloadNoSig} disabled={busy}>
              {downloadingForm === "sc104" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Download
            </Button>
            <button onClick={onClose} className="ml-1 p-1 rounded hover:bg-white/20 transition-colors">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── Scrollable form area ── */}
        <div className="flex-1 overflow-y-auto bg-gray-200 flex flex-col items-center py-4 gap-4">

          {/* ── Page 1 ── */}
          {page === 1 && (
            <div className="w-full max-w-3xl px-2">
              <div style={pageStyle} className="shadow-xl">
                <img src="/sc104-page1.png" alt="SC-104 Page 1" className="w-full h-auto block" draggable={false} />

                {/* Court info (right column, Items 2 / header area) */}
                {fi(fields, set, "courtStreet",      407, 552, 32, "Court street address")}
                {fi(fields, set, "caseNumber",        399, 465, 33, "Case number")}
                {fi(fields, set, "caseName",          407, 433, 32, "Plaintiff v. Defendant")}
                {fi(fields, set, "hearingDate",       460, 409, 14, "", "date")}
                {fi(fields, set, "hearingTime",       425, 385, 12, "9:00 a.m.")}
                {fi(fields, set, "hearingDept",       537, 385,  7, "97")}

                {/* Item 1 — who was served */}
                {fi(fields, set, "personServedName",  102, 438, 46, "Full name of person served")}
                {fi(fields, set, "businessName",       80, 385, 50, "Business or entity name")}
                {fi(fields, set, "authorizedPerson",   80, 369, 40, "Person authorized to accept")}
                {fi(fields, set, "authorizedTitle",   349, 369, 13, "Job title")}

                {/* Item 3 — documents served */}
                {cb(fields, set, "docsServed_sc100", 53, 298)}
                {cb(fields, set, "docsServed_sc120", 53, 279)}
                {cb(fields, set, "docsServedOther_check", 53, 108)}
                {fi(fields, set, "docsServedOther",  100, 108, 75, "Describe other documents")}
              </div>
            </div>
          )}

          {/* ── Page 2 ── */}
          {page === 2 && (
            <div className="w-full max-w-3xl px-2">
              <div style={pageStyle} className="shadow-xl">
                <img src="/sc104-page2.png" alt="SC-104 Page 2" className="w-full h-auto block" draggable={false} />

                {/* Page 2 header */}
                {fi(fields, set, "caseName",        106, 728, 49, "Case name")}
                {fi(fields, set, "caseNumber",      449, 739, 22, "Case number")}

                {/* Item 4a — Personal service radio */}
                {radioMethod(fields, set, "personal",     53, 677)}
                {/* 4a fields */}
                {fi(fields, set, "serviceDate",     142, 662, 20, "", "date")}
                {fi(fields, set, "serviceTime",     342, 662, 14, "2:30 p.m.")}
                {fi(fields, set, "serviceAddress",  160, 652, 44, "Street address")}
                {fi(fields, set, "serviceCity",     115, 638, 36, "City")}
                {fi(fields, set, "serviceState",    412, 638,  6, "CA")}
                {fi(fields, set, "serviceZip",      490, 638,  9, "Zip")}

                {/* Item 4b — Substituted service radio */}
                {radioMethod(fields, set, "substituted", 53, 603)}
                {/* 4b fields */}
                {fi(fields, set, "serviceDate",     170, 522, 20, "", "date")}
                {fi(fields, set, "serviceTime",     370, 522, 14, "2:30 p.m.")}
                {fi(fields, set, "serviceAddress",  133, 495, 45, "At this address")}
                {fi(fields, set, "serviceCity",     115, 453, 35, "City")}
                {fi(fields, set, "serviceState",    408, 453,  6, "CA")}
                {fi(fields, set, "serviceZip",      482, 453,  9, "Zip")}
                {fi(fields, set, "subPersonDesc",    80, 459, 82, "Name/description of person who received papers")}
                {fi(fields, set, "mailingDate",     235, 385, 18, "", "date")}
                {fi(fields, set, "mailingFrom",     425, 385, 22, "City, State")}

                {/* Item 5 — server info */}
                {fi(fields, set, "serverName",       85, 250, 50, "Server's full name")}
                {fi(fields, set, "serverPhone",     450, 250, 20, "Phone")}
                {fi(fields, set, "serverAddress",    95, 231, 77, "Street address")}
                {fi(fields, set, "serverCity",       95, 214, 42, "City")}
                {fi(fields, set, "serverState",     405, 214,  6, "CA")}
                {fi(fields, set, "serverZip",       472, 214,  9, "Zip")}
                {fi(fields, set, "serverFee",       145, 195, 12, "0.00")}

                {/* Item 6 — declaration */}
                {fi(fields, set, "signDate",         85, 105, 18, "", "date")}
                {fi(fields, set, "serverName",       63,  73, 42, "Server's printed name")}
              </div>
            </div>
          )}

        </div>

        {/* ── Footer tip ── */}
        <div className="shrink-0 bg-white border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <strong>Tip:</strong> Click any blue field to type directly into the form. Use <strong>Page 1</strong> for court info, who was served, and documents served. Use <strong>Page 2</strong> for how service was made and the server's information.
        </div>
      </DialogContent>
    </Dialog>
  );
}
