import { useState } from "react";
import { i18n } from "@/lib/i18n";
import { useListCases, useGetCaseStats, useDeleteCase, getListCasesQueryKey, getGetCaseStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Briefcase, DollarSign, Activity, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function ReadinessBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  const label =
    score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="flex flex-col items-end gap-1 min-w-[70px]">
      <span className={`text-2xl font-black tabular-nums ${label}`}>{score}%</span>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Readiness</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    filed: "bg-green-50 text-green-700 border-green-200",
    closed: "bg-gray-100 text-gray-500 border-gray-200",
  };
  const style = styles[status] || styles.draft;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border capitalize ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function Dashboard() {
  const { data: cases, isLoading: loadingCases } = useListCases();
  const { data: stats, isLoading: loadingStats } = useGetCaseStats();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteCase = useDeleteCase();

  const [confirmId, setConfirmId] = useState<number | null>(null);
  const confirmCase = cases?.find((c) => c.id === confirmId);

  const handleDelete = () => {
    if (confirmId == null) return;
    deleteCase.mutate(
      { id: confirmId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCaseStatsQueryKey() });
          toast({ title: "Case deleted", description: "The case has been permanently removed." });
          setConfirmId(null);
        },
        onError: () => {
          toast({ title: "Delete failed", description: "Could not delete the case. Please try again.", variant: "destructive" });
          setConfirmId(null);
        },
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">{i18n.dashboard.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Pick up where you left off, or start a new case.</p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto h-12 px-6 bg-primary text-primary-foreground font-bold rounded-xl">
          <Link href="/cases/new">
            <Plus className="mr-2 h-5 w-5" />
            {i18n.dashboard.newCaseBtn}
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
        <Card className="border-0 bg-primary/5">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="h-12 w-12 bg-primary/15 rounded-xl flex items-center justify-center shrink-0">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{i18n.dashboard.totalCases}</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-10" />
              ) : (
                <p className="text-4xl font-black text-foreground leading-none">{stats?.total ?? 0}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-accent/5">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="h-12 w-12 bg-accent/20 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{i18n.dashboard.totalSought}</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <p className="text-4xl font-black text-foreground leading-none">${stats?.totalClaimAmount?.toLocaleString() ?? 0}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{i18n.dashboard.avgReadiness}</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16" />
              ) : (
                <>
                  <p className="text-4xl font-black text-foreground leading-none mb-2">{stats?.avgReadinessScore ?? 0}%</p>
                  <div className="w-full h-2 rounded-full bg-green-200 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${stats?.avgReadinessScore ?? 0}%` }} />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Case List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-foreground mb-4">{i18n.dashboard.recentActivity}</h2>

        {loadingCases ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : cases && cases.length > 0 ? (
          cases.map((c) => (
            <div key={c.id} className="relative group/card">
              <Link href={`/cases/${c.id}`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group rounded-2xl">
                  <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors truncate leading-tight">
                        {c.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={c.status} />
                        <span className="text-xs text-muted-foreground">
                          Updated {format(new Date(c.updatedAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 pr-10">
                      <ReadinessBar score={c.readinessScore ?? 0} />
                      <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors hidden sm:block" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Delete button — sits outside the Link so it doesn't navigate */}
              <button
                onClick={(e) => { e.preventDefault(); setConfirmId(c.id); }}
                className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/card:opacity-100 transition-all"
                aria-label="Delete case"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <Card className="p-14 text-center border-dashed rounded-2xl">
            <div className="flex flex-col items-center gap-4">
              <Briefcase className="h-14 w-14 text-muted-foreground/20" />
              <p className="text-lg font-medium text-muted-foreground">{i18n.dashboard.noCases}</p>
              <Button asChild className="mt-1 rounded-xl">
                <Link href="/cases/new">Start Your First Case</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmId !== null} onOpenChange={(open) => { if (!open) setConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this case?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmCase?.title}</strong> will be permanently deleted — including all documents, chat history, and form data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteCase.isPending}
            >
              {deleteCase.isPending ? "Deleting…" : "Yes, delete it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
