Should I weed on Stripe until I finish my beta import { useState, useRef, useEffect } from "react";
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
          <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded"><FileText className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="font-medium">{doc.originalName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={doc.ocrStatus === 'complete' ? 'secondary' : 'outline'}
                    className={`text-[10px] ${doc.ocrStatus === 'complete' ? 'text-green-700 bg-green-100' : doc.ocrStatus === 'failed' ? 'text-red-700 bg-red-100' : ''}`}>
                    {doc.ocrStatus === 'complete' ? i18n.documents.complete : doc.ocrStatus === 'failed' ? i18n.documents.failed : i18n.documents.processing}
                  </Badge>
                  <span>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ""}</span>
                  {doc.createdAt && (
                    <span>
                      {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      {new Date(doc.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => window.open(`/api/cases/${caseId}/documents/${doc.id}/file`, "_blank")} className="text-muted-foreground hover:text-primary hover:bg-primary/10" aria-label="View document">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} disabled={deleteDoc.isPending} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(!documents || documents.length === 0) && <p className="text-center text-muted-foreground py-8">{i18n.documents.noDocs}</p>}
      </div>
    </div>
  );
}
