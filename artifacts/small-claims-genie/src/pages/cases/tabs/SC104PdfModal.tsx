import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, X, Info, FileText, Pencil, ChevronDown, ChevronUp } from "lucide-react";

// Convert UI field state → server body format
export function sc104FieldsToBody(f: Record<string, string>): Record<string, unknown> {
  const docsServed: string[] = [];
  if (f["docsServed_sc100"] === "yes") docsServed.push("sc100");
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
  prefilledKeys?: ReadonlySet<string>;
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

/** A read-only row in the case summary card */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="font-medium text-foreground">{value || <span className="text-muted-foreground italic">Not entered</span>}</span>
    </div>
  );
}

export function SC104PdfModal({ open, onClose, caseId, getToken, fields, onChange, saving, onSave, prefilledKeys = new Set() }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [caseInfoExpanded, setCaseInfoExpanded] = useState(false);
  const [sameAddress, setSameAddress] = useState(true);
  const blankFormUrl = `${import.meta.env.BASE_URL}sc104-form.pdf`;

  const hasData = Object.keys(fields).some(k => (fields[k] ?? "").trim());
  const hasCaseInfo = prefilledKeys.size > 0;

  const f = (key: string) => fields[key] ?? "";
  const set = (key: string) => (v: string) => onChange({ ...fields, [key]: v });

  // When "same address" is toggled on, copy defendant's address back into service address fields
  function handleSameAddressToggle(checked: boolean) {
    setSameAddress(checked);
    if (checked) {
      onChange({
        ...fields,
        serviceAddress: fields["serviceAddress"] ?? "",
        serviceCity: fields["serviceCity"] ?? "",
        serviceState: fields["serviceState"] ?? "",
        serviceZip: fields["serviceZip"] ?? "",
      });
    }
  }

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

  useEffect(() => {
    if (open) {
      setMode("edit");
      // If defendant's address is in the pre-filled fields, default to "same address"
      setSameAddress(true);
    }
    if (!open) {
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      setMode("view");
      setCaseInfoExpanded(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    // If "same address" is still selected, ensure service address fields carry the pre-filled values
    await onSave();
    await fetchPreview();
    setMode("view");
  }

  const objectSrc = previewUrl ?? blankFormUrl;

  // Build a human-readable "who is being served" line
  const servedLine = f("businessName")
    ? [f("businessName"), f("authorizedPerson") && `c/o ${f("authorizedPerson")}`, f("authorizedTitle") && `(${f("authorizedTitle")})`].filter(Boolean).join(" ")
    : f("personServedName");

  // Build a human-readable address line
  const addressLine = [f("serviceAddress"), f("serviceCity"), f("serviceState"), f("serviceZip")].filter(Boolean).join(", ");

  // Build documents line
  const docsList = [
    f("docsServed_sc100") === "yes" ? "SC-100 Plaintiff's Claim" : "",
    f("docsServedOther") || "",
  ].filter(Boolean).join(" · ");

  // Server progress
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
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d6b5e] text-white shrink-0 shadow-md gap-2 flex-wrap">
          <span className="font-bold text-sm tracking-wide whitespace-nowrap">SC-104 — Proof of Service</span>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
                Save &amp; Preview
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
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 border-t border-border px-4 py-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0 text-[#0d6b5e]" />
              <span>
                {hasData
                  ? "Your data is shown on the form. Switch to \"Enter Details\" to edit it."
                  : "Switch to \"Enter Details\" to fill in the server details."}
              </span>
            </div>
          </div>
        )}

        {/* ── Edit mode ── */}
        {mode === "edit" && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-4 space-y-4">

            {/* ── Case info summary card (read-only, collapsible) ── */}
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
                      <p className="text-[10px] text-teal-700 mt-0.5">Serving <strong>{servedLine || "—"}</strong> · {docsList || "—"}</p>
                    </div>
                  </div>
                  {caseInfoExpanded
                    ? <ChevronUp className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    : <ChevronDown className="h-3.5 w-3.5 text-teal-600 shrink-0" />}
                </button>

                {caseInfoExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-teal-200 space-y-2">
                    <SummaryRow label="Defendant" value={servedLine} />
                    {f("authorizedPerson") && <SummaryRow label="Authorized agent" value={`${f("authorizedPerson")}${f("authorizedTitle") ? ` (${f("authorizedTitle")})` : ""}`} />}
                    <SummaryRow label="Documents" value={docsList} />
                    <SummaryRow label="Serve-to address" value={addressLine} />
                    <p className="text-[10px] text-teal-700 pt-1">
                      Need to correct something? Update it in your <strong>Intake</strong> tab and re-open this form.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Server completion progress ── */}
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${serverComplete ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
              {serverComplete
                ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                : <Info className="h-4 w-4 text-amber-500 shrink-0" />}
              <p className={`text-xs ${serverComplete ? "text-green-800" : "text-amber-800"}`}>
                {serverComplete
                  ? "All server details complete. Click Save & Preview to generate the form."
                  : `Complete the fields below — the person who served the papers fills these in.`}
              </p>
            </div>

            {/* ── How service was made ── */}
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
                    <p className="text-muted-foreground text-[10px]">Left with a responsible adult at home or workplace</p>
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

              {/* Address toggle */}
              {hasCaseInfo && addressLine ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={sameAddress} onChange={e => handleSameAddressToggle(e.target.checked)} className="h-3.5 w-3.5 rounded" />
                    Service was at the defendant's address: <span className="font-medium">{addressLine}</span>
                  </label>
                  {!sameAddress && (
                    <div className="space-y-2 pl-5 border-l-2 border-muted">
                      <Field label="Actual address where served" id="serviceAddress" value={f("serviceAddress")} onChange={set("serviceAddress")} placeholder="Street address" />
                      <div className="flex gap-2">
                        <Field label="City" id="serviceCity" value={f("serviceCity")} onChange={set("serviceCity")} placeholder="City" half />
                        <Field label="State" id="serviceState" value={f("serviceState")} onChange={set("serviceState")} placeholder="CA" half />
                        <Field label="Zip" id="serviceZip" value={f("serviceZip")} onChange={set("serviceZip")} placeholder="Zip" half />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Field label="Address where served" id="serviceAddress" value={f("serviceAddress")} onChange={set("serviceAddress")} placeholder="Street address" />
                  <div className="flex gap-2">
                    <Field label="City" id="serviceCity" value={f("serviceCity")} onChange={set("serviceCity")} placeholder="City" half />
                    <Field label="State" id="serviceState" value={f("serviceState")} onChange={set("serviceState")} placeholder="CA" half />
                    <Field label="Zip" id="serviceZip" value={f("serviceZip")} onChange={set("serviceZip")} placeholder="Zip" half />
                  </div>
                </div>
              )}
            </section>

            {/* ── Server's information ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">Who Served the Papers?</h3>
              <p className="text-[10px] text-muted-foreground">This must be someone other than you — a friend, family member, or process server over 18.</p>
              <div className="flex gap-2">
                <Field label="Server's full name" id="serverName" value={f("serverName")} onChange={set("serverName")} placeholder="Name" half />
                <Field label="Phone number" id="serverPhone" value={f("serverPhone")} onChange={set("serverPhone")} placeholder="Phone" half />
              </div>
              <Field label="Server's street address" id="serverAddress" value={f("serverAddress")} onChange={set("serverAddress")} placeholder="Street address" />
              <div className="flex gap-2">
                <Field label="City" id="serverCity" value={f("serverCity")} onChange={set("serverCity")} placeholder="City" half />
                <Field label="State" id="serverState" value={f("serverState")} onChange={set("serverState")} placeholder="CA" half />
                <Field label="Zip" id="serverZip" value={f("serverZip")} onChange={set("serverZip")} placeholder="Zip" half />
              </div>
              <Field label="Fee for service (enter 0 if no fee)" id="serverFee" value={f("serverFee")} onChange={set("serverFee")} placeholder="0.00" />
            </section>

            {/* ── Signature date ── */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">Declaration Date</h3>
              <p className="text-[10px] text-muted-foreground">The date the server signs the form — must be after service was completed.</p>
              <Field label="Date signed" id="signDate" value={f("signDate")} onChange={set("signDate")} placeholder="MM/DD/YYYY" />
            </section>

            <div className="pt-2 pb-6">
              <Button
                className="w-full bg-[#0d6b5e] hover:bg-[#0a5549] text-white gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save &amp; Preview Form
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Generates a preview of the filled SC-104. Use the card buttons to sign and download.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
