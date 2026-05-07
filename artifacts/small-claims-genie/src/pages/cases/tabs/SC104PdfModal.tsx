import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, X, Info, FileText, Pencil } from "lucide-react";

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
  caseId: number;
  getToken: () => Promise<string | null>;
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  saving: boolean;
  onSave: () => Promise<void>;
}

function Field({ label, id, value, onChange, placeholder, type = "text", half = false }: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; half?: boolean;
}) {
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <Label htmlFor={id} className="text-[10px] font-medium text-muted-foreground mb-0.5 block">{label}</Label>
      <Input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-xs"
      />
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-3.5 w-3.5 rounded" />
      {label}
    </label>
  );
}

export function SC104PdfModal({ open, onClose, caseId, getToken, fields, onChange, saving, onSave }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const blankFormUrl = `${import.meta.env.BASE_URL}sc104-form.pdf`;

  const hasData = Object.keys(fields).some(k => (fields[k] ?? "").trim());

  const f = (key: string) => fields[key] ?? "";
  const set = (key: string) => (v: string) => onChange({ ...fields, [key]: v });
  const setCheck = (key: string) => (v: boolean) => onChange({ ...fields, [key]: v ? "yes" : "" });

  // Fetch a server-generated pre-filled PDF preview
  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const token = await getToken();
      const body = sc104FieldsToBody(fields);
      const res = await fetch(`/api/cases/${caseId}/forms/sc104`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Preview failed");
      const blob = await res.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setPreviewUrl(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [caseId, getToken, fields]); // eslint-disable-line react-hooks/exhaustive-deps

  // On open: if we have saved data, generate a preview; otherwise show blank form
  useEffect(() => {
    if (open && hasData) {
      fetchPreview();
    }
    if (!open) {
      // clean up blob URL when modal closes
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      setMode("view");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    await onSave();
    // After saving, regenerate the preview to reflect saved data
    await fetchPreview();
    setMode("view");
  }

  const objectSrc = previewUrl ?? blankFormUrl;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none flex flex-col overflow-hidden gap-0"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d6b5e] text-white shrink-0 shadow-md gap-2 flex-wrap">
          <span className="font-bold text-sm tracking-wide whitespace-nowrap">SC-104 — Proof of Service</span>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Mode toggle */}
            <div className="flex rounded-md border border-white/30 overflow-hidden text-[11px]">
              <button
                onClick={() => { setMode("view"); if (hasData && !previewUrl) fetchPreview(); }}
                className={`px-3 py-1 flex items-center gap-1 transition-colors ${mode === "view" ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
              >
                <FileText className="h-3 w-3" /> View Form
              </button>
              <button
                onClick={() => setMode("edit")}
                className={`px-3 py-1 flex items-center gap-1 transition-colors ${mode === "edit" ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
              >
                <Pencil className="h-3 w-3" /> Enter Details
              </button>
            </div>
            {mode === "edit" && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Save to System
              </Button>
            )}
            {mode === "view" && hasData && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-[#14b8a6]" /> Data saved
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-white/20" aria-label="Close">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── View mode: PDF ── */}
        {mode === "view" && (
          <div className="flex-1 min-h-0 bg-gray-300 relative">
            {loadingPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#0d6b5e]" />
              </div>
            )}
            <object
              key={objectSrc}
              data={objectSrc}
              type="application/pdf"
              className="w-full h-full block"
              aria-label="SC-104 Proof of Service form"
            >
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                <Info className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground max-w-sm">Your browser cannot display the PDF inline.</p>
                <a href={objectSrc} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">Open SC-104 Form in New Tab</Button>
                </a>
              </div>
            </object>
            {/* Footer tip */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 border-t border-border px-4 py-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0 text-[#0d6b5e]" />
              <span>
                {hasData
                  ? "This is your saved data. Switch to \u201cEnter Details\u201d to edit it, or use the card buttons to sign and download."
                  : "Switch to \u201cEnter Details\u201d to fill in the form details and save them to your case."}
              </span>
            </div>
          </div>
        )}

        {/* ── Edit mode: form inputs ── */}
        {mode === "edit" && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-4 space-y-5">
            <p className="text-xs text-muted-foreground">
              Fill in the details below. Click <strong>Save to System</strong> to store your data — it will be remembered next time you open this form.
            </p>

            {/* ── Section 1: Who is being served ── */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">1 — Who Is Being Served</h3>
              <Field label="1a. Name of person being served" id="personServedName" value={f("personServedName")} onChange={set("personServedName")} placeholder="Full legal name" />
              <p className="text-[10px] text-muted-foreground pt-1">— OR if serving a business or entity —</p>
              <Field label="1b. Business or agency name" id="businessName" value={f("businessName")} onChange={set("businessName")} placeholder="Business name" />
              <div className="flex gap-2">
                <Field label="Person authorized for service" id="authorizedPerson" value={f("authorizedPerson")} onChange={set("authorizedPerson")} placeholder="Name" half />
                <Field label="Job title" id="authorizedTitle" value={f("authorizedTitle")} onChange={set("authorizedTitle")} placeholder="Title" half />
              </div>
            </section>

            {/* ── Section 3: Documents served ── */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">3 — Documents Served</h3>
              <Check label="SC-100, Plaintiff's Claim and ORDER" checked={f("docsServed_sc100") === "yes"} onChange={setCheck("docsServed_sc100")} />
              <Check label="SC-120, Defendant's Claim and ORDER" checked={f("docsServed_sc120") === "yes"} onChange={setCheck("docsServed_sc120")} />
              <Field label="Other (describe)" id="docsServedOther" value={f("docsServedOther")} onChange={set("docsServedOther")} placeholder="Other documents served" />
            </section>

            {/* ── Section 4: How service was made ── */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">4 — How Service Was Made</h3>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="serviceMethod" value="personal" checked={f("serviceMethod") === "personal"} onChange={() => set("serviceMethod")("personal")} />
                  Personal service (handed directly)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="serviceMethod" value="substituted" checked={f("serviceMethod") === "substituted"} onChange={() => set("serviceMethod")("substituted")} />
                  Substituted service
                </label>
              </div>
              <div className="flex gap-2">
                <Field label="Date served" id="serviceDate" value={f("serviceDate")} onChange={set("serviceDate")} placeholder="MM/DD/YYYY" half />
                <Field label="Time served" id="serviceTime" value={f("serviceTime")} onChange={set("serviceTime")} placeholder="e.g. 2:30 p.m." half />
              </div>
              <Field label="Address where served" id="serviceAddress" value={f("serviceAddress")} onChange={set("serviceAddress")} placeholder="Street address" />
              <div className="flex gap-2">
                <Field label="City" id="serviceCity" value={f("serviceCity")} onChange={set("serviceCity")} placeholder="City" half />
                <Field label="State" id="serviceState" value={f("serviceState")} onChange={set("serviceState")} placeholder="CA" half />
                <Field label="Zip" id="serviceZip" value={f("serviceZip")} onChange={set("serviceZip")} placeholder="Zip" half />
              </div>
              {f("serviceMethod") === "substituted" && (
                <Field label="Name/description of person papers left with" id="subPersonDesc" value={f("subPersonDesc")} onChange={set("subPersonDesc")} placeholder="Description of person" />
              )}
            </section>

            {/* ── Section 5: Server's information ── */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">5 — Server's Information</h3>
              <div className="flex gap-2">
                <Field label="Server's name" id="serverName" value={f("serverName")} onChange={set("serverName")} placeholder="Full name of server" half />
                <Field label="Phone" id="serverPhone" value={f("serverPhone")} onChange={set("serverPhone")} placeholder="Phone number" half />
              </div>
              <Field label="Server's address" id="serverAddress" value={f("serverAddress")} onChange={set("serverAddress")} placeholder="Street address" />
              <div className="flex gap-2">
                <Field label="City" id="serverCity" value={f("serverCity")} onChange={set("serverCity")} placeholder="City" half />
                <Field label="State" id="serverState" value={f("serverState")} onChange={set("serverState")} placeholder="CA" half />
                <Field label="Zip" id="serverZip" value={f("serverZip")} onChange={set("serverZip")} placeholder="Zip" half />
              </div>
              <Field label="Fee for service ($)" id="serverFee" value={f("serverFee")} onChange={set("serverFee")} placeholder="0.00" />
            </section>

            {/* ── Section 6: Declaration date ── */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">6 — Declaration Date</h3>
              <Field label="Date signed" id="signDate" value={f("signDate")} onChange={set("signDate")} placeholder="MM/DD/YYYY" />
            </section>

            <div className="pt-2 pb-6">
              <Button
                className="w-full bg-[#0d6b5e] hover:bg-[#0a5549] text-white gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save to System
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                After saving, switch to <strong>View Form</strong> to see your data on the official SC-104.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
