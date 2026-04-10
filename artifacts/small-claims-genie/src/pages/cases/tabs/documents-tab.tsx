import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  useListDocuments,
  useUploadDocument,
  useDeleteDocument,
  getListDocumentsQueryKey,
  getGetCaseReadinessQueryKey,
  getListCasesQueryKey,
  getGetCaseStatsQueryKey,
  getGetCaseQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Paperclip, Trash2, Eye, ClipboardList, CheckSquare2, Square, AlertCircle } from "lucide-react";
import { i18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function DocumentsTab({ caseId, evidenceChecklist }: { caseId: number; evidenceChecklist: { id: string; item: string; description: string; checked?: boolean }[] }) {
  const { data: documents } = useListDocuments(caseId, { query: { enabled: !!caseId } });
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    () => new Set(evidenceChecklist.filter(i => i.checked).map(i => i.id))
  );

  useEffect(() => {
    setCheckedItems(new Set(evidenceChecklist.filter(i => i.checked).map(i => i.id)));
  }, [evidenceChecklist]);

  const saveChecked = async (next: Set<string>) => {
    try {
      const token = await getToken();
      await fetch(`/api/cases/${caseId}/advisor/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ checkedIds: Array.from(next) }),
      });
      queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
    } catch { /* silent */ }
  };

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      saveChecked(n);
      return n;
    });
  };

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
    await uploadDoc.mutateAsync({ id: caseId, data: { file, label: file.name } });
    invalidateDocAndScore();
    toast({ title: "Document uploaded", description: "OCR text extraction is running in the background." });
    e.target.value = "";
  };

  const handleDelete = (docId: number) => {
    deleteDoc.mutate({ id: caseId, docId }, { onSuccess: () => { invalidateDocAndScore(); } });
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{i18n.documents.title}</h2>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploadDoc.isPending} data-testid="button-upload-doc">
          <Paperclip className="h-4 w-4 mr-2" />
          {uploadDoc.isPending ? i18n.documents.processing : i18n.documents.uploadBtn}
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleUpload} />
      </div>

      {evidenceChecklist.length > 0 && (
        <div className="mb-6 rounded-lg border border-[#a8e6df] bg-[#f0fffe] p-4">
          <div className="flex items-center gap-2 mb-2">
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

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Don't forget:</span> Upload any other documents, photos, screenshots, or images you believe are relevant to your case — even if they're not on the checklist above.
        </p>
      </div>

      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg px-5 py-4 mb-6 bg-muted/5 cursor-pointer hover:border-primary/40 transition-colors flex items-center gap-4" onClick={() => fileInputRef.current?.click()}>
        <div className="shrink-0 w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Drag and drop files here</p>
          <p className="text-xs text-muted-foreground">Contracts, receipts, photos, texts, emails, invoices — anything related to your case</p>
        </div>
        <Button variant="outline" type="button" className="shrink-0" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse Files</Button>
      </div>

      <div className="space-y-4">
        {documents?.map((doc: any) => (
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
  );
}
