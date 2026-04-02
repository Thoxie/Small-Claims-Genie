import { useEffect } from "react";
import { useLocation } from "wouter";
import { useListCases } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wand2 } from "lucide-react";

export default function Resume() {
  const [, setLocation] = useLocation();
  const { data: cases, isLoading, isError } = useListCases();

  useEffect(() => {
    if (isLoading || !cases) return;
    if (cases.length === 0) {
      setLocation("/cases/new");
    } else if (cases.length === 1) {
      setLocation(`/cases/${cases[0].id}`);
    } else {
      const mostRecent = cases.reduce((a, b) =>
        new Date(b.updatedAt ?? 0) > new Date(a.updatedAt ?? 0) ? b : a
      );
      setLocation(`/cases/${mostRecent.id}`);
    }
  }, [cases, isLoading, setLocation]);

  if (isError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-5xl">⚖️</div>
        <h2 className="text-2xl font-bold text-primary">Ready to fight your case?</h2>
        <p className="text-muted-foreground max-w-sm">
          Start by creating your first case and we'll walk you through everything step by step.
        </p>
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-full px-8">
          <Link href="/cases/new">
            <Wand2 className="mr-2 h-5 w-5" />
            Start Your Case
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/sign-in">Sign in to a different account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md flex flex-col items-center gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-4 w-56" />
    </div>
  );
}
