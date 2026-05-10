import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, X, Info, ChevronDown, ChevronUp, ExternalLink, AlertCircle } from "lucide-react";
import { sc104FieldsToBody } from "./sc104-utils";

interface Props {
  open: boolean;
  onClose: () => void;
  caseId: number;
  getToken: () => Promise<string | null>;
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  onSave: () => Promise<void>;
  prefilledKeys?: ReadonlySet<string>;
}

function Field({ label, id, value, onChange, placeholder, half = false }: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; half?: boolean;
}) {
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <Label htmlFor={id} className="text-[10px] font-medium text-muted-foreground mb-0.5 block">{label}</Label>
      <Input
        id={id} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-xs"
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="font-medium text-foreground">{value || <span className="italic text-muted-foreground">Not entered</span>}</span>
    </div>
  );
}

export function SC104PdfModal({ open, onClose, caseId, getToken, fields, onChange, onSave, prefilledKeys = new Set() }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [caseInfoExpanded, setCaseInfoExpanded] = useState(false);

  const hasCaseInfo = prefilledKeys.size > 0;
  const f = (key: string) => fields[key] ?? "";
  const set = (key: string) => (v: string) => onChange({ ...fields, [key]: v });

  useEffect(() => {
    if (!open) {
      setPdfError(null);
      setCaseInfoExpanded(false);
    }
  }, [open]);

  async function handleSaveAndOpen() {
    setSubmitting(true);
    setPdfError(null);
    try {
      // 1. Save server details to the database
      await onSave();
      // 2. Generate the filled PDF
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/forms/sc104`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(sc104FieldsToBody(fields)),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      // 3. Open in a new tab so the user can view, fill any remaining fields, save, and print
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      // 4. Close the modal — they're done here
      onClose();
    } catch {
      setPdfError("Something went wrong generating the PDF. Your data was saved — try the Download button on the form card.");
    } finally {
      setSubmitting(false);
    }
  }

  // Build summary strings from pre-filled fields
  const servedLine = f("businessName")
    ? [f("businessName"), f("authorizedPerson") && `c/o ${f("authorizedPerson")}`, f("authorizedTitle") && `(${f("authorizedTitle")})`].filter(Boolean).join(" ")
    : f("personServedName");
  const addressLine = [f("serviceAddress"), f("serviceCity"), f("serviceState"), f("serviceZip")].filter(Boolean).join(", ");
  const docsList = [
    f("docsServed_sc100") === "yes" ? "SC-100 Plaintiff's Claim" : "",
    f("docsServedOther") || "",
  ].filter(Boolean).join(" · ");

  // Progress: count how many server-entry fields are filled
  const serverKeys = ["serviceMethod", "serviceDate", "serverName", "serverPhone", "serverAddress", "serverCity", "serverState", "serverZip", "signDate"];
  const serverFilled = serverKeys.filter(k => (f(k) ?? "").trim()).length;
  const serverComplete = serverFilled === serverKeys.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none flex flex-col overflow-hidden gap-0"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d6b5e] text-white shrink-0 shadow-md gap-2">
          <span className="font-bold text-sm tracking-wide">SC-104 — Proof of Service</span>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/20" aria-label="Close">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* ── Form ── */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-4 space-y-4">

          {/* Case info summary card — read-only, collapsible */}
          {hasCaseInfo && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => setCaseInfoExpanded(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-teal-900">Case information filled from your intake</p>
                    <p className="text-[10px] text-teal-700 mt-0.5">
                      Serving <strong>{servedLine || "—"}</strong> · {docsList || "—"}
                    </p>
                  </div>
                </div>
                {caseInfoExpanded
                  ? <ChevronUp className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  : <ChevronDown className="h-3.5 w-3.5 text-teal-600 shrink-0" />}
              </button>
              {caseInfoExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-teal-200 space-y-2">
                  <SummaryRow label="Defendant" value={servedLine} />
                  {f("authorizedPerson") && (
                    <SummaryRow label="Authorized agent" value={`${f("authorizedPerson")}${f("authorizedTitle") ? ` (${f("authorizedTitle")})` : ""}`} />
                  )}
                  <SummaryRow label="Documents" value={docsList} />
                  <SummaryRow label="Serve-to address" value={addressLine} />
                  <p className="text-[10px] text-teal-700 pt-1">
                    Need to correct something? Update it in your <strong>Intake</strong> tab and re-open this form.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress indicator */}
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${serverComplete ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            {serverComplete
              ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              : <Info className="h-4 w-4 text-amber-500 shrink-0" />}
            <p className={`text-xs ${serverComplete ? "text-green-800" : "text-amber-800"}`}>
              {serverComplete
                ? "All server details complete — click Save & Open PDF below."
                : "Fill in the server details below, then click Save & Open PDF."}
            </p>
          </div>

          {/* ── How were the papers delivered? ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground border-b pb-1">How Were the Papers Delivered?</h3>
            <div className="flex flex-col gap-2 text-xs">
              <label className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <input type="radio" name="serviceMethod" value="personal"
                  checked={f("serviceMethod") === "personal"}
                  onChange={() => set("serviceMethod")("personal")}
                  className="mt-0.5" />
                <div>
                  <p className="font-medium">Personal service</p>
                  <p className="text-muted-foreground text-[10px]">Handed directly to the defendant</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <input type="radio" name="serviceMethod" value="substituted"
                  checked={f("serviceMethod") === "substituted"}
                  onChange={() => set("serviceMethod")("substituted")}
                  className="mt-0.5" />
                <div>
                  <p className="font-medium">Substituted service</p>
                  <p className="text-muted-foreground text-[10px]">Left with a responsible adult at their home or workplace</p>
                </div>
              </label>
            </div>
            {f("serviceMethod") === "substituted" && (
              <Field
                label="Who were the papers left with? (name or description)"
                id="subPersonDesc" value={f("subPersonDesc")} onChange={set("subPersonDesc")}
                placeholder="e.g. Jane Doe, co-worker"
              />
            )}
            <Field label="Date served" id="serviceDate" value={f("serviceDate")} onChange={set("serviceDate")} placeholder="MM/DD/YYYY" />
          </section>

          {/* ── Who served the papers? ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground border-b pb-1">Who Served the Papers?</h3>
            <p className="text-[10px] text-muted-foreground">Must be someone other than you — a friend, family member, or process server aged 18 or older.</p>
            <div className="flex gap-2">
              <Field label="Server's full name" id="serverName" value={f("serverName")} onChange={set("serverName")} placeholder="Full name" half />
              <Field label="Phone number" id="serverPhone" value={f("serverPhone")} onChange={set("serverPhone")} placeholder="Phone" half />
            </div>
            <Field label="Server's street address" id="serverAddress" value={f("serverAddress")} onChange={set("serverAddress")} placeholder="Street address" />
            <div className="flex gap-2">
              <Field label="City" id="serverCity" value={f("serverCity")} onChange={set("serverCity")} placeholder="City" half />
              <Field label="State" id="serverState" value={f("serverState")} onChange={set("serverState")} placeholder="CA" half />
              <Field label="Zip" id="serverZip" value={f("serverZip")} onChange={set("serverZip")} placeholder="Zip" half />
            </div>
            <Field label="Fee for service (enter 0 if none)" id="serverFee" value={f("serverFee")} onChange={set("serverFee")} placeholder="0.00" />
          </section>

          {/* ── Declaration date ── */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground border-b pb-1">Declaration Date</h3>
            <p className="text-[10px] text-muted-foreground">The date the server signs — must be after service was completed.</p>
            <Field label="Date signed" id="signDate" value={f("signDate")} onChange={set("signDate")} placeholder="MM/DD/YYYY" />
          </section>

          {/* ── Error ── */}
          {pdfError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">{pdfError}</p>
            </div>
          )}

          {/* ── Save & Open PDF ── */}
          <div className="pt-2 pb-6 space-y-2">
            <Button
              className="w-full bg-[#0d6b5e] hover:bg-[#0a5549] text-white gap-2"
              onClick={handleSaveAndOpen}
              disabled={submitting}
            >
              {submitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ExternalLink className="h-4 w-4" />}
              {submitting ? "Saving & generating PDF…" : "Save & Open PDF"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Saves your data, then opens the filled SC-104 in a new tab — print or save from there.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
