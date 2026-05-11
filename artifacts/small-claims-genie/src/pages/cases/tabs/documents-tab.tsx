import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  useListDocuments,
  useUploadDocument,
  useDeleteDocument,
  useGetCase,
  getListDocumentsQueryKey,
  getGetCaseReadinessQueryKey,
  getListCasesQueryKey,
  getGetCaseStatsQueryKey,
  getGetCaseQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { FileText, Paperclip, Trash2, Eye, ClipboardList, CheckSquare2, Square, AlertCircle, Play, X, ChevronRight, Sparkles, Scale } from "lucide-react";
import { i18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { DocumentWithMeta } from "@/lib/types";

// ─── DocTile ─────────────────────────────────────────────────────────────────
function DocTile({ doc, caseId, onDelete, deleting, getToken, onSaved }: {
  doc: DocumentWithMeta;
  caseId: number;
  onDelete: () => void;
  deleting: boolean;
  getToken: () => Promise<string | null>;
  onSaved: () => void;
}) {
  const [label] = useState(doc.label || doc.filename || "");
  const [description, setDescription] = useState(doc.description || "");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(doc.description || "");

  const uploadDate = doc.createdAt
    ? new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const save = async (nextDesc: string) => {
    if (nextDesc === lastSavedRef.current) return;
    lastSavedRef.current = nextDesc;
    setSaving(true);
    try {
      const token = await getToken();
      await fetch(`/api/cases/${caseId}/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ label, description: nextDesc }),
      });
      onSaved();
    } catch { /* silent */ }
    setSaving(false);
  };

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void save(description); }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [description]);

  const handleView = async () => {
    if (viewing) return;
    setViewing(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/documents/${doc.id}/file`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load document");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch { /* silent */ }
    setViewing(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="min-w-0 text-sm font-medium truncate">{label}</p>
          {uploadDate && <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">Uploaded {uploadDate}</span>}
          {saving && <span className="text-[10px] text-muted-foreground shrink-0">saving…</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground shrink-0 select-none">Evidence Name</span>
          <input
            className="flex-1 min-w-0 text-xs text-foreground/60 bg-transparent border-b border-transparent hover:border-muted-foreground/40 focus:border-primary/60 focus:outline-none transition-colors placeholder:text-foreground/40"
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
            maxLength={120}
            placeholder="Enter name for this document…"
          />
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={handleView}
          disabled={viewing}
          aria-label="View document"
          title="View document"
        >
          <Eye className={`h-4 w-4 ${viewing ? "animate-pulse" : ""}`} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} disabled={deleting} aria-label="Delete document">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────────────
export function DocumentsTab({ caseId, evidenceChecklist: evidenceChecklistProp, onNext, advisorTrigger }: {
  caseId: number;
  evidenceChecklist: { id: string; item: string; description: string; checked?: boolean }[];
  onNext?: () => void;
  advisorTrigger?: number;
}) {
  const { data: documents } = useListDocuments(caseId, { query: { enabled: !!caseId } });
  const { data: liveCase } = useGetCase(caseId, { query: { enabled: !!caseId } });
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();

  // Always prefer the live server data; fall back to the prop on initial render before the query resolves
  const evidenceChecklist = (
    (liveCase as any)?.evidenceChecklist as { id: string; item: string; description: string; checked?: boolean }[] | null | undefined
  ) ?? evidenceChecklistProp;

  const [activeTab, setActiveTab] = useState<"checklist" | "uploads">("checklist");
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    () => new Set(evidenceChecklistProp.filter(i => i.checked).map(i => i.id))
  );

  // Sync checked state whenever the live query delivers fresh data (e.g. returning to this tab)
  // but skip updates while a save is in flight to avoid overwriting optimistic state.
  const savingRef = useRef(false);
  useEffect(() => {
    if (savingRef.current) return;
    setCheckedItems(new Set(evidenceChecklist.filter(i => i.checked).map(i => i.id)));
  }, [evidenceChecklist]);

  // Keep a ref to the latest checked state so toggleItem can read it without a stale closure
  const checkedItemsRef = useRef(checkedItems);
  checkedItemsRef.current = checkedItems;

  const saveChecked = useCallback(async (next: Set<string>) => {
    savingRef.current = true;
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/advisor/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ checkedIds: Array.from(next) }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
      }
    } catch { /* network error — optimistic state stays, will sync on next load */ }
    finally { savingRef.current = false; }
  }, [caseId, getToken, queryClient]);

  const toggleItem = useCallback((id: string) => {
    const next = new Set(checkedItemsRef.current);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setCheckedItems(next);
    void saveChecked(next);
  }, [saveChecked]);

  const deleteChecklistItem = async (itemId: string) => {
    try {
      const token = await getToken();
      await fetch(`/api/cases/${caseId}/advisor/checklist/${itemId}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
    } catch { /* silent */ }
  };

  const invalidateDocAndScore = () => {
    queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getGetCaseReadinessQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCaseStatsQueryKey() });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    e.target.value = "";
    try {
      await uploadDoc.mutateAsync({ id: caseId, data: { file, label: file.name } });
      invalidateDocAndScore();
      toast({ title: "Document uploaded", description: "OCR text extraction is running in the background." });
      setActiveTab("uploads");
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : null) ?? "Upload failed — please try again.";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = (docId: number) => {
    deleteDoc.mutate({ id: caseId, docId }, { onSuccess: () => { invalidateDocAndScore(); } });
  };

  // ─── Inline AI Advisor ────────────────────────────────────────────────────
  type AdvisorPhase = "idle" | "analyzing" | "results";
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorPhase, setAdvisorPhase] = useState<AdvisorPhase>("idle");
  const [advisorQuestions, setAdvisorQuestions] = useState<{ id: string; question: string }[]>([]);
  const [advisorChecklist, setAdvisorChecklist] = useState<{ id: string; item: string; description: string }[]>([]);
  const [advisorChecked, setAdvisorChecked] = useState<Set<string>>(new Set());
  const [advisorTruncatedDocs, setAdvisorTruncatedDocs] = useState<string[]>([]);
  const [advisorLegalAlert, setAdvisorLegalAlert] = useState("");

  const openAdvisor = useCallback(async () => {
    setAdvisorOpen(true);
    setAdvisorPhase("analyzing");
    setAdvisorQuestions([]);
    setAdvisorChecklist([]);
    setAdvisorChecked(new Set());
    setAdvisorTruncatedDocs([]);
    setAdvisorLegalAlert("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/cases/${caseId}/advisor/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAdvisorQuestions(data.questions || []);
      setAdvisorChecklist(data.evidenceChecklist || []);
      setAdvisorTruncatedDocs(data.truncatedDocs || []);
      setAdvisorLegalAlert(typeof data.legalAlert === "string" ? data.legalAlert : "");
      setAdvisorPhase("results");
      // Refresh the case so the new checklist appears in the Documents tab immediately
      queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
    } catch {
      toast({ title: "Advisor error", description: "Could not analyze your case. Please try again.", variant: "destructive" });
      setAdvisorPhase("idle");
      setAdvisorOpen(false);
    }
  }, [caseId, getToken, toast, queryClient]);

  // Open advisor when workspace sticky bar button increments the trigger
  const prevTriggerRef = useRef(0);
  useEffect(() => {
    if (!advisorTrigger || advisorTrigger === prevTriggerRef.current) return;
    prevTriggerRef.current = advisorTrigger;
    void openAdvisor();
  }, [advisorTrigger, openAdvisor]);

  const toggleAdvisorItem = (id: string) => {
    setAdvisorChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      void (async () => {
        try {
          const token = await getToken();
          await fetch(`/api/cases/${caseId}/advisor/checklist`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ checkedIds: Array.from(next) }),
          });
          queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
        } catch { /* non-critical */ }
      })();
      return next;
    });
  };

  const uploadCount = documents?.length ?? 0;
  const checklistCount = evidenceChecklist.length;

  return (
    <div className="px-4 pt-3 pb-4 md:px-6 md:pb-6">
      <div className="flex gap-4 items-start">

        {/* Left: all tab content */}
        <div className="flex-1 min-w-0 space-y-4">

      {/* Sub-tabs + Upload button — same row */}
      <div className="flex items-center gap-6">
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleUpload} />
        <button
          type="button"
          onClick={() => setActiveTab("checklist")}
          className={`flex flex-1 items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all border-2 shadow-sm justify-center ${
            activeTab === "checklist"
              ? "bg-[#f0fffe] text-[#0d6b5e] border-[#0d6b5e] shadow-[#0d6b5e]/20 shadow-md"
              : "bg-background text-muted-foreground border-muted-foreground/25 hover:border-[#0d6b5e]/50 hover:text-[#0d6b5e] hover:bg-[#f0fffe]/50"
          }`}
        >
          <ClipboardList className="h-6 w-6 shrink-0" />
          <span>
            <span className={`block text-[10px] font-medium uppercase tracking-wider mb-0.5 ${activeTab === "checklist" ? "text-[#0d6b5e]" : "text-muted-foreground/60"}`}>Click here</span>
            Document Checklist
          </span>
          {checklistCount > 0 && (
            <span className={`ml-auto text-[11px] rounded-full px-1.5 py-0.5 font-semibold ${
              activeTab === "checklist" ? "bg-[#0d6b5e]/15 text-[#0d6b5e]" : "bg-muted text-muted-foreground"
            }`}>
              {checkedItems.size}/{checklistCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("uploads")}
          className={`flex flex-1 items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all border-2 shadow-sm justify-center ${
            activeTab === "uploads"
              ? "bg-[#f0fffe] text-[#0d6b5e] border-[#0d6b5e] shadow-[#0d6b5e]/20 shadow-md"
              : "bg-background text-muted-foreground border-muted-foreground/25 hover:border-[#0d6b5e]/50 hover:text-[#0d6b5e] hover:bg-[#f0fffe]/50"
          }`}
        >
          <FileText className="h-6 w-6 shrink-0" />
          <span>
            <span className={`block text-[10px] font-medium uppercase tracking-wider mb-0.5 ${activeTab === "uploads" ? "text-[#0d6b5e]" : "text-muted-foreground/60"}`}>Click here</span>
            My Uploads
          </span>
          {uploadCount > 0 && (
            <span className={`ml-auto text-[11px] rounded-full px-1.5 py-0.5 font-semibold ${
              activeTab === "uploads" ? "bg-[#0d6b5e]/15 text-[#0d6b5e]" : "bg-muted text-muted-foreground"
            }`}>
              {uploadCount}
            </span>
          )}
        </button>
        <Button className="ml-auto shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploadDoc.isPending} data-testid="button-upload-doc">
          <Paperclip className="h-4 w-4 mr-2" />
          {uploadDoc.isPending ? i18n.documents.processing : i18n.documents.uploadBtn}
        </Button>
      </div>

      {/* ── Checklist Tab ── */}
      {activeTab === "checklist" && (
        <div>
          {evidenceChecklist.length === 0 ? (
            <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 p-8 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-semibold text-sm text-foreground">No checklist yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Click the button below — the AI Genie will analyze your case and generate a document checklist for you.</p>
              <Button
                type="button"
                size="lg"
                onClick={() => void openAdvisor()}
                className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
              >
                <Sparkles className="h-4 w-4" /> AI Genie Check My Case
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-[#a8e6df] bg-[#f0fffe] p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="h-4 w-4 text-[#0d6b5e]" />
                <h3 className="font-semibold text-sm text-[#0d6b5e]">Your Document Checklist</h3>
                <span className="text-xs text-muted-foreground ml-auto">{checkedItems.size}/{evidenceChecklist.length} gathered</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Check off each document as you gather it, then upload it using the button above.</p>
              <div className="space-y-2">
                {evidenceChecklist.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 rounded-lg border border-[#a8e6df] bg-white p-3">
                    <button type="button" onClick={() => toggleItem(item.id)} className="flex items-start gap-3 flex-1 text-left hover:bg-[#ddf6f3]/40 transition-colors rounded">
                      <div className="mt-0.5 shrink-0 text-[#0d6b5e]">
                        {checkedItems.has(item.id) ? <CheckSquare2 className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${checkedItems.has(item.id) ? "line-through text-muted-foreground" : ""}`}>{item.item}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => deleteChecklistItem(item.id)} className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" aria-label="Remove from checklist">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Uploads Tab ── */}
      {activeTab === "uploads" && (
        <div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Don't forget:</span> Upload any documents, photos, screenshots, or images relevant to your case — even if they're not on the checklist.
            </p>
          </div>

          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg px-5 py-4 mb-6 bg-muted/5 cursor-pointer hover:border-primary/40 transition-colors flex items-center gap-4"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="shrink-0 w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Drag and drop files here</p>
              <p className="text-xs text-muted-foreground">Contracts, receipts, photos, texts, emails, invoices — anything related to your case</p>
            </div>
            <Button variant="outline" type="button" className="shrink-0" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse Files</Button>
          </div>

          <div className="space-y-3">
            {documents?.map((doc: DocumentWithMeta) => (
              <DocTile
                key={doc.id}
                doc={doc}
                caseId={caseId}
                onDelete={() => handleDelete(doc.id)}
                deleting={deleteDoc.isPending}
                getToken={getToken}
                onSaved={invalidateDocAndScore}
              />
            ))}
            {(!documents || documents.length === 0) && (
              <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 p-6 mt-2">
                <div className="flex flex-col items-center gap-3 text-center mb-5">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary/60" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">No documents uploaded yet</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">The AI Genie reads your documents and uses them to answer questions. Upload everything you have — more is better.</p>
                  </div>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">Documents that win small claims cases</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { icon: "📄", label: "Contracts & agreements", sub: "Written or signed" },
                    { icon: "🧾", label: "Receipts & invoices", sub: "Proof of payment" },
                    { icon: "📷", label: "Photos & videos", sub: "Damage or condition" },
                    { icon: "💬", label: "Texts & emails", sub: "Screenshots work" },
                    { icon: "🏦", label: "Bank statements", sub: "Transfers & charges" },
                    { icon: "📬", label: "Prior demand letters", sub: "If you sent one" },
                  ].map(({ icon, label, sub }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 px-3 py-2.5 text-left transition-colors"
                    >
                      <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                      <div>
                        <p className="text-[12px] font-medium text-foreground leading-tight">{label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-4">Click any card or use the Browse Files button above — PDFs, images, and Word docs all accepted</p>
              </div>
            )}
          </div>
        </div>
      )}

        </div>{/* end left column */}

        {/* Right: video tutorial card — matches Step 2 style exactly */}
        <div
          onClick={() => setTutorialOpen(true)}
          className="cursor-pointer group flex-shrink-0 w-[220px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
          title="Watch the tutorial for this step"
        >
          <div className="relative bg-[#0f2537] h-[120px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
                <Play className="w-[18px] h-[18px] text-white ml-1" fill="white" />
              </div>
              <span className="text-white text-xs font-semibold opacity-90">Watch Tutorial</span>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">~3 min</div>
            <div className="absolute top-2 left-2 bg-[#14b8a6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Step 3</div>
          </div>
          <div className="bg-background px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold">Upload Evidence</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Docs, photos &amp; files</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#14b8a6] shrink-0" />
          </div>
        </div>

      </div>{/* end flex row */}

      {/* ── Save & Continue ── */}
      {onNext && (
        <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
          <Button
            onClick={onNext}
            className="bg-[#0d6b5e] hover:bg-[#0a5449] text-white gap-2 px-6"
          >
            Save &amp; Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Tutorial modal ── */}
      {tutorialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setTutorialOpen(false)}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-[840px] mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b bg-[#f8fffe]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#14b8a6] flex items-center justify-center">
                  <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Step 3 Tutorial — Upload My Evidence</p>
                  <p className="text-[10px] text-gray-500">Small Claims Genie Training Video</p>
                </div>
              </div>
              <button
                onClick={() => setTutorialOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              width="840"
              height="472"
              src="https://app.heygen.com/embeds/f8abfad324e84757af33eadebc3f85dd"
              title="Step 3 Tutorial — Upload My Evidence"
              frameBorder="0"
              allow="encrypted-media; fullscreen;"
              allowFullScreen
              className="block w-full"
            />
          </div>
        </div>
      )}

      {/* ── Inline AI Advisor Sheet ── */}
      <Sheet open={advisorOpen} onOpenChange={setAdvisorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="p-5 border-b bg-gradient-to-r from-[#ddf6f3] to-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-base">AI Genie Case Review</SheetTitle>
                <SheetDescription className="text-xs">Reviewing your uploaded evidence and case details</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 p-5 space-y-6 overflow-y-auto">

            {/* Analyzing phase */}
            {advisorPhase === "analyzing" && (
              <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
                <div className="h-12 w-12 rounded-full bg-[#ddf6f3] flex items-center justify-center animate-pulse">
                  <Sparkles className="h-6 w-6 text-[#0d6b5e]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0d6b5e]">Reviewing your case…</p>
                  <p className="text-sm text-muted-foreground mt-1">Analyzing your documents and evidence</p>
                </div>
                <div className="w-64 h-1.5 rounded-full bg-[#ddf6f3] overflow-hidden">
                  <div className="h-full w-2/5 rounded-full bg-[#14b8a6] animate-[progress-slide_1.4s_ease-in-out_infinite]" />
                </div>
              </div>
            )}

            {/* Results phase */}
            {advisorPhase === "results" && (
              <>
                {advisorTruncatedDocs.length > 0 && (
                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>
                      <strong>Large document notice:</strong> The following {advisorTruncatedDocs.length === 1 ? "file was" : "files were"} too large to fully analyze:{" "}
                      {advisorTruncatedDocs.map((name, i) => (
                        <span key={i}><em>{name}</em>{i < advisorTruncatedDocs.length - 1 ? ", " : ""}</span>
                      ))}. Contact us at{" "}
                      <a href="mailto:support@smallclaimsgenie.com" className="underline font-medium">support@smallclaimsgenie.com</a>{" "}
                      for assistance.
                    </span>
                  </div>
                )}

                {advisorLegalAlert && (
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                        <Scale className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="font-bold text-sm text-amber-900">⚖️ Know Your Legal Rights — You May Be Owed More</p>
                    </div>
                    <p className="text-sm text-amber-900 leading-relaxed">{advisorLegalAlert}</p>
                    <p className="text-xs text-amber-700 font-medium">Review your claim amount before filing — you may want to update it.</p>
                  </div>
                )}

                {advisorChecklist.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-[#0d6b5e] flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                      <h3 className="font-semibold text-sm">Evidence to gather for your case</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Check off items as you gather them — your progress is saved automatically.</p>
                    <div className="space-y-2">
                      {advisorChecklist.map((item) => (
                        <button key={item.id} type="button" onClick={() => toggleAdvisorItem(item.id)}
                          className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors">
                          <div className="mt-0.5 shrink-0 text-[#0d6b5e]">
                            {advisorChecked.has(item.id) ? <CheckSquare2 className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${advisorChecked.has(item.id) ? "line-through text-muted-foreground" : ""}`}>{item.item}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {advisorQuestions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold">?</div>
                      <h3 className="font-semibold text-sm">Things to think about</h3>
                    </div>
                    <div className="space-y-2">
                      {advisorQuestions.map((q) => (
                        <div key={q.id} className="rounded-lg border border-[#a8e6df] bg-[#f0fffe] px-4 py-3">
                          <p className="text-sm text-[#0d6b5e] leading-relaxed">{q.question}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-3">
                  <Button
                    type="button"
                    onClick={() => void openAdvisor()}
                    variant="outline"
                    className="w-full gap-2"
                    disabled={false}
                  >
                    <Sparkles className="h-4 w-4" />
                    Run Again
                  </Button>
                  <Button type="button" onClick={() => setAdvisorOpen(false)} className="w-full bg-[#0d6b5e] hover:bg-[#0a5449] text-white">
                    Done — Back to My Documents
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Your checklist is saved — find it in the Document Checklist tab.</p>
                </div>
              </>
            )}

          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
