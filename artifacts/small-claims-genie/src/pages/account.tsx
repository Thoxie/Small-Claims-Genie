import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AccountPage() {
  const { getToken, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const confirmed = confirmText.trim() === "DELETE";

  async function handleDelete() {
    if (!confirmed || deleting) return;
    setDeleting(true);

    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.BASE_URL}api/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Deletion failed");
      }

      await signOut();
      setLocation("/");
    } catch (err) {
      toast({
        title: "Deletion failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Under the California Consumer Privacy Act (CCPA), you have the right to request
        permanent deletion of all personal data we hold about you.
      </p>

      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">This cannot be undone</p>
            <p className="text-sm text-red-600 mt-1">
              Deleting your account permanently removes all of your cases, documents,
              AI conversations, and uploaded files. Your login will be disabled immediately.
            </p>
          </div>
        </div>

        {!dialogOpen ? (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => setDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete My Account &amp; All Data
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-800">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => { setDialogOpen(false); setConfirmText(""); }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleDelete}
                disabled={!confirmed || deleting}
              >
                {deleting ? "Deleting…" : "Yes, Delete Everything"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
